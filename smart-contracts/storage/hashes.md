# Hashes & Multihashes

`Hash` stores keyed state.

## Declaration

```python
balances = Hash(default_value=0)
metadata = Hash()
```

## Basic Access

```python
balances["alice"] = 100
balance = balances["alice"]
```

## Multi-Dimensional Keys

Hashes support tuple keys:

```python
allowances["alice", "dex"] = 500
amount = allowances["alice", "dex"]
```

The runtime allows up to 16 key dimensions.

## Collection Helpers

```python
balances.all()
balances.all("alice")
balances.clear()
balances.clear("alice")
```

## Clone Another Hash

Use `clone_from(...)` when you want a one-time snapshot of another `Hash` or
`ForeignHash`:

```python
legacy_balances = ForeignHash(
    foreign_contract="con_legacy_token",
    foreign_name="balances",
)

balances = Hash(default_value=0)

@construct
def seed():
    balances.clone_from(legacy_balances)
```

`clone_from(...)` clears the target hash first, then copies the stored entries
from the source. After the clone, the new hash is local state and can be
updated independently.

## Key Rules

- keys are converted to strings
- `.` and `:` are not allowed inside key parts
- slices are not allowed
- keys longer than `1024` characters are rejected
- `key in hash` is intentionally unsupported; read the key and compare against
  your chosen default / sentinel value instead

## When to Use

Use `Hash` for mappings, registries, ledgers, and sparse structured state.

## Scan order and limits

`all()` returns values in lexicographic order of their full stored keys (UTF-8
byte order). Numeric-looking key parts sort as strings: `"10"` precedes `"2"`.
Pending writes override committed values; deleted entries are omitted. Cache
warming and the order in which entries were written do not affect the result.
Static and function-local `ForeignHash` scans use the same ordering.

Native scans charge storage reads as entries are consumed. Scanning stops on
chi exhaustion and enforces a 128 KiB cumulative encoded key/value budget.
An oversized scan fails the transaction instead of returning a partial list.
Keep large collections partitioned by key prefix and avoid scanning an
unbounded collection within a transaction.
