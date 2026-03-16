# Datetime

The `datetime` module provides time and duration handling for contracts. The current block time is available as `now`.

## Datetime

### Creating a Datetime

```python
import datetime

dt = datetime.datetime(year=2025, month=3, day=16, hour=14, minute=30, second=0)
```

### Properties

| Property | Type |
|----------|------|
| `dt.year` | int |
| `dt.month` | int |
| `dt.day` | int |
| `dt.hour` | int |
| `dt.minute` | int |
| `dt.second` | int |
| `dt.microsecond` | int |

### Comparisons

```python
@export
def is_past_deadline(deadline: datetime.datetime):
    return now > deadline
```

All comparison operators work: `<`, `<=`, `==`, `!=`, `>`, `>=`.

### Subtraction

Subtracting two Datetimes returns a Timedelta:

```python
@export
def time_since_launch(launch: datetime.datetime):
    elapsed = now - launch
    return elapsed.days
```

### Using `now`

The `now` variable is the block timestamp — agreed upon by validators and identical for all transactions in the same block.

```python
last_action = Variable()

@export
def do_something():
    assert now - last_action.get() > datetime.timedelta(hours=1), "Too soon"
    last_action.set(now)
```

## Timedelta

### Creating a Timedelta

```python
import datetime

one_week = datetime.timedelta(weeks=1)
two_days = datetime.timedelta(days=2)
one_hour = datetime.timedelta(hours=1)
thirty_min = datetime.timedelta(minutes=30)
ten_sec = datetime.timedelta(seconds=10)
```

### Convenience Constants

```python
datetime.WEEKS    # timedelta(weeks=1)
datetime.DAYS     # timedelta(days=1)
datetime.HOURS    # timedelta(hours=1)
datetime.MINUTES  # timedelta(minutes=1)
datetime.SECONDS  # timedelta(seconds=1)
```

### Properties

| Property | Returns |
|----------|---------|
| `td.seconds` | Total duration in seconds |
| `td.minutes` | Total duration in minutes |
| `td.hours` | Total duration in hours |
| `td.days` | Total duration in days |
| `td.weeks` | Total duration in weeks |

### Arithmetic

```python
# Add timedelta to datetime
unlock_time = now + datetime.timedelta(days=7)

# Add timedeltas
total = datetime.timedelta(days=1) + datetime.timedelta(hours=12)

# Multiply
triple = datetime.timedelta(hours=1) * 3
```

## Example: Time-Locked Vault

```python
import datetime

balances = Hash(default_value=0)
locks = Hash()  # stores unlock datetime

@export
def deposit(amount: float):
    balances[ctx.caller] += amount

@export
def lock(duration_days: int):
    assert balances[ctx.caller] > 0, "Nothing to lock"
    locks[ctx.caller] = now + datetime.timedelta(days=duration_days)

@export
def withdraw(amount: float):
    unlock = locks[ctx.caller]
    if unlock is not None:
        assert now >= unlock, "Funds are still locked"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
```
