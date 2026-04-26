# Configuration

Xian node configuration is easiest to understand as three layers:

1. network manifests and templates
2. node profiles
3. the rendered CometBFT home

The higher layers describe operator intent. The rendered home is what the node
actually runs.

```mermaid
flowchart TD
  Templates["Reusable templates"]
  Manifests["Network manifests"]
  Profile["Node profile"]
  Home["Rendered CometBFT home"]
  Runtime["Running node"]
  Patches["Local state-patch bundles"]
  Governance["On-chain governance approval"]

  Templates --> Profile
  Manifests --> Profile
  Profile --> Home
  Home --> Runtime
  Patches --> Home
  Governance --> Runtime
  Patches --> Runtime
```

## Network Manifests And Templates

Network manifests describe network-wide defaults such as:

- chain and network identity
- canonical seed nodes
- snapshot bootstrap URLs
- runtime backend and image posture
- block policy defaults
- tracer-mode defaults
- optional pinned release images and their provenance metadata
- optional shielded/privacy packaging metadata such as approved privacy artifact
  catalogs and shielded history commitments

Canonical manifests live under `xian-configs/networks/<name>/manifest.json`.
Reusable starter templates live under `xian-configs/templates/`.

The important distinction is:

- templates are reusable starting points
- manifests describe a specific network

For canonical published networks, the manifest can also pin:

- `node_release_manifest`: the exact repo refs and build inputs that produced
  the published node images
- `privacy_artifact_catalog`: a checksum-pinned catalog of approved shielded
  registry manifests for that network
- `shielded_history_policy`: the compatibility and retention commitment for the
  `shielded_wallet_history` feed
- `privacy_submission_policy`: operator-facing relayer and disclosure posture

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
```

On the current supported branch:

- `bytecode_version` is required for `xian_vm_v1`
- `gas_schedule` is required for `xian_vm_v1`
- `authority` must be `native`
- the older `shadow_tracer_mode` rollout field is not part of the current
  supported config surface

### `[xian.bds]`

This section is relevant when the node is running as a service node with the
optional indexed stack enabled.

It contains BDS/Postgres-related settings such as:

- connection info
- pool sizing
- statement timeout
- application name
- spool location and warning thresholds

## Release Provenance In Manifests

When a network pins published node images, `node_release_manifest` is the
machine-readable provenance block that explains how those images were built.

The current release manifest surface includes:

- exact repo refs for the main runtime components
- digest-pinned Python and Go base images
- the CometBFT version plus a checksum-pinned source archive URL
- the s6-overlay version plus architecture-specific SHA256 values

That means the network manifest is no longer just saying "use this image." It
also carries the pinned release inputs that produced that image.

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

## Stack-Managed Exposure Defaults

The maintained `xian-stack` backend now defaults to fail-closed host
publishing:

- CometBFT P2P remains public-facing by default on `26656`
- CometBFT RPC defaults to `127.0.0.1:26657`
- CometBFT metrics defaults to `127.0.0.1:26660`
- Xian app metrics defaults to `127.0.0.1:9108`
- dashboard defaults to `127.0.0.1:8080`
- PostGraphile defaults to `127.0.0.1:5000`
- `xian-dex-automation` defaults to `127.0.0.1:38280` when enabled

Public exposure is explicit through the stack backend:

- `--public-rpc` or `XIAN_PUBLIC_RPC_ENABLED=1`
- `--public-metrics` or `XIAN_PUBLIC_METRICS_ENABLED=1`
- `--public-query` or `XIAN_PUBLIC_QUERY_ENABLED=1`

`public-query` is intentionally separate from `public-rpc`. It publishes the
read-only indexed surface for BDS / GraphQL. It does not also expose the live
node RPC.

For local workflows, `xian-stack` now generates `.stack-secrets.env` on first
use. That file holds local BDS and PostGraphile passwords and should stay
untracked. For BDS-enabled runs, PostGraphile now uses its own dedicated
read-only database role instead of the primary BDS owner account.

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
| `38280` | optional `xian-dex-automation` admin UI and API |

Additional sidecars such as the shielded relayer or `xian-intentkit` use their
own published ports when enabled.

Those port numbers describe the service sockets, not a guarantee that the
service is Internet-facing. In the maintained stack, only CometBFT P2P is
public by default.
