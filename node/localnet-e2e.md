# 5-Validator Localnet E2E

Use this workflow when you want to validate the live Xian stack on one machine
with a real 5-validator network, not just repo-local unit tests.

The maintained entrypoint lives in `xian-stack` and is designed to exercise the
real runtime path with:

- 5 validators
- the native Rust tracer
- one BDS-enabled service node
- real validator governance
- governed forward state patches
- `xian-py`
- nested contract deployment and dynamic contract-call routing
- DEX deployment and mixed trading flows
- shielded-note-token proof-backed flows
- indexed reads, websocket subscriptions, and event watching
- logging, readonly simulation under load, intentional BDS catch-up, and
  dedicated parallel-execution validation

## Canonical Command

From `xian-stack`:

```bash
make localnet-e2e
```

Equivalent machine-facing backend command:

```bash
python3 ./scripts/backend.py localnet-e2e
python3 ./scripts/backend.py localnet-e2e --start-phase 10-retrieval-surfaces --resume-dir .artifacts/localnet-e2e/<run-id>
```

Artifacts are written under:

```text
.artifacts/localnet-e2e/<run-id>/
```

The runner writes:

- `summary.json`
- one JSON file per phase
- a copy of the generated `network.json`

## What The Runner Does

The phases intentionally build on each other:

1. bootstrap a fresh 5-validator network with the native tracer and a BDS-enabled
   service node
2. verify health, peer connectivity, validator count, and recent app-hash
   equality
3. use `xian-py` to fund accounts, deploy helper contracts, simulate, and read
   state
4. deploy a contract factory that submits multiple child contracts, then test
   dynamic contract/function dispatch and multi-hop `ctx.caller` /
   `ctx.signer` behavior
5. send periodic transfers from different nodes
6. run a higher-rate burst workload and capture approximate TPS
7. trigger conflicting and invalid transactions intentionally
8. deploy and exercise the DEX contract pack
9. hammer readonly simulation and capture approximate simulator QPS
10. intentionally let the primary BDS service fall behind by stopping
    Postgres, generate live chain traffic, then verify it catches back up
11. validate retrieval through indexed BDS reads, `abci_query`, `xian-py`
   watchers, raw websocket tx subscriptions, paginated `/keys/<prefix>`
   retrieval, and a secondary BDS reindex/restart path fed from retained block
   history
12. run a dedicated determinism check by comparing recent app hashes, sampled
    state, and simulation outputs across validators
13. vote a validator power change, remove a validator, and add it back through
    real on-chain governance
14. approve and apply a governed forward state patch
15. switch logging posture to `DEBUG` and `TRACE` and verify the expected log
    output appears
16. use the governed system `zk_registry`, deploy the shielded-note-token, then
    test deposit, shielded transfer, and withdraw flows
17. run a dedicated parallel-execution probe that:
    - verifies `/perf_status` reports the configured parallel on/off posture on
      every validator
    - forces a non-conflicting batch and checks for speculative acceptance
    - forces same-sender reuse and checks for serial prefiltering
    - forces read-after-write and prefix-scan tails and checks for multi-wave
      speculative handling

## Recommended Matrix

Run the same exercise in these modes over time:

### Integrated Topology, Parallel Off

```bash
XIAN_LOCALNET_TOPOLOGY=integrated \
XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=0 \
make localnet-e2e
```

### Integrated Topology, Parallel On

```bash
XIAN_LOCALNET_TOPOLOGY=integrated \
XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=1 \
XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS=4 \
XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS=4 \
make localnet-e2e
```

### Fidelity Topology, Parallel Off

```bash
XIAN_LOCALNET_TOPOLOGY=fidelity \
XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=0 \
make localnet-e2e
```

### Fidelity Topology, Parallel On

```bash
XIAN_LOCALNET_TOPOLOGY=fidelity \
XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=1 \
XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS=4 \
XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS=4 \
make localnet-e2e
```

## Useful Overrides

```bash
LOCALNET_E2E_BUILD=1 make localnet-e2e
LOCALNET_E2E_BURST_COUNTER_OPS=500 make localnet-e2e
LOCALNET_E2E_DEX_ROUNDS=12 make localnet-e2e
LOCALNET_E2E_BOOTSTRAP=0 make localnet-e2e
```

`LOCALNET_E2E_BOOTSTRAP=0` is only for rerunning the phased checks against an
already-running localnet.

## Operational Notes

- The runner creates disposable local validator keys and stores them in
  `.localnet/network.json` so it can exercise real validator governance. Treat
  those keys as local-only dev material.
- The shielded-note-token is exercised as a privacy-asset flow, but it is not
  currently listed on the DEX in the canonical run. The current DEX fixture
  expects float-based token semantics, while the shielded-note-token public
  interface uses integer amounts.
- The orchestration phase validates contract-submitted child deployments,
  dynamic name-based and module-based dispatch, rollback on nested submission
  failure, and preserved `ctx.caller` / `ctx.signer` across a multi-hop call
  chain.
- The parallel-execution phase uses a dedicated `parallel_probe` contract and
  validates the runtime through recent `/perf_status` block metadata, not just
  transaction success.
- The BDS catch-up phase intentionally stops the local Postgres service. The
  pass condition is that live block production continues, BDS reports backlog
  or degraded indexing, and the indexed surface catches up again after
  Postgres returns. On the current service-node implementation, `queue_depth`
  can stay nonzero in steady state, so the meaningful recovery signals are the
  indexed height, spool state, and DB health.
- The harness also validates a secondary BDS rebuild path outside the live
  service-node process. That makes the retrieval phase cover both live catch-up
  and explicit reindex/restart recovery from retained block history.
- The secondary BDS path is no longer just a one-shot sync. The current run
  also stops that rebuilt instance, lets the chain advance, then restarts it
  again to verify delayed catch-up from retained history.
- The localnet validator image must include `xian-zk`, not just the Python-side
  prover utilities. The shielded phase verifies proofs inside the validator
  runtime.
- The shielded phase uses explicit transaction chi ceilings. The default
  readonly simulator cap is intentionally smaller than proof-backed shielded
  execution, so simulator-based chi estimation is not the right path for
  those transactions in the canonical run.
- The shielded phase is normally the slowest phase in the whole run because it
  includes real proving work. A clean success run can spend multiple minutes in
  that phase alone.
- Hex-looking public addresses are valid shielded withdraw recipients. The
  toolkit and contract now use matching recipient-digest hashing semantics for
  those values.
- Keep the logging phase short. `TRACE` is intentionally expensive and exists
  for debugging, not for steady-state operation.
- Localnet Compose waits for `service_healthy`, not just `service_started`.
  Treat a running container as not ready until the health checks pass.
- `make localnet-clean` now requires `FORCE=1` because it deletes all localnet
  keys, state, and generated Compose files.

## What To Review After A Run

Always inspect:

- `summary.json`
- the phase JSON files
- BDS status and indexed-height progress on the service node
- the logging phase output snippets

If a phase fails:

- inspect `.localnet/<node>/.cometbft/xian/logs/`
- inspect Docker logs for the affected node
- compare the last successful phase with the first failing phase

For the deeper internal operator runbook and rationale behind the phase order,
keep the matching note in `xian-meta` aligned with this page.
