# Parallel Block Execution

Xian can speculatively execute block transactions in parallel without changing
the canonical result of the block.

The important boundary is this:

- `xian-contracting` does not execute multiple contracts concurrently inside a single Python process
- `xian-contracting` owns the native speculative execution controller
- `xian-abci` wraps that controller for block processing, reward shaping, and
  node-facing metrics
- final accepted state must stay equivalent to normal serial execution in block
  order

That makes parallel execution a node-side optimization, not a change to
consensus semantics.

## Where The Boundary Lives

Inside `xian-contracting`, each in-process execution is guarded by a lock.
That runtime mutates process-global Python import hooks and module caches, so it
does not try to run multiple contract executions concurrently inside one Python
process.

Instead, `xian-contracting` exposes a native speculative controller that uses
separate worker processes for speculative execution. In the block path,
`xian-abci` uses that controller with a worker runtime built from
`ContractingClient`, `Driver`, `TxProcessor`, and the optional rewards handler
against the same committed LMDB state snapshot.

So the model is:

- one block has one canonical transaction order
- workers speculate independently on the last committed state
- the main process decides which speculative results are safe to accept

## How It Works

At a high level:

```mermaid
flowchart TD
  Block["CometBFT finalizes block contents and order"]
  Gate{"Parallel execution enabled and block large enough?"}
  Serial["Execute remaining transactions serially"]
  Wave["Build a speculative wave"]
  Workers["Worker processes execute with auto_commit=false"]
  Metadata["Return result plus read/write/prefix metadata"]
  Accept["Accept conflict-free prefix in canonical order"]
  Tail{"Tail worth speculating?"}
  Apply["Apply accepted results in block order"]
  Commit["Normal LMDB batch commit and app_hash"]

  Block --> Gate
  Gate -->|no| Serial
  Gate -->|yes| Wave
  Wave --> Workers
  Workers --> Metadata
  Metadata --> Accept
  Accept --> Tail
  Tail -->|yes| Wave
  Tail -->|no| Serial
  Accept --> Apply
  Serial --> Apply
  Apply --> Commit
```

1. CometBFT finalizes the block contents and order.
2. If parallel execution is enabled and the block is large enough, the native
   controller in `xian-contracting` builds a speculative wave and sends those
   transactions to a worker pool.
3. Each worker executes its assigned transaction with `auto_commit=false`,
   collects access metadata, and returns a proposed result.
4. The main process checks the speculative results in canonical order and
   accepts the conflict-free prefix of that wave.
5. If the tail conflicts with earlier accepted work, the node either
   respeculates that tail against the updated overlay or falls back to serial
   execution when the remaining tail is not worth another speculative wave.
6. Accepted speculative results are applied in canonical order.
7. After the block is complete, the node commits the final block state through
   the normal LMDB batch write path.

The critical point is that speculation happens first, but acceptance
happens in normal block order.

## Worked Example

Consider a canonical block ordered like this:

1. `tx1`: `currency.transfer(alice -> bob, 10)`
2. `tx2`: `currency.transfer(carol -> dave, 20)`
3. `tx3`: `orders.place(id=1)` writing `orders:1`
4. `tx4`: `orders.summary()` scanning `orders:` with `Hash.all()`

The controller can speculate all four in one wave because nothing about the
front of the queue makes that impossible up front.

The worker results might look like this:

- `tx1` reads and writes Alice and Bob balance keys
- `tx2` reads and writes Carol and Dave balance keys
- `tx3` writes `orders:1`
- `tx4` records a prefix read on `orders:`

Acceptance walks the block in order:

- `tx1` is accepted
- `tx2` is accepted
- `tx3` is accepted
- `tx4` is rejected from that wave because its prefix read overlaps with the
  earlier accepted write to `orders:1`

At that point, the node does not reorder the block. It keeps `tx1`, `tx2`, and
`tx3` exactly where they are, then handles the tail:

- it can respeculate `tx4` against the updated overlay in a later wave
- or it can execute `tx4` serially if the remaining tail is not worth another
  speculative wave

Either way, the final result must match normal serial execution of
`tx1 -> tx2 -> tx3 -> tx4`.

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

Fallback conditions include:

- the same sender already appeared earlier in the accepted block path
- a key this transaction read was written earlier
- a key this transaction writes was read or written earlier
- a tracked prefix scan overlaps with earlier accepted writes
- a normal write overlaps with earlier additive writes
- an additive write overlaps with earlier normal writes
- the worker failed to return a usable speculative result

This is why parallel execution is described as speculative rather than
concurrent mutation.

## Prefiltered vs Fallback

The runtime exposes two different operator-facing counters because they mean
different things:

- `serial_prefiltered`: the controller chose not to speculate a remaining head
  transaction at all, usually because fewer than two safe front-of-queue
  candidates were worth putting into a wave
- `serial_fallbacks`: the transaction was part of speculative handling, but the
  accepted-prefix checks or a worker failure forced it back onto the serial path

In practice, same-sender reuse near the front of the remaining queue often
shows up as prefiltering, while read-after-write tails, write conflicts, and
prefix-scan conflicts are more likely to show up as speculative fallback or
later-wave respeculation.

## Why It Is Real Parallelism

This is real parallel execution, but not unsafe shared-state concurrency.

- multiple transactions can execute at the same time in separate worker
  processes
- one in-process `Executor` executes one transaction at a time
- final acceptance stays serial-equivalent

Xian uses multiple CPU cores for speculative contract execution while keeping
the correctness model tied to canonical block order.

## The Reward-Delta Exception

Normal shared writes are treated conservatively as conflicts.

The explicit exception is reward accounting. Reward outputs are modeled
as additive deltas, not ordinary overwrites. Two transactions can both add to
the same recipient balance and be accepted speculatively because the
merge operation is deterministic addition.

But if another transaction reads that balance, or directly overwrites it, the
executor falls back to serial execution.

## Current Operator Controls

Parallel execution is configured as top-level keys in the rendered
`config/xian.toml`. The current controls are:

- `parallel_execution_enabled`
- `parallel_execution_workers`
- `parallel_execution_min_transactions`
- `parallel_execution_max_speculative_waves`
- `parallel_execution_min_wave_acceptance_ratio`
- `parallel_execution_low_acceptance_min_wave_size`
- `parallel_execution_warm_workers`
- `parallel_execution_access_estimates_enabled`

`parallel_execution_enabled` defaults to `false`, so operators must opt in.
When enabled, the current defaults warm worker processes and use access
estimates to plan speculative stages before falling back to runtime conflict
checks.

The performance snapshot reports both planning and execution counters,
including:

- `estimated_known_transactions`
- `estimated_unknown_transactions`
- `estimated_stage_count`
- `estimated_parallelizable_transactions`
- `estimated_known_shapes`
- `estimated_unknown_shapes`
- `planned_stage_count`
- `planned_parallelizable_transactions`
- `speculative_wave_count`
- `speculative_accepted`
- `speculative_rejected`
- `serial_prefiltered`
- `serial_fallbacks`
- `guardrail_fallbacks`

`guardrail_fallbacks` means the controller stopped speculating because the
acceptance-ratio or low-acceptance guardrails said the remaining work should run
serially.

## Why This Is Safe

This design is consensus-safe because it preserves serial semantics:

- canonical block order never changes
- validators can mix enabled and disabled parallel posture and converge on
  the same final block result
- speculative workers do not commit their writes to disk
- accepted speculative results are revalidated against earlier accepted writes
- conflicting transactions are re-run serially on the accepted state
- if the speculative executor itself fails, the node falls back to ordinary
  serial block execution

In other words, the node is allowed to guess in parallel, but it is only
allowed to commit what is correct in serial order.

## Representative Throughput

The runtime includes a dedicated benchmark harness in
`xian-contracting/tests/performance/benchmark_parallel_tps.py`.

Representative local numbers from June 1, 2026 were collected on an Apple M1
development machine with 8 logical CPUs, Python 3.14.5, 4 parallel workers, 5
iterations per scenario, warmed workers, and the default guardrails of 4
speculative waves, 25% minimum wave acceptance, and 8 low-acceptance minimum
wave size.

Command:

```bash
uv run python tests/performance/benchmark_parallel_tps.py --scenario all --iterations 5 --workers 4 --markdown
```

| Workload | Tx | Rounds | Serial TPS | Parallel TPS | Speedup | Speculative outcome |
|---|---:|---:|---:|---:|---:|---|
| Independent CPU-heavy writes | 256 | 50,000 | 34 | 120 | 3.55x | 256 / 256 accepted |
| Independent light writes | 256 | 1,000 | 300 | 938 | 3.14x | 256 / 256 accepted |
| Small independent block | 8 | 10,000 | 121 | 432 | 3.63x | 8 / 8 accepted |
| Same sender, independent keys | 128 | 10,000 | 117 | 116 | 1.01x | 128 prefiltered to serial |
| Hot counter contention | 128 | 10,000 | 126 | 97 | 0.78x | 1 accepted, 127 guardrail fallbacks |
| Many writes, one scan at tail | 128 | 10,000 | 126 | 435 | 3.44x | 127 accepted, 1 prefiltered |
| Alternating writes and scans | 64 | 5,000 | 187 | 148 | 0.79x | 1 accepted, 63 guardrail fallbacks |
| Mostly independent, periodic hot counter | 128 | 10,000 | 125 | 103 | 0.82x | 9 accepted, 119 guardrail fallbacks |

These numbers are execution-engine throughput, not full end-to-end network TPS.
They compare the serial and speculative execution paths after worker warmup;
they should not be quoted as a guaranteed validator TPS figure.

The result is workload-dependent:

- parallel execution is clearly useful when a block contains many transactions
  from different senders that touch disjoint state
- it helps when broad reads such as `Hash.all()` are pushed to the tail of
  a block, because the independent prefix can be accepted first
- same-sender runs naturally collapse back to serial execution and are roughly
  neutral
- hot shared state and alternating scan/write patterns are worse than serial
  execution, even with guardrails, because the node pays for failed speculation
  before serializing the tail

That makes speculative parallel execution worth keeping as a configurable
node-side feature, especially for high-throughput workloads with independent
accounts or sharded contract state. It should remain rollout-managed rather
than blindly enabled for every validator profile. Operators should monitor
`speculative_accepted`, `serial_prefiltered`, `serial_fallbacks`, and
`guardrail_fallbacks`; if fallback-heavy blocks dominate, serial execution is
the better posture for that workload.

One important measurement boundary: this benchmark uses custom contract
functions, so the node's conservative access estimator cannot know most shapes
ahead of time. Built-in known shapes, such as common token transfer and approve
patterns, can be prefiltered or staged earlier by the ABCI wrapper. Unknown
contract shapes are safe because the runtime records actual reads,
writes, and prefix reads before accepting speculative results.

## What It Does Not Do

Parallel block execution does not:

- make `xian-contracting` multithreaded in-process
- allow naive concurrent mutation of shared state
- weaken deterministic execution requirements
- let validators accept different speculative winners

All validators have to end the block with the same final state and the
same `app_hash`.

## Related Pages

- [Transaction Lifecycle](/concepts/transaction-lifecycle)
- [Deterministic Execution](/concepts/deterministic-execution)
- [Runtime Features](/node/runtime-features)
