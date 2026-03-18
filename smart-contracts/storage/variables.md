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

## Defaults

If nothing has been written yet, `.get()` returns the declared
`default_value`, or `None` if no default was supplied.

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
