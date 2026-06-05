# DEX Contract Pack

The DEX contract pack is the canonical Xian AMM contract set.

Active development lives in `xian-dex`. The pinned, reproducible catalog copy
lives in `xian-configs/contract-packs/dex`.

## Assets

The canonical assets are:

- `contract-packs/dex/contract-pack.json`
- `contract-packs/dex/contract-bundle.json`
- `contract-packs/dex/contracts/con_pairs.s.py`
- `contract-packs/dex/contracts/con_dex.s.py`
- `contract-packs/dex/contracts/con_dex_helper.s.py`
- `contract-packs/dex/contracts/con_lp_token.s.py`
- `contract-packs/dex/contracts/demo_token.s.py`

Validate the contract pack:

```bash
cd ~/xian/xian-cli
uv run xian contract-pack validate dex
```

## Recipes

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

Then install the DEX contract pack:

```bash
cd ~/xian/xian-cli
uv run xian contract-pack install dex --recipe local-demo --repo-dir ../xian-dex
```

For scripted setups, start the localnet first and then use
`xian contract-pack install dex ...` to drive the product-owned installer
through the CLI catalog flow.

## Development Overrides

Use a different pinned bundle when testing a release candidate:

```bash
cd ~/xian/xian-dex
XIAN_DEX_BUNDLE=/path/to/contract-bundle.json \
  uv run python scripts/bootstrap_dex.py --recipe local-demo
```

Use raw source only for active DEX development:

```bash
cd ~/xian/xian-dex
uv run python scripts/bootstrap_dex.py \
  --recipe local-demo \
  --dex-contracts-dir ./src
```
