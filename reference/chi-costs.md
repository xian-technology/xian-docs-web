# Chi Cost Table

This page provides a detailed reference for chi costs across all operation types.

## Storage Costs

| Operation | Cost | Unit |
|-----------|------|------|
| Storage read | 1 | chi per byte (key + value) |
| Storage write | 25 | chi per byte (key + value) |

Byte count includes both the encoded key (e.g., `currency.balances:alice`) and the encoded value (e.g., `1000000`).

## Base Costs

| Item | Value |
|------|-------|
| Base transaction cost | 5 chi |
| Chi-to-XIAN conversion | 20 chi = 1 XIAN |

## Limits

| Limit | Value |
|-------|-------|
| Maximum chi per transaction | 6,500,000 |
| Maximum line events per transaction (`python_line_v1`) | 800,000 |
| Maximum instruction events per transaction (`native_instruction_v1`) | 3,250,000 |
| Maximum write data per transaction | 128 KB |
| Default chi allocation | 1,000,000 |

## Chi Formula

```
chi_used = (raw_compute_cost // 1000) + 5 + storage_read_cost + storage_write_cost
```

Where:
- `raw_compute_cost` = sum of all opcode costs charged by the selected tracer backend
- `5` = base transaction cost
- `storage_read_cost` = total bytes read * 1
- `storage_write_cost` = total bytes written * 25

## Opcode Costs

Each Python bytecode instruction has a fixed cost in compute units (CU). The
native tracer charges those instructions exactly; the pure-Python tracer
precomputes line buckets from the same opcode schedule. Both are converted to
chi via `raw_cost // 1000`.

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

## Example Cost Calculations

### Simple Variable Read

```python
counter.get()
```

- Opcode cost: ~20-50 CU (function call + attribute access)
- Storage read: key `con_x.counter` (12 bytes) + value `42` (2 bytes) = 14 bytes = 14 chi
- Total: approximately 14-15 chi

### Simple Hash Write

```python
balances["alice"] = 1000
```

- Opcode cost: ~20-50 CU
- Storage write: key `con_x.balances:alice` (20 bytes) + value `1000` (4 bytes) = 24 bytes * 25 = 600 chi
- Total: approximately 600-601 chi

### Token Transfer (Two Reads + Two Writes)

```python
@export
def transfer(to: str, amount: float):
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

- 2 storage reads: ~30-60 chi
- 2 storage writes: ~1,200-1,400 chi
- Opcodes: ~100-200 CU
- Base cost: 5 chi
- Total: approximately 1,300-1,700 chi

## Cost Optimization Tips

| Strategy | Savings |
|----------|---------|
| Use shorter contract and variable names | Reduces key byte count for every read/write |
| Cache repeated reads in local variables | Avoids paying read cost multiple times |
| Use `default_value` in Hash declarations | Avoids unnecessary reads that return None |
| Minimize writes in loops | Each write is 25x more expensive than a read |
| Batch cross-contract calls | Reduces function call overhead |
| Avoid storing large strings or lists | Every byte costs 25 chi to write |

## XIAN Cost Examples

At 20 chi per XIAN:

| Operation | Chi | XIAN Cost |
|-----------|--------|----------|
| Simple read | ~15 | ~0.75 |
| Single write | ~600 | ~30 |
| Token transfer | ~1,500 | ~75 |
| Complex DEX swap | ~5,000 | ~250 |
| Contract deployment | ~50,000+ | ~2,500+ |

Deployment includes more than final writes. It also pays for contract-analysis
work and canonical source storage. Large comments are not preserved in stored
`__source__`, but raw submitted source is still size-limited.
