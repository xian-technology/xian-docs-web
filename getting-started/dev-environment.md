# Development Environment

The recommended setup is the sibling-workspace model used by the maintained
repos, smoke tests, and localnet flows.

## Recommended Workspace

```text
~/xian/
  xian-cli/
  xian-stack/
  xian-abci/
  xian-configs/
  xian-contracting/
  xian-py/
```

Useful optional siblings depending on your work:

- `xian-linter` for standalone lint-service work
- `xian-js` for browser and TypeScript integrations
- `xian-wallet-browser` and `xian-wallet-mobile` for wallet development
- `xian-contracts` for maintained contract packages
- `xian-playground-web`, `xian-contracting-hub-web`, and `xian-mcp-server` for
  higher-level tooling

## Tooling Baseline

| Tool | Recommended version / note |
|------|-----------------------------|
| Python | `3.14` for the core repos |
| `uv` | preferred Python environment and command runner |
| Docker | required for `xian-stack`, localnet, and most node workflows |
| Git | needed for the sibling workspace |

The Python repos in the maintained workspace use Python `3.14`.

## Bootstrap

Start with the operator-facing repo, then validate the runtime stack:

```bash
cd ~/xian/xian-cli
uv sync --group dev

cd ../xian-stack
make validate
```

If you are working directly on the contract runtime or ABCI layer, also install
their dev environments:

```bash
cd ~/xian/xian-contracting
uv sync --group dev

cd ../xian-abci
uv sync --group dev
```

## Common Validation Loops

Use focused checks while you iterate.

```bash
cd ~/xian/xian-contracting
uv run pytest tests/unit/test_linter.py tests/unit/test_lmdb_store.py tests/unit/test_tracer.py

cd ../xian-abci
uv run pytest tests/abci_methods/test_query.py tests/abci_methods/test_finalize_block.py

cd ../xian-stack
make smoke-cli
```

## Local Multi-Node Testing

Use `xian-stack` when you need a realistic local validator environment:

```bash
cd ~/xian/xian-stack
python3 ./scripts/backend.py localnet-init --nodes 4 --topology integrated --clean
python3 ./scripts/backend.py localnet-up --wait-for-health
python3 ./scripts/backend.py localnet-status
```

For deeper whole-stack validation, use the maintained harnesses in
`xian-stack`, including the broader localnet e2e flows and the VM-oriented
localnet runs.

## Contract-Only Setup

Install Python 3.14, uv, Git and a Rust toolchain. The fresh-chain language ships in the source checkouts below. Use a separate folder for these commands. The pinned revision supplies contracting 1.1.4, compiler-core 0.2.1, VM-core 0.1.3 and runtime-types 0.1.6.

```bash
git clone https://github.com/xian-technology/xian-contracting.git
cd xian-contracting
git checkout --detach 412c53fc0cee4275ee0a6e6fa195054915447620
uv sync --frozen --group dev
uv run --no-sync python -c 'from xian_compiler_core import compiler_version; assert compiler_version()["vm_profile"] == "xian_vm_v2"'
```

Run tests from this environment using `uv run --no-sync pytest path/to/test_contract.py`. This installation includes the native VM. A package-index installation requires published matching versions of all four packages.

Continue with [Your first smart contract](/getting-started/first-contract).
