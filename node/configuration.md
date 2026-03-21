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
- `config/priv_validator_key.json`
- `config/node_key.json`
- `data/priv_validator_state.json`

Relevant current configuration sections:

- `[statesync]` for CometBFT state sync
- `[xian]` for Xian runtime features like tracing, metrics, pruning, and
  parallel execution

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
| `5000` | optional GraphQL / PostGraphile in BDS mode |

## Dashboard Settings

Dashboard settings are runtime settings in the node profile, not CometBFT
settings:

- `dashboard_enabled`
- `dashboard_host`
- `dashboard_port`

When enabled, `xian node start` passes those values to the `xian-stack`
backend, which starts the separate dashboard service alongside the node
runtime.

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

## Stack Performance Snapshot Settings

The containerized `xian-stack` runtime enables Xian performance snapshots by
default so the dashboard and `/perf_status` can show recent execution timing.

Current stack-level environment knobs:

- `XIAN_PERF_ENABLED`
- `XIAN_PERF_RECENT_BLOCKS`

These are runtime environment settings, not CometBFT config keys. They control
whether the node writes recent execution snapshots under the CometBFT home and
how many completed blocks are retained there for inspection.
