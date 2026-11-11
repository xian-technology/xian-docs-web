# Standard Library Overview

Xian does not expose the full Python standard library to contracts.

Instead, it injects a small deterministic runtime surface directly into the
contract environment.

## Available Runtime Modules

- `datetime`
- `hashlib`
- `random`
- `importlib`
- `crypto`
- `zk`
- `decimal(value)` (numeric constructor)

These are runtime-provided globals. They are not general-purpose Python imports.

The `zk` runtime is verification-only. Proof generation, witness construction,
Merkle-path derivation, and note scanning stay off-chain in tooling such as
`xian_zk`.

Use `decimal(value)` for numeric construction. The standalone `sqrt`, `quantize`, `mul_div_floor` and `mul_div_ceil` helpers cover common financial arithmetic. See [Numbers, division and rounding](/smart-contracts/numbers).

## Design Goal

The standard library surface exists only where Xian can provide deterministic,
sandbox-safe behavior.
