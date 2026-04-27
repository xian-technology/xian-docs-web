# Governance Web Console

`xian-governance-web` is the validator-facing governance operations console.
It is a separate app from a validator node. It reads governance state through a
configured Xian RPC endpoint and submits votes only through the connected Xian
browser wallet.

Repository:

- `https://github.com/xian-technology/xian-governance-web`

## What It Provides

Use the console to:

- inspect protocol-governance and validator-governance proposals
- see proposal status, thresholds, voting weight, and per-validator votes
- connect the Xian browser wallet
- submit validator votes through wallet signing
- create guided protocol and validator-governance proposals
- inspect active validators and candidates
- verify state-patch bundle hashes before activation
- open off-chain proposal references such as GitHub discussions or pull
  requests

The console is not a comment system and does not store validator private keys.
Proposal discussion should happen in the linked off-chain venue.

## Requirements

To run the console locally:

- Node.js and npm
- access to a Xian RPC endpoint
- the Xian browser wallet for voting or proposal creation
- a wallet account that is an active validator for governance actions

Current-governance read support expects the node/API surface to include:

- `/masternodes_vote/<proposal-id>`
- `/masternodes_vote_records/<proposal-id>`

Those endpoints expose the per-voter validator-governance records used by the
vote matrix. Older networks that do not yet have those contract/API changes can
still expose proposal aggregates, but complete per-validator vote auditing is
only available for proposals created after the vote-record upgrade.

## Run Locally

```bash
git clone https://github.com/xian-technology/xian-governance-web.git
cd xian-governance-web
npm install
cp .env.example .env
npm run dev
```

The default local URL is:

```text
http://127.0.0.1:4173
```

Set the target network in `.env`:

```bash
PORT=4173
XIAN_NETWORK_ID=mainnet
XIAN_NETWORK_NAME="Xian Mainnet"
XIAN_CHAIN_ID=<chain-id>
XIAN_RPC_URL=https://<rpc-host>
XIAN_DASHBOARD_URL=https://<dashboard-host>
XIAN_GOVERNANCE_CONTRACT=governance
XIAN_MEMBERSHIP_CONTRACT=masternodes
```

`XIAN_DASHBOARD_URL` is optional and is used only for navigation and
observability. Voting does not require exposing a validator node endpoint.

## Voting Model

Only active validators can vote.

The signer is the wallet account, not the node process. Running a node or
serving a public RPC endpoint does not create voting rights by itself.

For protocol governance, the `governance` contract imports the membership
contract and requires the caller to be a current member. On canonical networks,
that membership contract is `masternodes`.

For validator governance, `masternodes` requires:

- `ctx.caller` to be in the active validator set to open a proposal
- the caller to have snapshotted voting weight on that proposal to vote

That means:

- active validator wallet accounts can create proposals and vote
- non-validator wallets can observe but cannot vote
- service nodes, BDS nodes, dashboards, and public RPC nodes observe unless the
  connected wallet account is also an active validator
- a validator added after a proposal opens cannot vote on that already-open
  proposal
- weight changes after proposal creation do not change that proposal's voting
  weight or threshold

## Delegation And Voting Weight

Delegators do not vote directly in governance. Delegation can still affect
governance indirectly through validator power, depending on network policy.

Current bundled networks use:

```text
power_mode = "equal"
```

In that mode, every active validator has the same active voting power. Delegated
stake affects staking economics and rewards, but it does not change governance
weight on those networks.

When a network uses:

```text
power_mode = "stake_weighted"
```

active validator power is based on:

```text
self_bond + total_delegated
```

Governance snapshots that active validator power when a proposal is created.
In stake-weighted networks, delegating to a validator can therefore increase
that validator's future governance weight, but the delegator still does not
cast a separate vote.

Delegation can also influence validator-set membership in `auto_top_n` and
`hybrid` selection modes, where total bonded stake is part of candidate ranking
and eligibility.

## Node Endpoints

Validator node endpoints are optional for the governance console.

The minimum useful setup is wallet plus RPC:

- the RPC endpoint provides proposal and validator state
- the browser wallet signs governance transactions
- private keys stay in the wallet

Validators may publish a read-only node or dashboard endpoint in their
validator profile for observability. The console can use those endpoints for
health and readiness views, but they are not part of authorization and should
never expose validator signing keys or mutating admin RPC.

## State Patches

Approving a state-patch proposal is not enough by itself. Validators still need
the exact approved patch bundle locally before the activation height.

The console can compute and compare the canonical bundle hash, but operators
must still distribute the bundle to validators and confirm node readiness.
See [Protocol Governance & State Patches](/node/protocol-governance) for the
full patch process.
