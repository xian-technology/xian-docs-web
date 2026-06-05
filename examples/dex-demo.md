# DEX Demo Example

The DEX Demo example installs the DEX contract pack onto a local indexed
network so wallets, the DEX web app, automation services, and integration tests
use the same AMM contract surface.

The machine-readable example manifest lives at
`xian-configs/examples/dex-demo/example.json`.

## Composition

- template: `single-node-indexed`
- contract pack: `dex` with the `local-demo` recipe
- services: DEX automation can attach to the indexed service endpoint
- owner repo: active development lives in `xian-dex`

## Commands

```bash
cd ~/xian/xian-cli
uv run xian example show dex-demo
uv run xian example starter dex-demo
uv run xian contract-pack install dex --recipe local-demo --repo-dir ../xian-dex
```

See [DEX Contract Pack](/contract-packs/dex) for the reusable contract bundle
and install recipes.
