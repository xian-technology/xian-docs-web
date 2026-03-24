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

## Current Distribution Note

The codebase is already structured around immutable images, but this repo set
currently documents the source-built workspace path. If you later publish
versioned node images, that becomes a distribution layer on top of the same
runtime contract documented here.
