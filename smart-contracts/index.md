# Smart Contracts

Xian smart contracts are written in Python, but not in unrestricted CPython.
They run inside a deterministic sandbox with a small, explicit language
surface, persistent state primitives, and stamp metering.

## What Makes Xian Contracts Different

- **Python syntax, chain-safe semantics**: contracts look like normal Python
  modules, but only a restricted subset is allowed.
- **Deterministic execution**: the runtime rejects language features that would
  make validator results diverge.
- **Persistent state primitives**: `Variable`, `Hash`, `ForeignVariable`,
  `ForeignHash`, and `LogEvent` are the storage/event building blocks.
- **Metered execution**: compute and storage both consume stamps.
- **Explicit imports**: contracts can import deployed contracts and a small
  runtime stdlib, not arbitrary Python modules.

## Contract Anatomy

Every contract is a single module with module-level declarations, an optional
constructor, and one or more exported functions:

```python
balances = Hash(default_value=0)
owner = Variable()

@construct
def seed():
    owner.set(ctx.caller)
    balances[ctx.caller] = 1_000_000

@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

## Current Rules To Remember

- module-level state declarations and imports are allowed
- at least one `@export` function is required
- exported function arguments must be annotated
- exported function return annotations are allowed, but only with the same
  whitelisted types accepted for arguments
- names starting or ending with `_` are rejected
- classes, nested functions, `try/except`, `lambda`, `async`, `yield`, and
  `from x import y` are rejected

## Quick Links

- [Contract Structure](/smart-contracts/contract-structure)
- [Functions](/smart-contracts/functions)
- [Context Variables](/smart-contracts/context)
- [Events](/smart-contracts/events)
- [Valid Code & Restrictions](/smart-contracts/valid-code)
- [Storage](/smart-contracts/storage/)
- [Standard Library](/smart-contracts/stdlib/)
- [Imports & Interfaces](/smart-contracts/imports/)
- [Contract Standards](/smart-contracts/standards/)
- [Testing](/smart-contracts/testing/)
- [Security](/smart-contracts/security/)
