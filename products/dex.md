# Xian DEX

`xian-dex` owns the DEX product: canonical AMM contracts, the SnakX web app,
and the product-level bundle manifest.

- Product catalog: `xian-configs/products/dex/product.json`
- Contract pack: [DEX Contract Pack](/contract-packs/dex)
- Example: [DEX Demo](/examples/dex-demo)
- Optional service: `xian-dex-automation`

Lifecycle:

- Install phase: post-genesis
- Included in genesis: no
- Shipped with node image: no
- Installer: `xian-dex/scripts/bootstrap_dex.py`
