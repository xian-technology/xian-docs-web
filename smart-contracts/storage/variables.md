# Variables

`Variable` stores one persistent value for a contract.

## Declaration

```python
owner = Variable()
counter = Variable(default_value=0)
typed_owner = Variable(t=str)
```

## Read and Write

```python
owner.set(ctx.caller)
current_owner = owner.get()
```

For mutable top-level values, `Variable` also supports collection-style helpers:

```python
settings = Variable(default_value={})
queue = Variable(default_value=[])

@export
def configure(mode: str):
    settings["mode"] = mode

@export
def enqueue(item: str):
    queue.append(item)
```

Supported top-level helpers include:

- dict-style `variable[key]`, `variable[key] = value`, and `del variable[key]`
- `update(...)`, `pop(...)`, and `clear()` for dict values
- list-style index assignment like `queue[0] = value`
- `append(...)`, `extend(...)`, `insert(...)`, `remove(...)`, `pop(...)`, and
  `clear()` for list values

## Defaults

If nothing has been written yet, `.get()` returns the declared
`default_value`, or `None` if no default was supplied.

For mutable values like `list` and `dict`, `.get()` returns a defensive copy.
That means in-place edits to the object returned by `.get()` are not persisted
unless you write the whole value back with `.set(...)`.

## Type Enforcement

If you pass `t=...`, writes are checked with `isinstance(...)`:

```python
name = Variable(t=str)
name.set("alice")   # ok
```

## When to Use

Use `Variable` when the contract owns exactly one value, such as:

- owner address
- total supply
- current counter
- configuration flag

Use a mutable `Variable(default_value={})` or `Variable(default_value=[])` when
the contract owns one top-level configuration object or queue-like list.
