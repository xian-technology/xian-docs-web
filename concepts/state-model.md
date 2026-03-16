# State Model

Xian stores all contract data in a key-value database. Every `Variable` and `Hash` in every contract maps to entries in this database. Understanding how state is organized, cached, and committed helps you write efficient contracts and debug unexpected behavior.

## Key Format

All state keys follow the pattern:

```
contract_name.variable_name:key1:key2:...
```

Examples:

| Contract State | Storage Key |
|---------------|-------------|
| `currency.balances["alice"]` | `currency.balances:alice` |
| `currency.balances["alice", "bob"]` | `currency.balances:alice:bob` |
| `con_nft.owner` (Variable) | `con_nft.owner` |
| `con_dex.pairs["TAU", "ETH"]` | `con_dex.pairs:TAU:ETH` |
| `con_game.metadata["name"]` | `con_game.metadata:name` |

The `.` separates the contract name from the variable name. The `:` separates key dimensions. You never construct these keys manually in contract code -- the ORM (`Hash`, `Variable`) handles it. But knowing the format is useful when querying state via the API.

## Storage Backend: LMDB

Xian uses LMDB (Lightning Memory-Mapped Database) as the underlying storage engine. LMDB provides:

- Memory-mapped I/O for fast reads
- Single-writer, multiple-reader concurrency
- ACID transactions with crash recovery
- No garbage collection pauses

All state for all contracts lives in a single LMDB environment on each validator node.

## Cache Layers

State access goes through multiple cache layers before hitting disk:

```
Contract code
    |
    v
Pending Writes (in-memory dict)
    |  Current transaction's uncommitted state changes.
    |  Reads check here first (read-your-own-writes).
    v
TTL Cache (in-memory LRU)
    |  Recently accessed values from previous transactions.
    |  Reduces LMDB read pressure during block execution.
    v
LMDB (disk)
    Persistent storage. Source of truth after each block.
```

### Pending Writes

During execution of a single transaction, all writes go into an in-memory buffer. If the transaction succeeds, these writes are promoted to the next layer. If it fails (assertion error, out of stamps), they are discarded entirely.

This is how Xian achieves atomic transactions -- either all state changes apply or none do.

### TTL Cache

Between transactions within the same block, a time-limited cache holds recently accessed values. This avoids redundant LMDB lookups when multiple transactions in the same block read the same keys.

### LMDB Persistence

At the end of each block, all committed state changes are written to LMDB in a single atomic batch. This ensures that:

- A crash mid-block does not corrupt state
- The state on disk is always a complete, consistent snapshot at a block boundary

## Atomic Batch Commits

State changes from an entire block are committed in one LMDB write transaction:

```
Block N execution:
  tx1: balances["alice"] -= 100, balances["bob"] += 100    (success)
  tx2: balances["carol"] -= 50, balances["dave"] += 50     (success)
  tx3: balances["eve"] -= 9999                              (fail - rolled back)

Commit:
  Only tx1 and tx2 state changes are written to LMDB.
  tx3's changes were already discarded from pending_writes.
```

## Rollback on Failed Transactions

When a transaction fails (assertion error, out of stamps, runtime error), its state changes are rolled back:

1. The pending writes buffer for that transaction is discarded
2. No state from the failed transaction reaches LMDB
3. The stamps consumed up to the failure point are still charged
4. Events emitted during the failed transaction are also discarded

This rollback is immediate and requires no explicit undo logic -- the pending writes were never committed.

## State and the App Hash

After committing a block's state changes, each validator computes an `app_hash` -- a hash of the entire state database. This hash is included in the next block's header and is how CometBFT verifies that all validators agree on the state.

If any validator has a different state (due to non-deterministic execution, a bug, or data corruption), its `app_hash` will differ, and the consensus protocol will flag the disagreement.

## Querying State

You can read any contract's state via the API without executing a transaction:

```
GET /api/abci_query/get/currency.balances:alice
```

This reads directly from the committed LMDB state (not from any in-flight transaction's pending writes).

See [REST API](/api/rest) for all query endpoints.
