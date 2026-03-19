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
- `decimal`

These are runtime-provided globals. They are not general-purpose Python imports.

The `decimal` runtime is the bridge behind Xian's deterministic numeric model.
Most contracts should still use normal `float` syntax in function signatures and
literals. The runtime converts those values into `ContractingDecimal` so users
can write readable decimal code without dealing with binary floating-point
behavior.

## Design Goal

The standard library surface exists only where Xian can provide deterministic,
sandbox-safe behavior.
