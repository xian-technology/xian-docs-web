# Configuration

Current Xian node configuration is split into three layers:

1. network manifests
2. node profiles
3. the materialized CometBFT home

## Network Manifests

Network manifests are JSON files written by `xian-cli` and stored by default at:

```text
./networks/<name>/manifest.json
```

They carry network-wide defaults such as:

- `schema_version`
- `name`
- `chain_id`
- `mode`
- `runtime_backend`
- `genesis_source`
- `snapshot_url`
- `seed_nodes`
- `tracer_mode`

Canonical manifests also live in `xian-configs/networks/<name>/manifest.json`.

Starter templates live separately at:

```text
xian-configs/templates/<name>.json
```

They are reusable defaults for `xian network create --template ...` and
`xian network join --template ...`, not live network manifests.

Canonical templates also declare:

- `operator_profile`: the intended operator posture for the template
- `monitoring_profile`: whether monitoring should stay off, run as a local
  stack, or be treated as a service-node concern

## Node Profiles

Node profiles are operator-local JSON files stored by default at:

```text
./nodes/<name>.json
```

They carry node-local intent such as:

- moniker
- validator key reference
- stack checkout path
- node-local seed overrides
- snapshot override
- service-node mode
- pruning settings
- readonly simulation settings
- parallel execution settings
- monitoring settings
- optional state-sync settings
- optional dashboard settings

See [Node Profiles](/node/profiles) for the exact shape.

## CometBFT Home

`xian node init` renders a CometBFT home directory, typically at:

```text
../xian-stack/.cometbft
```

for the `xian-stack` backend, unless you override `home` explicitly.

The rendered home contains:

- `config/config.toml`
- `config/genesis.json`
- `config/state-patches/`
- `config/priv_validator_key.json`
- `config/node_key.json`
- `data/priv_validator_state.json`

Relevant current configuration sections:

- `[statesync]` for CometBFT state sync
- `[xian]` for Xian runtime features such as tracing, metrics, pruning,
  readonly simulation, parallel execution, mempool nonce reservations, and
  service-node behavior
- `[xian.bds]` for BDS / indexed-read runtime settings when `service_node` is
  enabled

The rendered home also carries the local state patch bundle directory used by
the governed forward patching flow:

- `config/state-patches/` for locally stored governed patch bundles

See [Runtime Features](/node/runtime-features) for the detailed operator-facing
reference of the current `[xian]` and `[xian.bds]` keys, including tracer modes
readonly simulation, and parallel execution.

## Ports

Common ports in the current stack:

| Port | Purpose |
|------|---------|
| `26656` | CometBFT P2P |
| `26657` | CometBFT RPC |
| `26660` | Prometheus metrics |
| `9108` | Xian Prometheus metrics |
| `8080` | optional dashboard |
| `9090` | optional Prometheus |
| `3000` | optional Grafana |
| `5000` | optional GraphQL / PostGraphile v5 in BDS mode |

## Dashboard Settings

Dashboard settings are runtime settings in the node profile, not CometBFT
settings:

- `dashboard_enabled`
- `monitoring_enabled`
- `dashboard_host`
- `dashboard_port`

When enabled, `xian node start` passes those values to the `xian-stack`
backend, which starts the separate dashboard service and, when requested,
Prometheus and Grafana alongside the node runtime.

## Snapshot Settings

There are two different snapshot concepts in the current stack:

- `snapshot_url`: operator bootstrap by restoring a prepared node-home archive
- `[statesync]`: protocol-level CometBFT state sync using Xian application
  snapshots

These are not the same mechanism.

`snapshot_url` is used by the node-init / restore workflow and replaces local
`data/` and `xian/` directories from an archive.

`[statesync]` is used by CometBFT when syncing from trusted peers that serve
application snapshots through the ABCI snapshot lifecycle.

Current state-sync keys in `config.toml`:

- `statesync.enable`
- `statesync.rpc_servers`
- `statesync.trust_height`
- `statesync.trust_hash`
- `statesync.trust_period`

When state sync is enabled, the current `xian-abci` tooling requires:

- at least two trusted RPC servers
- a trusted height greater than zero
- the matching trusted block hash

Use the dedicated snapshot tool to manage local application snapshots:

```bash
uv run xian-state-snapshot list
uv run xian-state-snapshot export
uv run xian-state-snapshot import --input-path ./xian-state-snapshot.tar.gz
```

These application snapshots are the snapshots served through CometBFT state
sync.

Incoming snapshot offers are rejected unless the metadata matches the current
chain, declared height, archive hash, app hash, and a positive chunk count.
Oversized chunks are rejected during apply, so malformed or inconsistent state
sync payloads fail cleanly instead of progressing partway through import.

## State Patch Bundles

Forward state patches use local bundle files, not `config.toml` keys.

Current path:

```text
<cometbft-home>/config/state-patches
```

Those bundle files are validator-local artifacts that must match the
on-chain-approved `bundle_hash` from the `governance` contract. They are part
of the protocol recovery path, not ad hoc local configuration.

See [Protocol Governance & State Patches](/node/protocol-governance) for the
current bundle format and approval flow.

## Pruning Settings

Pruning in the current stack is block-history pruning, not a separate
application-state pruning mode.

Relevant keys:

- `xian.pruning_enabled`
- `xian.blocks_to_keep`

When enabled, Xian returns `retain_height` to CometBFT on commit so old block
history can be dropped. The latest LMDB application state remains intact.

## Xian Metrics Settings

Xian's own Prometheus endpoint is configured inside the rendered
`config.toml` under `[xian]`, separate from CometBFT's built-in
instrumentation block.

Current keys:

- `metrics_enabled`
- `metrics_host`
- `metrics_port`
- `metrics_bds_refresh_seconds`

In the Docker stack, the runtime binds the Xian metrics server inside the
container and publishes it to the host separately from CometBFT's `26660`
metrics endpoint.

## Xian Application Logging Settings

Xian's own application logs are configured under `[xian]` in the rendered
`config.toml`.

Current keys:

- `transaction_trace_logging`
- `app_log_level`
- `app_log_json`
- `app_log_rotation_hours`
- `app_log_retention_days`

These settings control the Xian application logger, not CometBFT's own
`log_level` / `log_format` settings. The runtime writes its rotated log files
under `.cometbft/xian/logs` and lets Loguru enforce rotation and retention
directly.

## Readonly Simulation Settings

Readonly transaction simulation is configured under `[xian]` in the rendered
`config.toml`.

Current keys:

- `simulation_enabled`
- `simulation_max_concurrency`
- `simulation_timeout_ms`
- `simulation_max_stamps`

These are node-local operational controls. Use them to keep dry runs useful for
wallets and SDKs without turning validator RPC into unrestricted free compute.

## Stack Performance Snapshot Settings

The containerized `xian-stack` runtime enables Xian performance snapshots by
default so the dashboard and `/perf_status` can show recent execution timing.

Current stack-level environment knobs:

- `XIAN_PERF_ENABLED`
- `XIAN_PERF_RECENT_BLOCKS`

These are runtime environment settings, not CometBFT config keys. They control
whether the node writes recent execution snapshots under the CometBFT home and
how many completed blocks are retained there for inspection.
