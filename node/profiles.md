# Node Profiles

A node profile is the validated, operator-local JSON contract shared by
`xian-cli`, `xian-stack`, and `xian-deploy`.

Profiles describe how one node should be rendered and run. They do not replace
the network manifest or the generated CometBFT home.

## Example

```json
{
  "schema_version": 1,
  "name": "local-dev",
  "network": "local",
  "moniker": "local-dev",
  "validator_key_ref": "./keys/local-dev/validator_key_info.json",
  "stack_dir": "../xian-stack",
  "node_image_mode": "local_build",
  "block_policy_mode": "periodic",
  "block_policy_interval": "5s",
  "pruning_enabled": false,
  "tx_fee_mode": "paid_metered",
  "parallel_execution_enabled": false,
  "services": {
    "bds": { "enabled": true },
    "dashboard": { "enabled": true, "host": "127.0.0.1", "port": 18080 },
    "monitoring": { "enabled": true },
    "intentkit": { "enabled": false },
    "dex_automation": { "enabled": false },
    "shielded_relayer": { "enabled": false }
  }
}
```

The actual schema contains additional validated defaults and advanced sections;
do not copy this abbreviated example over an existing profile.

## Important Fields

| Field | Meaning |
| --- | --- |
| `network` | source manifest name or operator network label |
| `validator_key_ref` | validator key-info or private-validator key reference |
| `stack_dir` | `xian-stack` checkout used by the backend |
| `node_image_mode` | `registry` for pinned images or `local_build` for workspace builds |
| `node_integrated_image`, `node_split_image` | immutable image references in registry mode |
| `node_release_manifest` | build provenance copied from a network/release manifest |
| `p2p` | seeds and persistent peers |
| `genesis` | optional local genesis override |
| `snapshot_url`, `snapshot_signing_keys` | bootstrap source and trust roots |
| `block_policy_*` | idle-block behavior and interval |
| `tx_fee_mode`, `free_*_chi` | paid or free-metered transaction policy |
| `services` | BDS, dashboard, monitoring, and optional sidecars |
| `advanced` | lower-level CometBFT, state-sync, metrics, nonce, and parallel settings |

`xian_vm_v1` is fixed by the node runtime and is not a profile choice.

## Create and Inspect Profiles

```bash
xian setup node

xian network create local-dev \
  --chain-id xian-local-1 \
  --template single-node-dev \
  --generate-validator-key \
  --init-node

xian node status local-dev
```

The canonical `single-node-dev` template uses this full local service posture,
including GraphQL/GraphiQL through BDS and Prometheus/Grafana through the
monitoring service. It deliberately leaves product- and credential-dependent
sidecars disabled.

Use `xian network join` with an explicit accepted manifest for an
operator-managed shared network. The checked-in mainnet manifest is a rehearsal
asset, not a public-network default.

## Editing Rules

- Keep secrets out of profiles when a secret file or environment reference is
  supported.
- Prefer CLI generation and validation over manual edits.
- Re-run `xian node init` after changing fields that affect rendered config.
- Do not change genesis, chain ID, or validator state for a running network.
- Use digest-pinned images and retained provenance for release deployments.

## Related Pages

- [Config Taxonomy](/node/config-taxonomy)
- [Configuration](/node/configuration)
- [Runtime Features](/node/runtime-features)
