# Dynamic Imports

Use dynamic imports when the target contract name is not hard-coded:

```python
token = importlib.import_module("con_token")
token.transfer(amount=100, to="bob")
```

## When to Use It

- plugin-style architectures
- configurable token or market contracts
- governance-selected implementation contracts

## Caution

Dynamic imports increase flexibility but also increase the need for interface
validation and access-control discipline.
