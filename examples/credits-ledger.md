# Credits Ledger Example

The Credits Ledger example uses Xian as the authoritative ledger for app
credits, balances, grants, burns, transfers, and event history.

The machine-readable example manifest lives at
`xian-configs/examples/credits-ledger/example.json`.

## Composition

- template: `single-node-indexed`
- contracts: `xian-configs/examples/credits-ledger/contracts/`
- app code: `xian-py/examples/credits_ledger`
- services: application API and projector worker owned by the example app

## Commands

```bash
cd ~/xian/xian-cli
uv run xian example show credits-ledger
uv run xian example starter credits-ledger
```

Use the example starter output as the canonical local walkthrough.
