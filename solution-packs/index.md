# Solution Packs

Solution packs are the product-oriented reference patterns for Xian.

They are not full end-user products. They are narrow, opinionated examples
that show how to use Xian as a Python-first decentralized backend for a real
application shape.

Every pack should explain:

- the use case
- why Xian fits
- the contract set
- the Python integration surface
- the operator template and recovery story

## Starter Flows

The canonical starter flows are now packaged directly in `xian-cli`.

Use:

```bash
cd ~/xian/xian-cli
uv run xian solution-pack list
uv run xian solution-pack show credits-ledger
uv run xian solution-pack starter credits-ledger
uv run xian solution-pack starter registry-approval --flow remote
```

`solution-pack show` returns the full machine-readable pack metadata. `starter`
returns the canonical ordered flow for a specific local or remote posture,
including the recommended network template, example directory, contract assets,
and step-by-step commands.

## Available Packs

- [Credits Ledger Pack](/solution-packs/credits-ledger)
- [Registry / Approval Pack](/solution-packs/registry-approval)
- [Workflow Backend Pack](/solution-packs/workflow-backend)

## Intended Progression

The initial pack set is:

1. Credits Ledger Pack
2. Registry / Approval Pack
3. Workflow Backend Pack

The goal is to prove Xian through concrete backend patterns rather than generic
toy contracts.

Today the deepest packs are:

- Credits Ledger, with a projected read model built from indexed chain events
- Registry / Approval, with an event-triggered projection hydrated from
  authoritative contract reads
- Workflow Backend, with separate processor and projector workers plus a
  projected queue/activity view
