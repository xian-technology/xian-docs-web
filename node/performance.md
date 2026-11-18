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

## Repeatable Five-Node Benchmarks

From `xian-stack`, run both transfer and contract-heavy workloads in two modes:

```bash
make localnet-vm-tps-bench LOCALNET_TPS_BENCH_OPS='1000' \
  LOCALNET_TPS_BENCH_ARGS='--repeats 3 --warmups 1 --output-path .artifacts/performance/result.json'
```

This target initializes its own five-validator localnet, builds the node image,
runs the campaign and stops the network. Use a separate checkout if another
localnet is in use: the generated homes, Compose project and container names
belong to this checkout's localnet.

- `manual`: reserves sender nonces before timing and supplies `--manual-chi`
  explicitly (default 2,000). Measured transactions perform no simulation.
  Wallet funding and contract deployment happen outside the measured window
  and may simulate. Signing and broadcast remain inside it.
- `automatic`: one persistent xian-py client per sender manages nonce allocation
  and simulates each transaction for chi. Both operations count toward elapsed
  time. Sender streams remain ordered; different wallets run concurrently.

Choose one with `--preparation-mode manual` or `automatic`; the default is
`both`. Choose the smallest safe manual chi budget for the workload and runtime
before establishing a baseline. Excess chi reduces block packing and changes
fees, so a generous budget is not a claim of maximum network capacity. Change
`LOCALNET_TPS_BENCH_WALLET_COUNT` and `LOCALNET_TPS_BENCH_SUBMIT_WORKERS` to
explore saturation. Both modes require every requested transaction to succeed,
check receipts, compare sampled final state on all five nodes and compare
application hashes. A failed transaction or lost submission fails the run.

The primary regression measurement is successful workload transactions divided
by client wall time from first submission through receipt resolution. Setup is
excluded. One warm-up per workload/mode/size is discarded; three measured
repeats produce median, minimum and maximum TPS. Chain-time TPS, submission
elapsed time and application-stage timings provide additional diagnostics.
Small block windows and receipt polling can distort these values; use larger
operation counts for capacity investigations. Five validators on one host
measure that host and configuration, not a geographically distributed network.

Compare against an accepted report from the same configuration and runner class:

```bash
make localnet-vm-tps-bench LOCALNET_TPS_BENCH_OPS='1000' \
  LOCALNET_TPS_BENCH_ARGS='--baseline /absolute/path/reference.json --max-regression-percent 25'
```

A median TPS drop greater than the tolerance fails. Missing measurements,
failed runs, fewer than three measured samples, different fee/consensus policy,
runner class, CPU count, container resource limits, workload settings or topology
reject the comparison.
The report records source commits and dirty status; use committed inputs for
accepted references. The initial chain is fresh for each campaign, while
repeats use fresh wallets/contracts on the same growing chain. Keep the same
campaign order and sizes for comparisons.

### CI Policy

`Localnet Performance` runs nightly and by manual dispatch on GitHub-hosted
Ubuntu 24.04. It exercises both modes and both workloads with 1,000 operations,
16 sender wallets, one warm-up and three measured repeats. Node dependencies
come from the stack release manifest, and the report records resolved source
commits. Update those pins to measure a changed node/runtime; changing an
unpinned sibling branch alone does not change what this job builds.

Without an accepted baseline, this job collects measurements and gates only
correctness. Select a successful `baseline_run_id` when dispatching, or set the
repository variable `XIAN_PERFORMANCE_BASELINE_RUN_ID` for scheduled comparisons.
The baseline is the `localnet-performance` artifact from that run. Artifacts
expire after 90 days: preserve accepted reports for long-term local comparisons
and deliberately select a replacement CI reference before expiry.

The initial comparison tolerance is 25%, a configurable starting policy, not
an empirically calibrated noise allowance. Measure several clean runs to assess
variance before enabling a required performance status. Investigate a failed
comparison and rerun against the same reference; do not automatically replace
the reference after a slow run. Keep normal pull-request correctness checks
independent of this hosted-runner performance job. A consistent dedicated
runner can support a tighter release gate once its variance has been measured.
