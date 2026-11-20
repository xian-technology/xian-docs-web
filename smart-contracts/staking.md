# Curated Multi-Token Staking

`xian-contracts/contracts/staking` is the maintained multi-pool staking
contract package. It is an optional application contract, separate from the
network's [validator staking and membership system](/node/staking).

Pool creators choose a stake token, reward token, annual percentage yield
(APY), fixed lock duration, position size, capacity, and optional entry-fee and
early-withdrawal settings.

## Annualized Reward Model

The contract identifies its reward model as `annualized_v1`. A position's
maximum reserved reward is:

```text
stake amount * (APY / 100) * (lock duration / 31,536,000)
```

This makes APY an annual rate rather than a flat reward paid for every lock.
Admission bounds are:

| Setting | Accepted range |
| --- | --- |
| APY | `0` through `100` |
| Lock duration | `3,600` through `31,536,000` seconds |

A stake is accepted only when the pool has enough unreserved deposited rewards
to reserve that position's maximum reward. Early unstaking scales the reserved
reward by elapsed time and applies the pool's configured principal penalty.

Funding tokens must expose `balance_of(address)`, `transfer(amount, to)`, and
`transfer_from(amount, to, main_account)`. Principal, reward deposits, and entry
fees are credited only after custody increases by the exact requested amount.
Fee-on-transfer or no-op incoming transfers revert without creating liabilities.

## Stake, Anchor, Then Unstake

The local bundle's `0.3.0` lifecycle depends on the canonical
`time_checkpoints` service and the node's automatic successor checkpoint work.
Use it with a matching node runtime. A missing service must fail closed; do not
replace it with local time or an application-owned clock.

`stake(pool_id)` transfers principal, applies entry fees, captures the pool terms
and reserves the maximum reward. The stored position records `created_block`
and initially has `start_time: null`. Its clock starts from the immutable
successor anchor recorded by the node, rather than the stake block's potentially
stale timestamp.

| Step | Contract call or check |
| --- | --- |
| Fund the position | Submit `stake(pool_id)` and wait for its committed result. Read `get_stake_info(pool_id, staker)`. |
| Wait for the anchor | The node records the successor checkpoint automatically. Check the position/reward view until the anchor is available; broadcast acceptance alone is insufficient. |
| Inspect progress | Use the resolved position start and `calculate_rewards(pool_id, staker)`, rather than the local clock or time a client first observed the position. |
| Settle | The staker calls `unstake(pool_id)` after the lock, or earlier only if the pool permits early withdrawal. Unstake resolves a ready anchor itself. |

`activate_stake(pool_id, staker)` is optional. Anyone may use it to materialize
the exact registry anchor once it is available. It does not choose the current
call time, move tokens, charge entry fees or reserve rewards again. Repeating
it cannot reset the clock. It respects the contract's paused state; it is not a
replacement for the canonical checkpoint service.

While the registry anchor is pending, the position/reward view remains pending,
`calculate_rewards` reports `activation_pending: true`, and no reward has accrued.
An unready `unstake` fails with `Stake activation pending.` even when early
withdrawal is otherwise allowed. Preserve a null start time in clients and show
it as pending; never substitute the stake request time, Unix epoch or local clock.

IDE and playground forms discover exported methods from the selected source
or deployed contract. The live node supplies automatic checkpoints; the offline
playground does not run that node driver merely because its block-height control
changes. A full offline lifecycle test needs an explicit canonical-service and
checkpoint fixture. Use a matching node for the integrated workflow.

The hub keeps source versions immutable. Import the accepted owner bundle as a
new version and select that version when opening source in the playground. Its
source-only handoff does not install runtime dependencies. Pin the deployed
source version and its matching runtime dependencies.

## Custody Liabilities

For each token, the contract tracks three protected balances:

- principal owed to active stakers
- deposited rewards not yet paid or returned
- entry fees and penalties owed to pool creators

`get_token_liability(token_contract)` returns the principal, reward, creator,
and total liability. `get_recoverable_excess(token_contract)` reports only the
unencumbered balance above that total:

```text
recoverable excess = max(contract balance - total liability, 0)
```

Even while paused, the contract owner cannot use
`emergency_withdraw_token(...)` to take protected principal, reward deposits,
or accrued creator funds. Emergency withdrawal is restricted to recoverable
excess, such as unsolicited token transfers.

Unstaking and creator-fee withdrawals settle their position, reservation,
statistics, and liabilities before token payouts. Each outgoing payment,
including excess recovery, must debit escrow and credit the recipient by the
exact amount. A short or excess transfer reverts the complete settlement.

## Integration Checks

Before accepting a pool in an application:

- confirm `get_contract_status()["reward_model"] == "annualized_v1"`
- verify the deployed source hash against the accepted bundle and discover
  the declared canonical `time_checkpoints` dependency and optional
  `activate_stake` helper; the reward-model label alone does not identify the
  position lifecycle API
- show the annualized formula and exact lock duration during pool review
- verify the pool has enough available rewards before asking a user to stake
- read activation readiness and timing from direct contract/RPC views; BDS
  index height or zero lag does not attest to automatic keeper state
- monitor per-token liabilities and recoverable excess independently
- treat pause and owner controls as operational privileges, not access to user
  liabilities
