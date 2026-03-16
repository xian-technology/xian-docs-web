# Variables

A `Variable` stores a single value that persists on-chain. Use it for scalars like an owner address, a total supply, or a configuration flag.

## Declaration

```python
owner = Variable()
total_supply = Variable()
is_paused = Variable()
```

Variables are declared at module level. The compiler automatically injects the contract name and variable name — you just call `Variable()`.

### With Default Value

```python
counter = Variable(default_value=0)
```

If the variable has never been set, `get()` returns `default_value` instead of `None`.

### With Type Constraint

```python
owner = Variable(t=str)
```

If `t` is set, calling `set()` with a value of the wrong type raises an `AssertionError`.

## Methods

### `set(value)`

Store a value.

```python
@construct
def seed():
    owner.set(ctx.caller)
    total_supply.set(1_000_000)
    is_paused.set(False)
```

### `get()`

Retrieve the stored value. Returns `None` (or `default_value`) if never set.

```python
@export
def get_owner():
    return owner.get()
```

## Example

```python
owner = Variable()
total_supply = Variable(default_value=0)

@construct
def seed():
    owner.set(ctx.caller)
    total_supply.set(1_000_000)

@export
def mint(amount: int):
    assert ctx.caller == owner.get(), "Only owner can mint"
    total_supply.set(total_supply.get() + amount)

@export
def get_supply():
    return total_supply.get()
```
