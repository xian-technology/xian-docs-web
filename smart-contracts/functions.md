# Functions

Xian contracts use three function categories:

- exported functions with `@export`
- one optional constructor with `@construct`
- undecorated private helpers

## Exported Functions

Exported functions define the external contract API.

```python
@export
def transfer(amount: decimal, to: str):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

V2 checks numeric arguments and returns on every export. Enable full annotation checking with `typecheck=True`.

```python
@export(typecheck=True)
def calculate(limit: decimal) -> str:
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
    price: decimal,
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
- `decimal`
- `bool`
- `bytes`
- `bytearray`
- `dict`
- `list`
- `set`
- `frozenset`
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

An exported decimal parameter accepts a decimal or an exactly representable integer. An integer parameter accepts integers. The source default in `rate: decimal = 0.1` is exactly one tenth. See [Numbers, division and rounding](/smart-contracts/numbers).

### Return Annotations

Return values are allowed, and exported functions may also use return type
annotations when the annotation is one of the same whitelisted types.

```python
@export
def summarize(items: list[int]) -> dict[str, int]:
    return {"count": len(items)}
```

Invalid return annotations fail linting:

```python
# BAD: custom types are not allowed in export signatures
@export
def balance_of(address: str) -> Decimal:
    return balances[address]
```

Use `-> decimal` for user-facing decimal amounts. Do not annotate exported
signatures with Python `Decimal`.

### Return Values

Returned values are included in the execution result. They are not persisted
unless you also write them to state.

```python
@export
def owner_of_contract() -> str:
    return owner.get()
```

Calls between contracts exchange native values. The wire representation of a decimal result is a tagged canonical string. Python and JavaScript clients decode it into their SDK-specific result types.

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
def ensure_nonnegative(amount):
    assert amount >= 0, "Amount must be non-negative"

@export
def approve(amount: decimal, to: str):
    ensure_nonnegative(amount)
    approvals[ctx.caller, to] = amount
```

They are not callable through transactions or by other contracts.

## Local Names and Comprehensions

Parameters and names assigned anywhere in a function are local to that function.
Reading a local name before it has been assigned fails, even when a module-level
variable, runtime module or builtin has the same name. Assignments in an untaken
branch or an empty loop still make the name local.

```python
@export
def choose(flag: bool):
    if flag:
        result = 7
    return result  # Fails when flag is False: result has not been assigned.
```

Initialize a local value before a conditional when every path needs it. Rebinding
a name such as `len` or `datetime` also shadows the builtin or runtime module
throughout that function; use a different local name when both are needed.

List and dictionary comprehensions have their own local target names. Their first
iterable is evaluated in the enclosing scope, and their targets do not overwrite
names in that scope. Later generators and filters use the comprehension scope,
so reading a later generator's target before its first assignment also fails.

## Assertions

`assert` is the normal validation mechanism:

```python
@export
def withdraw(amount: decimal):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
```

Failed assertions:

- abort execution
- roll back writes and events from that transaction
- consume chi up to the failure point

## Disallowed Function Patterns

The function body has to obey the language restrictions:

- no nested functions
- no classes
- no `try/except`
- no `lambda`
- no `async`
- no generators or `yield`
- no context managers

See [Valid Code & Restrictions](/smart-contracts/valid-code) for the full
linting surface.
