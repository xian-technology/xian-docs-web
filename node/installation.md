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
uv run xian keys validator generate --out-dir ./keys/validator-1
uv run xian network join validator-1 --network mainnet \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
uv run xian node init validator-1
```

## Start the Runtime

```bash
uv run xian node start validator-1
```

For backend-only debugging from `xian-stack`:

```bash
python3 ./scripts/backend.py start --no-service-node
python3 ./scripts/backend.py status --no-service-node
python3 ./scripts/backend.py stop --no-service-node
```

## Current Distribution Note

The codebase is already structured around immutable images, but this repo set
currently documents the source-built workspace path. If you later publish
versioned node images, that becomes a distribution layer on top of the same
runtime contract documented here.
