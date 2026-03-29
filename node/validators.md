# Becoming a Validator

Becoming a validator is a mix of governance approval and operator setup.

## Local Setup

Generate validator material:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
```

Join or create the target network profile:

```bash
uv run xian network join validator-1 --network mainnet \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
```

For canonical networks, that profile now inherits the pinned published
`xian-node` image digests from the network manifest by default. Use
`--node-image-mode local_build` only when you intentionally want a
source-built local override.

Initialize the node home:

```bash
uv run xian node init validator-1
```

Start and verify:

```bash
uv run xian node start validator-1
uv run xian node status validator-1
```

## Network Admission

The operational setup above only prepares the node. Whether the node becomes an
active validator depends on the target network's on-chain validator/membership
rules and governance process.

Inspect the target network bundle in `xian-configs` and the canonical
contracts, especially `members.s.py` and `governance.s.py`, for the active
policy.

On current networks, the canonical validator-membership contract is still
`members.s.py`, but it is submitted on-chain as `masternodes`.

Current validator governance covers more than a flat membership list:

- candidates register on-chain and escrow the configured registration bond
- active validators vote candidates in and out through the `masternodes`
  contract
- validator voting power is explicit on-chain and is snapshotted when a
  proposal is created
- validator payout addresses are explicit on-chain through each validator's
  `reward_key`
- protocol governance controls approved contract calls and forward state patches
- tx-fee validator rewards are split by validator power, not equally per node
- validators are expected to carry approved local patch bundles when a governed
  state patch is scheduled

## Current On-Chain Validator Model

The canonical validator record currently tracks:

- validator account / consensus key
- status such as `pending`, `active`, `leaving`, `left`, or `removed`
- requested and active validator power
- reward payout key
- operator metadata fields such as `moniker`, `network_endpoint`, and
  `metadata_uri`
- registration bond held by the `masternodes` contract
- bond refund on clean leave or governed removal under the current canonical
  policy

The high-level lifecycle is:

1. generate validator key material locally
2. prepare the node profile and home
3. submit `masternodes.register(...)` on-chain
4. existing validators approve the `add_member` proposal
5. Xian applies the resulting validator-set update to CometBFT with the
   approved validator power

Current validator proposals also snapshot voter weights. A validator added
after proposal creation does not get to vote on that already-open proposal.

## Reward Behavior

The validator slice of tx fees no longer pays every validator equally.

Instead:

- the validator portion is defined by the `rewards` contract split
- each active validator receives a share proportional to `validator_power`
- the payout is sent to the validator's configured `reward_key`
- if a validator has no explicit `reward_key`, the validator key itself
  receives the reward

See [Protocol Governance & State Patches](/node/protocol-governance) for the
current remediation model.
