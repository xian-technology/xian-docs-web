# How It Compares

Xian is best understood as a Python-first smart-contract stack built on top of
CometBFT.

## Compared with EVM Chains

| Topic | Xian | Typical EVM chain |
|------|------|-------------------|
| Contract language | restricted Python | Solidity / Vyper |
| Consensus engine | CometBFT | chain-specific execution + consensus stack |
| Finality | BFT finality | often probabilistic outside BFT systems |
| Runtime model | source-level Python + metering | EVM bytecode |
| Storage backend | LMDB in the application | client-specific storage internals |

## Compared with App-Chains

Like an app-chain stack, Xian separates:

- consensus and networking (`CometBFT`)
- application logic (`xian-abci`)
- deterministic runtime (`xian-contracting`)

What is unusual is the contract language and tooling model: Python contracts,
Python SDKs, and a Python-heavy operator/developer workflow.

## Compared with Monorepo Stacks

Xian keeps the repos split so that:

- deterministic runtime changes stay isolated
- operator UX can evolve independently
- runtime/backend and docs stay modular

The tradeoff is that the contracts between repos need to be explicit and
validated. That is why manifests, node profiles, and backend JSON surfaces are
treated as formal interfaces.
