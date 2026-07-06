# BountyFrame

On-chain payouts for user-generated marketing content, judged by decentralized AI.

Brands fund a campaign and write the creative guidelines in plain language.
Creators submit a link to their post. A GenLayer Intelligent Contract fetches the
media, evaluates it against the guidelines, and releases the bounty when the
validators agree. There is no account manager reviewing submissions by hand.

## Live on GenLayer Bradbury

| | |
|---|---|
| Contract | [`0x857B95185f5e4192097b2E6E80A437F14e3FF5f7`](https://explorer-bradbury.genlayer.com/address/0x857B95185f5e4192097b2E6E80A437F14e3FF5f7) |
| Deploy transaction | [`0x96ad273c…6fa146d2`](https://explorer-bradbury.genlayer.com/tx/0x96ad273c052cc90ab9ce2c590b54b388940baa35cf87b95e250b58c36fa146d2) |
| Network | GenLayer Bradbury (chain id 4221) |

## How it works

1. **A brand funds a campaign.** It deposits GEN into escrow and writes the
   creative guidelines as text. The deposit sets how many bounties the campaign
   can pay.
2. **A creator submits a link.** They post their content and submit the image URL.
   Payouts are limited to one per creator per campaign.
3. **Validators judge and pay.** Each validator independently fetches the media,
   runs a vision model against the same guidelines, and votes. A majority decides.
   Approved content is paid immediately, minus a 5% protocol fee.

## Why the judgment runs on GenLayer

Deciding whether an image matches a brand's guidelines is a subjective call. A
normal smart contract cannot make it, and a single AI API reintroduces a party you
have to trust. GenLayer runs the evaluation inside the contract: the leader fetches
the media and returns a structured verdict, and every validator re-runs the same
check. Consensus is reached only when the validators agree on the boolean
`compliant` decision, and that agreement is what authorizes the payout. If a result
looks wrong, it can be appealed for re-evaluation by a larger validator set.

## Technology

- **Intelligent Contract** in Python, executed by the GenVM. It owns the escrow,
  the guidelines, the AI verdict, and the payout. Non-deterministic work (web fetch
  and the vision model) runs inside an equivalence-principle block; state changes
  and value transfers happen only after consensus.
- **Consensus rule** built with `gl.vm.run_nondet_unsafe`: the leader proposes a
  JSON verdict, validators reproduce it and agree only on the compliant decision.
- **Frontend** in Next.js (App Router) with TypeScript and Tailwind CSS, connected
  to the chain through [`genlayer-js`](https://www.npmjs.com/package/genlayer-js)
  and a browser wallet.
- **Deployment** with a `genlayer-js` script that reads the contract and submits it
  to Bradbury.

## Repository layout

```
contracts/          Intelligent Contract (Python): campaigns and AI media evaluation
tests/direct/       Fast in-memory contract tests (genlayer-test, direct mode)
deploy/             Bradbury deployment script (genlayer-js + TypeScript)
frontend/           Next.js app: documentation-first landing and the dApp
requirements.txt    Python tooling for the contract (lint + tests)
```

## Contract interface

| Method | Type | Purpose |
|---|---|---|
| `create_campaign(title, guidelines, bounty_amount)` | write, payable | Open a campaign and escrow GEN |
| `fund_campaign(campaign_id)` | write, payable | Add escrow to a campaign |
| `submit(campaign_id, media_url)` | write | Judge a submission and pay on approval |
| `close_campaign(campaign_id)` | write | Brand closes a campaign and reclaims escrow |
| `get_campaign(id)` / `get_submission(id)` | view | Read campaign and submission state |
| `get_protocol_config()` | view | Owner, fee recipient, fee, counters |

## Contract development

Requires Python 3.12 or newer.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

genvm-lint check contracts/bounty_frame.py
pytest tests/direct/ -v
```

The tests run the contract in memory and mock the web and model calls, so they
exercise the campaign logic, payouts, and access control without a network.

## Frontend

Requires Node.js 18 or newer.

```bash
cd frontend
npm install
npm run dev      # local development
npm run build    # production build
```

The frontend reads the deployed contract address from
`NEXT_PUBLIC_CONTRACT_ADDRESS` and falls back to the live Bradbury address, so it
works out of the box.

### Deploy the frontend to Vercel

Import the repository in Vercel and set the project **Root Directory** to
`frontend`. The framework is detected automatically. No environment variables are
required for the live contract; set `NEXT_PUBLIC_CONTRACT_ADDRESS` only if you
deploy your own contract.

## Deploying the contract

Deployment targets GenLayer Bradbury only.

1. Fund a wallet from the [faucet](https://testnet-faucet.genlayer.foundation).
2. Create `.env` from `.env.example` and set `ACCOUNT_PRIVATE_KEY` to that wallet's
   key. The file is git-ignored and the key is never logged.
3. Deploy:

```bash
cd deploy
npm install
npm run deploy
```

The script prints the transaction hash and the deployed contract address. Put that
address in `frontend/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS` if you want the
frontend to point at your own deployment.

## Network

| Setting | Value |
|---|---|
| GenLayer RPC | `https://rpc-bradbury.genlayer.com` |
| Chain id | 4221 |
| Currency | GEN |
| Explorer | https://explorer-bradbury.genlayer.com |
| Faucet | https://testnet-faucet.genlayer.foundation |

## Security

- Credentials live in `.env` and `.env.local`, both git-ignored. The deployer key
  is used only by the deploy script and is never printed or committed.
- Escrow, fees, and payouts are handled on-chain. The contract releases funds only
  after validator consensus on the compliant decision.

## License

MIT. See [LICENSE](LICENSE).
