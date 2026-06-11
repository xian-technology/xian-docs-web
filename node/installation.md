# Installation & Setup

The supported setup path uses the sibling-workspace model:

```text
~/xian/
  xian-cli/
  xian-stack/
  xian-abci/
  xian-configs/
  xian-contracting/
  xian-py/
```

This is the layout used by image builds, smoke tests, and the cross-repo
operator flow.

If you install Xian packages from PyPI instead of using the sibling workspace,
the published package names are:

- `xian-tech-cli`
- `xian-tech-abci`
- `xian-tech-contracting`
- `xian-tech-py`
- `xian-tech-linter`

The command and import surfaces remain the same, for example `xian`,
`xian-abci`, `contracting`, and `xian_py`.

## Host Requirements

- macOS or Linux
- Docker with `docker compose`
- `uv`
- Python 3.14 for `xian-cli`, `xian-abci`, `xian-contracting`,
  `xian-linter`, and `xian-py`

## Bootstrap the Workspace

```bash
cd ~/xian/xian-cli
uv sync --group dev

cd ../xian-stack
make validate
```

`make validate` checks both the Compose topology and the canonical manifest
contract from `xian-configs`.

## Guided Node Setup

`xian setup node` is the recommended first path for local node setup. It walks
through the same lifecycle that the lower-level commands expose:

- choose whether to join an existing network or create a local single-node network
- choose the network name, node name, validator key mode, and runtime preset
- choose the validator selection policy when generating a fresh local genesis
- create or join the network manifest and write the node profile
- materialize the CometBFT home with `xian node init`
- optionally start the node and run the post-start health check

For an interactive setup:

```bash
cd ~/xian/xian-cli
uv run xian setup node
```

Non-interactive shells must pass either `--plan` or `--yes`. Use `--plan` to
inspect the exact lifecycle commands and output paths before writing files:

```bash
uv run xian setup node --mode join --network testnet --name validator-1 --plan
```

Use `--yes` to apply the plan without confirmation. In scripted runs, pass
`--start` explicitly when the node should start immediately:

```bash
uv run xian setup node --mode local --network local-dev --name validator-1 \
  --preset basic --key-mode generate --start --yes
```

For a joined node with indexed services, use the indexed preset and a validator
key reference:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
uv run xian setup node --mode join --network testnet --name validator-1 \
  --preset indexed --key-mode existing \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --start --yes
```

For mainnet or an operator-supplied network, pass the manifest explicitly:

```bash
uv run xian setup node --mode join --network mainnet --name validator-1 \
  --network-manifest /path/to/mainnet/manifest.json \
  --preset indexed --key-mode existing \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --no-start --yes
```

Common wizard options:

| Option | Use |
|--------|-----|
| `--mode join|local` | join a manifest-backed network or create a fresh local network |
| `--preset basic|indexed` | choose `single-node-dev` or `single-node-indexed` |
| `--key-mode generate|existing` | generate validator key material or use `--validator-key-ref` |
| `--network-manifest` | use an operator-supplied manifest for a joined network |
| `--bootstrap-mode genesis|snapshot` | choose the join bootstrap source |
| `--restore-snapshot` | restore the effective snapshot after initializing a joined node |
| `--start` / `--no-start` | start immediately or only write the artifacts |
| `--base-dir` | choose where `nodes/`, `networks/`, and `keys/` are written |
| `--stack-dir` / `--configs-dir` | point at explicit sibling checkouts |
| `--node-image-mode registry|local_build` | use pinned images or local source builds |
| `--tx-fee-mode paid_metered|free_metered` | choose paid transaction fees or 0-fee metered execution |
| `--free-tx-max-chi` | cap one transaction's submitted chi budget in `free_metered` mode |
| `--free-block-max-chi` | cap one proposed block's total submitted chi budget in `free_metered` mode |
| `--block-policy-mode on_demand|idle_interval|periodic` | block production policy when the template/manifest default is not wanted |
| `--block-policy-interval` | idle or periodic empty-block interval, for example `1s` or `10s` |
| `--validator-selection-mode manual|auto_top_n|hybrid` | validator-set selection policy for a generated local genesis; valid only with `--mode local` and without `--genesis-source` |
| `--force` | overwrite existing generated artifacts where supported |

Wizard defaults:

| Field | Default |
|-------|---------|
| setup path | `join` |
| joined network | `testnet` |
| local network | `local-dev` |
| node name | `validator-1` |
| local chain ID | `xian-local-1` for `local` / `local-dev`, otherwise `xian-<network>-1` |
| joined preset | `indexed` |
| local preset | `basic` |
| key mode | `generate`, unless `--validator-key-ref` is supplied |
| local validator selection mode | `manual` |
| interactive start choice | asks, defaulting to start |
| scripted start choice | does not start unless `--start` is supplied |

The `basic` preset maps to `single-node-dev`. It creates a minimal local node
profile with the dashboard enabled and BDS / monitoring disabled.

The `indexed` preset maps to `single-node-indexed`. It enables BDS, the local
dashboard, and monitoring. The first start of an indexed local build can spend
time pulling or building Docker images, including the PostGraphile image used by
the optional GraphQL layer. Startup progress is printed while Docker works.

For fresh local networks, validator selection is written into the generated
genesis file. Keep `manual` when validator admission should happen through
explicit governance votes. Use `auto_top_n` or `hybrid` when you need a local
chain that exercises stake-ranked validator-set rebalancing:

```bash
uv run xian setup node --mode local --network local-dev --name validator-1 \
  --preset basic --key-mode generate \
  --validator-selection-mode hybrid \
  --no-start --yes
```

This option does not apply when joining an existing network or when passing an
external `--genesis-source`. For a chain that already exists, validator policy
changes happen through the `validators.update_policy` governance path. See
[Becoming a Validator](/node/validators#selection-modes) for the selection mode
semantics.

The wizard is a thin wrapper over the explicit commands below. Use the lower
level commands directly when you need advanced flags or automation-specific
control that the wizard does not expose.

```bash
cd ~/xian/xian-cli
uv run xian network template list
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev --generate-validator-key --init-node
```

When using `xian network create` directly, the same genesis-time validator
policy is available with `--validator-selection-mode`. The flag is accepted only
when the command is generating the local genesis from a bundle:

```bash
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev \
  --bootstrap-node validator-1 \
  --generate-validator-key \
  --validator-selection-mode auto_top_n
```

If you are joining an existing network instead of creating a fresh local one:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
uv run xian network join validator-1 --network testnet \
  --template single-node-indexed \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
uv run xian node init validator-1
```

Mainnet operators should pass the operator-supplied mainnet manifest with
`--network-manifest`; the checked-in canonical manifests cover local, devnet,
and testnet.

Canonical network manifests may pin published `xian-node` image digests.
When those fields are present, `xian network join` writes them into the node
profile and `xian node start` pulls those images by default instead of building
from the local workspace.

Canonical network manifests also carry the embedded release-manifest provenance
for those images. That same provenance block is copied into the node profile, so
`xian node status` can show both the pinned image digests and the exact repo
refs / build toolchain those images were produced from.

Use a local source-built override when you want to test unreleased changes:

```bash
uv run xian network join validator-1 --network testnet \
  --template single-node-indexed \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack \
  --node-image-mode local_build
```

## Start the Runtime

```bash
uv run xian node start validator-1
uv run xian node status validator-1
uv run xian node endpoints validator-1
uv run xian node health validator-1
```

For backend-only debugging from `xian-stack`:

```bash
python3 ./scripts/backend.py start --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py status --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py stop --no-bds-enabled --no-dashboard --no-monitoring
```

## Advanced Runtime Features

If you need lower-level runtime tuning such as:

- `xian_vm_v1` bytecode or gas schedule policy
- speculative parallel transaction execution
- direct `[xian]` metrics or mempool settings

see [Runtime Features](/node/runtime-features).

The supported high-level `xian-cli` flow currently surfaces the common runtime
settings operators need during setup, including transaction fee mode, readonly
simulation, parallel execution, logging, pruning, and optional sidecars. Use
`xian-configure-node`, rendered config edits, or stack environment variables
only for lower-level runtime knobs that are not part of the profile flow.

## Remote Linux Hosts

Use `xian-deploy` when you want the same runtime contract on remote Linux
hosts.

Typical path:

```bash
ansible-playbook playbooks/bootstrap.yml
ansible-playbook playbooks/push-home.yml
ansible-playbook playbooks/deploy.yml
ansible-playbook playbooks/health.yml
```

Recovery/bootstrap variants:

```bash
ansible-playbook playbooks/restore-state-snapshot.yml
ansible-playbook playbooks/bootstrap-state-sync.yml
```

Use `playbooks/restore-state-snapshot.yml` when you already have an exported
Xian application-state snapshot archive.

Use `playbooks/bootstrap-state-sync.yml` when you want the remote node to join
from trusted peers through CometBFT state sync.

## Distribution Model

Xian supports two node-runtime paths on the same `xian-stack` backend:

- canonical networks can pin published immutable `xian-node` images by digest
- local and custom workflows can keep using source-built workspace images

The local `xian-stack` checkout still matters in both cases because it owns the
Compose topology, backend control plane, and smoke-tested operator flow.
