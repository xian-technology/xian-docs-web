# Importing Other Contracts

Static imports are the simplest cross-contract pattern:

```python
import currency

@export
def pay(amount: float, to: str):
    currency.transfer(amount=amount, to=to)
```

## What Happens

- the imported name resolves to another deployed contract
- calling its exported function creates a cross-contract call
- `ctx.signer` stays the original transaction signer
- `ctx.caller` becomes the calling contract inside the callee

This distinction is critical for security-sensitive logic.
