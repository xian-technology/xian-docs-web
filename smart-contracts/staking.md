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

## Integration Checks

Before accepting a pool in an application:

- confirm `get_contract_status()["reward_model"] == "annualized_v1"`
- show the annualized formula and exact lock duration during pool review
- verify the pool has enough available rewards before asking a user to stake
- monitor per-token liabilities and recoverable excess independently
- treat pause and owner controls as operational privileges, not access to user
  liabilities
