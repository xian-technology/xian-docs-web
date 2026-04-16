# Chi & Metering

Chi is Xian's execution-energy unit. It is the budget that limits computation,
storage work, and other metered runtime behavior during a transaction.

It is not a separate token. It is the unit Xian uses to price execution.

## How Chi Works

When a transaction is submitted, it carries a chi limit.

- if execution finishes within that limit, the transaction succeeds and the
  chain charges the chi actually used
- if execution exceeds the limit, execution aborts, state changes roll back,
  and the submitted limit is what matters for failure accounting

## Core Constants

| Constant | Value | Meaning |
|----------|-------|---------|
| `READ_COST_PER_BYTE` | `1` | chi per stored byte read |
| `WRITE_COST_PER_BYTE` | `25` | chi per stored byte written |
| `CHI_PER_T` | `20` | chi purchased by one unit of the native token |
| base transaction cost | `5` | flat chi charged on every transaction |

## Base Formula

Tracer-backed execution currently uses the familiar compute-to-chi conversion:

```text
chi_used = (raw_compute_cost // 1000) + 5
```

Storage charges are then added on top based on the encoded key and value sizes.

For `xian_vm_v1`, the execution machine changes, but the same high-level idea
does not: VM work, host operations, storage, transaction bytes, and return
payload size are all metered explicitly against the transaction's chi budget.

## What Gets Metered

### Computation

Xian currently supports three metering backends:

- `python_line_v1`: deterministic source-line buckets
- `native_instruction_v1`: exact executed Python bytecode instructions
- `xian_vm_v1`: VM-native gas schedule over VM operations and host calls

The network chooses the execution engine and metering policy. Applications and
validators do not get to improvise their own cost model.

### Storage Reads

Reading state costs `1` chi per byte of encoded key plus encoded value.

### Storage Writes

Writing state costs `25` chi per byte of encoded key plus encoded value.

Writes are intentionally much more expensive than reads because they expand the
durable chain state.

### Cross-Contract Calls

Cross-contract calls meter the called work too. In practice that means a single
transaction can accumulate chi across multiple contracts if it touches multiple
execution paths.

### Proof Verification and Other Runtime Bridges

Metered runtime bridges such as hashing, signature checks, and zk verification
also contribute to total chi usage. In the VM-native path, these appear as
explicit host operations instead of implicit Python work.

## Limits

| Limit | Value |
|------|-------|
| maximum chi per transaction | `6,500,000` |
| maximum Python line events per transaction (`python_line_v1`) | `800,000` |
| maximum instruction events per transaction (`native_instruction_v1`) | `3,250,000` |
| maximum write per transaction | `128 KB` |
| default chi allocation | `1,000,000` |

Those line/instruction ceilings are tracer-backend safety limits. VM-native
execution uses its own gas schedule rather than those tracer-event counters.

## Converting Chi To Native Token Cost

Chi is priced through the chain's native token:

```text
token_cost = chi_used / 20
```

Examples:

| Chi used | Token cost |
|----------|------------|
| `100` | `5.0` |
| `1,000` | `50.0` |
| `10,000` | `500.0` |
| `100,000` | `5,000.0` |
| `1,000,000` | `50,000.0` |

## Why Chi Matters For Design

Chi is not only a billing detail. It shapes how you design contracts:

- long or repeated storage writes are expensive
- repeated reads add up
- deep multi-contract flows cost more than simple direct calls
- proof-backed and privacy-preserving flows are expected to cost more than
  trivial public transfers

## Practical Optimization Rules

- minimize storage writes
- cache repeated reads in local variables
- keep stored keys and values compact
- avoid unnecessary cross-contract hops
- simulate before submitting when the SDK supports it

## See Also

- [Estimating Chi](/api/dry-runs)
- [Chi Cost Table](/reference/chi-costs)
- [The Xian VM](/concepts/xian-vm)
