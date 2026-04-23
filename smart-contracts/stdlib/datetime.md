# Datetime

The runtime injects a deterministic `datetime` module and the `now` environment
variable.

## Available Types

```python
datetime.datetime(...)
datetime.datetime.strptime(...)
datetime.timedelta(...)
datetime.WEEKS
datetime.DAYS
datetime.HOURS
datetime.MINUTES
datetime.SECONDS
```

## Example

```python
unlock_at = Variable()

@construct
def seed():
    unlock_at.set(now + datetime.DAYS * 7)

@export
def withdraw():
    assert now >= unlock_at.get(), "Too early"
```

## Policy Examples

The meaning of `now` stays the same across all networks. What changes is
whether chain time advances while the network is idle.

On an `on_demand` network:

- no idle blocks are produced
- `now` does not move until another block is created

On a `periodic` network with `10s` empty blocks:

- chain time advances roughly every 10 seconds
- deadlines can expire even if no user transactions are submitted

That means contracts should treat time as a condition checked during execution,
not as a background scheduler.

## Notes

- `now` comes from block context, not local wall-clock time
- `now` is the finalized consensus block timestamp
- every transaction in the same block sees the same `now`
- the exposed `Datetime` and `Timedelta` types are restricted runtime wrappers
- these types are also valid for exported-function annotations
