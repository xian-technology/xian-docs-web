# Xian NFT

`xian-nft` owns the NFT product: XSC-0005 checker/reference contracts,
PixelSnek marketplace UI, and bootstrap tooling.

- Contract bundle: `xian-nft/contract-bundle.json`
- Bootstrap script: `xian-nft/scripts/bootstrap_nft.py`
- App: PixelSnek marketplace

Lifecycle:

- Install phase: post-genesis
- Included in genesis: no
- Shipped with node image: no

Install:

```bash
uv run --project ../xian-cli xian contract bundle validate contract-bundle.json
uv run --group deploy python scripts/bootstrap_nft.py
```
