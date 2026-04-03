# Parallel Block Execution

Xian can speculatively execute block transactions in parallel without changing
the canonical result of the block.

The important boundary is this:

- `xian-contracting` stays single-execution per process
- `xian-abci` owns the optional parallel block executor
- final accepted state must stay equivalent to normal serial execution in block
  order

That makes parallel execution a node-side optimization, not a change to
consensus semantics.

## Where The Boundary Lives

Inside `xian-contracting`, each in-process execution is guarded by a lock.
That runtime mutates process-global Python import hooks and module caches, so it
does not try to run multiple contract executions concurrently inside one Python
process.

Instead, `xian-abci` uses separate worker processes for speculative execution.
Each worker builds its own `ContractingClient`, `Driver`, and `TxProcessor`
against the same committed LMDB state snapshot.

So the model is:

- one block still has one canonical transaction order
- workers speculate independently on the last committed state
- the main process decides which speculative results are safe to accept

## How It Works

At a high level:

1. CometBFT finalizes the block contents and order.
2. If parallel execution is enabled and the block is large enough, `xian-abci`
   sends the block transactions to a worker pool.
3. Each worker executes its assigned transaction with `auto_commit=false`,
   collects access metadata, and returns a proposed result.
4. The main process walks the block again in canonical order and checks each
   speculative result against the writes already accepted from earlier
   transactions in that same block.
5. If the speculative result is still valid, the main process applies it.
6. If it is no longer valid, the transaction is re-executed serially against
   the latest main-process state.
7. After the block is complete, the node commits the final block state through
   the normal LMDB batch write path.

The critical point is that speculation happens first, but acceptance still
happens in normal block order.

## What Metadata Is Tracked

The safety model depends on deterministic access tracking.

For each transaction, the runtime records:

- exact reads: keys loaded through normal state reads
- exact writes: keys the transaction wants to set
- prefix reads: collection scans such as `Hash.all()` that depend on every key
  under a prefix
- additive writes: special commutative reward deltas tracked separately from
  normal writes

This metadata comes from the runtime/storage layer:

- `Driver.get(...)` tracks exact reads
- collection scans record prefix reads on the scanned prefix
- successful execution returns the transaction write set
- reward outputs are separated into additive deltas so they can be merged
  safely when they are purely incremental

## When A Speculative Result Is Rejected

The main process falls back to serial execution when a speculative result is no
longer safe relative to earlier accepted transactions.

Current fallback conditions include:

- the same sender already appeared earlier in the accepted block path
- a key this transaction read was written earlier
- a key this transaction writes was read or written earlier
- a tracked prefix scan overlaps with earlier accepted writes
- a normal write overlaps with earlier additive writes
- an additive write overlaps with earlier normal writes
- the worker failed to return a usable speculative result

This is why parallel execution is described as speculative rather than
concurrent mutation.

## The Reward-Delta Exception

Normal shared writes are treated conservatively as conflicts.

The current explicit exception is reward accounting. Reward outputs are modeled
as additive deltas, not ordinary overwrites. Two transactions can both add to
the same recipient balance and still be accepted speculatively because the
merge operation is deterministic addition.

But if another transaction reads that balance, or directly overwrites it, the
executor falls back to serial execution.

## Why This Is Safe

This design is consensus-safe because it preserves serial semantics:

- canonical block order never changes
- speculative workers do not commit their writes to disk
- accepted speculative results are revalidated against earlier accepted writes
- conflicting transactions are re-run serially on the latest state
- if the speculative executor itself fails, the node falls back to ordinary
  serial block execution

In other words, the node is allowed to guess in parallel, but it is only
allowed to commit what is still correct in serial order.

## What It Does Not Do

Parallel block execution does not:

- make `xian-contracting` multithreaded in-process
- allow naive concurrent mutation of shared state
- weaken deterministic execution requirements
- let validators accept different speculative winners

All validators still have to end the block with the same final state and the
same `app_hash`.

## Related Pages

- [Transaction Lifecycle](/concepts/transaction-lifecycle)
- [Deterministic Execution](/concepts/deterministic-execution)
- [Runtime Features](/node/runtime-features)
