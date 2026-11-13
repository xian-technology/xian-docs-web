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
| `services` | BDS, dashboard, monitoring, and optional sidecars |
| `advanced` | lower-level CometBFT, state-sync, metrics, and nonce settings |

`xian_vm_v2` is fixed by the node runtime and is not a profile choice.

The transaction fee policy is not a profile choice either: it is chain state
chosen at genesis (see [Chain Chi Caps](/concepts/chi#chain-chi-caps)), and
profiles that set `tx_fee_mode`, `max_tx_chi` or `max_block_chi` are rejected.
Set the policy with `xian network create` (or `xian setup node --mode local`)
through `--tx-fee-mode`, `--max-tx-chi` and `--max-block-chi`; it is recorded
as `fee_policy` in the network manifest.

Profiles and network templates that still carry the settings of the removed
parallel executor (`parallel_execution_enabled`, `parallel_execution_workers`,
`parallel_execution_min_transactions` or `advanced.parallel_execution`) are
rejected as unknown fields. Delete those fields; blocks always execute serially
(see [Block Execution](/concepts/block-execution)).

`advanced.metrics.host` and `advanced.metrics.port` are the host-side address
and port on which the node's application metrics are published (default
`127.0.0.1:9108`, local only). Inside the container the node always listens on
`0.0.0.0:9108`, which is also the in-network Prometheus target. A non-loopback
host needs the stack's public-metrics opt-in; see
[Public Exposure](/node/configuration#public-exposure).

Numeric polling intervals, metrics refresh intervals and nonce-expiry settings
must be finite numbers. Profile validation rejects `NaN`,
infinity and numbers too large to represent as finite runtime settings.

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
