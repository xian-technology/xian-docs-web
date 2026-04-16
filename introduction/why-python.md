# Why Python?

Xian uses Python as the contract authoring language because the main product
goal is usable decentralized infrastructure, not language novelty.

The core idea is simple: developers should be able to read and write contract
logic with ordinary software literacy, while the platform still enforces
deterministic execution, metering, and a narrow runtime boundary.

## Python Is The Frontend

In Xian, Python is the source language developers author. It is not an open
invitation to run unrestricted CPython inside consensus.

That distinction matters:

- authors write Python-like contracts
- the linter and compiler enforce the Xian subset
- the runtime executes that subset deterministically
- a network may use a tracer-backed Python engine or `xian_vm_v1` under the
  hood

So "Python contracts" in Xian means Python-authored, Xian-defined contract
programs.

## Why This Helps In Practice

### Readability

Contract code is security-sensitive. Readable code is easier to review, test,
audit, and operate.

```python
@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

The Xian version is intentionally close to the kind of code a normal backend
team already reads every day.

### Shared Team Vocabulary

Python lowers the coordination cost between:

- contract authors
- backend engineers
- QA and test engineers
- auditors and operators

That matters when a team needs to understand both on-chain and off-chain logic
as one system.

### Fast Feedback Loops

The developer workflow stays short:

- write contract source
- lint and test it locally with `ContractingClient`
- build or submit the deployment payload
- inspect state, events, and receipts through the SDKs and APIs

You do not need a specialized contract compiler toolchain just to start
learning the model.

## Determinism Still Comes First

Python only works here because Xian narrows it aggressively.

The platform removes or constrains the parts of Python that are bad fits for
deterministic consensus:

- no file or network I/O
- no dynamic code execution
- no unrestricted imports
- no classes, generators, async, or broad reflection
- no ordinary floating-point semantics in contract values

Instead, Xian provides deterministic replacements and host-controlled context:

- `now` is chain time
- `random` is seeded from public execution context
- contract `float` values are decimal-backed
- storage, events, and cross-contract calls go through explicit runtime
  constructs

## Python Does Not Lock Xian To One Runtime Forever

One of the big advantages of the Xian design is that Python authorship and
runtime execution are separate concerns.

Today the same contract language can map to:

- tracer-backed Python execution, where validators align on tracer mode and
  CPython minor version
- `xian_vm_v1`, where validators align on a native runtime plus explicit
  `bytecode_version` and `gas_schedule`

That gives Xian a path to more native execution and more stable machine-level
semantics without forcing developers to abandon the authoring language.

## Honest Tradeoffs

Xian makes deliberate tradeoffs.

### It Is A Restricted Subset

This is not "run any Python you want."

If a familiar Python feature would weaken determinism, auditability, or runtime
clarity, Xian excludes it.

### Performance Is A Platform Concern, Not A Language Illusion

Python source is chosen for readability and adoption. Performance comes from:

- deterministic metering
- explicit host operations
- careful storage accounting
- native components such as the tracer, verifier, and Xian VM runtime

The point is not to pretend Python is magically as fast as low-level systems
languages. The point is to keep contract authorship simple while letting the
runtime evolve underneath.

### Runtime Discipline Still Matters

Validators must still stay aligned on the supported runtime for the network
they are joining. The exact alignment rules depend on the execution engine, but
the principle does not change: all validators must execute the same contract
semantics.

## Bottom Line

Xian chooses Python because it makes decentralized application logic easier to
understand, test, and integrate. The language stays familiar; the runtime stays
strict. That combination is the product thesis.
