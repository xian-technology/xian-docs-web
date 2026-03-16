# Foreign Variables & Hashes

`ForeignVariable` and `ForeignHash` let you **read** another contract's state without importing it. They are strictly read-only — you cannot write through them.

## ForeignVariable

Read another contract's `Variable`:

```python
foreign_owner = ForeignVariable(
    foreign_contract="currency",
    foreign_name="owner"
)

@export
def check_currency_owner():
    return foreign_owner.get()  # reads currency.owner
```

### Methods

- `get()` — Read the foreign variable's value
- `set()` — **Raises `ReferenceError`** (read-only)

## ForeignHash

Read another contract's `Hash`:

```python
foreign_balances = ForeignHash(
    foreign_contract="currency",
    foreign_name="balances"
)

@export
def check_balance(account: str):
    return foreign_balances[account]  # reads currency.balances:account
```

### Methods

- `__getitem__(key)` — Read a hash entry: `foreign_balances["alice"]`
- `__setitem__(key, value)` — **Raises `ReferenceError`** (read-only)
- `clear()` — **Raises `Exception`** (read-only)

Multi-dimensional keys work the same as regular Hashes:

```python
foreign_approvals = ForeignHash(
    foreign_contract="currency",
    foreign_name="approvals"
)

@export
def check_approval(owner: str, spender: str):
    return foreign_approvals[owner, spender]
```

## When to Use Foreign vs Import

| Approach | Read State | Call Functions | Safety |
|----------|-----------|----------------|--------|
| `ForeignVariable` / `ForeignHash` | Yes | No | Cannot trigger side effects |
| `import contract` | Yes (via calls) | Yes | Runs foreign code |

Use `Foreign*` when you only need to read another contract's state and don't want to execute any of its code. This is safer because no foreign code runs — you're reading raw storage directly.

Use `import` when you need to call another contract's functions (e.g., `currency.transfer(...)`).

## Example: Price Oracle Consumer

```python
# Read the oracle's price data without importing the oracle contract
oracle_prices = ForeignHash(
    foreign_contract="con_price_oracle",
    foreign_name="prices"
)

@export
def get_price(pair: str):
    price = oracle_prices[pair]
    assert price is not None, f"No price for {pair}"
    return price
```
