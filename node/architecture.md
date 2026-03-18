# Architecture

Xian node operations are intentionally split across multiple repos so the
deterministic core, operator UX, and runtime backend stay cleanly separated.

## Repo Responsibilities

| Repo | Responsibility |
|------|----------------|
| `xian-cli` | operator-facing commands and local manifest/profile artifacts |
| `xian-stack` | Docker images, Compose topology, backend control surface |
| `xian-abci` | deterministic node process, query handling, config rendering |
| `xian-configs` | canonical network bundles and contract presets |
| `xian-contracting` | contract runtime, metering, storage, linting |
| `xian-py` | external SDK for apps, wallets, and transaction helpers |

## Runtime Shapes

### Integrated

The default runtime is a single node container:

```text
operator -> xian-cli -> xian-stack backend -> integrated node container
                                            |- xian-abci
                                            `- CometBFT
```

This is the preferred operational default because it is simpler to run and
upgrade, while still using immutable images and proper container-native
supervision.

### Fidelity

The optional fidelity profile splits the node:

```text
operator -> xian-stack backend -> abci-app container
                               -> cometbft container
                               -> optional dashboard container
```

Use this when you want process isolation that more closely resembles an
orchestrated deployment.

## Optional Services

- Dashboard and explorer: separate HTTP/WebSocket service backed by CometBFT
  RPC
- BDS + GraphQL: optional Postgres and PostGraphile services for indexed data

These are not part of the deterministic execution path.

## Deterministic Boundary

Consensus-sensitive behavior lives in `xian-abci` and `xian-contracting`:

- transaction validation and execution
- ABCI request handling
- state storage and app-hash generation
- instruction metering and linter rules

Runtime services such as Compose, dashboard, GraphQL, and supervisor choice do
not change consensus semantics.
