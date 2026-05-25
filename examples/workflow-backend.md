# Workflow Backend Example

The Workflow Backend example uses Xian as an authoritative workflow state
machine while normal Python workers claim, process, project, and expose work
items.

The machine-readable example manifest lives at
`xian-configs/examples/workflow-backend/example.json`.

## Composition

- template: `single-node-indexed`
- contracts: `xian-configs/examples/workflow-backend/contracts/`
- app code: `xian-py/examples/workflow_backend`
- services: processor worker, projector worker, and application API

## Commands

```bash
cd ~/xian/xian-cli
uv run xian example show workflow-backend
uv run xian example starter workflow-backend
```

Use the example starter output as the canonical local walkthrough.
