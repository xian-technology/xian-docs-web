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
backend's `--start-phase` and `--resume-dir` options.

## Coverage

The layered harness covers:

- five-node startup, health, peers, validator count, and app-hash agreement
- `xian-py` reads, simulation, source deployment, and transactions
- nested contract deployment/calls and rollback
- periodic, burst, conflicting, and invalid transaction workloads
- DEX bootstrap and mixed trading
- BDS outage, catch-up, indexed reads, reindex, and watchers
- validator governance and policy transitions
- governed forward state patches
- application logging modes
- shielded-note and relayed proof flows with governed verifier registration
- parallel execution acceptance and fallback behavior
- restart/chaos convergence and soak checks

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
- Shielded phases perform real proving and can dominate runtime.
- `TRACE` logging is temporary diagnostic posture.
- A running container is not ready until health checks pass.
- `make localnet-clean` is destructive and requires `FORCE=1`.

## Review Results

Inspect `summary.json`, the first failing phase, BDS indexed-height progress,
node application logs, Docker logs, and final app-hash agreement. Preserve the
run directory with the exact sibling SHAs when using it as release evidence.
