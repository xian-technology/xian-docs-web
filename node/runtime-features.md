# Runtime Features

This page explains the runtime behavior that ends up in the rendered
`config.toml` under `[xian]`, `[xian.execution.engine]`, and `[xian.bds]`.

Use it with:

- [Configuration](/node/configuration) for the overall layer model
- [Node Profiles](/node/profiles) for the high-level JSON contract
- [Parallel Block Execution](/concepts/parallel-block-execution) for the
  execution model
- [The Xian VM](/concepts/xian-vm) for VM-native execution semantics

## Where Runtime Features Live

Different settings live at different layers.

| Layer | Typical settings |
|------|------------------|
| templates / manifests | block policy defaults, genesis, P2P seeds, image posture |
| node profiles | BDS/service posture, logging, simulation, parallel execution, dashboard, monitoring, advanced runtime defaults |
| rendered `config.toml` | effective runtime values, including execution engine policy |
| `xian-stack` environment | localnet and Docker-specific overrides, especially for stack-managed services |

## Execution Engine

The most important runtime distinction is between the top-level tracer setting
and the explicit execution-engine policy.

### VM-Native Execution

`xian_vm_v1` is the fixed node execution runtime:

```toml
[xian.execution.engine]
mode = "xian_vm_v1"
```

Important current rules:

- `xian_vm_v1` is the only supported node runtime
- bytecode, gas schedule, and authority are internal VM constants
- operators configure runtime-adjacent behavior such as simulation and parallel
  execution, not alternate execution engines

The high-level `xian-cli` profile flow exposes runtime-adjacent posture such as
parallel execution and BDS/service settings. The VM execution policy itself is
fixed.

## Application Logging

Xian has its own application logger, separate from CometBFT logging.

Relevant `[xian]` keys:

- `transaction_trace_logging`
- `app_log_level`
- `app_log_json`
- `app_log_rotation_hours`
- `app_log_retention_days`

Use these for:

- compact per-transaction debugging
- structured JSON logs
- rotated application log retention under `.cometbft/xian/logs`

For normal operation, keep transaction-level tracing off unless you are
debugging a specific runtime path.

## Readonly Simulation

Readonly transaction simulation is a node-local service posture, not a
consensus rule.

Relevant `[xian]` keys:

- `simulation_enabled`
- `simulation_max_concurrency`
- `simulation_timeout_ms`
- `simulation_max_chi`

Operationally:

- simulation runs in bounded worker processes
- it is meant for SDKs, wallets, and developer tooling
- it should not be treated as free unbounded public compute

## Parallel Execution

Xian supports speculative parallel block execution while still committing the
canonical serial-equivalent result.

Relevant `[xian]` keys:

- `parallel_execution_enabled`
- `parallel_execution_workers`
- `parallel_execution_min_transactions`
- `parallel_execution_max_speculative_waves`
- `parallel_execution_min_wave_acceptance_ratio`
- `parallel_execution_low_acceptance_min_wave_size`
- `parallel_execution_warm_workers`
- `parallel_execution_access_estimates_enabled`

Practical guidance:

- `parallel_execution_workers` defaults to `4`
- if parallel execution is enabled, workers must be greater than zero
- enable it deliberately, not blindly
- treat it as a rollout-managed operator feature
- validate it against your actual workload
- remember that it is process-level speculation with serial fallback, not
  unrestricted shared-memory concurrency

The maintained `xian-cli` templates currently default this posture
conservatively, while lower-level raw `xian-abci` defaults may differ. The
effective value is whatever ends up in the rendered config for the node you
actually start.

## Metrics And Health

Relevant `[xian]` keys:

- `metrics_enabled`
- `metrics_host`
- `metrics_port`
- `metrics_bds_refresh_seconds`
- `pending_nonce_reservation_ttl_seconds`

These control the Xian application metrics endpoint and some node-local runtime
bookkeeping behavior.

The app metrics endpoint is separate from CometBFT's built-in metrics exporter.
When BDS is enabled, the app metrics exporter also mirrors the queue, lag,
storage, and connection-pool posture from `/bds_status`.

## BDS Runtime

When `bds_enabled = true`, the optional indexed stack becomes relevant. BDS is
the Blockchain Data Service, one service under the node profile `services`
object.

Important `[xian.bds]` families:

- connection settings for Postgres
- pool sizing
- statement timeout
- queue capacity
- live catch-up polling
- optional RPC URL override
- application name
- spool location
- warning thresholds for queued or disk-heavy recovery conditions

These settings matter for indexed reads, recovery, and GraphQL. They do not
change consensus behavior.

Operationally, the live path now keeps newly finalized blocks in an in-memory
pending buffer and only persists them once any missing earlier heights have
been recovered from RPC. The local spool is still useful for offline
maintenance and explicit recovery workflows, but it is no longer the primary
live-path durability mechanism.

`catchup_enabled` only starts the background catch-up worker when `rpc_url` is
also set. Stack localnets fill this with the RPC URL reachable from the BDS
process: loopback for integrated containers, and the CometBFT service name for
split fidelity containers. `xian-deploy` derives the same topology-aware
default for remote hosts when BDS is enabled; set `xian_bds_rpc_url` only when
you need to point catch-up at a different trusted RPC endpoint.

## Runtime Key Reference

### Core `[xian]` Keys

| Key | Purpose |
|-----|---------|
| `bds_enabled` | BDS / indexed-stack posture |
| `pruning_enabled` | enable block-history pruning |
| `blocks_to_keep` | retain-height window when pruning is enabled |
| `metrics_enabled`, `metrics_host`, `metrics_port`, `metrics_bds_refresh_seconds` | Xian application metrics |
| `transaction_trace_logging`, `app_log_*` | Xian application logging |
| `simulation_*` | readonly simulation controls |
| `parallel_execution_*` | speculative parallel execution controls |
| `pending_nonce_reservation_ttl_seconds` | local pending-nonce reservation TTL |

### `[xian.execution.engine]` Keys

| Key | Purpose |
|-----|---------|
| `mode` | fixed execution runtime, currently `xian_vm_v1` |

### `[xian.bds]` Keys

| Key family | Purpose |
|------------|---------|
| `dsn`, `host`, `port`, `database`, `user`, `password` | Postgres connectivity |
| `pool_min_size`, `pool_max_size` | connection pool sizing |
| `statement_timeout_ms`, `acquire_timeout_ms`, `application_name` | query/runtime behavior |
| `queue_max_size`, `catchup_enabled`, `catchup_poll_seconds`, `rpc_url` | live BDS queue and catch-up behavior |
| `spool_dir`, `spool_warn_entries`, `spool_warn_bytes`, `disk_free_warn_bytes` | recovery spool and warning thresholds |

## Stack / Localnet Environment Knobs

The Docker stack exposes additional environment knobs for localnet and
stack-managed runs.

Important examples:

- `XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS`
- `XIAN_APP_METRICS_ENABLED`
- `XIAN_APP_METRICS_HOST`
- `XIAN_APP_METRICS_PORT`
- `XIAN_PERF_ENABLED`
- `XIAN_PERF_RECENT_BLOCKS`

For single-node stack BDS runs, the stack also mirrors the BDS runtime keys as
environment variables:

| Environment variable | Runtime key |
|----------------------|-------------|
| `XIAN_BDS_DSN` | `xian.bds.dsn` |
| `XIAN_BDS_HOST`, `XIAN_BDS_PORT`, `XIAN_BDS_DATABASE`, `XIAN_BDS_USER`, `XIAN_BDS_PASSWORD` | Postgres connection fields |
| `XIAN_BDS_POOL_MIN_SIZE`, `XIAN_BDS_POOL_MAX_SIZE` | connection pool sizing |
| `XIAN_BDS_STATEMENT_TIMEOUT_MS`, `XIAN_BDS_ACQUIRE_TIMEOUT_MS`, `XIAN_BDS_APPLICATION_NAME` | query/runtime behavior |
| `XIAN_BDS_QUEUE_MAX_SIZE`, `XIAN_BDS_CATCHUP_ENABLED`, `XIAN_BDS_CATCHUP_POLL_SECONDS`, `XIAN_BDS_RPC_URL` | live BDS queue and catch-up behavior |
| `XIAN_BDS_SPOOL_DIR`, `XIAN_BDS_SPOOL_WARN_ENTRIES`, `XIAN_BDS_SPOOL_WARN_BYTES`, `XIAN_BDS_DISK_FREE_WARN_BYTES` | recovery spool and warning thresholds |

For the integrated stack, `XIAN_BDS_RPC_URL` defaults to
`http://127.0.0.1:26657`, which is the CometBFT RPC endpoint reachable from the
BDS process. To stop catch-up, disable `XIAN_BDS_CATCHUP_ENABLED`; do not rely
on an empty RPC URL as a disable switch.

Use those primarily for localnet, stack debugging, or deliberate Docker-side
overrides. For normal operator workflows, prefer manifests, profiles, and the
rendered config first.
