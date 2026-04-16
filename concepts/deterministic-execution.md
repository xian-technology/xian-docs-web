# Deterministic Execution

Every validator in a Xian network must produce the same post-block state from
the same ordered transactions. If one validator diverges, its `app_hash` no
longer matches the rest of the network.

This page explains how Xian keeps execution deterministic even though contracts
are authored in Python.

## Why Determinism Matters

Xian is a replicated state machine. Each validator independently executes the
same block. If execution semantics differ, consensus breaks at the application
layer even when block ordering itself is correct.

Typical sources of nondeterminism in ordinary software include:

- local time
- system randomness
- file and network I/O
- floating-point edge cases
- runtime-version drift
- hidden mutable process-global state

Xian removes or controls those sources explicitly.

## Execution Engines Must Agree

Xian separates contract authorship from contract execution.

That means the exact alignment rules depend on the selected execution engine:

| Engine family | Validators must align on |
|--------------|---------------------------|
| tracer-backed Python runtimes | `xian-abci`, `xian-contracting`, tracer mode, and the supported CPython minor version |
| `xian_vm_v1` | `xian-abci`, `xian-contracting`, native VM support, `bytecode_version`, `gas_schedule`, and authority |

The principle is always the same: validators must execute the same machine
contract for the same source and state.

## Sandboxed Contract Language

Contracts run in a restricted Xian-defined Python subset.

Forbidden categories include:

- file I/O and network I/O
- subprocess and OS access
- unrestricted imports
- dynamic code execution
- classes, generators, async, and broad reflection

This removes the most common ways ordinary Python code becomes machine-specific
or environment-dependent.

## Fresh Module Loads, Persistent Chain State

Contract modules are loaded from chain state for execution. They are not used as
durable mutable state containers across transactions.

That means:

- module globals do not persist like normal application memory
- durable contract state belongs in `Variable` and `Hash`
- imports resolve against deployed contracts in state, not against arbitrary
  Python packages

## Metering Is Deterministic Too

Chi accounting is part of execution semantics, so it must be deterministic.

Tracer-backed runtimes meter execution in one of two ways:

- `python_line_v1` charges deterministic line buckets
- `native_instruction_v1` charges exact executed Python bytecode instructions

`xian_vm_v1` meters directly at the VM and host-operation layer through the
selected VM gas schedule.

In all cases, the user-visible transaction chi budget remains the hard bound
that determines whether execution succeeds or rolls back.

## Host Effects Are Explicit

Contracts cannot touch the host environment directly.

Instead, Xian exposes explicit deterministic runtime operations for:

- storage reads and writes
- event emission
- cross-contract calls
- context reads such as `now` and chain metadata
- hashing, signature checks, and zk verification bridges

These are part of the Xian runtime contract. They are not arbitrary operating
system syscalls.

## Decimal, Time, and Randomness

Xian also replaces the most common semantic footguns with deterministic rules.

### Decimal-Backed Values

Contract `float` values are decimal-backed runtime values, not ordinary binary
IEEE 754 floats.

That avoids the classic:

```python
# Standard Python: 0.1 + 0.2 = 0.30000000000000004
# Xian contracts:  0.1 + 0.2 = 0.3
```

### Chain Time

`now` is the finalized block timestamp, not local wall-clock time.

### Deterministic Random

The contract `random` module is seeded from public execution context such as:

- `chain_id`
- `block_num`
- `block_hash`
- a transaction-specific input hash

That makes it deterministic across validators. It does not make it secret.

## Deterministic Encoding

State encoding is deterministic as well:

- JSON is written in a stable compact form
- special runtime types use fixed marker formats
- the same logical value always produces the same stored bytes

This matters because storage encoding contributes directly to the committed app
state.

## What Usually Causes Divergence

Real divergence risks tend to come from operator drift rather than exotic math.

Common examples:

- validators running different runtime versions
- tracer-backed networks drifting on CPython minor version
- validators selecting different execution policy
- local forks of consensus-sensitive repos
- corrupted or inconsistent local state

## If Determinism Breaks

When a validator no longer matches the network:

1. its application results diverge
2. its `app_hash` no longer matches the validator majority
3. it falls out of consensus until the runtime and state are corrected

Forward state patches are useful after consensus is live. They do not replace
the need to restore deterministic execution first.

## Summary

| Source of nondeterminism | How Xian controls it |
|--------------------------|----------------------|
| local time | `now` is the finalized block timestamp |
| system randomness | contract `random` is seeded from public chain context |
| file/network I/O | forbidden by the sandbox |
| floating-point drift | decimal-backed contract values |
| hidden mutable process state | durable state lives in contract storage, not module globals |
| runtime-version drift | validators must align on the selected execution engine and its supported runtime |
| encoding differences | deterministic compact encoding rules |
