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

## Why It Matters

This is the closest thing to interface checking in the contract runtime. It is
especially useful for dynamic imports and contract-standard enforcement.
