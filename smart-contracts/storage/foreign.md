# Foreign Variables & Hashes

Foreign storage gives one contract read-only access to another contract's
state.

## Declaration

```python
token_balances = ForeignHash(
    foreign_contract="currency",
    foreign_name="balances",
)

token_owner = ForeignVariable(
    foreign_contract="currency",
    foreign_name="owner",
)
```

## Behavior

- reads behave like the underlying local primitive
- writes are rejected
- this is for composition, not shared mutable state
- if you need a local snapshot, create a normal `Hash` and call
  `local_hash.clone_from(foreign_hash)`

## Why It Exists

Foreign storage is useful when:

- a contract needs to inspect canonical token balances
- governance logic depends on another contract's stored state
- you want to avoid copying state into a second contract

For behavior changes, use exported functions and explicit cross-contract calls.

## Snapshot Copy Pattern

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

This copies the current stored entries into `balances`. Future writes to the
source contract do not update the cloned hash automatically.
