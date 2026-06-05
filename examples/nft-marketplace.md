# NFT Marketplace Example

The NFT marketplace example installs the [NFT Contract Pack](/contract-packs/nft)
onto a local indexed network and runs PixelSnek from `xian-nft`.

Use:

```bash
cd ~/xian/xian-cli
uv run xian example starter nft-marketplace --flow local
```

The starter flow uses `single-node-indexed`, installs the `nft` contract pack
with the `reference-marketplace` recipe, and then starts the PixelSnek web app.
