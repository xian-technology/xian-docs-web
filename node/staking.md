# Staking Mechanics

The on-chain `validators` contract owns registration bonds, self-bonding,
delegation, unbonding, commission, membership, and slashing. `rewards` defines
the global fee split; the runtime uses validator state to distribute the
validator portion.

## Registration Bond and Stake

These are different balances:

- the registration bond is escrowed in `holdings[validator]`
- self-bond and delegations contribute to the validator's bonded stake

Delegations form one pool per validator: `total_delegated` tokens owned by
`total_shares` shares. A delegator holds shares; `get_delegation` reports
their current value as `amount`. A slash lowers the pool's tokens, so every
delegation loses the same fraction without any per-delegator work.

On a clean leave, governed removal, or candidate withdrawal, the registration
bond is refunded immediately and the self-bond becomes a pending unbond.
Delegations stay in the exited validator's pool, which earns nothing. Each
delegator undelegates when it chooses. Once that exit's time anchor is finalized,
a later withdrawal uses its recorded exit window, including time already served;
it can be immediately claimable if that window has passed. The displayed
`left_at` remains the exit execution timestamp, not this successor anchor.

## Main Functions

| Function | Purpose |
| --- | --- |
| `register(...)` | create a pending candidate and escrow registration bond |
| `update_registration(...)` | update candidate power/profile fields |
| `update_profile(...)` | update active/approved reward and metadata fields |
| `bond_self(amount)` | add validator self-bond |
| `unbond_self(amount)` | create a pending self-unbond |
| `delegate(validator, amount, reward_key=None)` | delegate stake (buys pool shares) |
| `undelegate(validator, amount)` | burn the shares worth `amount` and create a pending delegation unbond |
| `claim_rewards(validator)` | pay the pending delegator reward to the reward key |
| `claim_unbond(id)` | claim an unlocked unbond |
| `get_delegation(delegator, validator)` | value, shares, pending reward and reward key |
| `get_pending_rewards(delegator, validator)` | what `claim_rewards` would pay |
| `announce_leave()` / `leave()` | planned validator exit |
| `unregister()` | withdraw an inactive candidate |

Bonding is closed for jailed, leaving, or terminal validators. Self-delegation
through `delegate()` is rejected; validators use `bond_self()`.

## Rewards and Commission

The checked-in genesis bundles configure the fee split for paid transactions
as:

| Recipient bucket | Default share |
| --- | ---: |
| validators | 70% |
| burn | 0% |
| foundation | 0% |
| contract developers | 30% |

The on-chain value is ordered as `[validators, burn, foundation, developers]`.
Each ratio must be non-negative and the four ratios must sum to one. The
runtime pays no rewards (and burns the fee) for a split whose paid ratios are
negative or exceed one in total, and never pays out more than the fee: shares
are truncated and the dust is burned with the burn share
([Chi](/concepts/chi)). Active
validators can change the split through a `reward_change` governance vote, so a
network may later enable burn or foundation funding without a runtime upgrade.

Developer rewards are attributed across the contracts used by a transaction,
weighted by their execution cost. If a contract has no claimable developer or
uses the system developer identity, that contract's developer amount returns to
the validator reward bucket rather than going to the foundation.

A failed transaction's fee is split the same way, except that the whole
developer share returns to the validator reward bucket: a failed call earns no
developer reward. When the sender cannot cover the failure fee, the split
applies to the balance it was charged.

The runtime first divides the validator reward bucket by active voting power.
For each validator:

1. commission (capped at the policy's `max_commission_bps`) goes to the
   validator reward key
2. of the remainder, the self-bond's part also goes to the reward key, and the
   delegations' part to the validator's delegation pool
3. the pool's tokens are credited to the `validators` contract
   (`reward_pool[validator]`), and `reward_per_share[validator]` grows by
   their amount per share

If a validator has no bonded stake, its validator share goes to its reward key.

Delegators are paid lazily: a delegation's pending reward is its shares times
the growth of `reward_per_share` since its last change. `delegate`,
`undelegate` and `claim_rewards` pay it out to the delegation's reward key
(event `DelegatorRewardClaimed`). Each transaction's reward work and receipt
grow with the number of active validators, never with the number of
delegators: a receipt has one `validator_reward` and at most one
`delegator_pool_reward` record per active validator. All amounts are rounded
down at 30 decimal places, so the pool never owes more than it holds; the
rounding dust stays in the pool.

## Unbonding

An unbond record stores owner, validator, amount, kind, creation block/time,
the captured unbonding period, unlock time, reason, and claimed state. Later
policy changes do not shorten the captured period. A positive unbonding period starts from a time anchor set automatically in a later finalized
block, rather than the request block's potentially stale post-idle timestamp.
Until that anchor is set, `unlock_at` is `null` and `claim_unbond` fails with
`Unbond time anchor pending.` Do not calculate a replacement unlock from
`created_at` or a local clock. Automatic anchor processing is bounded, so queued
records can require additional blocks before an unlock time appears. A zero-day
policy intentionally makes the unbond immediately eligible at chain `now`.

Only its owner can claim after an unlock time exists and `now >= unlock_at`,
once its validator has no pending penalty jobs. A pending penalty holds every
unbond claim for that validator, including records whose creation height makes
them ineligible for that penalty. Those earlier records keep their amounts.

`next_unbond_unlock_at` is also nullable: a positive `pending_unbond_count` with
no next unlock means records are waiting for a time anchor. A non-null next
unlock describes the earliest dated record, not every pending record. Check
each record's own `unlock_at` before claiming.

The checked-in local/dev/test bundles use a 7-day unbonding period. The draft
mainnet rehearsal bundle uses 14 days. The policy active on the target chain is
authoritative.

`unbonding_period_days` must be an integer from 0 through 106750. The upper
bound keeps the period plus one retention day within CometBFT's duration range.

Active validators also have a fixed leave-announcement delay before `leave()`.
An announcement preserves active eligibility during that delay; ordinary stake
ranking, jail and minimum-bond rules can still remove a validator from selection.
After leave, removal, or withdrawal, stake follows the normal unbonding clock.

## Slashing and Evidence

Governance can slash a validator. The runtime can also apply supported
CometBFT evidence during block finalization.

Fresh genesis gives evidence a time window of at least the seeded unbonding
period plus one day. Mainnet's 14-day unbonding therefore starts with at least
15 days of evidence retention. Existing larger evidence settings are preserved.

Increasing the unbonding period raises a committed retention target to cover
the greatest required period observed, including successful intermediate
policy changes within one block. The authenticated schedule records a base
duration, a growth-start timestamp and that target. At a finalized block
timestamp, the effective duration is the smaller of the target and the base
plus elapsed consensus time since growth started. This keeps the historical
expiry cutoff from moving backwards and covers new infractions during the
increase.

A higher target first evaluates the existing schedule at that block's timestamp
and starts the next schedule there. Time spent idle before the increase cannot
be banked as immediate growth. Reducing the policy does not lower the time
retention target or shorten existing unbonds. The configured base block-age limit and
evidence-byte cap stay fixed.

The committed policy also records `security_checkpoint_height`,
`security_checkpoint_nanos` and nullable `previous_security_checkpoint_height`.
A previous height of zero is valid; it is distinct from no previous checkpoint.
At height `H`, the effective block-age limit is the greater of the configured
base and `H` minus the oldest protected checkpoint height. This keeps
still-live pre-jump infractions inside the height window while their fresh
challenge horizon is served. The effective block-age limit can grow or decrease as an old floor
is safely retired; it is not a change to the configured base.

A checkpoint rotates at most once per finalized block, only after actual
consensus time since the current checkpoint reaches the retention target.
Target increases are applied first. A long idle gap does not synthesize missed
rotations and discard the protected floor. The duration-growth fields change
when their target increases; checkpoint fields change at these actual-time
rotations. Neither mechanism writes an application clock on every block, so a
pending increase does not itself force a repeated idle proof-block loop.
Block production follows the configured
[block policy](/concepts/time-and-blocks); no timer executes in the background.

CometBFT expires evidence only after both its block age and its time age exceed
their limits. A block-count pruning setting is therefore not a substitute for
the committed time window. A full node-store snapshot must preserve the
historical consensus data needed for the complete live evidence window,
including its security checkpoints. Application state alone is insufficient; see
[Bootstrap and Snapshots](/node/configuration#bootstrap-and-snapshots).

Slashable value can include self-bond, the delegation pool, and pending
unbonds created at or after the infraction height. This prevents a validator or
delegator from escaping a known earlier infraction by unbonding. Rewards a
delegator already earned stay claimable. A fully slashed pool refuses new
delegations; its holders leave with
`undelegate(validator, 0)`.

Checked-in development bundles apply these defaults:

| Evidence | Slash | Jail |
| --- | ---: | --- |
| duplicate vote | 500 bps | yes |
| light-client attack | 1,000 bps | yes |

Evidence IDs are deduplicated. Slashed value is sent to the configured
`slash_destination`.

Penalties that include pending unbonds progress across blocks through the
canonical `validator_penalties` coordinator. The configured evidence jail
takes effect immediately, except for the last active validator. Stake changes,
registration, exits, unjailing, and unbond claims for the affected validator
wait until its pending jobs finish; earned reward claims remain available.
Live-only penalties complete synchronously.

The runtime advances one shared maximum of 32 work units per block. Collection
and debit passes each visit pending records in creation order. The live
self-bond and delegation-pool debit commits as one work unit. Progress is part
of chain state, so a restart resumes the stored cursor. Final payment and
completion commit together, and later jobs compound the earlier results.

An asynchronous penalty result identifies its `job_id`.
`validator_penalties.get_pending_slash_job(job_id)` reports its phase, cursor,
allocated slash escrow, and final `slash_amount`. A validator record exposes
`pending_slash_count`. Operators should wait for a completed job before
reconciling its final payment or retrying a held withdrawal.

Slash debits use cumulative proportional rounding in deterministic participant
order. Successive cumulative targets preserve the total slash without making
any participant's bonded or unbonding balance negative. A penalty that rounds
to zero records no token transfer.

## Policy

Governance can update:

- selection and power modes
- active-set size, rebalance interval, and activation delay
- minimum self/total bond and maximum commission
- churn and replacement margin
- unbonding period
- manual override posture
- slash destination and evidence penalties

The minimum self/total bond applies in every mode: an `add_member` proposal
is refused (and an open one rejected) while the candidate is below it, and
automatic selection skips such accounts. The churn limit counts every
newcomer a rebalance admits, whether it fills an empty seat or replaces an
incumbent.

The mainnet bundle starts in `manual` mode with `min_self_bond = 100000` and
`min_total_bond = 500000`. Moving to `hybrid` or `auto_top_n` is one
`update_policy` vote; its finalization rebalances at once, so validators that
should stay must meet the minimum bond first (a switch that would leave no
active validator cannot finalize). Switch only with a full set of bonded
validators: empty seats are filled one per rebalance without any stake
comparison, while a full set only admits newcomers that outbond an incumbent
by the replacement margin.

Policy changes affect validator economics and membership safety. Rehearse them
on a private network and verify the resulting active set and reward routing.

## Related Pages

- [Becoming a Validator](/node/validators)
- [Validator Operations Runbook](/node/validator-operations-runbook)
- [Protocol Governance](/node/protocol-governance)
