# Time & Block Policy

Xian contracts do not see local wall-clock time. They see chain time.

## What `now` Means

The `now` variable exposed to contracts is derived from the finalized CometBFT
block timestamp agreed by consensus.

- every validator sees the same `now` for a given block
- every transaction in the same block sees the same `now`
- `now` is UTC-based chain time, not the machine time of the validator

This is why time-based contract logic can be deterministic.

## Supported Block Policies

Xian supports three block-production policies:

### `on_demand`

```json
{
  "block_policy_mode": "on_demand",
  "block_policy_interval": "0s"
}
```

- no idle empty blocks
- chain time advances only when a new block is produced
- best fit for low-traffic networks that want blocks only when needed

### `idle_interval`

```json
{
  "block_policy_mode": "idle_interval",
  "block_policy_interval": "10s"
}
```

- no immediate empty blocks while idle
- if the chain stays idle long enough, an empty block is produced after the
  configured interval
- chain time can advance during idle periods, but only at the configured pace

### `periodic`

```json
{
  "block_policy_mode": "periodic",
  "block_policy_interval": "10s"
}
```

- scheduled empty blocks are enabled
- chain time keeps moving even with no user transactions
- best fit for networks that want steady block cadence

## What Changes Across Policies

The execution model does not change. Only idle-time progression changes.

| Policy | Idle empty blocks | Does chain time advance while idle? |
| --- | --- | --- |
| `on_demand` | no | no |
| `idle_interval` | after interval | yes |
| `periodic` | yes | yes |

Contracts remain deterministic under all three because `now` still comes from
the finalized block header.

## Contract Design Rules

Time in Xian should be used as a condition checked when a transaction executes,
not as a background scheduler.

Good patterns:

```python
assert now < deadline, "Permit expired"
assert now >= unlock_time.get(), "Too early"
```

```python
claimable_end = now if now < closes else closes
elapsed = claimable_end - begins
```

Bad assumptions:

- "this should happen automatically at 12:00 UTC"
- "the chain clock keeps moving even if nobody submits transactions"
- "a deadline is checked at mempool arrival time"

## Practical Examples

### Permit Deadlines

In the canonical `currency` contract, a permit is valid only if the inclusion
block still satisfies:

```python
assert now < deadline, "Permit has expired."
```

That means:

- signing at `11:59:59` does not guarantee success
- the transaction must be included before the deadline block time
- this is correct and deterministic

### Streaming Payments

Streaming payments accrue lazily:

```python
claimable_end_point = now if now < closes else closes
claimable_period = claimable_end_point - begins
```

Nothing runs in the background. Accrual is calculated when someone calls the
stream function in a later block.

### Governance Expiry

A proposal expiry like:

```python
votes[proposal_id, "expiry"] = now + datetime.timedelta(days=7)
```

means voting remains valid until a later transaction is executed in a block
whose `now` is past that expiry.

## Important Caveat

Even with `create_empty_blocks = false`, CometBFT may still produce a proof
block after state changes so the updated `app_hash` appears in a committed
header. That is a consensus/proof requirement, not a separate wall-clock timer.
