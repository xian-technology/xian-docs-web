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

## Ports

Common ports in the current stack:

| Port | Purpose |
|------|---------|
| `26656` | CometBFT P2P |
| `26657` | CometBFT RPC |
| `26660` | Prometheus metrics |
| `8080` | optional dashboard |
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
