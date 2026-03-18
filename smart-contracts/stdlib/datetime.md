# Datetime

The runtime injects a deterministic `datetime` module and the `now` environment
variable.

## Available Types

```python
datetime.datetime(...)
datetime.timedelta(...)
datetime.DAYS
datetime.HOURS
datetime.MINUTES
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

## Notes

- `now` comes from block context, not local wall-clock time
- the exposed `Datetime` and `Timedelta` types are restricted runtime wrappers
- these types are also valid for exported-function annotations
