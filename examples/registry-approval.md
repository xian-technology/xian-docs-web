# Registry / Approval Example

The Registry / Approval example uses Xian as the authoritative proposal,
approval, activation, and revocation layer for a shared registry.

The machine-readable example manifest lives at
`xian-configs/examples/registry-approval/example.json`.

## Composition

- template: `single-node-indexed`
- contracts: `xian-configs/examples/registry-approval/contracts/`
- app code: `xian-py/examples/registry_approval`
- services: application API and projector worker owned by the example app

## Commands

```bash
cd ~/xian/xian-cli
uv run xian example show registry-approval
uv run xian example starter registry-approval
```

Use the example starter output as the canonical local walkthrough.
