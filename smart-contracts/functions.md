# Functions

Xian contracts support three kinds of functions: exported (public), constructor, and private.

## Exported Functions (`@export`)

Exported functions are the contract's public API. They can be called by transactions or by other contracts.

```python
@export
def transfer(to: str, amount: float):
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

### Type Annotations

All arguments to `@export` functions **must** have type annotations. This is enforced by the linter.

Allowed types:
- `str`, `int`, `float`, `bool`
- `dict`, `list`
- `datetime.datetime`, `datetime.timedelta`
- `Any` (accepts anything)

```python
@export
def create_order(item: str, quantity: int, price: float, metadata: dict):
    pass
```

Return type annotations are **not allowed**:

```python
# BAD — linter error E018
@export
def get_balance(addr: str) -> float:
    return balances[addr]

# GOOD
@export
def get_balance(addr: str):
    return balances[addr]
```

### Return Values

Functions can return values. The return value is included in the transaction result but is not stored on-chain.

```python
@export
def get_balance(addr: str):
    return balances[addr]
```

## Constructor (`@construct`)

Runs exactly once when the contract is deployed. Use it to initialize state.

```python
@construct
def seed(initial_supply: int):
    balances[ctx.caller] = initial_supply
    total_supply.set(initial_supply)
    owner.set(ctx.caller)
```

- Only one `@construct` per contract
- Constructor arguments are passed during contract submission
- Constructor arguments do not require type annotations
- After execution, the constructor is renamed internally and becomes uncallable

## Private Functions

Functions without a decorator are private. They are only callable from within the same contract.

```python
def calculate_fee(amount):
    """Private — only callable within this contract."""
    return amount * 0.01

@export
def transfer_with_fee(to: str, amount: float):
    fee = calculate_fee(amount)
    balances[ctx.caller] -= (amount + fee)
    balances[to] += amount
    balances["treasury"] += fee
```

Private functions:
- Do not require type annotations
- Are name-mangled with a `__` prefix (e.g., `calculate_fee` becomes `__calculate_fee`)
- Cannot be called from other contracts or external transactions
- Cannot be nested inside other functions (linter error E019)

## Assertions

Use `assert` for input validation and access control. A failed assertion reverts all state changes and consumes stamps.

```python
@export
def withdraw(amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
```

The assert message is returned in the transaction result for debugging.

## Forbidden Patterns

The following are not allowed in any function:

- **Nested functions** — no `def` inside `def`
- **Lambda expressions** — no `lambda`
- **Classes** — no `class`
- **Try/except** — no exception handling (use `assert` instead)
- **Async/await** — no async functions
- **Yield/generators** — no `yield` or generator expressions
- **With statements** — no context managers
- **Closures** — no capturing variables from outer scopes

See [Valid Code](/smart-contracts/valid-code) for the complete list.
