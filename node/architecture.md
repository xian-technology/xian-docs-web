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
- Monitoring: optional Prometheus/Grafana stack plus the Xian app metrics
  endpoint
- BDS: optional indexed storage layer with asynchronous block ingestion,
  automatic catch-up from CometBFT RPC, and replay/reindex tooling
- GraphQL: optional PostGraphile layer over the BDS Postgres database for
  convenience queries only
- Host-backed storage growth comes from chain data, Xian state, the BDS spool,
  and Postgres volumes rather than mutable growth inside a container image

These are not part of the deterministic execution path. The validator remains
authoritative for current-state reads through raw ABCI query, while BDS-backed
reads are indexed and eventually consistent.

## Deterministic Boundary

Consensus-sensitive behavior lives in `xian-abci` and `xian-contracting`:

- transaction validation and execution
- ABCI request handling
- state storage and app-hash generation
- instruction metering and linter rules

Runtime services such as Compose, dashboard, BDS, GraphQL, and supervisor
choice do not change consensus semantics.
