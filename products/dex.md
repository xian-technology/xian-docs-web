# Xian DEX

`xian-dex` owns the DEX product: canonical AMM contracts, the SnakX web app,
and the product-level bundle manifest.

- Contract bundle: `xian-dex/contract-bundle.json`
- Bootstrap script: `xian-dex/scripts/bootstrap_dex.py`
- Optional service: `xian-dex-automation`

Lifecycle:

- Install phase: post-genesis
- Included in genesis: no
- Shipped with node image: no
- Installer: `xian-dex/scripts/bootstrap_dex.py`

Install:

```bash
uv run --project ../xian-cli xian contract bundle validate contract-bundle.json
uv run python scripts/bootstrap_dex.py --recipe local-demo
```
