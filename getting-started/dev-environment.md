# Setting Up Your Development Environment

The recommended developer setup uses the sibling-workspace model:

```text
~/xian/
  xian-cli/
  xian-stack/
  xian-abci/
  xian-configs/
  xian-contracting/
  xian-py/
  xian-linter/
```

## Tooling

- Python 3.12+ for the core repos
- `uv`
- Docker with Compose
- Git

## Bootstrap

```bash
cd ~/xian/xian-cli
uv sync --group dev

cd ../xian-stack
make validate
```

## Useful Validation Loops

```bash
cd ../xian-contracting
uv run pytest tests/unit/test_linter.py tests/unit/test_lmdb_store.py tests/unit/test_tracer.py

cd ../xian-abci
uv run pytest tests/abci_methods/test_query.py tests/abci_methods/test_finalize_block.py

cd ../xian-stack
make smoke-cli
```

## Local Multi-Node Testing

```bash
cd ../xian-stack
python3 ./scripts/backend.py localnet-init --nodes 4 --topology integrated --clean
python3 ./scripts/backend.py localnet-up --wait-for-health
python3 ./scripts/backend.py localnet-status
```
