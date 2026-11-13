# Performance and Capacity

Measure a representative workload before changing node settings. Transaction
count alone does not describe execution cost: transfers, deployments, swaps,
delegation rewards, and proof verification stress different parts of the node.

## Establish a Baseline

Record the release revisions or image digests, node topology, CPU and memory
limits, state size, validator/delegator population, and enabled services. Use
the same workload and initial state when comparing configurations.

Observe:

- submitted, included, successful, and failed transaction counts separately
- block execution and commit duration, including slower blocks
- receipt latency and mempool backlog
- CPU use, resident memory, disk latency, and free space
- BDS indexed height and spool growth when indexing is enabled

The [localnet harness](/node/localnet-e2e) records integration evidence.
Production sizing also needs a longer run with representative state and
network conditions. A short local transfer benchmark is not a capacity
guarantee for a deployed network.

## Block Chi Capacity

The genesis fee policy caps each block at `max_block_chi` (500,000 by default),
counted as the sum of the chi each transaction **supplies**, not the chi it
uses. Block capacity therefore depends on how much chi clients supply: five
transactions that each supply 100,000 chi fill a default block even if each
uses a few thousand. Clients should supply a simulated estimate plus a small
margin, which xian-py and xian-js do by default when a transaction omits its
chi limit. See
[Chain Chi Caps](/concepts/chi#chain-chi-caps).

Serial execution cost per transaction does not grow with the block: the node
undoes a transaction's tentative state changes in place instead of copying the
block's pending writes, and reuses each contract's parsed and validated IR for
byte-identical stored text. Neither changes chi, receipts or state.

## Find the Expensive Stage

Inspect `/perf_status` through ABCI or the dashboard, and use the application
metrics endpoint for trends. Useful timing scopes include:

| Scope | What it helps investigate |
| --- | --- |
| `finalize_decode` | transaction decoding and admission work |
| `finalize_execute` | block transaction execution |
| `tx_process_output` | result shaping and reward effects |
| `finalize_result_assembly` | transaction result and event serialization |
| `finalize_state_root` | application-hash preparation |
| `finalize_bds_enqueue` | preparing the local indexing handoff |

Some scopes contain other scopes. Do not add all timings together as if they
were independent parts of block latency.

Blocks execute serially; there is no parallel-execution setting to tune. See
[Block Execution](/concepts/block-execution).

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
Local `ContractingClient` metering uses the native V2 VM and is useful for
regression tests. Use node simulation for a fee estimate against the target
state, transaction envelope and configuration.
