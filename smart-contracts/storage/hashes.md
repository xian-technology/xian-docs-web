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

## Key Rules

- keys are converted to strings
- `.` and `:` are not allowed inside key parts
- slices are not allowed
- oversized keys are rejected

## When to Use

Use `Hash` for mappings, registries, ledgers, and sparse structured state.
