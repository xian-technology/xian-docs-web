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
| templates / manifests | block policy defaults, tracer defaults, image posture |
| node profiles | service-node posture, logging, simulation, parallel execution, dashboard, monitoring |
| rendered `config.toml` | effective runtime values, including execution engine policy |
| `xian-stack` environment | localnet and Docker-specific overrides, especially for stack-managed services |

## Execution Engine

The most important runtime distinction is between the top-level tracer setting
and the explicit execution-engine policy.

### Tracer-Backed Execution

Tracer-backed networks still use the familiar top-level tracer mode:

```toml
[xian]
tracer_mode = "native_instruction_v1"

[xian.execution.engine]
mode = "native_instruction_v1"
bytecode_version = ""
gas_schedule = ""
authority = ""
```

Supported tracer-backed modes are:

- `python_line_v1`
- `native_instruction_v1`

### VM-Native Execution

`xian_vm_v1` uses explicit execution policy instead:

```toml
[xian.execution.engine]
mode = "xian_vm_v1"
bytecode_version = "xvm-1"
gas_schedule = "xvm-gas-1"
authority = "native"
```

Important current rules:

- `xian_vm_v1` requires `bytecode_version`
- `xian_vm_v1` requires `gas_schedule`
- `authority` must be `native`

The high-level `xian-cli` profile flow currently exposes tracer selection and
other runtime posture, but the full VM execution policy is still a lower-level
runtime concern handled through rendered config, helper tooling, or localnet
environment controls.

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

Practical guidance:

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

## Service-Node / BDS Runtime

When a node is run in service-node mode, the optional indexed stack becomes
relevant.

Important `[xian.bds]` families:

- connection settings for Postgres
- pool sizing
- statement timeout
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

## Runtime Key Reference

### Core `[xian]` Keys

| Key | Purpose |
|-----|---------|
| `block_service_mode` | service-node / indexed-stack posture |
| `pruning_enabled` | enable block-history pruning |
| `blocks_to_keep` | retain-height window when pruning is enabled |
| `tracer_mode` | top-level tracer selection for tracer-backed runtimes |
| `metrics_enabled`, `metrics_host`, `metrics_port`, `metrics_bds_refresh_seconds` | Xian application metrics |
| `transaction_trace_logging`, `app_log_*` | Xian application logging |
| `simulation_*` | readonly simulation controls |
| `parallel_execution_*` | speculative parallel execution controls |
| `pending_nonce_reservation_ttl_seconds` | local pending-nonce reservation TTL |

### `[xian.execution.engine]` Keys

| Key | Purpose |
|-----|---------|
| `mode` | selected execution engine |
| `bytecode_version` | VM bytecode policy for `xian_vm_v1` |
| `gas_schedule` | VM gas schedule id for `xian_vm_v1` |
| `authority` | authoritative executor selection; currently `native` for `xian_vm_v1` |

### `[xian.bds]` Keys

| Key family | Purpose |
|------------|---------|
| `dsn`, `host`, `port`, `database`, `user`, `password` | Postgres connectivity |
| `pool_min_size`, `pool_max_size` | connection pool sizing |
| `statement_timeout_ms`, `application_name` | query/runtime behavior |
| `spool_dir`, `spool_warn_entries`, `spool_warn_bytes`, `disk_free_warn_bytes` | recovery spool and warning thresholds |

## Stack / Localnet Environment Knobs

The Docker stack exposes additional environment knobs for localnet and
stack-managed runs.

Important examples:

- `XIAN_TRACER_MODE`
- `XIAN_LOCALNET_TRACER_MODE`
- `XIAN_LOCALNET_EXECUTION_MODE`
- `XIAN_LOCALNET_EXECUTION_BYTECODE_VERSION`
- `XIAN_LOCALNET_EXECUTION_GAS_SCHEDULE`
- `XIAN_LOCALNET_EXECUTION_AUTHORITY`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS`
- `XIAN_APP_METRICS_ENABLED`
- `XIAN_APP_METRICS_HOST`
- `XIAN_APP_METRICS_PORT`
- `XIAN_PERF_ENABLED`
- `XIAN_PERF_RECENT_BLOCKS`

Use those primarily for localnet, stack debugging, or deliberate Docker-side
overrides. For normal operator workflows, prefer manifests, profiles, and the
rendered config first.
