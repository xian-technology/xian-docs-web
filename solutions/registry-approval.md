# Registry / Approval Solution

The Registry / Approval solution uses Xian as the authoritative proposal,
approval, activation, and revocation layer for a shared registry.

The machine-readable solution manifest lives at
`xian-configs/solutions/registry-approval/solution.json`.

## Composition

- template: `single-node-indexed` locally, `consortium-3` remotely
- contracts: `xian-configs/solutions/registry-approval/contracts/`
- examples: `xian-py/examples/registry_approval`
- services: application API and projector worker owned by the example app

## Commands

```bash
cd ~/xian/xian-cli
uv run xian solution show registry-approval
uv run xian solution starter registry-approval
uv run xian solution starter registry-approval --flow remote
```

Use the solution starter output as the canonical local or remote walkthrough.
