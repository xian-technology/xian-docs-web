# xian-cli

`xian-cli` is the operator-facing control plane for Xian networks and local
nodes. It also provides JSON-oriented wallet, query, simulation, and
transaction commands.

## Install

```bash
uv tool install xian-tech-cli
xian --help
```

Runtime-heavy commands require `xian-stack` and `xian-configs`, either as
sibling checkouts or through explicit directory flags.

## Command Groups

| Group | Purpose |
| --- | --- |
| `xian setup node` | guided local network creation or manifest-backed join |
| `xian network template` | list and inspect network templates |
| `xian network create` | create a local/operator-managed manifest and profile |
| `xian network join` | create a node profile from a manifest |
| `xian node` | initialize, start, stop, inspect, and recover a node |
| `xian doctor` | diagnose profiles, artifacts, services, and live endpoints |
| `xian snapshot` / `xian recovery` | restore or apply explicit recovery plans |
| `xian contract` | build offline artifacts and validate hash-pinned bundles |
| `xian client` | wallet, query, call, simulation, and transaction automation |

The checked-in `testnet` and draft `mainnet` manifests are configuration and
rehearsal assets. The current codebase has no active public testnet or mainnet.

## Create a Local Node

```bash
xian network create local-dev \
  --chain-id xian-local-1 \
  --template single-node-dev \
  --generate-validator-key \
  --init-node

xian node start local-dev
xian node health local-dev
xian node endpoints local-dev
```

Use `xian setup node` for an interactive flow. Add `--plan` or `--dry-run` to
review supported setup and recovery operations before writing files.

## Query and Submit

```bash
export XIAN_NODE_URL=http://127.0.0.1:26657

xian client wallet generate --private-key-out ./wallet.key
xian client query balance <address>
xian client call currency balance_of --kwargs-json '{"address":"<address>"}'
xian client simulate currency transfer \
  --kwargs-json '{"to":"bob","amount":1}'
```

Submit contract source:

```bash
xian client tx submit-source ./contracts/con_counter.s.py \
  --private-key-env XIAN_PRIVATE_KEY \
  --mode commit
```

`xian contract build-artifacts` is for offline inspection and CI. The node
does not accept those artifacts as the executable deployment payload.

Prefer environment variables or protected key files over command-line private
keys, which can leak through shell history and process listings.

## Operator Notes

- Manifests and node profiles are explicit files; inspect them before starting
  a node.
- Use `xian node status`, `health`, and `endpoints` instead of scraping Docker
  output.
- Product repositories own product bootstrap scripts. The CLI validates their
  contract bundles but does not install every product automatically.
- Automation should consume JSON output rather than human status text.

## Related Pages

- [Installation and Setup](/node/installation)
- [Configuration](/node/configuration)
- [Node Profiles](/node/profiles)
- [Source repository](https://github.com/xian-technology/xian-cli)
