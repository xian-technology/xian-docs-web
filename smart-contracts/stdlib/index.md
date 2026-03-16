# Standard Library

Xian contracts have access to a curated set of modules provided by the runtime. These are **not** Python's standard library — they are purpose-built for deterministic, sandboxed execution.

## Available Modules

| Module | Import | Purpose |
|--------|--------|---------|
| [random](/smart-contracts/stdlib/random) | `import random` | Deterministic pseudo-random numbers |
| [datetime](/smart-contracts/stdlib/datetime) | `import datetime` | Time and duration handling |
| [hashlib](/smart-contracts/stdlib/hashlib) | `import hashlib` | SHA-256 and SHA-3 hashing |
| [crypto](/smart-contracts/stdlib/crypto) | `import crypto` | Ed25519 signature verification |
| decimal | `decimal(value)` | Fixed-point arithmetic (auto-available) |

## Implicit Globals

These are available in every contract without importing:

| Name | Type | Description |
|------|------|-------------|
| `ctx` | Context | Transaction context (caller, signer, this, owner) |
| `now` | Datetime | Current block timestamp |
| `block_num` | int | Current block height |
| `block_hash` | str | Current block hash |
| `chain_id` | str | Network chain identifier |
| `Any` | type | The `Any` type annotation |

## Decimal Arithmetic

All `float` literals in contracts are automatically converted to `ContractingDecimal` for precision. You can also create them explicitly:

```python
@export
def precise_math(x: float):
    result = x * decimal("0.01")  # 30-digit precision
    return result
```

- Precision: 30 upper digits + 30 lower digits
- Rounding: always rounds down (ROUND_FLOOR)
- Supports: `+`, `-`, `*`, `/`, `//`, `%`, `**`, all comparisons
- Converts to/from int and float: `int(d)`, `float(d)`

## Note on Imports

`import os`, `import sys`, and all other Python standard library modules are **forbidden**. Only the modules listed above and deployed contracts can be imported.
