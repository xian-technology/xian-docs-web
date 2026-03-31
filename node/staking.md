# Staking Mechanics

Xian's validator economics are now explicit on-chain behavior, not just an
off-chain social process.

The canonical contracts are:

- `members.s.py`, submitted as `masternodes`
- `rewards.s.py`
- `governance.s.py`

`masternodes` owns validator registration, self-bonding, delegation, unbonding,
membership voting, and evidence-driven slashing. `rewards` defines the global
fee split, and the runtime uses `masternodes` state to distribute the validator
bucket.

## What Exists Today

The current canonical model includes:

- registration bonds for validator candidates
- self-bonding by validators
- delegation to validators
- explicit validator commission in basis points
- separate reward payout keys for validators and delegators
- unbonding queues with claim-after-unlock semantics
- governance votes for validator admission, removal, jailing, slashing, and
  policy changes
- system-driven evidence penalties for supported CometBFT misbehavior types

## Contract Surfaces

The main exported staking and validator-lifecycle functions are:

| Function | What it does |
| --- | --- |
| `register(...)` | creates a pending validator registration and escrows the registration bond |
| `update_registration(...)` | updates requested power and profile fields for a pending or approved candidate |
| `update_profile(...)` | updates reward routing and metadata for an active or approved validator |
| `announce_leave()` | starts the fixed leave-delay timer |
| `leave()` | exits after the leave delay, refunds registration bond, and unbonds stake into pending claims |
| `unregister()` | withdraws a pending / approved candidate before activation |
| `bond_self(amount)` | adds validator self-bond |
| `unbond_self(amount)` | removes self-bond into a pending unbond record |
| `delegate(validator, amount, reward_key=None)` | adds delegated stake to a validator |
| `undelegate(validator, amount)` | removes delegated stake into a pending unbond record |
| `claim_unbond(unbond_id)` | claims unlocked pending unbond funds |

Read surfaces relevant to staking include:

- `get_validator(account)`
- `get_active_validators()`
- `get_pending_candidates()`
- `get_delegation(delegator, validator)`
- `get_delegators(validator)`
- `get_pending_unbond(unbond_id)`
- `get_pending_unbond_ids(owner)`
- `get_reward_distribution_info(validator)`
- `get_policy_config()`

## Registration Bond vs Bonded Stake

There are two different value flows:

- the registration bond goes into `holdings[validator]`
- self-bond and delegations go into `self_bond` and `delegations`

That distinction matters operationally:

- the registration bond is refunded immediately on clean leave, governed
  removal, or unregister
- self-bond and delegations do not return immediately
- self-bond and delegations become `pending_unbond` records and must wait out
  the unbonding period before claim

## Bonding and Delegation Rules

The contract lets a validator accept bond only while it is:

- `pending`
- `active`
- `approved`

Bonding is closed when a validator is:

- jailed
- `leaving`
- `left`
- `removed`
- `withdrawn`

Additional rules:

- `bond_self()` cannot be used by a jailed validator
- `delegate()` cannot target a jailed validator
- self-delegation through `delegate()` is rejected; validators must use
  `bond_self()`
- delegation and self-bond amounts must be positive

## Reward Routing and Commission

Validator fee rewards are computed in two stages.

First, the runtime takes the validator bucket from the `rewards` contract split
and divides it across active validators by `validator_power`.

Second, each validator's share is split using `masternodes` state:

1. The validator's `commission_bps` is taken off the top.
2. The remainder is distributed pro rata across:
   - the validator's `self_bond`
   - every active delegation to that validator
3. The validator also receives its self-bond share of that remainder.

Reward routing keys:

- the validator share goes to `reward_key`, or the validator key if unset
- each delegator may set a per-validator reward key in `delegate(...)`
- if a delegator does not set one, rewards go to the delegator account itself

If a validator has no self-bond or delegations at all, its full validator share
is paid directly to the operator reward key.

## Pending Unbonds

`unbond_self()` and `undelegate()` do not transfer funds out immediately.
Instead they create a `pending_unbond` record with:

- `id`
- `owner`
- `validator`
- `amount`
- `kind` (`self_bond` or `delegation`)
- `created_block`
- `created_at`
- `unlock_at`
- `claimed`
- optional `reason`

`unlock_at` is derived from `unbonding_period_days` in the membership policy.
Current bundled networks pin this to `7`.

Claim rules:

- only the recorded `owner` can claim
- the record must not already be claimed
- `now` must be greater than or equal to `unlock_at`

## Exit Behavior

`announce_leave()` starts a fixed 7-day leave timer. That delay is separate
from the configurable unbonding period.

When `leave()` succeeds:

- the validator status becomes `left`
- the registration bond is refunded immediately
- `self_bond` is zeroed and turned into a pending unbond with reason `left`
- all live delegations are zeroed and turned into pending unbonds with reason
  `left`
- the validator is removed from the active set

The same bonding sweep happens for:

- `remove_member` votes, with reason `removed`
- `unregister()`, with reason `withdrawn`

That means validator exit has two clocks:

1. a fixed 7-day leave announcement delay for active validators
2. the configured unbonding delay before self-bond and delegations can be
   claimed

## Slashing

The membership contract supports governed slashing through
`type_of_vote="slash_member"` and system-driven evidence penalties.

Slash scope is broader than just live self-bond. A slash can apply pro rata
across:

- current validator self-bond
- current live delegations
- pending unbonds created after the infraction height

Slashed funds are transferred to `slash_destination`, which the bundled
networks currently set to `dao`.

## Evidence Penalties

The runtime submits evidence penalties internally during `finalize_block`
through `masternodes.apply_evidence_penalty(...)`. Normal users cannot call
that surface directly.

Supported infraction types today:

| Infraction | Default slash | Default jail |
| --- | --- | --- |
| `DUPLICATE_VOTE` | `500` bps | `true` |
| `LIGHT_CLIENT_ATTACK` | `1000` bps | `true` |

Current behavior:

- evidence is deduplicated by `evidence_id`
- if the validator is still known and jailing is enabled, the validator is
  jailed
- in non-manual selection modes, the validator set is rebalanced immediately
  after an applied evidence penalty
- pending unbonds are slashable only when the infraction height is less than or
  equal to the unbond's `created_block`

That last rule is important. If a validator commits an infraction first and
then exits or undelegates later, the resulting pending unbond can still be
slashed. If the infraction happened after the unbond was created, that pending
unbond is left untouched.

## Policy Surface

`update_policy` votes can change the validator-selection and staking policy at
runtime.

| Key | Meaning |
| --- | --- |
| `selection_mode` | `manual`, `auto_top_n`, or `hybrid` |
| `max_validators` | active-set cap in auto / hybrid modes |
| `power_mode` | `equal`, `requested`, or `stake_weighted` |
| `rebalance_interval` | blocks per rebalance epoch |
| `activation_delay_epochs` | epochs a candidate must wait before eligibility |
| `unbonding_period_days` | delay before pending unbonds can be claimed |
| `min_self_bond` | minimum self-bond required for eligibility |
| `min_total_bond` | minimum self-bond plus delegation required for eligibility |
| `max_commission_bps` | upper bound for validator commission |
| `max_active_set_churn` | max incumbent replacements per rebalance epoch |
| `min_bond_margin_bps` | extra bond margin a challenger must beat to replace an incumbent |
| `manual_override_enabled` | enables selected manual governance actions in non-manual modes |
| `slash_destination` | recipient of slashed stake |
| `duplicate_vote_slash_bps` | slash rate for duplicate vote evidence |
| `duplicate_vote_jail` | whether duplicate vote evidence jails |
| `light_client_attack_slash_bps` | slash rate for light-client attack evidence |
| `light_client_attack_jail` | whether light-client attack evidence jails |

## Membership Vote Types

`masternodes.propose_vote(...)` currently accepts these vote types:

- `add_member`
- `remove_member`
- `jail_member`
- `unjail_member`
- `slash_member`
- `set_member_power`
- `change_registration_fee`
- `reward_change`
- `dao_payout`
- `stamp_cost_change`
- `change_types`
- `update_policy`
- `topic_vote`

Vote semantics:

- only active validators can propose
- the proposer automatically records the first `yes`
- required approvals are snapshotted at proposal creation
- the current bundled policy stores both a 4/5 count threshold and a 4/5
  weight threshold
- approval is reached when `yes_weight` reaches the required weight threshold
- vote count still participates in reporting and early-rejection logic
- proposals expire after 7 days if still pending

In non-manual selection modes:

- `add_member` votes are allowed only in `hybrid`
- `remove_member`, `set_member_power`, `jail_member`, and `unjail_member`
  require `manual_override_enabled = true`
- `slash_member` remains available regardless of manual override policy

## Current Bundled Reality

The maintained `xian-configs` bundles currently pin:

- `selection_mode = "manual"`
- `power_mode = "equal"`
- `unbonding_period_days = 7`
- `manual_override_enabled = true`
- `duplicate_vote_slash_bps = 500`
- `light_client_attack_slash_bps = 1000`

So the current public model is still validator-vote admission and removal, but
the contract already supports automatic top-N selection, delegation-aware
ranking, delegated reward routing, and evidence-triggered slashing when a
network chooses to enable them.
