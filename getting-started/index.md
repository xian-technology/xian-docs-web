# Quickstart

Choose the smallest setup that matches what you want to do.

## Path 1: Contract Development Only

If you want to write and test contracts locally without running a node:

- use Python `3.14+`
- install `xian-tech-contracting`
- work with `ContractingClient`

```bash
python -m pip install xian-tech-contracting
```

This gives you:

- the contract runtime
- the linter
- `ContractingClient` for local deployment and testing

This is the fastest way to learn contract structure, storage, events, imports,
and testing.

## Path 2: Full Workspace / Node Development

If you want to work on nodes, localnet, canonical manifests, or cross-repo
runtime behavior:

- use the sibling-workspace layout
- use Python `3.14+`
- install `uv`
- install Docker with Compose

The maintained core workspace is:

```text
~/xian/
  xian-cli/
  xian-stack/
  xian-abci/
  xian-configs/
  xian-contracting/
  xian-py/
```

See [Development Environment](/getting-started/dev-environment) for the full
bootstrap flow.

## Path 3: Application Integration

If you are building an app, service, wallet, or agent instead of modifying the
runtime itself:

- use `xian-py` for Python integrations
- use `xian-js` for TypeScript/browser integrations
- use the node APIs for reads, events, and indexed data

## What To Read Next

- [Development Environment](/getting-started/dev-environment)
- [Your First Smart Contract](/getting-started/first-contract)
- [Deploying & Interacting](/getting-started/deploying)
- [Architecture Overview](/introduction/architecture-overview)
