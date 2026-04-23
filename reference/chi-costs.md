# Chi Cost Table

This page provides a detailed reference for chi costs across all operation types.

## Tracer Storage Costs

| Operation | Cost | Unit |
|-----------|------|------|
| Storage read | 1 | meter unit per byte (key + value) |
| Storage write | 25 | meter units per byte (key + value) |
| Submitted transaction bytes | 1 | meter unit per byte |
| Returned value bytes | 1 | meter unit per byte |

Byte count includes both the encoded key (e.g., `currency.balances:alice`) and the encoded value (e.g., `1000000`).

These constants are the tracer-backed policy used by `python_line_v1` and
`native_instruction_v1`. `xian_vm_v1` uses its own VM host-operation schedule;
current VM storage writes are charged at `25` units per byte, while VM storage
reads are charged by the VM schedule rather than the tracer `READ_COST_PER_BYTE`
constant.

## Base Costs

| Item | Value |
|------|-------|
| Base transaction cost | 5 chi |
| Chi-to-XIAN conversion | 20 chi = 1 XIAN |

## Limits

| Limit | Value |
|-------|-------|
| Runtime raw safety ceiling | 50,000,000,000 raw units |
| Maximum line events per transaction (`python_line_v1`) | 800,000 |
| Maximum instruction events per transaction (`native_instruction_v1`) | 3,250,000 |
| Maximum write data per transaction | 128 KiB |
| Maximum return value size | 128 KiB |
| Maximum submitted contract source | 64 KiB |
| Maximum sequence or binary allocation | 128 KiB |
| Default chi allocation | 1,000,000 |

## Chi Formula

```
chi_used = (raw_meter_cost // 1000) + 5
```

Where:
- `raw_meter_cost` = compute, storage, transaction-byte, return-value, and
  runtime-bridge costs charged by the selected execution backend
- `5` = base transaction cost
- the final value is capped by the transaction's submitted chi budget

## Opcode Costs

Each Python bytecode instruction has a fixed cost in compute units (CU). The
native tracer charges those instructions exactly; the pure-Python tracer
precomputes line buckets from the same opcode schedule. Both are converted to
chi via `raw_cost // 1000`.

For `xian_vm_v1`, the runtime no longer meters CPython bytecode directly. VM
execution is charged through the VM gas schedule plus the same storage and
payload-size concepts. The table below therefore describes the tracer-backed
compute schedule, not every possible VM-native gas entry.

| Cost Range (CU) | Instructions |
|-----------------|--------------|
| 2 | Simple loads, stores, stack operations |
| 4 | Arithmetic operations, comparisons |
| 6 | Function calls, attribute access |
| 8 | Container operations (list/dict access) |
| 10-20 | Loop control, exception setup |
| 26 | Import operations |
| 1610 | Maximum cost instruction |

The exact cost per opcode is defined in the metering engine and is deterministic across all validators.

## Example Meter Contributions

The rows below show raw meter contributions before the final `// 1000`
conversion. Do not read a storage row such as `600` as `600` billed chi; it is
one part of the raw aggregate that becomes final `chi_used`.

### Simple Variable Read

```python
counter.get()
```

- Opcode cost: backend-dependent compute units
- Storage read: key `con_x.counter` (12 bytes) + value `42` (2 bytes) = 14 raw meter units on tracer-backed execution
- Final chi: `5 + (raw_meter_cost // 1000)`, so use simulation for the exact receipt value

### Simple Hash Write

```python
balances["alice"] = 1000
```

- Opcode cost: backend-dependent compute units
- Storage write: key `con_x.balances:alice` (20 bytes) + value `1000` (4 bytes) = 24 bytes * 25 = 600 raw meter units on tracer-backed execution
- Final chi: `5 + (raw_meter_cost // 1000)`, capped by the submitted budget

### Token Transfer (Two Reads + Two Writes)

```python
@export
def transfer(to: str, amount: float):
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

- 2 storage reads: roughly 30-60 raw meter units, depending on encoded key/value sizes
- 2 storage writes: roughly 1,200-1,400 raw meter units, depending on encoded key/value sizes
- compute, transaction bytes, return values, and runtime bridge work add to the same raw meter total
- final chi is the converted receipt value, so simulate the transaction against the target execution policy for a real estimate

## Cost Optimization Tips

| Strategy | Savings |
|----------|---------|
| Use shorter contract and variable names | Reduces key byte count for every read/write |
| Cache repeated reads in local variables | Avoids paying read cost multiple times |
| Use `default_value` in Hash declarations | Avoids unnecessary reads that return None |
| Minimize writes in loops | Each write is 25x more expensive than a read |
| Batch cross-contract calls | Reduces function call overhead |
| Avoid storing large strings or lists | Every byte increases the raw write-meter cost |

## ZK Bridge Metering

The runtime `zk` bridge has explicit meter constants before native verification
or shielded helper work runs:

| Operation | Cost |
|-----------|------|
| raw Groth16 verify base | 750,000 |
| raw Groth16 public input | 50,000 each |
| raw Groth16 payload byte | 50 each |
| registry-backed Groth16 verify base | 500,000 |
| registry prepared-key setup | 250,000 |
| registry-backed public input | 50,000 each |
| registry-backed payload byte | 25 each |
| shielded tree append base | 250,000 |
| shielded tree append commitment | 500,000 each |
| shielded command nullifier digest base | 100,000 |
| shielded command nullifier digest input | 50,000 each |
| shielded command binding | 100,000 |
| shielded command execution tag | 50,000 |

ZK inputs are bounded before verification: verifying-key hex payloads are
limited to `8,192` characters, proof hex payloads to `4,096` characters,
public inputs to `32`, and registry verifying-key ids to `128` characters.

## XIAN Cost Conversion

At 20 chi per XIAN:

| Billed chi | XIAN cost |
|------------|-----------|
| 5 | 0.25 |
| 20 | 1 |
| 100 | 5 |
| 1,000 | 50 |
| 10,000 | 500 |

Use dry-run simulation for operation-level estimates. Deployment includes more
than final writes: it also pays for contract-analysis work and canonical source
storage. Large comments are not preserved in stored `__source__`, but raw
submitted source is still size-limited.
