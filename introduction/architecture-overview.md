# Architecture Overview

The current Xian stack is split into a small set of focused repositories and a
runtime topology built around CometBFT plus Python-heavy services.

The important framing is that Xian is not only a contract runtime. It is a
full decentralized application platform with contract execution, node runtime,
SDKs, deployment tooling, indexed reads, and monitoring surfaces.

## Core Repositories

| Repo | Role |
|------|------|
| `xian-contracting` | deterministic contract runtime, linter, storage, metering |
| `xian-abci` | ABCI application, query layer, node services, optional dashboard |
| `xian-configs` | canonical network manifests, contracts, and bundled assets |
| `xian-stack` | Docker images, Compose topology, localnet, runtime backend |
| `xian-cli` | operator control plane for keys, network join/create, node lifecycle |
| `xian-py` | external Python SDK |

Related but non-core tooling:

- `xian-linter` for standalone linting service mode
- `xian-docs-web` for documentation

## Runtime Layers

```text
applications / services / wallets / automation
            |
         xian-py
            |
     CometBFT RPC / dashboard API
            |
        CometBFT
            |
            | ABCI
            v
         xian-abci
            |
            v
     xian-contracting + LMDB
```

## Where Each Repo Fits

### xian-contracting

Owns:

- sandboxed Python execution
- stamp metering
- contract linter
- LMDB-backed state driver
- local testing surface via `ContractingClient`

### xian-abci

Owns:

- `CHECK_TX`, `FINALIZE_BLOCK`, `COMMIT`, `QUERY`
- transaction validation and nonce logic
- event conversion into standard ABCI events
- bounded dry-run simulation
- optional dashboard and WebSocket observer service

### xian-configs

Owns canonical network assets:

- `networks/<name>/manifest.json`
- genesis bundles
- canonical contract sources used by networks

### xian-stack

Owns runtime packaging and topology:

- immutable node images
- Compose files
- integrated and fidelity localnet modes
- runtime defaults and resource limits

### xian-cli

Owns operator workflows:

- validator key generation
- `network create` and `network join`
- node profiles and manifest resolution
- `node init`, `start`, `stop`, `status`, `doctor`

### xian-py

Owns the external client-facing SDK:

- wallets
- transaction construction/signing
- read/query helpers
- sync and async API surfaces

## Optional Runtime Services

The stack also supports optional services that are outside the deterministic
consensus path:

- dashboard HTTP/WebSocket service
- BDS indexed read stack with Postgres storage, automatic catch-up, and local
  replay/reindex tooling
- optional GraphQL/PostGraphile v5 convenience layer over that BDS database

Those services improve observability and query ergonomics, but validators do
not depend on them for consensus.

This is part of the product thesis: Xian should be usable like a real software
tool, not only as a bare execution engine.
