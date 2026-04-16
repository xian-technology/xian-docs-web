# Importing Other Contracts

Static imports are the simplest way to compose contracts when the dependency is
known ahead of time.

```python
import currency

@export
def pay(amount: float, to: str):
    currency.transfer(amount=amount, to=to)
```

## What A Static Import Means In Xian

This is not Python package importing.

In Xian, a static import resolves to another deployed contract in chain state.
Calling an exported function on that imported module creates a contract-to-
contract call inside the same transaction.

## Caller And Signer Semantics

The most important security rule is the split between `ctx.signer` and
`ctx.caller`.

During a cross-contract call:

- `ctx.signer` stays the original external transaction signer
- `ctx.caller` becomes the immediate calling contract

That is why permission checks need to be intentional:

- use `ctx.caller` when you want to authorize a specific contract
- use `ctx.signer` when you want to authorize the end user behind the whole
  transaction

## Good Uses

Static imports are a good fit for:

- token and registry integrations
- fixed infrastructure dependencies
- contracts that rely on a known standard companion contract

## When To Prefer Something Else

Use dynamic imports and interface checks when:

- the dependency is chosen at runtime
- governance selects the target contract
- the system is registry-driven or plugin-like

## Design Guidance

- keep imported dependencies explicit and minimal
- document whether a callee expects contract-level authority or end-user
  authority
- validate interfaces for anything that might change over time
