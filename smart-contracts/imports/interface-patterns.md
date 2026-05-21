# Interface Patterns

`importlib.enforce_interface(...)` lets a contract validate another contract's
shape before using it. The first argument can be either an imported contract
module or a contract name string.

## Example

```python
token = importlib.import_module("con_token")

ok = importlib.enforce_interface(
    token,
    [
        importlib.Func("transfer", args=("amount", "to")),
        importlib.Var("balances", Hash),
    ],
)

assert ok, "Token does not satisfy the expected interface"
```

If you do not need the module object for anything else, you can pass the
contract name directly:

```python
ok = importlib.enforce_interface(
    "con_token",
    [
        importlib.Func("transfer", args=("amount", "to")),
        importlib.Var("balances", Hash),
    ],
)
```

## Variable Markers

Use the storage type name itself as the second argument to `importlib.Var`.
Do not quote it and do not pass a constructed storage object.

Supported storage markers are:

| Marker | Interface requirement |
|--------|-----------------------|
| `Variable` | local `Variable` storage |
| `Hash` | local `Hash` storage |
| `ForeignVariable` | foreign `Variable` storage |
| `ForeignHash` | foreign `Hash` storage |

The compiler preserves these markers in the Xian VM artifact, and the runtime
resolves them as interface type markers when the contract executes.

## Why It Matters

This is the closest thing to interface checking in the contract runtime. It is
especially useful for dynamic imports and contract-standard enforcement.
