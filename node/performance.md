# Performance and Capacity

Measure a representative workload before changing node settings. Transaction
count alone does not describe execution cost: transfers, deployments, swaps,
delegation rewards, and proof verification stress different parts of the node.

## Establish a Baseline

Record the release revisions or image digests, node topology, CPU and memory
limits, state size, validator/delegator population, and enabled services. Use
the same workload and initial state when comparing configurations.

Start with parallel execution disabled. Observe:

- submitted, included, successful, and failed transaction counts separately
- block execution and commit duration, including slower blocks
- receipt latency and mempool backlog
- CPU use, resident memory, disk latency, and free space
- BDS indexed height and spool growth when indexing is enabled

The [localnet harness](/node/localnet-e2e) records integration evidence.
Production sizing also needs a longer run with representative state and
network conditions. A short local transfer benchmark is not a capacity
guarantee for a deployed network.

## Find the Expensive Stage

Inspect `/perf_status` through ABCI or the dashboard, and use the application
metrics endpoint for trends. Useful timing scopes include:

| Scope | What it helps investigate |
| --- | --- |
| `finalize_decode` | transaction decoding and admission work |
| `finalize_execute`, `finalize_parallel` | serial or speculative execution |
| `tx_process_output` | result shaping and reward effects |
| `finalize_result_assembly` | transaction result and event serialization |
| `finalize_state_root` | application-hash preparation |
| `finalize_bds_enqueue` | preparing the local indexing handoff |

Some scopes contain other scopes. Do not add all timings together as if they
were independent parts of block latency.

## Tune Parallel Execution

Enable parallel execution only after recording the serial baseline. Increase
the worker count gradually and compare completed work, latency, memory, and
fallback counters under the same workload.

Independent reads and writes are the best candidates. Repeated senders,
shared balances, broad scans, and other overlapping state access reduce the
amount of reusable speculative work. More workers can increase memory and
coordination costs without improving throughput.

Keep a configuration only if it improves measured performance and produces
the same state, transaction results, and events as serial execution. See
[Parallel Block Execution](/concepts/parallel-block-execution) for controls
and acceptance counters.

## Include Optional Services

Simulation, dashboard queries, and BDS do not define consensus rules, but they
share host resources and some application request paths. Measure node latency
while these services are busy, not only while they are idle.

For BDS, check whether indexed height keeps up and whether an outage backlog
drains after the database returns. Leave disk capacity for the spool, database,
snapshots, and retained CometBFT history. A queue limit is not a total disk-use
limit. See [Pruning and Retention](/node/pruning).

## Contract-Level Improvements

- keep storage values and return payloads compact
- avoid rewriting unchanged state
- reuse values already read within a call
- paginate collection reads
- minimize unnecessary cross-contract calls
- simulate the real call against representative state before choosing a budget

Use the native VM's [chi costs](/reference/chi-costs) for fee reasoning.
Local Python harness metering is useful for regression tests but uses a
different meter.
