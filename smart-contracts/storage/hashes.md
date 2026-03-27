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

The runtime currently allows up to 16 key dimensions.

## Collection Helpers

```python
balances.all()
balances.all("alice")
balances._items()
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
- oversized keys are rejected

## When to Use

Use `Hash` for mappings, registries, ledgers, and sparse structured state.
