# How It Compares

Xian is best understood as a Python-first decentralized application platform
built around programmable networks, easy contracts, and clean integration.

## Compared with General-Purpose Smart-Contract Chains

| Topic | Xian | Typical general-purpose chain |
|------|------|------------------------------|
| Primary goal | easy programmable networks and integration | shared public execution and broad ecosystem reach |
| Contract language | restricted Python | Solidity / Vyper / Move / Rust-like stacks |
| Product emphasis | ease of use, flexibility, operations | ecosystem scale, liquidity, broad compatibility |
| Runtime model | Python-authored contracts with deterministic Xian execution | chain-specific VM and contract model |
| Best fit | app-specific decentralized backends | broad public smart-contract ecosystems |

## Compared with App-Chains

Like an app-chain stack, Xian separates:

- consensus and networking (`CometBFT`)
- application logic (`xian-abci`)
- deterministic runtime (`xian-contracting`)

What is unusual is the developer-facing model: Python contracts, Python SDKs,
Python-heavy workflows, and a stronger emphasis on making decentralization feel
like ordinary software infrastructure.

## Compared with Enterprise Blockchain Stacks

Compared with heavier enterprise stacks, Xian aims to stay more direct:

- easier to reason about for normal developers
- easier to script and automate
- easier to integrate with application code and services
- easier to run as a focused programmable network rather than as a sprawling platform exercise

## Compared with Monorepo Stacks

Xian keeps the repos split so that:

- deterministic runtime changes stay isolated
- operator UX can evolve independently
- runtime/backend and docs stay modular

The tradeoff is that the contracts between repos need to be explicit and
validated. That is why manifests, node profiles, and backend JSON surfaces are
treated as formal interfaces.
