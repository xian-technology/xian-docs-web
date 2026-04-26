# DEX Demo Solution

The DEX Demo solution installs the DEX module onto a local or remote network so
wallets, the DEX web app, automation services, and integration tests use the
same AMM contract surface.

The machine-readable solution manifest lives at
`xian-configs/solutions/dex-demo/solution.json`.

## Composition

- template: `single-node-indexed` locally, `consortium-3` remotely
- module: `dex` with the `local-demo` local recipe or `production` remote
  recipe
- services: DEX automation can attach to the indexed service endpoint
- owner repo: active development lives in `xian-dex`

## Commands

```bash
cd ~/xian/xian-cli
uv run xian solution show dex-demo
uv run xian solution starter dex-demo
uv run xian module install dex --recipe local-demo --stack-dir ../xian-stack
```

See [DEX Module](/modules/dex) for the reusable contract bundle and install
recipes.
