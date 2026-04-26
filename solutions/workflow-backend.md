# Workflow Backend Solution

The Workflow Backend solution uses Xian as an authoritative workflow state
machine while normal Python workers claim, process, project, and expose work
items.

The machine-readable solution manifest lives at
`xian-configs/solutions/workflow-backend/solution.json`.

## Composition

- template: `single-node-indexed` locally, `embedded-backend` remotely
- contracts: `xian-configs/solutions/workflow-backend/contracts/`
- examples: `xian-py/examples/workflow_backend`
- services: processor worker, projector worker, and application API

## Commands

```bash
cd ~/xian/xian-cli
uv run xian solution show workflow-backend
uv run xian solution starter workflow-backend
uv run xian solution starter workflow-backend --flow remote
```

Use the solution starter output as the canonical local or remote walkthrough.
