# Storage

Xian contracts store data on-chain using two primitives: **Variable** (single value) and **Hash** (key-value mapping). Both persist across transactions and are the only way to maintain state.

## Overview

| Type | Use Case | Example |
|------|----------|---------|
| [Variable](/smart-contracts/storage/variables) | Single value (owner, total supply, config) | `owner = Variable()` |
| [Hash](/smart-contracts/storage/hashes) | Key-value map (balances, approvals, metadata) | `balances = Hash(default_value=0)` |
| [ForeignVariable](/smart-contracts/storage/foreign) | Read another contract's Variable | `foreign_owner = ForeignVariable(...)` |
| [ForeignHash](/smart-contracts/storage/foreign) | Read another contract's Hash | `foreign_balances = ForeignHash(...)` |

## Storage Costs

Every read and write costs stamps:

| Operation | Cost |
|-----------|------|
| Read | 1 stamp per byte (key + value) |
| Write | 25 stamps per byte (key + value) |

The maximum write capacity per transaction is **128 KB**.

## Key Format

Internally, storage keys follow the pattern `contract.variable:key1:key2`. For example:

- `currency.balances:alice` — Alice's balance on the currency contract
- `con_dex.pairs:TAU:ETH` — The TAU/ETH pair on a DEX contract
- `con_nft.owner` — The owner Variable on an NFT contract

You don't construct these keys manually — the ORM handles it. But understanding the format helps when querying state via the API.
