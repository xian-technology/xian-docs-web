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

## Public Callable Aliases

An imported contract can expose a public alias to an exported function or an
admitted builtin or host callable. For example, `con_tools` can define:

```python
size = len

@export
def identify():
    return ctx.this

identify_alias = identify
```

A caller can retrieve or invoke those aliases:

```python
import con_tools

@export
def inspect():
    count = con_tools.size
    return [count([1, 2, 3]), con_tools.identify_alias()]
```

The result is `[3, "con_tools"]`. An exported-function alias retains its
original contract and canonical exported function name, including that
contract's owner and normal caller context. An admitted builtin, host function
or class-method alias executes in the calling contract's context; importing it
does not borrow the exporting contract's authority. Public aliases use the
module's initialized binding, including any supported rebinding in its module
body.

Alias lookup does not create additional transaction entrypoints. A name used
with a direct transaction, `importlib.call(...)` or `importlib.has_export(...)`
must satisfy the ordinary export rules. Private-function aliases, storage and
event handles, and ordinary data globals are not exposed through this mechanism.
An interface check on a global attribute does not make that attribute public.

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
