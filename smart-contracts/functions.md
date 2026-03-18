# Functions

Xian contracts use three function categories:

- exported functions with `@export`
- one optional constructor with `@construct`
- undecorated private helpers

## Exported Functions

Exported functions define the external contract API.

```python
@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

### Argument Annotations

Every exported argument must be annotated:

```python
@export
def create_order(item: str, quantity: int, price: float, metadata: dict):
    orders[item] = {
        "quantity": quantity,
        "price": price,
        "metadata": metadata,
    }
```

Allowed annotation types:

- `str`
- `int`
- `float`
- `bool`
- `dict`
- `list`
- `Any`
- `datetime.datetime`
- `datetime.timedelta`

### Return Annotations

Return values are allowed, and exported functions may also use return type
annotations when the annotation is one of the same whitelisted types.

```python
@export
def balance_of(address: str) -> float:
    return balances[address]
```

Invalid return annotations still fail linting:

```python
# BAD: custom types are not allowed in export signatures
@export
def balance_of(address: str) -> Decimal:
    return balances[address]
```

### Return Values

Returned values are included in the execution result. They are not persisted
unless you also write them to state.

```python
@export
def owner_of_contract() -> str:
    return owner.get()
```

## Constructor

The constructor runs once when the contract is submitted:

```python
@construct
def seed(initial_supply=1_000_000):
    owner.set(ctx.caller)
    balances[ctx.caller] = initial_supply
```

Use the constructor for:

- initial balances
- metadata defaults
- owner/operator assignment
- one-time configuration

## Private Helpers

Private helpers are internal utilities:

```python
def ensure_positive(amount):
    assert amount > 0, "Amount must be positive"

@export
def approve(amount: float, to: str):
    ensure_positive(amount)
    balances[ctx.caller, to] = amount
```

They are not callable through transactions or by other contracts.

## Assertions

`assert` is the normal validation mechanism:

```python
@export
def withdraw(amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
```

Failed assertions:

- abort execution
- roll back writes and events from that transaction
- still consume stamps up to the failure point

## Disallowed Function Patterns

The function body still has to obey the language restrictions:

- no nested functions
- no classes
- no `try/except`
- no `lambda`
- no `async`
- no generators or `yield`
- no context managers

See [Valid Code & Restrictions](/smart-contracts/valid-code) for the full
linting surface.
