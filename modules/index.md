# Modules

Modules are reusable on-chain contract or protocol units that can be installed
onto a running Xian network.

They are lower-level than solutions. A module answers: which contract set is
being installed, which exact sources are pinned, and which install recipes are
supported?

Use:

```bash
cd ~/xian/xian-cli
uv run xian module list
uv run xian module show dex
uv run xian module validate dex
uv run xian module install dex --recipe local-demo --stack-dir ../xian-stack
```

## Available Modules

- [DEX Module](/modules/dex)
- [Stable Protocol Module](/modules/stable-protocol)

## How Modules Relate To Solutions

A module is an installable contract/protocol unit. A solution is a full
workflow that composes templates, modules, services, examples, and docs.

For example, the DEX module owns the canonical AMM contracts. The DEX demo
solution composes the DEX module with a local indexed node, demo liquidity, and
optional automation.

