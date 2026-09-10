# 5-Validator Localnet E2E

The `xian-stack` localnet harness validates the integrated runtime on one
machine with five validators, the fixed Xian VM, and optional indexed services.

## Choose a Flow

| Goal | Command |
| --- | --- |
| disposable five-node network | `LOCALNET_NODES=5 make localnet-init && make localnet-up` |
| broad whole-stack E2E | `make localnet-e2e` |
| E2E with parallel execution | `make localnet-parallel-e2e` |
| validator/governance safety | `make localnet-protocol-safety` |
| release-grade gate | `make release-safety` |

Use the clean localnet for interactive debugging. Use the E2E or release gate
when you need recorded cross-repo evidence.

## Run the Harness

```bash
cd ../xian-stack
make localnet-e2e
```

Machine-facing equivalent:

```bash
python3 ./scripts/backend.py localnet-e2e
```

Artifacts are written under:

```text
.artifacts/localnet-e2e/<run-id>/
```

The directory contains `summary.json`, per-phase JSON, and the generated
network description. A failed run can resume from a supported phase with the
backend's `--start-phase` and `--resume-dir` options. Resume at a phase that
has not begun. Use a fresh run when repeating a partially executed recovery,
nonce, accounting, or replay scenario: those checks retain stateful fixtures
and refuse to reuse existing observer or replay directories.

## Coverage

The layered harness covers:

- five-node startup, health, peers, validator count, and app-hash agreement
- application version, submission-name admission, and query-height/error
  semantics through each running node's CometBFT RPC
- proposal byte-budget and nonce-selection checks in isolated processes using
  each node image's installed runtime and fee configuration
- real deployment at the 64-character contract-name limit, with constructor
  state checked through RPC on all five validators
- `xian-py` reads, simulation, source deployment, and transactions
- nested contract deployment/calls and rollback
- periodic, burst, conflicting, and invalid transaction workloads
- DEX bootstrap and mixed trading
- BDS outage, catch-up, indexed reads, reindex, and watchers
- validator governance, policy transitions, and governed fee-distribution changes
- governed forward state patches
- application logging modes
- shielded-note and relayed proof flows with governed verifier registration
- parallel execution acceptance and fallback behavior
- restart/chaos convergence and soak checks
- process crashes before state persistence, after persistence, and before the
  commit response, with transaction effects and nonces checked after recovery
- real 4/1 and 3/2 network partitions, progress with quorum, a halt without
  quorum, reconvergence after healing, and a full-network restart
- fresh non-validator catch-up from genesis and peer state sync interrupted
  after the first snapshot chunk
- the same blocks executed by serial and parallel validators, comparing
  application hashes, transaction results, events, and consensus updates
- nonce gaps, conflicting pending nonces, submission-node restart, replay
  rejection, and a queued transaction whose balance becomes insufficient
- a seeded accounting model covering transfers, minting, burning, staking,
  unstaking, failed-call rollback, native fees, rewards, and a network restart
- exact transaction-size boundaries, pending transaction bytes exceeding one
  block, compute exhaustion with rollback, and successful execution afterward
- offline replay from public block data, rebuilding application state and
  comparing every block's application root, transaction outcomes, chi usage, and events

The validator-governance phase proposes and approves a non-default transaction
fee split of 60% validators, 10% burn, 10% foundation, and 20% contract
developers. It waits for the `rewards` state to converge on all five nodes,
executes a fee-paying contract transaction, and verifies the resulting
validator/delegator, implicit burn, foundation, and developer totals against
the approved ratios. The test-specific split is deliberately different from
the canonical 70/0/0/30 genesis default.

## Recovery and Accounting Checks

Recovery phases temporarily stop validators, disconnect Docker networks, and
terminate an application process at a selected persistence boundary. Each
crash scenario checks that the network recovers without losing or duplicating
the transaction. Crash hooks are installed only in disposable test containers;
they are not included in the node image.

The partition test checks voting power before splitting the network. Four
validators must keep producing blocks when one is isolated. With neither side
holding more than two thirds of the voting power, the 3/2 split must halt.
After reconnecting, all five nodes must agree on application hashes and block
results. Fresh observers have newly generated keys and no validator voting
power. They must catch up to the running network, including after an
interrupted multi-chunk state sync.

The accounting phase compares contract state after each operation against a
separate Python model, including zero, negative, and oversized amounts. It
checks conservation of the test asset, rollback on failure, native currency
charged as fees, and the net supply reduction from
burning. The governed fee-distribution phase checks reward recipients and
ratios. A restart midway through the accounting sequence checks persistence.
The default accounting workload is 48 operations:

```bash
LOCALNET_E2E_INVARIANT_ROUNDS=120 \
LOCALNET_E2E_SEED=accounting-review-1 \
make localnet-e2e
```

The seed and operation trace are recorded with the phase results. A seed
reproduces the generated choices; network timing and block grouping can vary.

## Replay Across Architectures

A successful E2E run exports `replay-corpus/` and performs a local replay. The
corpus contains public configuration, CometBFT block databases, expected
result digests, and source revisions. Application state and validator private
keys are excluded. A fresh application must re-execute the stored blocks;
copying an existing state database cannot satisfy this test.

The scheduled **Localnet Safety** workflow uses that same corpus on native
ARM64 and x86-64 runners. Each runner builds the recorded source revisions and
compares the application root and actual re-execution results for every
block. A local E2E pass covers the host architecture; check both CI replay jobs
before treating cross-architecture behavior as validated.

To check a retained corpus against a locally built node image:

```bash
uv run python scripts/localnet_replay_corpus.py \
  --corpus .artifacts/localnet-e2e/<run-id>/replay-corpus \
  --image xian-node-integrated:local --output .artifacts/replay-check
```

Use a fresh output directory. Its `result.json` records the image,
architecture, replay height, root, and number of compared blocks. Local runs
also flag uncommitted source changes; CI requires committed revisions so the
replay builds can reproduce the source network.

## Release Safety

```bash
make release-safety
```

This runs release validation for the contracting/runtime repos, stack
validation, parallel E2E, a node capability report, and protocol-safety
coverage. Use it before tagging changes to execution, genesis, networking,
governance, validator behavior, or localnet plumbing.

## Topology Matrix

Exercise both integrated and fidelity topology, with parallel execution off and
on when the change can affect process boundaries or speculation:

```bash
XIAN_LOCALNET_TOPOLOGY=fidelity \
XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=1 \
XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS=4 \
make localnet-e2e
```

The default harness remains the baseline. Overrides should answer a specific
validation question and be recorded with the run artifacts.

## Operational Notes

- Generated validator keys and proving material are disposable local test
  assets.
- The BDS phase intentionally causes an outage; block production must continue
  and the indexed head must recover afterward.
- Localnet PostgreSQL uses a Docker-managed volume. Normal `localnet-down`
  preserves it; a fresh E2E bootstrap and `localnet-clean FORCE=1` remove the
  generated localnet's volumes. Copying `.localnet/` alone does not back up BDS.
- Shielded phases perform real proving and can dominate runtime. Recovery and
  replay add temporary observer containers and extra disk usage. The resource
  boundary phase deliberately submits several large transactions; leave Docker
  enough memory and disk space for the five validators plus an observer. That
  phase temporarily allows 30 seconds for proposals and 10 seconds for voting
  steps so full-size blocks can propagate at the configured P2P bandwidth. It
  restores the ordinary timings afterward; this is a resource-boundary check,
  not a throughput benchmark.
- `TRACE` logging is temporary diagnostic posture.
- A running container is not ready until health checks pass.
- `make localnet-clean` is destructive and requires `FORCE=1`.

## Review Results

Inspect `summary.json`, the first failing phase, BDS indexed-height progress,
node application logs, Docker logs, and final app-hash agreement. Preserve the
run directory with the exact sibling SHAs when using it as release evidence.
