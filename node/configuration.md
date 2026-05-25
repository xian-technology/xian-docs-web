# Configuration

Xian node configuration is easiest to understand as three layers:

1. network manifests and templates
2. node profiles
3. the rendered CometBFT home

The higher layers describe operator intent. The rendered home is what the node
actually runs.

If you are deciding between templates, profiles, deploy bindings, bundles,
contract packs, and examples, start with [Config Taxonomy](/node/config-taxonomy).
Its precedence table is the canonical reference for which layer wins during
manifest/profile creation, local runtime, and remote deployment.

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
- genesis declaration
- canonical P2P seeds and persistent peers
- snapshot bootstrap URLs
- image posture
- block policy defaults
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
- P2P seeds and persistent peers
- optional node-local genesis override
- BDS and other service posture
- pruning
- dashboard and monitoring settings
- application logging settings
- readonly simulation settings
- parallel execution settings
- advanced runtime defaults and overrides

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
- metrics
- application logging
- readonly simulation
- parallel execution
- local pending-nonce reservation behavior

`xian_vm_v1` is the only supported node runtime. Execution mode, bytecode,
gas schedule, and authority are internal VM constants, not operator-selectable
settings.

### `[xian.bds]`

This section is relevant when `bds_enabled = true` and the optional indexed
stack is enabled.

It contains BDS/Postgres-related settings such as:

- connection info
- pool sizing
- statement timeout
- queue and catch-up settings
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

For Xian application snapshots, the trusted CometBFT app hash is the state-root
Merkle commitment. During import, Xian recomputes that root from the downloaded
contract state and nonce state before accepting the snapshot.

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

## Network Manifest Shape

Manifests use object families instead of flat legacy fields:

```json
{
  "schema_version": 1,
  "name": "testnet",
  "chain_id": "xian-testnet-1",
  "genesis": {
    "kind": "bundle",
    "bundle": "testnet",
    "genesis_time": "2026-03-30T00:00:00.000000Z"
  },
  "p2p": {
    "seeds": [],
    "persistent_peers": []
  }
}
```

`genesis.kind = "source"` points at a materialized `genesis.json` by URL or
file path. `genesis.kind = "bundle"` tells tooling to render deterministic
genesis from a named contract bundle such as `local`, `devnet`, or `testnet`.
When tooling generates a source genesis from a bundle, it may also record
`genesis_build` provenance beside the manifest.

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
