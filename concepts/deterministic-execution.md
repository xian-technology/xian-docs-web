# Deterministic Execution

Every validator in the Xian network must produce exactly the same state after executing the same block of transactions. If even one byte differs, the `app_hash` will not match and consensus fails. This page explains how Xian achieves determinism in a Python execution environment.

## Why Determinism Matters

Xian is a replicated state machine. Every validator independently executes every transaction and must arrive at the same result. If execution were non-deterministic (different results on different machines), validators would disagree on the state, and the network would halt.

Non-deterministic behavior in typical Python programs comes from:
- Floating-point rounding across CPU architectures
- Dictionary ordering (not an issue since Python 3.7)
- System calls (time, random, file I/O, network)
- Thread scheduling

Xian eliminates all of these sources.

## How Determinism Is Achieved

### Sandboxed Execution

Contracts run in a restricted Python sandbox. The following are forbidden:

- File I/O (`open`, `os`, `sys`, `pathlib`)
- Network access (`socket`, `urllib`, `requests`)
- Process management (`subprocess`, `multiprocessing`)
- All standard library modules (except the Xian-provided runtime modules)
- Classes, closures, generators, async/await, try/except

This eliminates the most common sources of non-determinism in Python programs.

### Deterministic Metering with `sys.monitoring`

Xian uses Python's `sys.monitoring` API, but the current meter is not a Python
callback on every executed opcode.

Instead, Xian:

- registers only contract code objects
- precomputes a deterministic bytecode-cost bucket for each executable source
  line
- charges that bucket when the interpreter reports execution of that line

This preserves deterministic accounting while keeping validator performance
practical on adversarial or very large loops.

### No Syscalls in the Hot Path

During contract execution, no system calls occur in the critical computation path. All I/O is limited to:

- LMDB reads/writes (which are memory-mapped and deterministic)
- The metering counter (an in-memory integer)

There are no calls to `time()`, `random()` (the system PRNG), or any OS facility during execution.

### Memory Checks at Boundary, Not Per-Instruction

Memory usage is checked at transaction boundaries rather than on every instruction. This simplifies the execution model and avoids the non-determinism that per-instruction memory tracking could introduce (different allocator behavior across platforms).

### Same Python Version Requirement

All validators must run the same version of CPython. The Python bytecode compiler can produce different bytecode across versions, which would lead to different instruction counts and costs. By pinning the Python version, all validators execute identical bytecode for the same contract source.

### Integer Arithmetic for Costs

All stamp cost calculations use integer arithmetic. There is no floating-point math in the metering engine. This eliminates rounding differences across CPU architectures:

```
raw_cost = sum of integer opcode costs
stamps_used = (raw_cost // 1000) + 5  # integer division, no float
```

### Decimal Arithmetic for Contract Values

Xian contract code uses normal Python `float` syntax in signatures and literals,
but the runtime executes those values as `ContractingDecimal`, not as binary
IEEE 754 floats.

That means:

- `amount: float` is the normal way to declare decimal-backed values in
  contracts
- a literal like `0.1` is preserved from source and compiled into a decimal
  runtime value
- values are stored and encoded deterministically as fixed decimal values

This prevents the classic binary floating-point issue:

```python
# Standard Python: 0.1 + 0.2 = 0.30000000000000004
# Xian contracts:  0.1 + 0.2 = 0.3
```

Current numeric policy:

- up to `61` whole digits
- up to `30` fractional digits
- extra fractional digits are truncated toward zero
- values outside the supported range are clamped to the supported min/max

This range is already wider than Ethereum-style `18` decimal token precision.

### Deterministic JSON Encoding

State values are serialized to JSON with deterministic properties:

- Dictionary key order is preserved (guaranteed since Python 3.7)
- No whitespace variation (compact format with `separators=(",", ":")`)
- Special types (`ContractingDecimal`, `Datetime`, `bytes`) use fixed marker
  formats
- The same value always produces the same byte string

### Deterministic Random

The `random` module available in contracts is seeded from block data (block hash and transaction index). Every validator uses the same seed for the same transaction, producing the same "random" numbers.

### Deterministic Time

The `now` variable in contracts is the finalized block timestamp agreed upon by
consensus. It is not local system time. All validators see the same `now` for
every transaction in the same block.

The active block policy changes whether chain time advances during idle
periods:

- `on_demand`: no idle empty blocks
- `idle_interval`: an empty block after a configured idle period
- `periodic`: scheduled empty blocks remain enabled

That policy affects time progression, not determinism.

## What Happens If Determinism Breaks

If a validator produces a different `app_hash` after executing a block:

1. CometBFT detects the mismatch when the validator proposes or votes on the next block
2. The divergent validator is unable to participate in consensus
3. The network continues with the 2/3+ majority that agrees

Common causes of divergence in practice:
- Running a different Python version than other validators
- Modified contract runtime libraries
- Corrupted LMDB state database
- Hardware memory errors

## Summary

| Source of Non-Determinism | How Xian Prevents It |
|--------------------------|---------------------|
| Floating-point rounding | `ContractingDecimal` for all contract values |
| System time | `now` is the consensus block timestamp |
| Random numbers | Seeded from block hash + transaction index |
| File/network I/O | Sandbox forbids all I/O |
| Dictionary ordering | Python 3.7+ guarantees insertion order |
| Memory allocation | Checked at boundary, not per-instruction |
| Instruction counting | deterministic line-based bytecode buckets with integer cost arithmetic |
| Python version differences | All validators must run the same CPython version |
| JSON serialization | Compact format, fixed type markers, no whitespace |
