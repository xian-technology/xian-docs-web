# Time & Block Policy

Xian contracts do not see local wall-clock time. They see chain time.

## What `now` Means

The `now` variable exposed to contracts is derived from the finalized CometBFT
block timestamp agreed by consensus.

- every validator sees the same `now` for a given block
- every transaction in the same block sees the same `now`
- `now` is UTC-based chain time, not the machine time of the validator

Consensus stores the timestamp as integer seconds and nanoseconds. Xian converts
it to a UTC contract datetime with microsecond precision, discarding the
remaining submicrosecond digits without rounding. For example, a consensus
fraction of `.123456789` seconds becomes `.123456` in contract `now`. This
conversion uses integer arithmetic and does not depend on the validator's time
zone.

This is why time-based contract logic can be deterministic. A block timestamp
tracks consensus time and can lag the external clock. See
[Block Time](/concepts/consensus#block-time) for its source.

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
The interval configures empty-block scheduling, not an exact finalized-block
time target. Consensus timeouts, transaction execution, validator availability
and network delays also affect observed cadence.

| Policy | Idle empty blocks | Does chain time advance while idle? |
| --- | --- | --- |
| `on_demand` | no | no |
| `idle_interval` | after interval | yes |
| `periodic` | yes | yes |

Contracts remain deterministic under all three because `now` comes from
the finalized block header.

## Financial Timer Anchors

A minimum holding or challenge period for newly received funds starts from a
fresh successor checkpoint. The first block after an idle gap can carry a stale
BFT timestamp, followed by a large jump; adding a period to that request block's
`now` does not establish the intended minimum hold.

Maintained application packages that declare `time_checkpoints` use its
canonical protocol-1 service and a matching node keeper. Before custody, the
consumer checks the service version, calls `request_anchor()` and verifies that
the returned positive height is its current `block_num`. The node automatically
records an immutable VM timestamp for that requested height in a later block.
`get_anchor(height)` returns `None` until that work is complete. Readiness is
required before the service accepts a request; an unsupported runtime fails
closed before custody.

Consumers keep pending positions locked and derive their start from the recorded
anchor. Optional materialization helpers cache that exact timestamp; a delayed
caller cannot choose a later start or reset an existing one. Applications read
readiness through current direct contract/RPC views. BDS index height, zero lag
or reindexing does not imply that keeper anchors or unbond maturity are current;
see [BDS Consistency](/api/bds#consistency).

A pending name lease has `get_expiry_time(name) == None` while
`get_owner(name)` remains valid. It cannot expire or be reassigned while its
anchor is pending. Renewal uses the later of the existing expiry and the
successor anchor, plus the captured lease period.

The offline playground needs an explicit canonical-service/checkpoint fixture
for these node-dependent lifecycles; changing its height control alone does not
run the node keeper.

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

In the XSC-0002 permit authorizer, a permit is valid only if the inclusion
block satisfies:

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

Even with `create_empty_blocks = false`, CometBFT may produce a proof
block after state changes so the updated `app_hash` appears in a committed
header. That is a consensus/proof requirement, not a separate wall-clock timer.
