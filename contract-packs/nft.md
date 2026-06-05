# NFT Contract Pack

The NFT contract pack lives in `xian-configs/contract-packs/nft`. It pins the
XSC-0005 checker and reference collection contracts owned by `xian-nft`.

Use:

```bash
cd ~/xian/xian-cli
uv run xian contract-pack show nft
uv run xian contract-pack validate nft
uv run xian contract-pack install nft --recipe reference-marketplace --repo-dir ../xian-nft
```

Recipes:

- `checker-only`: deploy only `con_xsc005`
- `reference-marketplace`: deploy `con_xsc005` and `con_xsc005_nft`

The pack is optional and post-genesis. It is not included in canonical network
genesis and is not shipped in the node image.
