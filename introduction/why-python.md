# Why Python?

Xian uses a restricted Python subset as its contract authoring language. The
goal is readable application logic without exposing unrestricted CPython to
consensus.

## Authoring and Execution

Contract authors write familiar Python syntax. Before deployment, the Xian
compiler validates that source and lowers it to canonical `xian_vm_v1` IR.
Validators execute that IR through the fixed native runtime.

This distinction is important: Python is the source language, while Xian
defines the executable semantics.

## Benefits

- Contract, backend, QA, and audit teams can review the same readable syntax.
- `ContractingClient` provides a short local test loop.
- The compiler rejects features that are unsafe or nondeterministic in
  consensus.
- Application code can use the Python or TypeScript SDK without a separate
  language-specific contract toolchain.

```python
@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

## Deterministic Subset

Xian excludes or controls ordinary Python behavior that could make validators
disagree:

- no file, network, subprocess, or operating-system access
- no unrestricted imports or dynamic code execution
- no classes, async, generators, or broad reflection
- `now` comes from finalized block time
- contract `float` values use deterministic decimal-backed semantics
- `random` is reproducible from public execution context and is not secret
- storage, events, imports, cryptography, and ZK verification use explicit
  runtime operations

The result is intentionally narrower than Python itself. See
[Valid Code & Restrictions](/smart-contracts/valid-code) for the exact language
surface.

## Tradeoffs

Familiar syntax does not remove contract-specific constraints. Authors still
need to account for chi, storage cost, public state, deterministic execution,
and adversarial callers. Features outside the supported subset must live in an
off-chain service or be expressed through a reviewed runtime primitive.
