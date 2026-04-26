# DEX Module

The DEX module is the canonical Xian AMM contract set.

Active development lives in `xian-dex`. The pinned, reproducible catalog copy
lives in `xian-configs/modules/dex`.

## Contract Bundle

The canonical module assets are:

- `modules/dex/module.json`
- `modules/dex/contract-bundle.json`
- `modules/dex/contracts/con_pairs.s.py`
- `modules/dex/contracts/con_dex.s.py`
- `modules/dex/contracts/con_dex_helper.s.py`
- `modules/dex/contracts/con_lp_token.s.py`
- `modules/dex/contracts/demo_token.s.py`

Validate the module:

```bash
cd ~/xian/xian-cli
uv run xian module validate dex
```

## Recipes

The module currently exposes these recipes:

| Recipe | Purpose |
|--------|---------|
| `core` | Deploy `con_pairs`, `con_dex`, and `con_dex_helper` without demo liquidity. |
| `local-demo` | Deploy the core DEX contracts plus a demo token, LP token, and seeded XIAN/XDT pool. |
| `production` | Deploy the core contracts without local-only demo assets. |

## Local Install

Start a local network first:

```bash
cd ~/xian/xian-stack
make localnet-init
make localnet-up
```

Then install the DEX module:

```bash
cd ~/xian/xian-cli
uv run xian module install dex --recipe local-demo --stack-dir ../xian-stack
```

The older `make localnet-up-with-dex` target remains as a compatibility alias,
but new automation should prefer `xian module install dex ...`.

## Development Overrides

Use a different pinned bundle when testing a release candidate:

```bash
XIAN_DEX_BUNDLE=/path/to/contract-bundle.json make localnet-dex-bootstrap
```

Use raw source only for active DEX development:

```bash
XIAN_DEX_CONTRACTS_DIR=../xian-dex/src make localnet-dex-bootstrap
```

