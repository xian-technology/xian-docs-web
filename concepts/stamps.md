# Stamps & Metering

Stamps are Xian's unit of computation, analogous to gas on Ethereum. Every operation in a smart contract -- arithmetic, storage reads, storage writes, function calls -- costs stamps. This prevents infinite loops, limits resource consumption, and compensates validators for execution work.

## How Stamps Work

When you submit a transaction, you specify a stamp limit (the maximum stamps you are willing to spend). The contract executes, and the actual stamps consumed are deducted from your XIAN balance.

- If the contract completes within the stamp limit, you pay only the stamps actually used.
- If the contract exceeds the stamp limit, execution halts, all state changes are rolled back, and you pay the full stamp limit.

## Cost Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `READ_COST_PER_BYTE` | 1 | Stamps charged per byte when reading from storage |
| `WRITE_COST_PER_BYTE` | 25 | Stamps charged per byte when writing to storage |
| `STAMPS_PER_T` | 20 | Number of stamps purchased by 1 XIAN. `T` stands for the native token. |
| Base transaction cost | 5 | Flat stamp cost added to every transaction |

## The Stamp Formula

The total stamp cost of a transaction is computed as:

```
stamps_used = (raw_compute_cost // 1000) + 5
```

Where:
- `raw_compute_cost` is the sum of all instruction costs (each Python opcode has a cost between 2 and 1610 compute units)
- The `// 1000` division converts compute units to stamps
- `+ 5` is the base transaction cost

Storage costs are added on top of compute costs:
- Each storage read adds `byte_count * 1` stamps
- Each storage write adds `byte_count * 25` stamps

The byte count includes both the key and the value.

## Limits

| Limit | Value |
|-------|-------|
| Maximum stamps per transaction | 6,500,000 |
| Maximum call count per transaction | 800,000 opcodes |
| Maximum write per transaction | 128 KB |
| Default stamp allocation | 1,000,000 |

If any limit is exceeded, the transaction fails and all state changes are reverted. The stamps consumed up to the failure point are still charged.

## Converting Stamps to XIAN

Stamps are purchased with XIAN, the native currency:

```
XIAN cost = stamps_used / STAMPS_PER_T
XIAN cost = stamps_used / 20
```

Examples:

| Stamps Used | XIAN Cost |
|-------------|----------|
| 100 | 5.0 |
| 1,000 | 50.0 |
| 10,000 | 500.0 |
| 100,000 | 5,000.0 |
| 1,000,000 | 50,000.0 |

## What Costs Stamps

### Computation

Every Python bytecode instruction incurs a cost. The metering engine uses `sys.monitoring` to count instructions during execution. Common instruction costs range from 2 to 1610 compute units.

### Storage Reads

Reading a value from state costs 1 stamp per byte of the key and value combined:

```python
# Reading balances["alice"] where the stored value is "1000000"
# Key: "con_token.balances:alice" (24 bytes)
# Value: "1000000" (7 bytes)
# Cost: 31 stamps
balance = balances["alice"]
```

### Storage Writes

Writing a value costs 25 stamps per byte:

```python
# Writing balances["alice"] = 999000
# Key: "con_token.balances:alice" (24 bytes)
# Value: "999000" (6 bytes)
# Cost: 750 stamps
balances["alice"] = 999000
```

### Cross-Contract Calls

Calling a function on another contract incurs the stamp cost of executing that function, plus the overhead of the call itself.

## Optimizing Stamp Usage

- **Minimize storage writes** -- writes cost 25x more than reads per byte
- **Use shorter variable and key names** -- key length contributes to byte cost
- **Cache reads in local variables** -- reading the same key twice costs stamps twice
- **Use `default_value`** -- avoids storing default entries explicitly
- **Batch related operations** -- fewer cross-contract calls means less overhead

## Stamps in Practice

A simple token transfer typically costs between 200 and 500 stamps. A complex DEX swap involving multiple contracts might cost 2,000-10,000 stamps. Contract deployment (submission) costs more because the entire source code is stored on-chain.

You can estimate stamp costs before submitting a transaction by using [dry runs](/api/dry-runs).
