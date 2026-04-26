# Architecture Overview

Xian is organized as a small set of focused repositories that together cover
contract authoring, deterministic execution, node operations, SDKs, and
optional higher-level services.

## Core Runtime Repositories

| Repo | Main role |
|------|-----------|
| `xian-contracting` | contract compiler, sandbox, storage model, metering, standard library bridges, local testing |
| `xian-abci` | CometBFT application, block execution, query layer, snapshots, dashboard service |
| `xian-configs` | canonical network manifests, system contracts, templates, modules, solutions |
| `xian-stack` | Docker images, Compose topology, localnet, monitoring, optional sidecars |
| `xian-cli` | operator workflow surface for keys, manifests, node init/start/stop/health |

## Network, Module, Solution, And Sidecar Structure

The network catalog has three separate responsibilities:

- source owner repositories own active product or contract development
- `xian-configs` owns reproducible network, module, and solution assets
- tooling and runtime repositories consume those assets to create or run nodes

![Xian module, solution, localnet, CLI, and sidecar structure](/diagrams/xian-system-structure.svg)

The current maintained inventory is:

| Asset type | Count | Current location |
|------------|-------|------------------|
| Canonical network manifests | 3 | `xian-configs/networks/local`, `devnet`, `testnet` |
| Reusable network templates | 5 | `xian-configs/templates/*.json` |
| Genesis contract presets | 3 | `xian-configs/contracts/contracts_local.json`, `contracts_devnet.json`, `contracts_testnet.json` |
| Modules | 2 | `xian-configs/modules/dex`, `modules/stable-protocol` |
| Solutions | 4 | `xian-configs/solutions/*` |

The important terms are:

| Term | Meaning |
|------|---------|
| Source owner repo | The active development home for a product or contract set, such as `xian-dex` for the DEX contracts and frontend. |
| Genesis contract preset | A `contracts_*.json` file that tells genesis construction which contracts are included before a chain starts. |
| Module | A reusable installable contract or protocol unit, such as the DEX AMM contracts. |
| Solution | A complete application/operator pattern that composes templates, modules, services, examples, and docs. |
| Contract bundle | A hash-pinned manifest for a deployable set of contract source files. It is smaller and more mechanical than a module. |
| Localnet | A local network instance started by `xian-stack`, usually from canonical assets in `xian-configs`. |
| Sidecar | An optional runtime service attached to a node or indexed API. It is not part of consensus and does not change genesis. |

`xian-cli` is the operator-facing control plane over this catalog. It reads
network manifests, templates, profiles, modules, solutions, and contract-bundle
metadata from `xian-configs`. `xian-stack` is the local Docker runtime that
turns those assets into running nodes. `xian-deploy` is the remote deployment
equivalent for prepared host material. `xian-abci` owns the genesis builder and
runtime application behavior.

The DEX is the clearest example of the split. `xian-dex` owns active DEX
development. `xian-configs/modules/dex` carries the pinned DEX module snapshot
for repeatable installs. The `dex-demo` solution composes that module with a
recommended local network and automation posture. The base `local`, `devnet`,
and `testnet` genesis presets do not automatically make every network a DEX
network.

Prefer pinned snapshots and manifest hashes for cross-repo consumption. Avoid
symlinks between repositories for canonical catalog assets because they are
brittle in CI, Docker builds, remote deployments, archives, and release
artifacts.

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
