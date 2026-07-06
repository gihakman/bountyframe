# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing
from dataclasses import dataclass
from datetime import datetime, timezone

# Error classification prefixes (see write-contract skill).
# Deterministic errors must match across validators; transient may both fail;
# LLM errors force a leader rotation.
ERROR_EXPECTED = "[EXPECTED]"    # business logic (deterministic)
ERROR_EXTERNAL = "[EXTERNAL]"    # external 4xx (deterministic)
ERROR_TRANSIENT = "[TRANSIENT]"  # network / 5xx (non-deterministic)
ERROR_LLM = "[LLM_ERROR]"        # malformed model output


@allow_storage
@dataclass
class Campaign:
    brand: Address
    title: str
    guidelines: str          # brand's plain-language evaluation criteria
    bounty_amount: u256      # payout per approved submission, in wei (GEN)
    escrow_balance: u256     # remaining escrowed funds, in wei
    payouts_made: u256
    active: bool
    created_at: str          # ISO-8601, pinned to tx timestamp


@allow_storage
@dataclass
class Submission:
    campaign_id: u256
    creator: Address
    media_url: str
    status: str              # "approved" | "rejected"
    score: u256              # model confidence / quality, 0-100
    reason: str              # model's justification
    paid_amount: u256        # net paid to creator, in wei (0 if rejected)
    created_at: str


# EOA recipients live on the chain layer; sending native GEN to them is an
# external message expressed through the EVM interface (see Value Transfers docs).
@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass


def _coerce_json(raw: typing.Any) -> dict:
    """Accept either a parsed dict or a raw string and return a dict.

    LLMs sometimes wrap JSON in prose or markdown fences even with
    response_format='json'. Strip and parse defensively.
    """
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        raise gl.vm.UserError(f"{ERROR_LLM} model returned {type(raw).__name__}")
    text = raw.strip()
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1 or last < first:
        raise gl.vm.UserError(f"{ERROR_LLM} no JSON object in model output")
    try:
        return json.loads(text[first : last + 1])
    except (ValueError, TypeError):
        raise gl.vm.UserError(f"{ERROR_LLM} unparseable JSON in model output")


def _as_bool(value: typing.Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "1", "pass", "approved")
    return False


def _as_score(value: typing.Any) -> int:
    try:
        n = int(round(float(str(value).strip())))
    except (ValueError, TypeError):
        return 0
    return max(0, min(100, n))


def _hex(addr: typing.Any) -> str:
    """Normalize an address (Address or raw bytes) to a 0x hex string."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    return Address(addr).as_hex


def _handle_leader_error(leaders_res: gl.vm.Result, leader_fn) -> bool:
    """Validator-side comparison when the leader returned an error.

    Deterministic errors must match exactly; transient failures on both sides
    agree; anything else disagrees to force a leader rotation.
    """
    leader_msg = getattr(leaders_res, "message", "")
    try:
        leader_fn()
        return False  # leader errored, validator succeeded -> disagree
    except gl.vm.UserError as e:
        validator_msg = getattr(e, "message", None) or str(e)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(
            ERROR_EXTERNAL
        ):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(
            ERROR_TRANSIENT
        ):
            return True
        return False
    except Exception:
        return False


class BountyFrame(gl.Contract):
    # --- protocol config ---
    owner: Address
    fee_recipient: Address
    protocol_fee_bps: u256          # basis points; 500 = 5%

    # --- campaigns ---
    campaign_count: u256
    campaigns: TreeMap[u256, Campaign]

    # --- submissions ---
    submission_count: u256
    submissions: TreeMap[u256, Submission]

    # one approved payout per creator per campaign (anti-spam)
    # key: f"{campaign_id}:{creator_hex}"
    claimed: TreeMap[str, bool]

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.fee_recipient = gl.message.sender_address
        self.protocol_fee_bps = u256(500)  # 5% protocol fee
        self.campaign_count = u256(0)
        self.submission_count = u256(0)

    # ------------------------------------------------------------------ #
    # Brand: campaign lifecycle
    # ------------------------------------------------------------------ #
    @gl.public.write.payable
    def create_campaign(
        self, title: str, guidelines: str, bounty_amount: u256
    ) -> u256:
        """Create a campaign and escrow GEN. `bounty_amount` is paid per approved
        submission; the value sent with this call funds the escrow."""
        deposit = gl.message.value
        if bounty_amount == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} bounty_amount must be > 0")
        if deposit < bounty_amount:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} deposit must cover at least one bounty"
            )
        if len(guidelines.strip()) == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} guidelines must not be empty")

        campaign_id = self.campaign_count
        self.campaigns[campaign_id] = Campaign(
            brand=gl.message.sender_address,
            title=title,
            guidelines=guidelines,
            bounty_amount=bounty_amount,
            escrow_balance=deposit,
            payouts_made=u256(0),
            active=True,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.campaign_count = campaign_id + u256(1)
        return campaign_id

    @gl.public.write.payable
    def fund_campaign(self, campaign_id: u256) -> None:
        """Top up a campaign's escrow with additional GEN."""
        campaign = self._require_campaign(campaign_id)
        if gl.message.value == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} must send value to fund")
        campaign.escrow_balance = campaign.escrow_balance + gl.message.value

    @gl.public.write
    def close_campaign(self, campaign_id: u256) -> None:
        """Brand closes the campaign and reclaims any remaining escrow."""
        campaign = self._require_campaign(campaign_id)
        if gl.message.sender_address != campaign.brand:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} only the brand can close")
        if not campaign.active:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} campaign already closed")

        refund = campaign.escrow_balance
        campaign.escrow_balance = u256(0)
        campaign.active = False
        if refund > u256(0):
            _Payee(campaign.brand).emit_transfer(value=refund)

    # ------------------------------------------------------------------ #
    # Creator: submit content, AI verdict, payout
    # ------------------------------------------------------------------ #
    @gl.public.write
    def submit(self, campaign_id: u256, media_url: str) -> str:
        """Creator submits a direct image URL. Validators independently fetch the
        media and judge it against the brand guidelines. On majority agreement that
        the content is compliant, the bounty is released to the creator."""
        campaign = self._require_campaign(campaign_id)
        if not campaign.active:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} campaign is not active")
        if campaign.escrow_balance < campaign.bounty_amount:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} campaign escrow is exhausted")

        creator = gl.message.sender_address
        claim_key = f"{int(campaign_id)}:{_hex(creator)}"
        if self.claimed.get(claim_key, False):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} creator already rewarded for this campaign"
            )
        if len(media_url.strip()) == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} media_url must not be empty")

        verdict = self._evaluate(media_url, campaign.guidelines)
        compliant = _as_bool(verdict.get("compliant"))
        score = u256(_as_score(verdict.get("score")))
        reason = str(verdict.get("reason", ""))[:512]

        submission_id = self.submission_count
        self.submission_count = submission_id + u256(1)

        if not compliant:
            self.submissions[submission_id] = Submission(
                campaign_id=campaign_id,
                creator=creator,
                media_url=media_url,
                status="rejected",
                score=score,
                reason=reason,
                paid_amount=u256(0),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            return "rejected"

        # Approved: release the bounty. All effects happen post-consensus.
        bounty = campaign.bounty_amount
        fee = (bounty * self.protocol_fee_bps) // u256(10000)
        net = bounty - fee

        campaign.escrow_balance = campaign.escrow_balance - bounty
        campaign.payouts_made = campaign.payouts_made + u256(1)
        self.claimed[claim_key] = True

        self.submissions[submission_id] = Submission(
            campaign_id=campaign_id,
            creator=creator,
            media_url=media_url,
            status="approved",
            score=score,
            reason=reason,
            paid_amount=net,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        _Payee(creator).emit_transfer(value=net)
        if fee > u256(0):
            _Payee(self.fee_recipient).emit_transfer(value=fee)

        return "approved"

    # ------------------------------------------------------------------ #
    # AI evaluation (non-deterministic; consensus via custom validator)
    # ------------------------------------------------------------------ #
    def _evaluate(self, media_url: str, guidelines: str) -> dict:
        prompt = (
            "You are a strict brand-safety reviewer for a marketing campaign.\n"
            "Judge ONLY the attached image against the brand guidelines below.\n\n"
            f"BRAND GUIDELINES:\n{guidelines}\n\n"
            "Decide whether the image satisfies every guideline. Be objective and "
            "conservative: if a required element is missing or a prohibited element "
            "is present, it is NOT compliant.\n"
            'Respond ONLY as JSON: {"compliant": true|false, '
            '"score": <integer 0-100 confidence>, "reason": "<one sentence>"}'
        )

        def leader_fn() -> dict:
            resp = gl.nondet.web.get(media_url)
            status = getattr(resp, "status", None)
            if status is None:
                status = getattr(resp, "status_code", 200)
            if 400 <= int(status) < 500:
                raise gl.vm.UserError(
                    f"{ERROR_EXTERNAL} media fetch returned {int(status)}"
                )
            if int(status) >= 500:
                raise gl.vm.UserError(
                    f"{ERROR_TRANSIENT} media host unavailable ({int(status)})"
                )

            image_bytes = resp.body
            raw = gl.nondet.exec_prompt(
                prompt, images=[image_bytes], response_format="json"
            )
            data = _coerce_json(raw)
            return {
                "compliant": _as_bool(data.get("compliant")),
                "score": _as_score(data.get("score")),
                "reason": str(data.get("reason", ""))[:512],
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)
            mine = leader_fn()
            leader = leaders_res.calldata
            # majority_vote: validators must agree on the binary compliant decision.
            return bool(mine["compliant"]) == bool(leader["compliant"])

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    # ------------------------------------------------------------------ #
    # Owner: protocol configuration
    # ------------------------------------------------------------------ #
    @gl.public.write
    def set_fee_recipient(self, new_recipient: Address) -> None:
        self._require_owner()
        self.fee_recipient = new_recipient

    @gl.public.write
    def set_protocol_fee_bps(self, new_bps: u256) -> None:
        self._require_owner()
        if new_bps > u256(2000):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} fee capped at 20%")
        self.protocol_fee_bps = new_bps

    # ------------------------------------------------------------------ #
    # Views
    # ------------------------------------------------------------------ #
    @gl.public.view
    def get_protocol_config(self) -> dict:
        return {
            "owner": _hex(self.owner),
            "fee_recipient": _hex(self.fee_recipient),
            "protocol_fee_bps": int(self.protocol_fee_bps),
            "campaign_count": int(self.campaign_count),
            "submission_count": int(self.submission_count),
        }

    @gl.public.view
    def get_campaign(self, campaign_id: u256) -> dict:
        c = self._require_campaign(campaign_id)
        return {
            "id": int(campaign_id),
            "brand": _hex(c.brand),
            "title": c.title,
            "guidelines": c.guidelines,
            "bounty_amount": str(int(c.bounty_amount)),
            "escrow_balance": str(int(c.escrow_balance)),
            "payouts_made": int(c.payouts_made),
            "active": bool(c.active),
            "created_at": c.created_at,
        }

    @gl.public.view
    def get_campaign_count(self) -> int:
        return int(self.campaign_count)

    @gl.public.view
    def get_submission(self, submission_id: u256) -> dict:
        if submission_id not in self.submissions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} submission not found")
        s = self.submissions[submission_id]
        return {
            "id": int(submission_id),
            "campaign_id": int(s.campaign_id),
            "creator": _hex(s.creator),
            "media_url": s.media_url,
            "status": s.status,
            "score": int(s.score),
            "reason": s.reason,
            "paid_amount": str(int(s.paid_amount)),
            "created_at": s.created_at,
        }

    @gl.public.view
    def get_submission_count(self) -> int:
        return int(self.submission_count)

    @gl.public.view
    def has_claimed(self, campaign_id: u256, creator: Address) -> bool:
        return self.claimed.get(f"{int(campaign_id)}:{_hex(creator)}", False)

    # ------------------------------------------------------------------ #
    # Internal guards
    # ------------------------------------------------------------------ #
    def _require_campaign(self, campaign_id: u256) -> Campaign:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} campaign not found")
        return self.campaigns[campaign_id]

    def _require_owner(self) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} owner only")
