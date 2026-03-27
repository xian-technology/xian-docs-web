# 4-Node Localnet E2E

Use this workflow when you want to validate the live Xian stack on one machine
with a real 4-node network, not just repo-local unit tests.

The maintained entrypoint lives in `xian-stack` and is designed to exercise the
real runtime path with:

- 4 validators
- the native Rust tracer
- one BDS-enabled service node
- real validator governance
- governed forward state patches
- `xian-py`
- DEX deployment and mixed trading flows
- shielded-note-token proof-backed flows
- indexed reads, websocket subscriptions, and event watching
- logging and readonly simulation under load

## Canonical Command

From `xian-stack`:

```bash
make localnet-e2e
```

Equivalent machine-facing backend command:

```bash
python3 ./scripts/backend.py localnet-e2e
```

Artifacts are written under:

```text
.localnet/e2e/<run-id>/
```

The runner writes:

- `summary.json`
- one JSON file per phase
- a copy of the generated `network.json`

## What The Runner Does

The phases intentionally build on each other:

1. bootstrap a fresh 4-node network with the native tracer and a BDS-enabled
   service node
2. verify health, peer connectivity, validator count, and recent app-hash
   equality
3. use `xian-py` to fund accounts, deploy helper contracts, simulate, and read
   state
4. send periodic transfers from different nodes
5. run a higher-rate burst workload and capture approximate TPS
6. trigger conflicting and invalid transactions intentionally
7. deploy and exercise the DEX contract pack
8. hammer readonly simulation and capture approximate simulator QPS
9. validate retrieval through indexed BDS reads, `abci_query`, `xian-py`
   watchers, and raw websocket tx subscriptions
10. run a dedicated determinism check by comparing recent app hashes, sampled
    state, and simulation outputs across validators
11. vote a validator power change, remove a validator, and add it back through
    real on-chain governance
12. approve and apply a governed forward state patch
13. switch logging posture to `DEBUG` and `TRACE` and verify the expected log
    output appears
14. deploy `zk_registry`, deploy the shielded-note-token, then test deposit,
    shielded transfer, and withdraw flows

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
- Keep the logging phase short. `TRACE` is intentionally expensive and exists
  for debugging, not for steady-state operation.

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
