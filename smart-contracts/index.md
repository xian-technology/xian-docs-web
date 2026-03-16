# Smart Contracts

Xian smart contracts are written in Python — a restricted subset that enforces security and determinism. If you can write Python, you can write smart contracts.

## What Makes Xian Contracts Different

- **Pure Python** — no new language to learn, no Solidity, no Rust
- **Deterministic** — same input always produces same output, guaranteed by the metering engine
- **Sandboxed** — no file I/O, no network, no unsafe builtins, no classes, no closures
- **Metered** — every instruction costs stamps (gas), preventing infinite loops and abuse

## Contract Anatomy

Every contract has up to three parts:

```python
# 1. State declarations (module level)
balances = Hash(default_value=0)
owner = Variable()

# 2. Constructor (runs once on deployment)
@construct
def seed():
    owner.set(ctx.caller)
    balances[ctx.caller] = 1_000_000

# 3. Public functions (callable by anyone)
@export
def transfer(to: str, amount: float):
    sender = ctx.caller
    assert balances[sender] >= amount, "Insufficient balance"
    balances[sender] -= amount
    balances[to] += amount
```

## Quick Links

- [Contract Structure](/smart-contracts/contract-structure) — decorators, functions, naming rules
- [Storage](/smart-contracts/storage/) — Variable, Hash, and cross-contract reads
- [Context](/smart-contracts/context) — the `ctx` object: signer, caller, owner
- [Functions](/smart-contracts/functions) — exports, constructors, private helpers
- [Events](/smart-contracts/events) — emitting observable signals for off-chain clients
- [Imports](/smart-contracts/imports/) — calling other contracts
- [Standard Library](/smart-contracts/stdlib/) — datetime, random, hashlib, crypto, decimal
- [Valid Code](/smart-contracts/valid-code) — what's allowed, what's forbidden
- [Security](/smart-contracts/security/) — access control, pitfalls, audit checklist
- [Testing](/smart-contracts/testing/) — using ContractingClient for local development
