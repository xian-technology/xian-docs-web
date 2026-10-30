# Becoming a Validator

Validator onboarding has two independent parts:

1. prepare and operate a node
2. register and become eligible through the on-chain `validators` contract

Starting a node does not add its key to the active validator set.

## Prepare the Node

```bash
xian keys validator generate --out-dir ./keys/validator-1

xian network join validator-1 \
  --network private-net \
  --network-manifest /path/to/accepted/manifest.json \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack

xian node init validator-1
xian node start validator-1
xian node health validator-1
```

Verify genesis, chain ID, image digests, peers, snapshot trust, and the
operator contact process. The current codebase has no active public testnet or
mainnet; do not treat checked-in rehearsal manifests as onboarding endpoints.

## On-Chain Lifecycle

1. Sign a direct `validators.register(...)` call with the validator account and
   supply the operator profile.
2. Escrow the registration bond.
3. Add self-bond or accept delegations when required by policy.
4. Enter `pending` status.
5. Become `active` according to the selection mode.
6. For a planned exit, call `announce_leave()` and later `leave()`.

Common statuses are `pending`, `approved`, `active`, `leaving`, `left`,
`removed`, and `withdrawn`. Jailing is a separate flag.

Validator records include the consensus key, reward key, requested/active
power, commission, profile metadata, registration bond, self-bond, delegation,
pending unbonds, and jail/slash/evidence information.

The registering account becomes the consensus key. Registration requires
`ctx.caller == ctx.signer`, so a wrapper contract cannot register on behalf of
an account. Use the account corresponding to the node's validator key, and keep
any separate reward key in the registration's `reward_key` field.

Consensus identities must be 32-byte Ed25519 public keys encoded as 64 hex
characters. The node compares these keys case-insensitively and emits a single
consensus identity for equivalent spellings; this does not rename contract
accounts or state keys. Use one consistent spelling in contract calls.

Malformed identities are excluded from consensus updates. An empty or entirely
invalid desired set does not erase the last effective nonempty validator set.
Equivalent key spellings with conflicting voting powers also reject the desired
update. Operators must correct the on-chain membership rather than treating
these cases as successful removals. The effective consensus baseline is
persisted in application state so later updates remain consistent after restart
or snapshot restore.

## Selection Modes

| Mode | Admission |
| --- | --- |
| `manual` | an approved `add_member` vote activates the validator |
| `auto_top_n` | eligible candidates are ranked and selected by total bonded stake |
| `hybrid` | governance approval is required before stake-ranked selection |

Auto/hybrid selection excludes jailed and leaving validators, enforces bond and
activation-delay gates, ranks by total bond, and applies configured churn and
replacement-margin limits.

## Voting Power

| Mode | Active power |
| --- | --- |
| `equal` | fixed equal power |
| `requested` | validator's requested power |
| `stake_weighted` | integer total bonded stake, minimum 1 |

The checked-in local/dev/test bundles use manual selection and equal power. The
draft `xian-mainnet-1` rehearsal bundle uses `auto_top_n`, at most 13 active
validators, equal power, a 720-block rebalance interval, and a one-epoch
activation delay. These values remain launch inputs until an accepted operator
manifest is published.

## Governance and Overrides

The `validators` contract governs membership, jailing, slashing, power, fees,
reward parameters, and validator policy. Only active validators vote, using
snapshotted voting power.

In non-manual modes, selected membership overrides depend on
`manual_override_enabled`; evidence slashing remains available regardless.
See [Protocol Governance](/node/protocol-governance) for the proposal model.

## Planned Exit

`announce_leave()` starts the leave delay. `leave()` removes the validator,
refunds the registration bond, and converts self-bond and delegations into
pending unbonds. Stake becomes claimable only after the configured unbonding
period.

Use the [Validator Operations Runbook](/node/validator-operations-runbook) for
the reviewed checklist and [Staking Mechanics](/node/staking) for value flows.
