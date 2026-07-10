# Governance Web Console

`xian-governance-web` is a validator-facing console for inspecting proposals,
creating supported proposal types, and submitting votes through the Xian
browser wallet. It is an optional application, not part of a validator node.

## Requirements

- Node.js and npm
- a trusted Xian RPC endpoint
- the Xian browser wallet for signed actions
- an active validator account for proposal and voting actions

Read-only users can inspect governance state without validator authority.

## Run Locally

```bash
git clone https://github.com/xian-technology/xian-governance-web.git
cd xian-governance-web
npm install
cp .env.example .env
npm run dev
```

Minimal local configuration:

```bash
PORT=4173
XIAN_GOVERNANCE_HOST=127.0.0.1
XIAN_NETWORK_ID=local
XIAN_NETWORK_NAME="Local Xian"
XIAN_CHAIN_ID=xian-local-1
XIAN_RPC_URL=http://127.0.0.1:26657
XIAN_GOVERNANCE_CONTRACT=governance
XIAN_MEMBERSHIP_CONTRACT=validators
```

`XIAN_DASHBOARD_URL` is optional and used for navigation and observability.

## Voting Model

The connected wallet account is the signer. Running a node or publishing an
RPC endpoint does not create voting authority.

- Only active validators can create or vote on supported proposals.
- Eligible voters, voting weights, and the threshold are snapshotted when a
  proposal opens.
- A validator added later cannot vote on that proposal.
- Delegators do not vote directly. Delegation affects later validator power
  only on networks whose policy uses stake-weighted power or stake-ranked
  membership.

The vote matrix requires these node query routes:

```text
/validators_vote/<proposal-id>
/validators_vote_records/<proposal-id>
```

## Operator Safety

- Confirm the wallet, RPC response, manifest, and console all show the same
  chain ID.
- Review the exact proposal target, function, payload, voter snapshot, and
  threshold before signing.
- Keep validator consensus keys out of the browser wallet and console.
- Treat state-patch approval and patch distribution as separate steps. Every
  validator needs the exact approved bundle before activation.
- Use a linked off-chain venue for discussion; the console is not a comment
  system.

See [Protocol Governance & State Patches](/node/protocol-governance) and the
[Validator Operations Runbook](/node/validator-operations-runbook).
