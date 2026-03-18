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
  "dashboard_enabled": false,
  "dashboard_host": "127.0.0.1",
  "dashboard_port": 8080
}
```

## Important Fields

| Field | Meaning |
|------|---------|
| `validator_key_ref` | path to `validator_key_info.json` or `priv_validator_key.json` |
| `stack_dir` | explicit `xian-stack` checkout used by the runtime backend |
| `service_node` | enables the integrated BDS path |
| `home` | explicit CometBFT home override |
| `dashboard_*` | optional runtime dashboard settings |

## How Profiles Are Created

Profiles are usually created with:

```bash
uv run xian network join validator-1 --network mainnet ...
```

or by `network create` when bootstrapping a fresh local network.

## Scope

Profiles are intentionally node-local. Network-wide defaults belong in the
manifest; node-specific overrides belong in the profile.
