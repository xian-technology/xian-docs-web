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

## Runtime Versions Must Agree

Xian separates contract authorship from contract execution.

The supported machine contract is `xian_vm_v2`. Validators must align on
`xian-abci`, `xian-contracting`, the native VM runtime, its fixed gas schedule,
and canonical Rust source-to-IR compilation. There is no operator-selectable
fallback execution engine.

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

`xian_vm_v2` meters directly at the VM and host-operation layer through the
fixed VM gas schedule.

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

### Exact Numbers

The compiler reads decimal literals from their original digits. Validators perform integer and scaled-integer arithmetic in the native VM. The type, bounds and rounding of each operation are part of the execution profile. See [Numbers, division and rounding](/smart-contracts/numbers).

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

Divergence risks include implementation edge cases as well as operator drift.

Common examples:

- validators running different runtime versions
- validators running mismatched compiler or VM versions
- local forks of consensus-sensitive repos
- corrupted or inconsistent local state
- ambient process state, collection ordering, and numeric boundary differences

## Testing Determinism

The native Contract Determinism campaign executes the reviewed surface corpus
and seeded generated programs in fresh processes. It varies hash seeds, time
zones, locale, Decimal context, import warmup, allocator, case order and storage
reopening. Optimized Python interpreters are checked for rejection rather than
used for contract execution.

The historical V1 corpus includes binary-float and raw Decimal cases. The V2 conformance vectors check exact digits, magnitude and precision bounds, signed division, rounding, helper results and the wire representation.

These checks complement five-node block replay and Rust-versus-Python block
execution differential tests.
They provide evidence for the tested programs and environments, not a proof for
every possible contract. Determinism and correctness are separate requirements:
a consistently wrong result must also fail a semantic test.

## If Determinism Breaks

When a validator diverges from the network:

1. its application results diverge
2. its `app_hash` differs from the validator majority
3. it falls out of consensus until the runtime and state are corrected

Forward state patches are useful after consensus is live. They do not replace
the need to restore deterministic execution first.

## Summary

| Source of nondeterminism | How Xian controls it |
|--------------------------|----------------------|
| local time | `now` is the finalized block timestamp |
| system randomness | contract `random` is seeded from public chain context |
| file/network I/O | forbidden by the sandbox |
| numeric drift | explicit numeric policies and cross-platform boundary tests |
| hidden mutable process state | durable state lives in contract storage, not module globals |
| runtime-version drift | validators must align on `xian_vm_v2`, its native runtime, and canonical compiler |
| encoding differences | deterministic compact encoding rules |
