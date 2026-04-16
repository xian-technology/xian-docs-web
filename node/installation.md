# Installation & Setup

The supported setup path today is the sibling-workspace model:

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
- Python 3.12+ for `xian-cli`, `xian-abci`, `xian-contracting`, and
  `xian-linter`
- Python 3.11+ for `xian-py`

## Bootstrap the Workspace

```bash
cd ~/xian/xian-cli
uv sync --group dev

cd ../xian-stack
make validate
```

`make validate` checks both the Compose topology and the canonical manifest
contract from `xian-configs`.

## Create Local Operator Artifacts

```bash
cd ~/xian/xian-cli
uv run xian network template list
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev --generate-validator-key --init-node
```

If you are joining an existing network instead of creating a fresh local one:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
uv run xian node init validator-1
```

Canonical network manifests can now pin published `xian-node` image digests.
When those fields are present, `xian network join` writes them into the node
profile and `xian node start` pulls those images by default instead of building
from the local workspace.

Canonical network manifests also carry the embedded release-manifest provenance
for those images. That same provenance block is copied into the node profile, so
`xian node status` can show both the pinned image digests and the exact repo
refs / build toolchain those images were produced from.

Use a local source-built override when you want to test unreleased changes:

```bash
uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
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
python3 ./scripts/backend.py start --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py status --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py stop --no-service-node --no-dashboard --no-monitoring
```

## Advanced Runtime Features

If you need lower-level runtime tuning such as:

- `python_line_v1` vs `native_instruction_v1`
- `xian_vm_v1` execution policy
- speculative parallel transaction execution
- direct `[xian]` metrics or mempool settings

see [Runtime Features](/node/runtime-features).

The supported high-level `xian-cli` flow currently surfaces tracer selection,
and parallel execution settings, but some lower-level runtime knobs still
require editing the rendered `config.toml`, using `xian-configure-node`, or
setting the relevant `xian-stack` environment variables.

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

Xian now supports two node-runtime paths on the same `xian-stack` backend:

- canonical networks can pin published immutable `xian-node` images by digest
- local and custom workflows can keep using source-built workspace images

The local `xian-stack` checkout still matters in both cases because it owns the
Compose topology, backend control plane, and smoke-tested operator flow.
