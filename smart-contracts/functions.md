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

By default, these annotations define the public interface and pass through the
linter, but they are not enforced automatically at runtime.

If a contract wants runtime enforcement, it can opt in on a per-function basis:

```python
@export(typecheck=True)
def calculate(limit: float) -> str:
    return "YES" if limit > 0.1 else "NO"
```

With `typecheck=True`, Xian checks annotated arguments before the function body
runs and checks the annotated return value before handing it back to the
caller.

### Argument Annotations

Every exported argument must be annotated:

```python
@export
def create_order(
    item: str,
    quantity: int,
    price: float,
    metadata: dict[str, int],
):
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

Subscripted container forms are also allowed when their base type is allowed,
for example:

- `list[int]`
- `dict[str, int]`
- `dict[str, list[int]]`

If `typecheck=True` is enabled, those nested container annotations are checked
recursively at runtime.

`float` is the normal annotation for decimal-backed numeric values in Xian.
Although the annotation says `float`, contract execution uses deterministic
`ContractingDecimal` values under the hood.

The same rule applies to opt-in runtime checks. A `float` annotation accepts
decimal-backed numeric values such as `ContractingDecimal`, as well as normal
Python `int` / `float` values from local testing.

That also applies to float literal default values in exported signatures, so a
default like `rate: float = 0.1` is compiled with the same deterministic
decimal semantics as any other float literal in contract code.

### Return Annotations

Return values are allowed, and exported functions may also use return type
annotations when the annotation is one of the same whitelisted types.

```python
@export
def summarize(items: list[int]) -> dict[str, int]:
    return {"count": len(items)}
```

Invalid return annotations still fail linting:

```python
# BAD: custom types are not allowed in export signatures
@export
def balance_of(address: str) -> Decimal:
    return balances[address]
```

Use `-> float` for user-facing decimal amounts. Do not annotate exported
signatures with Python `Decimal`.

### Return Values

Returned values are included in the execution result. They are not persisted
unless you also write them to state.

```python
@export
def owner_of_contract() -> str:
    return owner.get()
```

If a function returns a decimal-backed value, the caller receives a
`ContractingDecimal` result object.

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
