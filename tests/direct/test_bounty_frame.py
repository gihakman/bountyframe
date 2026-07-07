"""Direct-mode tests for the BountyFrame intelligent contract.

Run: pytest tests/direct/ -v
These run in-memory (no server). The vision model and media fetch are mocked, so
they exercise business logic, state transitions, payouts, and access control.
Validator consensus is exercised separately in integration tests.
"""
from conftest import CONTRACT, ONE_GEN, addr_hex, mock_media_ok, mock_verdict


def _new_campaign(direct_vm, direct_deploy, brand, deposit, bounty):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = brand
    direct_vm.deal(brand, deposit * 4)
    direct_vm.value = deposit
    cid = contract.create_campaign("Summer Launch", "Show our can on a sunny beach; no competing brands.", bounty)
    direct_vm.value = 0
    return contract, cid


def test_create_campaign_stores_state(direct_vm, direct_deploy, direct_alice):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 5 * ONE_GEN, ONE_GEN)
    assert int(cid) == 0
    c = contract.get_campaign(cid)
    assert c["brand"].lower() == addr_hex(direct_alice)
    assert c["active"] is True
    assert c["escrow_balance"] == str(5 * ONE_GEN)
    assert c["bounty_amount"] == str(ONE_GEN)
    assert contract.get_campaign_count() == 1


def test_create_campaign_rejects_underfunded(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.deal(direct_alice, 10 * ONE_GEN)
    direct_vm.value = ONE_GEN // 2  # less than one bounty
    with direct_vm.expect_revert("deposit must cover at least one bounty"):
        contract.create_campaign("t", "guidelines here", ONE_GEN)
    direct_vm.value = 0


def test_submit_approved_pays_creator(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 5 * ONE_GEN, ONE_GEN)
    mock_media_ok(direct_vm)
    mock_verdict(direct_vm, compliant=True, score=88, reason="Can visible, sunny beach.")

    direct_vm.sender = direct_bob
    result = contract.submit(cid, "https://cdn.example.com/post.png")
    assert result == "approved"

    # escrow reduced by full bounty
    c = contract.get_campaign(cid)
    assert c["escrow_balance"] == str(4 * ONE_GEN)
    assert c["payouts_made"] == 1

    # submission recorded with 5% fee deducted from creator's net
    s = contract.get_submission(0)
    assert s["status"] == "approved"
    assert s["creator"].lower() == addr_hex(direct_bob)
    net = ONE_GEN - (ONE_GEN * 500) // 10000
    assert s["paid_amount"] == str(net)
    assert contract.has_claimed(cid, direct_bob) is True


def test_submit_rejected_no_payout(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 5 * ONE_GEN, ONE_GEN)
    mock_media_ok(direct_vm)
    mock_verdict(direct_vm, compliant=False, score=10, reason="Competing brand visible.")

    direct_vm.sender = direct_bob
    result = contract.submit(cid, "https://cdn.example.com/bad.png")
    assert result == "rejected"

    c = contract.get_campaign(cid)
    assert c["escrow_balance"] == str(5 * ONE_GEN)  # unchanged
    assert c["payouts_made"] == 0
    s = contract.get_submission(0)
    assert s["status"] == "rejected"
    assert s["paid_amount"] == "0"
    assert contract.has_claimed(cid, direct_bob) is False


def test_double_reward_blocked(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 5 * ONE_GEN, ONE_GEN)
    mock_media_ok(direct_vm)
    mock_verdict(direct_vm, compliant=True)

    direct_vm.sender = direct_bob
    contract.submit(cid, "https://cdn.example.com/post.png")
    with direct_vm.expect_revert("already rewarded"):
        contract.submit(cid, "https://cdn.example.com/post2.png")


def test_submit_blocked_when_escrow_exhausted(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    # fund exactly one bounty
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, ONE_GEN, ONE_GEN)
    mock_media_ok(direct_vm)
    mock_verdict(direct_vm, compliant=True)

    direct_vm.sender = direct_bob
    assert contract.submit(cid, "https://cdn.example.com/a.png") == "approved"

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("escrow is exhausted"):
        contract.submit(cid, "https://cdn.example.com/b.png")


def test_close_campaign_only_brand(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 3 * ONE_GEN, ONE_GEN)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("only the brand can close"):
        contract.close_campaign(cid)

    direct_vm.sender = direct_alice
    contract.close_campaign(cid)
    c = contract.get_campaign(cid)
    assert c["active"] is False
    assert c["escrow_balance"] == "0"


def test_fund_campaign_increases_escrow(direct_vm, direct_deploy, direct_alice):
    contract, cid = _new_campaign(direct_vm, direct_deploy, direct_alice, 2 * ONE_GEN, ONE_GEN)
    direct_vm.sender = direct_alice
    direct_vm.value = 3 * ONE_GEN
    contract.fund_campaign(cid)
    direct_vm.value = 0
    assert contract.get_campaign(cid)["escrow_balance"] == str(5 * ONE_GEN)


def test_protocol_fee_config_owner_only(direct_vm, direct_deploy, direct_owner, direct_bob):
    contract = direct_deploy(CONTRACT)
    # deployer (direct_owner) is the owner
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("owner only"):
        contract.set_protocol_fee_bps(100)

    direct_vm.sender = direct_owner
    contract.set_protocol_fee_bps(250)
    assert contract.get_protocol_config()["protocol_fee_bps"] == 250


def test_fee_cap_enforced(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("fee capped"):
        contract.set_protocol_fee_bps(5000)
