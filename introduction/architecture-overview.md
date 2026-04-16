# Architecture Overview

Xian is organized as a small set of focused repositories that together cover
contract authoring, deterministic execution, node operations, SDKs, and
optional higher-level services.

## Core Runtime Repositories

| Repo | Main role |
|------|-----------|
| `xian-contracting` | contract compiler, sandbox, storage model, metering, standard library bridges, local testing |
| `xian-abci` | CometBFT application, block execution, query layer, snapshots, dashboard service |
| `xian-configs` | canonical network manifests, contracts, templates, solution packs |
| `xian-stack` | Docker images, Compose topology, localnet, monitoring, optional sidecars |
| `xian-cli` | operator workflow surface for keys, manifests, node init/start/stop/health |

## Developer and Application Repositories

| Repo | Main role |
|------|-----------|
| `xian-py` | Python SDK for reads, submissions, watchers, indexed feeds, and shielded relayer clients |
| `xian-js` | TypeScript client, provider contract, relayer clients, and browser dapp example |
| `xian-wallet-browser` / `xian-wallet-mobile` | end-user wallet applications |
| `xian-contracts` | maintained contract packages, including shielded-note and shielded-command contracts |
| `xian-linter` | standalone lint service/package |
| `xian-playground-web` | browser playground for authoring, linting, deploying, and calling contracts |
| `xian-contracting-hub-web` | curated contract catalog and deployment UI |
| `xian-mcp-server` | local MCP/HTTP bridge for AI-assisted Xian workflows |

## Execution Path

At the protocol core, Xian looks like this:

```text
wallets / apps / services / agents
            |
      xian-py / xian-js
            |
   CometBFT RPC + dashboard APIs
            |
         CometBFT
            |
            | ABCI
            v
         xian-abci
            |
            v
     xian-contracting runtime
            |
            v
      LMDB application state
```

CometBFT owns consensus, networking, and block ordering. `xian-abci` owns the
application behavior behind that consensus boundary. `xian-contracting` owns
contract semantics, storage, metering, and the standard-library bridge used by
contracts.

## Contract Execution Layers

There are two separate concerns to keep distinct:

1. Contract authors write restricted Python source.
2. The network chooses how that source is executed.

Today Xian supports:

- tracer-based Python execution with `python_line_v1`
- tracer-based Python execution with `native_instruction_v1`
- `xian_vm_v1`, which executes validated Xian VM artifacts through a native
  runtime and explicit execution policy

That means Python remains the contract language, while the execution machine is
allowed to evolve without asking developers to rewrite contracts in a new
language.

## VM and ZK Building Blocks

Two important subsystems live inside the broader runtime architecture.

### Xian VM

`xian-contracting` can lower contracts into versioned VM artifacts for
`xian_vm_v1`. Those artifacts are validated during deployment and stored
alongside human-facing source so the native runtime can execute a stable,
Xian-defined machine contract instead of depending on CPython bytecode layout.

### Shielded / ZK Stack

The native verifier surface is intentionally narrow:

- `zk.verify_groth16(...)`
- `zk.verify_groth16_bn254(...)`
- `zk.has_verifying_key(...)`

The proving and wallet side stays off-chain in `xian-zk`, while the on-chain
layer lives in `xian-contracts` through `shielded-note-token`,
`shielded-commands`, and adapter contracts.

## Optional Services

Several services are useful in practice but are not part of consensus:

- dashboard HTTP and WebSocket APIs
- BDS-backed indexed reads and recovery tooling
- PostGraphile-based GraphQL over the BDS database
- the stack-managed shielded relayer
- stack-managed `xian-intentkit`

These services improve operator UX, analytics, wallet sync, and application
integration, but validators do not need them to agree on state.

## How The Pieces Fit In Practice

- contract authors usually start with `xian-contracting` and `ContractingClient`
- app developers use `xian-py`, `xian-js`, wallets, and the dashboard or indexed
  APIs
- node operators use `xian-cli`, `xian-stack`, `xian-abci`, and canonical assets
  from `xian-configs`
- privacy-sensitive applications additionally use `xian-zk`,
  `zk_registry`, shielded contracts, and optionally the relayer surface

That combination is the practical Xian architecture: one contract language,
multiple execution runtimes, and a surrounding stack that treats decentralized
infrastructure like a real software platform instead of an isolated VM.
