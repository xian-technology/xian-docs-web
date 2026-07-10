# Staking Mechanics

The on-chain `validators` contract owns registration bonds, self-bonding,
delegation, unbonding, commission, membership, and slashing. `rewards` defines
the global fee split; the runtime uses validator state to distribute the
validator portion.

## Registration Bond and Stake

These are different balances:

- the registration bond is escrowed in `holdings[validator]`
- self-bond and delegations contribute to the validator's bonded stake

On a clean leave, governed removal, or candidate withdrawal, the registration
bond is refunded immediately. Self-bond and delegations become pending unbonds
and wait for the configured unbonding period.

## Main Functions

| Function | Purpose |
| --- | --- |
| `register(...)` | create a pending candidate and escrow registration bond |
| `update_registration(...)` | update candidate power/profile fields |
| `update_profile(...)` | update active/approved reward and metadata fields |
| `bond_self(amount)` | add validator self-bond |
| `unbond_self(amount)` | create a pending self-unbond |
| `delegate(validator, amount, reward_key=None)` | delegate stake |
| `undelegate(validator, amount)` | create a pending delegation unbond |
| `claim_unbond(id)` | claim an unlocked unbond |
| `announce_leave()` / `leave()` | planned validator exit |
| `unregister()` | withdraw an inactive candidate |

Bonding is closed for jailed, leaving, or terminal validators. Self-delegation
through `delegate()` is rejected; validators use `bond_self()`.

## Rewards and Commission

The runtime first divides the validator reward bucket by active voting power.
For each validator:

1. commission is paid to the validator reward key
2. the remainder is distributed pro rata across self-bond and active
   delegations
3. delegators receive rewards at their configured reward key or account

If a validator has no bonded stake, its validator share goes to its reward key.

## Unbonding

An unbond record stores owner, validator, amount, kind, creation block/time,
unlock time, reason, and claimed state. Only its owner can claim it after
`now >= unlock_at`.

The checked-in local/dev/test bundles use a 7-day unbonding period. The draft
mainnet rehearsal bundle uses 14 days. The policy active on the target chain is
authoritative.

Active validators also have a fixed leave-announcement delay before `leave()`.
After leave, removal, or withdrawal, stake follows the normal unbonding clock.

## Slashing and Evidence

Governance can slash a validator. The runtime can also apply supported
CometBFT evidence during block finalization.

Slashable value can include self-bond, live delegations, and pending unbonds
created after the infraction height. This prevents a validator or delegator
from escaping a known earlier infraction by unbonding.

Checked-in development bundles apply these defaults:

| Evidence | Slash | Jail |
| --- | ---: | --- |
| duplicate vote | 500 bps | yes |
| light-client attack | 1,000 bps | yes |

Evidence IDs are deduplicated. Slashed value is sent to the configured
`slash_destination`.

## Policy

Governance can update:

- selection and power modes
- active-set size, rebalance interval, and activation delay
- minimum self/total bond and maximum commission
- churn and replacement margin
- unbonding period
- manual override posture
- slash destination and evidence penalties

Policy changes affect validator economics and membership safety. Rehearse them
on a private network and verify the resulting active set and reward routing.

## Related Pages

- [Becoming a Validator](/node/validators)
- [Validator Operations Runbook](/node/validator-operations-runbook)
- [Protocol Governance](/node/protocol-governance)
