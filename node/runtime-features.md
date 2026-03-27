# Runtime Features

This page is the operator-facing reference for Xian runtime settings that end
up under `[xian]` and `[xian.bds]` in the rendered `config.toml`.

Use it together with:

- [Configuration](/node/configuration) for the three config layers
- [Node Profiles](/node/profiles) for the high-level `xian-cli` JSON contract
- [Starting, Stopping & Monitoring](/node/managing) for runtime inspection

## Where To Set Runtime Features

Not every runtime setting lives at the same layer.

| Layer | What belongs there |
|------|---------------------|
| starter template / network manifest | network defaults such as `tracer_mode` and block policy |
| node profile | node-local posture such as `service_node`, pruning, dashboard, monitoring, readonly simulation, and parallel execution |
| rendered `config.toml` `[xian]` | materialized runtime settings such as readonly simulation, parallel execution, metrics, mempool nonce TTL, and BDS settings |
| `xian-stack` env / localnet env | stack-managed overrides for localnet, Docker publish behavior, metrics, perf snapshots, and local development |

Current important point:

- `tracer_mode` is part of the supported `xian-cli` template / manifest / profile
  flow.
- readonly simulation settings are now part of the supported `xian-cli`
  template / profile flow too, and they remain node-local runtime posture
- parallel execution settings are now part of the supported `xian-cli`
  template / profile flow too, but they remain node-local settings rather than
  network-manifest state.

That means:

- use `xian network create ... --tracer-mode ...` or
  `xian network join ... --tracer-mode ...` for tracer selection
- use `xian network create/join ... --simulation-* ...` or template defaults
  for node-local readonly simulation posture
- use `xian network create/join ... --parallel-execution-* ...` or template
  defaults for node-local parallel execution posture
- use the rendered `config.toml`, `xian-configure-node`, or localnet
  environment variables only when you need lower-level overrides

## Tracer Modes

Xian currently supports two execution tracers:

| Mode | Meaning | Typical use |
|------|---------|-------------|
| `python_line_v1` | pure-Python line-bucket metering with an `800,000` line-event ceiling | local development, easiest standalone install, conservative default |
| `native_instruction_v1` | Rust-backed exact instruction metering with a `3,250,000` instruction-event ceiling | maintained node/runtime stacks, lower-overhead production-style execution |

What matters operationally:

- the tracer affects contract metering policy
- validators in the same network should stay aligned on the same tracer mode
- the maintained `xian-stack` node image includes the native tracer package
- if you run `xian-abci` directly outside the maintained stack, native tracing
  requires the native extra / package to be installed
- `python_line_v1` keeps its performance profile by rejecting source shapes that
  distort line buckets, including ternary expressions, semicolons, and
  one-line compound statements
- `native_instruction_v1` is both more precise and lower-overhead, but it is a
  consensus-policy choice because its metering semantics differ from the
  Python tracer

### How To Set The Tracer

Supported high-level path:

```bash
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev \
  --tracer-mode python_line_v1

uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --tracer-mode native_instruction_v1
```

That value is then materialized into the rendered CometBFT home:

```toml
[xian]
tracer_mode = "native_instruction_v1"
```

Current canonical template defaults show the intended posture:

- `single-node-dev` uses `python_line_v1`
- `single-node-indexed`, `consortium-3`, and `embedded-backend` use
  `native_instruction_v1`

## Application Logging

Xian also has its own application logger for block execution, mempool
validation, simulation, and service-node runtime behavior.

Current keys:

```toml
[xian]
transaction_trace_logging = false
app_log_level = "INFO"
app_log_json = false
app_log_rotation_hours = 1
app_log_retention_days = 7
```

What they mean:

- `transaction_trace_logging`: emit per-transaction debug summaries during
  block execution
- `app_log_level`: minimum level written to stderr and the rotated file sink
- `app_log_json`: emit structured JSON logs instead of the plain text format
- `app_log_rotation_hours`: rotate the Xian application log file on this
  interval
- `app_log_retention_days`: keep rotated Xian application logs for this many
  days

Operational guidance:

- the Xian application logger is separate from CometBFT's own `log_level`
- Xian application logs are written under `.cometbft/xian/logs`
- retention is enforced by the logger itself, including compressed rotated
  archives
- both stderr and the rotated file sink are queued asynchronously to reduce
  execution-path blocking on log I/O
- keep `transaction_trace_logging=false` unless you are actively debugging a
  contract or runtime path
- `transaction_trace_logging=true` only emits per-transaction summaries when
  `app_log_level` includes `DEBUG`
- full serialized per-transaction results are emitted only when
  `transaction_trace_logging=true` and `app_log_level=TRACE`
- prefer `app_log_json=true` when shipping logs into a structured collector

### How To Set Application Logging

Supported high-level path:

```bash
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev \
  --app-log-level INFO \
  --app-log-rotation-hours 1 \
  --app-log-retention-days 7

uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --app-log-level DEBUG \
  --transaction-trace-logging \
  --app-log-json
```

Those values are written into the node profile and then materialized by
`xian node init` into the rendered CometBFT home:

```toml
[xian]
transaction_trace_logging = true
app_log_level = "DEBUG"
app_log_json = true
app_log_rotation_hours = 1
app_log_retention_days = 7
```

## Readonly Simulation

Xian also has a readonly transaction simulator behind the `simulate_tx` query
path.

Current keys:

```toml
[xian]
simulation_enabled = true
simulation_max_concurrency = 2
simulation_timeout_ms = 3000
simulation_max_stamps = 1000000
```

What they mean:

- `simulation_enabled`: turn readonly transaction simulation on or off
- `simulation_max_concurrency`: maximum concurrent simulation workers accepted
  by this node
- `simulation_timeout_ms`: wall-clock timeout for one simulation worker
- `simulation_max_stamps`: readonly stamp budget cap used for simulation

### How To Set Readonly Simulation

Supported high-level path:

```bash
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev \
  --simulation-enabled \
  --simulation-max-concurrency 2 \
  --simulation-timeout-ms 3000 \
  --simulation-max-stamps 1000000

uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --simulation-enabled \
  --simulation-max-concurrency 2 \
  --simulation-timeout-ms 3000 \
  --simulation-max-stamps 1000000
```

Those values are written into the node profile and then materialized by
`xian node init` into the rendered CometBFT home:

```toml
[xian]
simulation_enabled = true
simulation_max_concurrency = 2
simulation_timeout_ms = 3000
simulation_max_stamps = 1000000
```

Operational guidance:

- simulation is free compute, so treat it as a protected API capability
- the node executes simulation in a bounded subprocess worker, not inside the
  main validator execution process
- keep public access behind a gateway or dedicated service-node tier
- use low concurrency and short timeouts on validator RPC endpoints
- raise the budget only when your client workflows need it
- expect structured failure results when simulation is disabled, saturated, or
  timed out

## Parallel Execution

Xian also has speculative parallel block execution in the runtime.

Current keys:

```toml
[xian]
parallel_execution_enabled = false
parallel_execution_workers = 0
parallel_execution_min_transactions = 8
```

What they mean:

- `parallel_execution_enabled`: turn speculative parallel execution on or off
- `parallel_execution_workers`: number of worker processes used for speculative
  execution
- `parallel_execution_min_transactions`: minimum block size before the parallel
  planner is used

### How To Set Parallel Execution

Supported high-level path:

```bash
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev \
  --parallel-execution-enabled \
  --parallel-execution-workers 4 \
  --parallel-execution-min-transactions 12

uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --parallel-execution-enabled \
  --parallel-execution-workers 4 \
  --parallel-execution-min-transactions 12
```

Those values are written into the node profile and then materialized by
`xian node init` into the rendered CometBFT home:

```toml
[xian]
parallel_execution_enabled = true
parallel_execution_workers = 4
parallel_execution_min_transactions = 12
```

This is still a node-local posture. If you want a consistent fleet-wide
default, standardize it through the canonical template you use for the network.

Lower-level paths still exist when you need them:

1. edit the rendered `config.toml` after `xian node init`
2. use the lower-level `xian-abci` helper: `xian-configure-node`
3. for `xian-stack` localnet, use the localnet environment variables:

```bash
export XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED=1
export XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS=4
export XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS=12
```

Operational guidance:

- treat this as a rollout-managed runtime feature for validator fleets
- parallel execution is speculative and must remain serial-equivalent; exact-key
  conflicts and tracked prefix-scan conflicts fall back to serial execution
- enable it only after testing your actual workload
- verify behavior through `xian node health`, the dashboard, and the parallel
  execution metrics

## Core `[xian]` Runtime Keys

These are the current operator-relevant runtime keys from the rendered
`config.toml`.

| Key | Default | Purpose | Preferred control layer |
|-----|---------|---------|-------------------------|
| `block_service_mode` | `false` | turns on service-node / BDS-oriented runtime behavior | derived from `service_node`; avoid editing directly for stack-managed nodes |
| `pruning_enabled` | `false` | enables block-history pruning | template/profile or rendered config |
| `blocks_to_keep` | `100000` | retain-height window when pruning is enabled | template/profile or rendered config |
| `tracer_mode` | `python_line_v1` | contract metering backend | manifest/template/profile or rendered config |
| `metrics_enabled` | `true` | enable the Xian Prometheus endpoint | rendered config or stack env |
| `metrics_host` | `127.0.0.1` | listen host for the Xian metrics endpoint | rendered config; stack-managed nodes may override binding behavior |
| `metrics_port` | `9108` | listen port for the Xian metrics endpoint | rendered config or stack env |
| `metrics_bds_refresh_seconds` | `5.0` | refresh interval for BDS-derived metrics | rendered config |
| `transaction_trace_logging` | `false` | emit per-transaction debug summaries during block execution | template/profile, rendered config, or `xian-configure-node` |
| `app_log_level` | `INFO` | Xian application log level for stderr and rotated files | template/profile, rendered config, or `xian-configure-node` |
| `app_log_json` | `false` | emit Xian application logs as structured JSON | template/profile, rendered config, or `xian-configure-node` |
| `app_log_rotation_hours` | `1` | Xian application log rotation interval in hours | template/profile, rendered config, or `xian-configure-node` |
| `app_log_retention_days` | `7` | Xian application log retention window in days | template/profile, rendered config, or `xian-configure-node` |
| `simulation_enabled` | `true` | enable readonly transaction simulation | template/profile, rendered config, or `xian-configure-node` |
| `simulation_max_concurrency` | `2` | concurrent readonly simulation workers | template/profile, rendered config, or `xian-configure-node` |
| `simulation_timeout_ms` | `3000` | wall-clock timeout for one readonly simulation | template/profile, rendered config, or `xian-configure-node` |
| `simulation_max_stamps` | `1000000` | stamp budget cap used by readonly simulation | template/profile, rendered config, or `xian-configure-node` |
| `parallel_execution_enabled` | `false` | enable speculative parallel execution | template/profile, rendered config, `xian-configure-node`, or localnet env |
| `parallel_execution_workers` | `0` | worker count for speculative execution | template/profile, rendered config, `xian-configure-node`, or localnet env |
| `parallel_execution_min_transactions` | `8` | threshold before parallel planning is attempted | template/profile, rendered config, `xian-configure-node`, or localnet env |
| `pending_nonce_reservation_ttl_seconds` | `60.0` | local mempool reservation TTL before stale pending nonces stop blocking retries; reservations are created only after signature, chain-id, and payload-shape validation succeeds | rendered config or `xian-configure-node` |

## `[xian.bds]` Service-Node Keys

These keys matter when `service_node=true` and the runtime is operating with
the optional indexed read stack.

| Key | Purpose | Preferred control layer |
|-----|---------|-------------------------|
| `dsn` / `host` / `port` / `database` / `user` / `password` | PostgreSQL connection settings | stack env or direct rendered config |
| `pool_min_size` / `pool_max_size` | asyncpg pool sizing | stack env or direct rendered config |
| `statement_timeout_ms` | PostgreSQL statement timeout | stack env or direct rendered config |
| `application_name` | PostgreSQL application identifier | stack env or direct rendered config |
| `spool_dir` | durable BDS spool path | stack env or direct rendered config |
| `spool_warn_entries` / `spool_warn_bytes` | warning thresholds for queued spool data | stack env or direct rendered config |
| `disk_free_warn_bytes` | free-disk warning threshold for the BDS spool host | stack env or direct rendered config |

For the maintained `xian-cli` + `xian-stack` flow:

- use `service_node=true` in the node profile to request the indexed stack
- let `xian-stack` provide the default BDS connection wiring
- use stack env only when you need to override the defaults explicitly

## Stack Environment Knobs

The Docker-backed stack has its own environment surface on top of the rendered
CometBFT home.

Current important runtime-related knobs include:

- `XIAN_TRACER_MODE`
- `XIAN_LOCALNET_TRACER_MODE`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_ENABLED`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_WORKERS`
- `XIAN_LOCALNET_PARALLEL_EXECUTION_MIN_TRANSACTIONS`
- `XIAN_APP_METRICS_ENABLED`
- `XIAN_APP_METRICS_HOST`
- `XIAN_APP_METRICS_PORT`
- `XIAN_APP_METRICS_BDS_REFRESH_SECONDS`
- `XIAN_PERF_ENABLED`
- `XIAN_PERF_RECENT_BLOCKS`

Use these when you are:

- running localnet
- debugging stack-managed runtime behavior
- overriding Docker-side publish and bind defaults for a specific workspace

For normal node operations, prefer templates, manifests, profiles, and the
rendered `config.toml` first.
