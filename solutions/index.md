# Solutions

Solutions are complete application or operator patterns. They compose network
templates, modules, services, examples, and documentation into a usable flow.

Use:

```bash
cd ~/xian/xian-cli
uv run xian solution list
uv run xian solution show dex-demo
uv run xian solution starter dex-demo
uv run xian solution starter registry-approval --flow remote
```

## Available Solutions

- [Credits Ledger](/solutions/credits-ledger)
- [Registry / Approval](/solutions/registry-approval)
- [Workflow Backend](/solutions/workflow-backend)
- [DEX Demo](/solutions/dex-demo)

## Modules Vs Solutions

Use a module when you want to install a reusable contract/protocol set.

Use a solution when you want the surrounding workflow: recommended template,
install order, service expectations, examples, and docs.
