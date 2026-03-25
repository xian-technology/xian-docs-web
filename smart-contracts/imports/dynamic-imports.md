# Dynamic Imports

Use dynamic imports when the target contract name is not hard-coded:

```python
token = importlib.import_module("con_token")
token.transfer(amount=100, to="bob")
```

If both the contract name and the exported function name are only known at
runtime, use `importlib.call(...)` instead of generic reflection:

```python
return importlib.call(
    contract_name,
    "balance_of",
    {"account": account},
)
```

If you need to probe before calling, use the read-only helpers:

```python
if importlib.exists(contract_name) and importlib.has_export(
    contract_name,
    "balance_of",
):
    return importlib.call(
        contract_name,
        "balance_of",
        {"account": account},
    )
```

If you only need ownership metadata or an interface check, you can also pass
the contract name directly:

```python
owner = importlib.owner_of(contract_name)
ok = importlib.enforce_interface(contract_name, expected_interface)
```

## When to Use It

- plugin-style architectures
- configurable token or market contracts
- governance-selected implementation contracts
- registry-driven dynamic dispatch

## Security Model

`importlib.call(...)` only resolves exported contract functions. It does not
expose generic `getattr(...)` style access to private functions or module
attributes.

`importlib.exists(...)` and `importlib.has_export(...)` are the intended probe
surface for dynamic dispatch. They let contracts validate targets without
opening generic module reflection.

## Caution

Dynamic imports increase flexibility but also increase the need for interface
validation and access-control discipline.
