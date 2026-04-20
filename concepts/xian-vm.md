# The Xian VM

The Xian VM is the execution layer that lets Xian keep Python as the contract
authoring language without tying consensus forever to CPython bytecode.

## The Two Layers To Keep Separate

There are always two distinct questions in Xian:

1. What language does the developer write?
2. What machine executes that program on validators?

Developers write a restricted Python subset. The network then chooses an
execution engine for that authored contract.

## Current Execution Modes

| Mode | What executes | When it is useful |
|------|----------------|-------------------|
| `python_line_v1` | restricted Python with line-bucket metering | simple development setups and conservative tracer-backed execution |
| `native_instruction_v1` | restricted Python with native instruction metering | production-style tracer-backed execution |
| `xian_vm_v1` | validated Xian VM artifacts under a native runtime | stable Xian-owned machine semantics and VM-native metering |

The contract language stays the same. What changes is the runtime beneath it.

## What `xian_vm_v1` Actually Uses

Under `xian_vm_v1`, deployment is artifact-driven.

The important stored artifacts are:

- `__source__`: canonical human-facing source used by explorers, dashboards,
  and inspection tooling
- `__xian_ir_v1__`: the persisted Xian VM IR used by the native runtime
- optional runtime-code compatibility fields for tracer-backed/tooling paths

Client and runtime tooling build and validate `deployment_artifacts`, which
include:

- `module_name`
- `vm_profile`
- `source`
- `vm_ir_json`
- content hashes for the canonical artifacts

The runtime validates those artifacts against the canonical compiler output
before deployment so forged or mismatched bundles are rejected.

## Execution Policy

VM-native execution is selected through the explicit execution-engine policy:

```toml
[xian.execution.engine]
mode = "xian_vm_v1"
bytecode_version = "xvm-1"
gas_schedule = "xvm-gas-1"
authority = "native"
```

On the current supported branch:

- `xian_vm_v1` requires `bytecode_version`
- `xian_vm_v1` requires `gas_schedule`
- `authority` must be `native`
- the older `shadow_tracer_mode` rollout field is not part of the current
  supported config surface

This makes the execution contract explicit instead of hiding it behind one
tracer string.

## What The Native Runtime Does

The native runtime is not a second unrestricted Python interpreter. It executes
validated Xian VM artifacts and delegates explicit host operations back to the
Xian runtime boundary.

That host boundary includes things such as:

- `Variable` and `Hash` reads and writes
- `ForeignVariable` and `ForeignHash` reads
- event emission
- contract import and export calls
- hashing and signature verification bridges
- `zk.*` verification syscalls

Those operations are deterministic runtime calls, not arbitrary operating-system
syscalls.

## What Stays The Same For Contract Authors

Contract authors still work with the familiar Xian model:

- `@construct` and `@export`
- `Variable`, `Hash`, and foreign state helpers
- `ctx`, `now`, events, and imports
- chi budgeting and deterministic rollback semantics

In other words, `xian_vm_v1` changes the execution machine, not the basic
developer-facing contract model.

## Why The Xian VM Matters

The Xian VM gives the platform a cleaner long-term machine contract:

- execution semantics become Xian-defined instead of CPython-bytecode-defined
- metering can be attached directly to VM operations and host calls
- deployment can be validated from canonical artifacts
- replay and parity testing become easier to reason about
- performance-sensitive paths can move further into native code without forcing
  a new contract language on developers

## Current Scope

The current VM-native runtime already covers real authored contract behavior,
including storage flows, decimals, datetime helpers, hashing, Ed25519
verification, imports, events, and the shielded contract helpers needed by the
existing shielded stack.

That means the Xian VM is not just a design note. It is a real execution path
that the node stack can select deliberately.

## Related Pages

- [Deterministic Execution](/concepts/deterministic-execution)
- [Chi & Metering](/concepts/chi)
- [Runtime Features](/node/runtime-features)
- [Contract Submission Internals](/reference/submission-internals)
