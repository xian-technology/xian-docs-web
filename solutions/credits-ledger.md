# Credits Ledger Solution

The Credits Ledger solution uses Xian as the authoritative ledger for app
credits, balances, grants, burns, transfers, and event history.

The machine-readable solution manifest lives at
`xian-configs/solutions/credits-ledger/solution.json`.

## Composition

- template: `single-node-indexed` locally, `embedded-backend` remotely
- contracts: `xian-configs/solutions/credits-ledger/contracts/`
- examples: `xian-py/examples/credits_ledger`
- services: application API and projector worker owned by the example app

## Commands

```bash
cd ~/xian/xian-cli
uv run xian solution show credits-ledger
uv run xian solution starter credits-ledger
uv run xian solution starter credits-ledger --flow remote
```

Use the solution starter output as the canonical local or remote walkthrough.
