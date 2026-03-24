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
  "stack_dir": "../xian-stack",
  "seeds": [],
  "genesis_url": null,
  "snapshot_url": null,
  "service_node": false,
  "home": null,
  "pruning_enabled": false,
  "blocks_to_keep": 100000,
  "block_policy_mode": "on_demand",
  "block_policy_interval": "0s",
  "operator_profile": "embedded_backend",
  "monitoring_profile": "service_node",
  "dashboard_enabled": false,
  "monitoring_enabled": true,
  "dashboard_host": "127.0.0.1",
  "dashboard_port": 8080
}
```

## Important Fields

| Field | Meaning |
|------|---------|
| `validator_key_ref` | path to `validator_key_info.json` or `priv_validator_key.json` |
| `stack_dir` | explicit `xian-stack` checkout used by the runtime backend |
| `service_node` | enables the optional indexed-service stack used for BDS-backed reads |
| `operator_profile` | the intended operator posture inherited from the selected starter template |
| `monitoring_profile` | the monitoring posture inherited from the selected starter template |
| `home` | explicit CometBFT home override |
| `block_policy_mode` | `on_demand`, `idle_interval`, or `periodic` |
| `block_policy_interval` | interval used for idle/periodic block policies |
| `monitoring_enabled` | starts Prometheus and Grafana through the `xian-stack` backend |
| `dashboard_*` | optional runtime dashboard settings |

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

The block policy only changes whether chain time advances while the chain is
idle. Contract `now` still comes from the finalized consensus block timestamp.
