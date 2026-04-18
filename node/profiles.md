# Node Profiles

Node profiles are the operator-local contract between `xian-cli` and
`xian-stack`.

They are written as JSON and validated on read. The current schema is explicit:

```json
{
  "schema_version": 1,
  "name": "validator-1",
  "network": "mainnet",
  "moniker": "validator-1",
  "validator_key_ref": "./keys/validator-1/validator_key_info.json",
  "runtime_backend": "xian-stack",
  "node_image_mode": "registry",
  "node_integrated_image": "ghcr.io/xian-technology/xian-node@sha256:...",
  "node_split_image": "ghcr.io/xian-technology/xian-node-split@sha256:...",
  "node_release_manifest": null,
  "stack_dir": "../xian-stack",
  "seeds": [],
  "genesis_url": null,
  "snapshot_url": null,
  "snapshot_signing_keys": [],
  "service_node": false,
  "home": null,
  "pruning_enabled": false,
  "blocks_to_keep": 100000,
  "block_policy_mode": "on_demand",
  "block_policy_interval": "0s",
  "tracer_mode": "python_line_v1",
  "transaction_trace_logging": false,
  "app_log_level": "INFO",
  "app_log_json": false,
  "app_log_rotation_hours": 1,
  "app_log_retention_days": 7,
  "simulation_enabled": true,
  "simulation_max_concurrency": 2,
  "simulation_timeout_ms": 3000,
  "simulation_max_chi": 1000000,
  "parallel_execution_enabled": false,
  "parallel_execution_workers": 0,
  "parallel_execution_min_transactions": 8,
  "operator_profile": "embedded_backend",
  "monitoring_profile": "service_node",
  "dashboard_enabled": false,
  "monitoring_enabled": true,
  "dashboard_host": "127.0.0.1",
  "dashboard_port": 8080,
  "intentkit_enabled": false,
  "intentkit_network_id": "xian-mainnet",
  "intentkit_host": "127.0.0.1",
  "intentkit_port": 38000,
  "intentkit_api_port": 38080
}
```

## Important Fields

| Field | Meaning |
|------|---------|
| `validator_key_ref` | path to `validator_key_info.json` or `priv_validator_key.json` |
| `stack_dir` | explicit `xian-stack` checkout used by the runtime backend |
| `node_image_mode` | `registry` for pinned published images or `local_build` for workspace-built images |
| `node_*_image` | immutable integrated/split image references used when `node_image_mode=registry` |
| `node_release_manifest` | optional embedded provenance block copied from `xian-stack/release-manifest.json`, including the exact component Git refs, digest-pinned base images, and checksum-pinned external build inputs used for a canonical published image |
| `service_node` | enables the optional indexed-service stack used for BDS-backed reads |
| `operator_profile` | the intended operator posture inherited from the selected starter template |
| `monitoring_profile` | the monitoring posture inherited from the selected starter template |
| `snapshot_url` | optional remote bootstrap source; may point to a snapshot archive directly or to a signed snapshot manifest |
| `snapshot_signing_keys` | trusted Ed25519 public keys used when `snapshot_url` points to a signed snapshot manifest |
| `home` | explicit CometBFT home override |
| `block_policy_mode` | `on_demand`, `idle_interval`, or `periodic` |
| `block_policy_interval` | interval used for idle/periodic block policies |
| `tracer_mode` | execution tracer backend materialized into `[xian].tracer_mode` |
| `transaction_trace_logging` | enables per-transaction debug summaries during block execution |
| `app_log_level` | Xian application log level written to stderr and rotated files |
| `app_log_json` | emits Xian application logs as structured JSON instead of plain text |
| `app_log_rotation_hours` | rotation interval for Xian application logs |
| `app_log_retention_days` | retention window for rotated Xian application logs |
| `simulation_enabled` | enables readonly transaction simulation on this node |
| `simulation_max_concurrency` | maximum concurrent readonly simulations accepted by this node |
| `simulation_timeout_ms` | wall-clock timeout for one readonly simulation worker |
| `simulation_max_chi` | readonly chi budget cap used during simulation |
| `parallel_execution_enabled` | enables speculative parallel block execution for this node |
| `parallel_execution_workers` | worker count for speculative execution on this node |
| `parallel_execution_min_transactions` | minimum block size before speculative execution is attempted |
| `monitoring_enabled` | starts Prometheus and Grafana through the `xian-stack` backend |
| `dashboard_*` | optional runtime dashboard settings |
| `intentkit_enabled` | starts the optional stack-managed `xian-intentkit` deployment |
| `intentkit_network_id` | selects the Xian network slot exposed to `xian-intentkit` |
| `intentkit_*` | published local host/port settings for the stack-managed frontend and API |

The explicit VM execution policy under `[xian.execution.engine]` is currently a
lower-level runtime concern. It is rendered into `config.toml`, but it is not
yet a first-class high-level field family in the normal profile JSON flow.

For the remaining lower-level runtime keys that are **not** currently surfaced
through the high-level profile flow, see
[Runtime Features](/node/runtime-features).

## How Profiles Are Created

Profiles are usually created with:

```bash
uv run xian network join validator-1 --network mainnet --template embedded-backend ...
```

or by `network create` when bootstrapping a fresh local network.

Use `xian network template list` to inspect the canonical starter shapes before
creating or joining a network.

The current canonical templates standardize these postures:

- `single-node-dev`: `operator_profile=local_development`,
  `monitoring_profile=none`
- `single-node-indexed`: `operator_profile=indexed_development`,
  `monitoring_profile=local_stack`
- `consortium-3`: `operator_profile=shared_network`,
  `monitoring_profile=service_node`
- `embedded-backend`: `operator_profile=embedded_backend`,
  `monitoring_profile=service_node`

## Scope

Profiles are intentionally node-local. Network-wide defaults belong in the
manifest; node-specific overrides belong in the profile.

For canonical networks, the normal flow is:

- the network manifest pins published image digests
- the network manifest also embeds the release-manifest provenance for those images
- `xian network join` copies those pinned image references into the node profile
- `xian network join` also copies the release-manifest provenance block into the node profile
- `xian node start` pulls those images by default

That means a canonical node profile can answer both questions locally:

- which immutable image digests should this node run?
- which exact repo refs and build toolchain produced those images?

Use `node_image_mode=local_build` when you intentionally want the profile to
run whatever the local `xian-stack` workspace builds instead.

The block policy only changes whether chain time advances while the chain is
idle. Contract `now` still comes from the finalized consensus block timestamp.

Readonly simulation and speculative parallel execution are both node-local
operator posture. They do not change consensus rules, but they do change how a
node exposes free compute and how it schedules block execution work locally.

When `snapshot_url` points to a signed snapshot manifest instead of a raw
archive, the profile must also carry one or more trusted
`snapshot_signing_keys`. The node validates the manifest signature, `chain_id`,
and archive hash before restoring the referenced snapshot.

Application logging is also node-local. It changes how much execution context
the node records and how those logs are formatted and retained under
`.cometbft/xian/logs`.

`xian-intentkit` posture is also node-local. The profile only stores the
operator-facing enable flag, selected Xian network slot, and local published
ports. The stack adapter generates the actual `xian-intentkit` env file from
those profile fields plus the resolved RPC endpoint and chain ID of the node.
