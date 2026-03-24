# Node Operations

This section documents the current operator path for running Xian nodes from
the maintained repos:

- `xian-cli` owns operator workflows such as key generation, network join, node
  initialization, start, stop, status, snapshot restore, and doctor checks.
- `xian-stack` owns the Docker images, Compose topology, backend lifecycle
  script, localnet, and optional dashboard/BDS services.
- `xian-abci` owns the deterministic node process, config rendering primitives,
  CometBFT-facing behavior, and application snapshot serving/loading.
- `xian-configs` owns canonical network bundles and contract presets.

## Recommended Flow

The supported workflow today is:

1. Inspect the available starter templates with `xian-cli`
2. Generate validator key material with `xian-cli` when needed
3. Create or join a network manifest/profile
4. Materialize the local CometBFT home with `xian node init`
5. Start and stop the runtime through `xian-stack`
6. Use `xian node status`, monitoring, and the optional dashboard for inspection

Typical commands:

```bash
uv run xian network template list
uv run xian network create local-dev --chain-id xian-local-1 \
  --template single-node-dev --generate-validator-key --init-node
uv run xian node status validator-1
uv run xian node stop validator-1
```

For joining an existing network with indexed services and monitoring defaults:

```bash
uv run xian network join validator-1 --network mainnet \
  --template embedded-backend \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
uv run xian node init validator-1
uv run xian node start validator-1
```

Without templates, the lower-level flow is still available:

1. Generate validator key material with `xian-cli`
2. Create or join a network manifest/profile manually
3. Materialize the local CometBFT home with `xian node init`
4. Start and stop the runtime through `xian-stack`
5. Use `xian node status` and the optional dashboard for inspection

## Runtime Topologies

Xian currently supports two runtime topologies in `xian-stack`:

- `integrated`: one container per node, with `xian-abci` and `CometBFT`
  supervised together by `s6-overlay`
- `fidelity`: separate `xian-abci` and `CometBFT` containers, closer to an
  orchestrated production layout

The dashboard is optional in both cases and runs as its own service. BDS and
GraphQL are optional indexed-read services on top of the node, not part of the
deterministic validator path.

## What This Section Covers

- [Architecture](/node/architecture): how the runtime pieces fit together
- [System Requirements](/node/requirements): host, Docker, and workspace needs
- [Installation & Setup](/node/installation): supported setup path today
- [Configuration](/node/configuration): manifests, profiles, homes, and ports
- [Node Profiles](/node/profiles): the JSON contract used by `xian-cli`
- [Starting, Stopping & Monitoring](/node/managing): the operational commands
- [Snapshots & Reindex](/node/managing): application snapshots, BDS replay,
  reindex, and snapshot import/export workflows
- [Validators](/node/validators): validator-specific setup and expectations
