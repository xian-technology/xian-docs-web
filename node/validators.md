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

Consensus identities must be 32-byte Ed25519 public keys in canonical form:
exactly 64 lowercase hex characters. Hex-case variants verify with the same key
but are distinct account strings, so `register()` and genesis `genesis_nodes`
reject anything else, and the node treats a non-canonical key in state as
malformed.

Malformed identities are excluded from consensus updates. An empty or entirely
invalid desired set does not erase the last effective nonempty validator set,
and neither does a set with an invalid power or a total power above CometBFT's
`MaxTotalVotingPower` (`MaxInt64 / 8`). Operators must correct the on-chain
membership rather than treating these cases as successful removals. The effective consensus baseline is
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

In `manual` mode an `add_member` proposal records the candidate's requested
power when the proposal is created; activation uses that power even if the
candidate edits its registration while the vote is open. Change it later with
`set_member_power`.

The active set is never empty. The last active validator cannot leave, and
governance cannot remove or jail it; a governance-requested rebalance that
would select nobody is rejected, while epoch and evidence-triggered rebalances
that would select nobody keep the current set. Evidence still slashes the last
active validator but does not jail it.

## Liveness and Activation Limits

Two rules keep validators that never sign from halting the chain (CometBFT
needs more than 2/3 of the voting power to commit a block).

**Newcomer power cap.** In `auto_top_n` and `hybrid` mode a rebalance admits
newcomers (into empty seats and as replacements, within
`max_active_set_churn`) only while their combined power stays within
`max_new_power_bps` of the new set's power. Even if every newcomer of a
rebalance never comes online, the incumbents keep the rest of the power. With
equal power and the 20% cap, a set of fewer than four validators therefore does
not grow automatically; governance grows it with `add_member`, which the cap
does not limit. While a set has fewer than four validators each newcomer holds
a third or more of the power, so one that never signs halts the chain: approve
only candidates whose node is already synced with the registered consensus
key.

**Downtime jailing.** Every block, FinalizeBlock reads the votes of the
decided last commit (part of the agreed block, so every node sees the same
votes). When an active validator's signature is absent, or a missed-block
count is open, the unmetered system transaction
`validators.record_liveness(absent)` counts consecutive misses per validator
(a signature or a nil vote resets the count; `missed_blocks` in the
validator record). At `downtime_jail_blocks` consecutive misses the validator
is jailed through the evidence penalty path with infraction `DOWNTIME`,
slashed by `downtime_slash_bps`, and its power drops at the next block. Nobody
is jailed while more than a third of the active power is absent at once (a
partition, not one validator's downtime), and never the last active
validator.

A validator jailed for downtime lifts the jail itself with `unjail()` once
`downtime_unjail_cooldown_hours` have passed since the jail; other jails are
lifted only by governance. After `unjail()` it is an approved candidate
again: governance re-adds it with `add_member` in `manual` mode, and the
capped rebalance re-selects it in `auto_top_n`/`hybrid` mode.

If validators holding a third or more of the power stop at once, no block
commits and no transaction can repair the set; the remaining operators
restart the chain with a recovery genesis (see
[Halt Recovery](/node/validator-operations-runbook#halt-recovery)).

`add_member`, `remove_member` and `jail_member` proposals are re-checked when
they finalize. A proposal whose target is no longer eligible (a jailed
candidate, an already removed or jailed member, or the last active validator)
is finalized as `rejected` without side effects.

## Voting Power

| Mode | Active power |
| --- | --- |
| `equal` | fixed equal power |
| `requested` | validator's requested power |
| `stake_weighted` | integer total bonded stake, minimum 1, clamped to `10^12` |

A single validator's power is at most `10^12` (`MAX_VALIDATOR_POWER`):
registration, `update_registration`, genesis powers and `set_member_power`
reject larger values. Every power change also keeps the active total within
CometBFT's `MaxTotalVotingPower` (`MaxInt64 / 8`), so no selection produces a
validator update that consensus would reject.

The checked-in local/dev/test bundles use manual selection and equal power. The
draft `xian-mainnet-1` rehearsal bundle starts in `manual` selection with at
most 13 active validators, equal power, a minimum self bond of 100,000 XIAN
and a minimum total bond of 500,000 XIAN (required for `add_member`), a
720-block rebalance interval and a one-epoch activation delay for a later
switch to automatic selection, and a churn limit of one newcomer per
rebalance. Newcomers add at most 20% of the power per rebalance
(`max_new_power_bps` 2000), a validator is jailed after 500 consecutive
missed blocks (`downtime_jail_blocks`; about 40 minutes at the idle 5 s block
interval, less under load), downtime is not slashed (`downtime_slash_bps` 0)
and a downtime jail can be lifted after 24 hours
(`downtime_unjail_cooldown_hours`). These values remain launch inputs until
an accepted operator manifest is published.

## Governance and Overrides

The `validators` contract governs membership, jailing, slashing, power, fees,
reward parameters, and validator policy. Only active validators vote, using
snapshotted voting power.

In non-manual modes, selected membership overrides depend on
`manual_override_enabled`; evidence slashing remains available regardless.
See [Protocol Governance](/node/protocol-governance) for the proposal model.

## Planned Exit

`announce_leave()` starts the leave delay. `leave()` removes the validator,
refunds the registration bond, and converts the self bond into a pending
unbond. Delegations stay in the validator's pool (earning nothing) until each
delegator undelegates; their unbonding clock starts at the exit. Stake becomes
claimable only after the configured unbonding period.

Use the [Validator Operations Runbook](/node/validator-operations-runbook) for
the reviewed checklist and [Staking Mechanics](/node/staking) for value flows.
