# Configuration

Xian node configuration is easiest to understand as three layers:

1. network manifests and templates
2. node profiles
3. the rendered CometBFT home

The higher layers describe operator intent. The rendered home is what the node
actually runs.

## Network Manifests And Templates

Network manifests describe network-wide defaults such as:

- chain and network identity
- canonical seed nodes
- snapshot bootstrap URLs
- runtime backend and image posture
- block policy defaults
- tracer-mode defaults
- optional pinned release images and their provenance metadata

Canonical manifests live under `xian-configs/networks/<name>/manifest.json`.
Reusable starter templates live under `xian-configs/templates/`.

The important distinction is:

- templates are reusable starting points
- manifests describe a specific network

## Node Profiles

Node profiles are operator-local JSON files, usually created by `xian-cli`
under `./nodes/<name>.json`.

Profiles capture node-local intent such as:

- moniker and validator key reference
- stack checkout path
- image mode and optional pinned images copied from a manifest
- service-node posture
- pruning
- dashboard and monitoring settings
- application logging settings
- readonly simulation settings
- parallel execution settings

See [Node Profiles](/node/profiles) for the high-level JSON contract.

## Rendered CometBFT Home

`xian node init` materializes the final runnable home, typically under the
`xian-stack` checkout.

Important contents include:

- `config/config.toml`
- `config/genesis.json`
- `config/state-patches/`
- `config/priv_validator_key.json`
- `config/node_key.json`
- `data/priv_validator_state.json`

From here on, the rendered config is the effective runtime truth.

## Important Config Sections

### `[xian]`

This section carries the main Xian runtime toggles, including:

- pruning
- top-level tracer selection
- metrics
- application logging
- readonly simulation
- parallel execution
- local pending-nonce reservation behavior

### `[xian.execution.engine]`

This section carries the explicit execution policy:

```toml
[xian.execution.engine]
mode = "python_line_v1"
bytecode_version = ""
gas_schedule = ""
authority = ""
shadow_tracer_mode = ""
```

For tracer-backed runtimes, `mode` matches the selected tracer-backed engine
and the other fields remain empty.

For `xian_vm_v1`, the policy becomes explicit:

```toml
[xian.execution.engine]
mode = "xian_vm_v1"
bytecode_version = "xvm-1"
gas_schedule = "xvm-gas-1"
authority = "native"
shadow_tracer_mode = ""
```

On the current supported branch:

- `bytecode_version` is required for `xian_vm_v1`
- `gas_schedule` is required for `xian_vm_v1`
- `authority` must be `native`
- `shadow_tracer_mode` must stay empty

### `[xian.bds]`

This section is relevant when the node is running as a service node with the
optional indexed stack enabled.

It contains BDS/Postgres-related settings such as:

- connection info
- pool sizing
- statement timeout
- application name
- spool location and warning thresholds

## Snapshot Bootstrap Vs State Sync

There are two different snapshot concepts in the stack.

### Snapshot Bootstrap

`snapshot_url` is an operator bootstrap path. It restores a prepared node-home
archive.

This URL can point either to:

- a snapshot archive directly, in which case the operator must supply an
  explicit expected SHA256
- a signed snapshot manifest JSON, in which case the node validates the
  manifest signature, `chain_id`, and embedded archive hash against trusted
  Ed25519 public keys before restoring the archive

### CometBFT State Sync

CometBFT `[statesync]` settings are protocol-level sync controls that require:

- trusted RPC servers
- trust height
- trust hash
- trust period

These are not the same mechanism.

## State Patch Bundles

Governed forward state patches are local bundle files stored under:

```text
<cometbft-home>/config/state-patches
```

They are not ordinary config keys. The runtime loads them only when the
on-chain governance state approves the matching bundle hash and activation
height.

## Metrics, Logging, Simulation, And Parallel Execution

The rendered config is where all node-local runtime posture is finally
materialized.

In practice:

- application metrics live under `[xian]`
- Xian application logging lives under `[xian]`
- readonly simulation lives under `[xian]`
- speculative parallel execution lives under `[xian]`
- the execution engine policy lives under `[xian.execution.engine]`

See [Runtime Features](/node/runtime-features) for the operator-facing meaning
of those settings.

## Common Ports

| Port | Purpose |
|------|---------|
| `26656` | CometBFT P2P |
| `26657` | CometBFT RPC |
| `26660` | CometBFT Prometheus metrics |
| `9108` | Xian application Prometheus metrics |
| `8080` | optional dashboard |
| `9090` | optional Prometheus |
| `3000` | optional Grafana |
| `5000` | optional GraphQL / PostGraphile |

Additional sidecars such as the shielded relayer or `xian-intentkit` use their
own published ports when enabled.
