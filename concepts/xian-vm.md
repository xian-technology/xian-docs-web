# The Xian VM

The Xian VM is the execution layer that lets Xian keep Python as the contract
authoring language without making CPython bytecode the consensus format.

## The Two Layers To Keep Separate

There are always two distinct questions in Xian:

1. What language does the developer write?
2. What machine executes that program on validators?

Developers write a restricted Python subset. Nodes execute it through the fixed
`xian_vm_v1` model.

## Execution Mode

| Mode | What executes |
|------|----------------|
| `xian_vm_v1` | validator-derived canonical IR under a native runtime |

The source language remains a restricted Python subset. The supported node
runtime is fixed to the VM artifact path; acceptance by the compiler does not
guarantee identical behavior to every Python operation.

## Testing Python Compatibility

The local Python harness is useful for contract tests, but complete semantic
parity with the native VM has not been established. Test deployment and calls
through `xian_vm_v1`, particularly when using optional builtin arguments. Compare results, storage writes, events and failed
transactions, rather than checking only that source compiles.

The runtime's compatibility suite includes a pinned pre-VM Python baseline.
It checks source admission independently and preserves value types and dictionary
key order when comparing returns, writes, events, and failure outcomes. Its
coverage is bounded; it does not establish full language or metering parity.

Dictionary operations reject unhashable keys, including lists, dictionaries,
bytearrays, mutable sets, decimal/time objects, and tuples containing unhashable
members. Equal numeric keys such as `True`, `1`, and `float("1")` address one
entry; replacement preserves the first key and its position. Large integers
remain distinct from nearby rounded floats. These in-memory rules do not relax
the string-key requirement for dictionaries persisted in contract storage.
Deterministic sets have their own member eligibility rules, including support
for decimal/time values.

Within one execution, aliases, function arguments and imported-contract calls
share mutable objects. Collection copies are shallow; nested objects keep their
identity. `is` compares object identity. Do not rely on CPython's optional integer
or string interning. Native methods evaluate their receiver before arguments.

`map`, `filter`, `zip` and `reversed` produce consumable iterators. Callbacks
run when a value is requested; `all` and `any` stop as soon as their answer is
known. List iteration observes appends, dictionary views reflect the underlying
dictionary, and changing dictionary size during iteration fails. Materialize an
iterator or view with `list` or `tuple` before returning or storing it. Native
ranges are lazy; materialized collections remain subject to allocation limits.
The local Python harness retains a stricter large-range construction guard.

Function defaults are evaluated in module definition order and retain their
identity across calls within an execution. A fresh execution initializes them
again. Keyword argument dictionaries preserve call-site order.

`sorted` and `list.sort` support stable `key`/`reverse` ordering; keys run once
per item. `min`/`max` support `key` and an empty-iterable `default`, and `sum`
supports `start` while rejecting text and bytes. Integer text conversion accepts
base zero, matching prefixes and valid digit separators. Boolean arithmetic uses
integer values; boolean bitwise operations retain boolean results. Sequence
slices clip large bounds, and string searches preserve out-of-range semantics.
`round` uses ties-to-even for integers and binary floats (so `round(2.675, 2)`
is `2.67`). Decimal rounding with explicit digits preserves Contracting's
`ROUND_DOWN` policy. Extreme digit counts are bounded before allocating powers.

Ordinary module variables may be reassigned in source order; function defaults
capture the value present at their definition. Storage declarations, imports and
function names remain unique. Calls and list/tuple literals support starred
iterable expansion, and nested assignments, loops and comprehensions support one
starred target per target sequence. Expansion is metered and limited to 128 Ki
items. Duplicate keyword arguments fail during argument merging.

`dict.update` consumes iterable pairs incrementally, `setdefault` preserves the
supplied object's identity, and `list.reverse` mutates the existing list.
`bytes.fromhex` accepts a string with ASCII whitespace between complete byte
pairs and limits decoded output to 128 KiB. Numeric string parsing accepts the
frozen Unicode 15.0 decimal digits, including mixed scripts; byte inputs remain
ASCII-only. Same-size dictionary key replacement follows historical insertion
slots and cursor behavior; replacing a visited key can still raise a mutation
error. Prefer completing an iteration before changing its keys.

Rounding a contract decimal with explicit digits produces a distinct raw Decimal
value: `str(round(decimal('2'), 2))` is `'2.00'`, and that result is not an instance
of the contract `decimal` wrapper. Finite raw values preserve quantum and signed
zero through arithmetic, formatting, return values and nested calls. Writing a
raw Decimal directly to Variable/Hash converts it to the storage decimal format;
`Variable(t=decimal)` checks the original type and requires an explicit
`decimal(value)` conversion. Storage encoding does not preserve raw quantum.
Raw Decimal values support general fractional powers and the 53 public methods
reachable through historical contract results, including `normalize`, `quantize`,
`sqrt`, `exp`, `ln`, `log10`, `as_integer_ratio` and `as_tuple`. Arithmetic uses a
91-digit, ROUND_DOWN context with Emin=-100 and Emax=100. Methods with a rounding
argument accept the Python rounding-mode strings. Custom context objects are
not supported; context arguments accept `None`.

Exact construction is separate from arithmetic rounding. For example,
`round(decimal('0'), 2).from_float(float('0.1'))` preserves the exact binary64
input, including its additional decimal digits. A decimal literal such as `0.1`
is the contract decimal wrapper and is not a valid `from_float` argument.
`as_tuple()` returns a `DecimalTuple` with `sign`, `digits` and `exponent` fields;
it supports tuple indexing, iteration and equality. Stored tuples serialize as
JSON arrays, so named fields are not a persisted-state format.

Infinity and quiet NaN can appear in memory and return values. Arithmetic and
comparisons follow Decimal rules: NaN is unequal to itself, ordering with NaN
fails, and invalid operations fail the transaction. Direct and nested storage
writes of non-finite decimals fail. Convert or reject them explicitly before
persisting a result. Deterministic sets order raw Decimals as negative Infinity,
finite values, positive Infinity, then quiet NaNs by sign and payload, preserving
insertion order for ties. Repeated references to one NaN deduplicate; distinct
NaN objects remain separate members. Signaling NaNs cannot be dictionary keys
or set members.

Decimal operations are bounded: input text is limited to 128 KiB, coefficient
digits and raw exponent magnitude to 131072, and transcendental/power inputs to
4096 coefficient digits and a coefficient-digit count plus exponent of at most
4096. Ordinary power additionally limits both operand coefficients to 1024
digits. Integer power and modular-power exponents additionally have a
coefficient-digit count plus exponent limit of 512. Rendering and expanded
ratios also have allocation limits. A limit
failure rolls back the transaction. This supported surface does not imply
unrestricted Python Decimal compatibility; migration tests must check actual
application inputs and boundary behavior.

Storage writes snapshot values, and reads return detached copies. Mutating a
read value changes storage only after an explicit write. Cycles may exist in
memory but cannot cross storage or public result boundaries. The native heap
limits live object accounting to 128 MiB and 1,048,576 objects; mutable objects
remain retained until execution ends. Boundary traversal and rendering are
bounded, and a limit failure rolls back transaction effects.

Runtime fixes can change contract results. Validators participating in one
network must use a consistent compiler and VM version when replaying blocks.

## What `xian_vm_v1` Actually Uses

Under `xian_vm_v1`, deployment is source-driven.

The important stored artifacts are:

- `__source__`: canonical human-facing source used by explorers, dashboards,
  and inspection tooling
- `__xian_ir_v1__`: the persisted Xian VM IR used by the native runtime

Clients submit cleartext source. Validators normalize, lint, and compile that
source with the canonical Rust compiler, then persist the resulting source and
IR.
Submitted `deployment_artifacts` are rejected so clients cannot choose the
executable IR.

```mermaid
flowchart TD
  Source["Restricted Python contract source"]
  Admission["Validator receives source deployment"]
  Compiler["Canonical Rust compiler"]
  Constructor["Execute module and constructor"]
  Stored["Commit source, IR, metadata, and initial state"]
  Call["Later contract call"]
  VM["Native xian_vm_v1 execution"]
  Host["Deterministic host operations"]
  State["Xian state, events, and imports"]

  Source --> Admission --> Compiler --> Constructor
  Constructor -->|successful deployment| Stored
  Stored -->|load executable IR| VM
  Call --> VM
  VM --> Host
  Host --> State
```

## Execution Policy

VM-native execution is the fixed node execution runtime.

On the supported branch:

- `xian_vm_v1` is the only supported node runtime
- bytecode, gas schedule, and authority are internal VM constants
- submitted contracts must provide source code

This keeps the execution contract explicit without exposing alternate engines
or an operator-selectable execution policy section.

## What The Native Runtime Does

The native runtime is not a second unrestricted Python interpreter. It executes
validator-derived Xian VM IR and delegates explicit host operations back to the
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

Contract authors work with the familiar Xian model:

- `@construct` and `@export`
- `Variable`, `Hash`, and foreign state helpers
- `ctx`, `now`, events, and imports
- chi budgeting and deterministic rollback semantics

In other words, `xian_vm_v1` changes the execution machine, not the basic
developer-facing contract model.

## Why The Xian VM Matters

The Xian VM gives the platform an explicit machine contract:

- execution semantics become Xian-defined instead of CPython-bytecode-defined
- metering can be attached directly to VM operations and host calls
- submitted source can be validated and compiled into canonical IR
- replay and parity testing become easier to reason about

## Scope

The VM-native runtime covers real authored contract behavior,
including storage flows, decimals, datetime helpers, hashing, Ed25519
verification, imports, events, and the shielded contract helpers needed by the
existing shielded stack.

It is the supported execution path for node deployments.

## Related Pages

- [Deterministic Execution](/concepts/deterministic-execution)
- [Chi & Metering](/concepts/chi)
- [Runtime Features](/node/runtime-features)
- [Contract Submission Internals](/reference/submission-internals)
