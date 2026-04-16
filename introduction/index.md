# What is Xian?

Xian is a Python-authored platform for programmable decentralized systems. It
combines a deterministic contract language, a node/runtime stack, SDKs,
operator tooling, optional indexed services, and shielded execution building
blocks into one ecosystem.

The important framing is that Xian is not only "a smart-contract language." It
is the full path from contract authoring to node operations to application
integration.

## What You Build With It

With Xian you can build:

- public smart-contract applications such as tokens, registries, DEX flows, and
  workflow backends
- application-specific networks and validator-operated decentralized services
- backend services, wallets, agents, and automations that interact with those
  contracts through Python and TypeScript SDKs
- shielded asset and shielded-command flows built on the runtime `zk` verifier,
  `zk_registry`, and the `xian-zk` proving toolkit

## What Makes Xian Different

### Python Authorship

Contracts are written in a restricted, deterministic Python subset. That keeps
contract code readable for normal software teams while still enforcing
sandboxing, metering, and deterministic state transitions.

### Explicit Runtime Choices

Python is the source language, not the only execution engine. A network can run
contracts through the tracer-based Python runtimes or through `xian_vm_v1`,
which executes validated Xian VM artifacts under an explicit execution policy.

### Full Operator Stack

The maintained repos cover the operator path end to end:

- `xian-cli` for network and node workflows
- `xian-stack` for Docker topology, localnet, monitoring, and sidecars
- `xian-abci` for the deterministic application behind CometBFT
- `xian-configs` for canonical network bundles and contract presets

### Software-Friendly Integration

Xian ships the surfaces application teams usually need in practice:

- `xian-py` and `xian-js`
- browser and mobile wallets
- dashboard REST and WebSocket feeds
- BDS-backed indexed reads and optional GraphQL
- a contract hub, playground, MCP server, and proving toolkit

## Public and Shielded Execution

Xian supports both ordinary public contract flows and proof-backed shielded
flows.

The shielded stack is split on purpose:

- the runtime exposes a narrow native `zk` verifier surface
- `zk_registry` stores active verifying keys
- `xian-zk` handles proving, wallet sync, bundle generation, and local prover
  services off-chain
- `shielded-note-token`, `shielded-commands`, and adapters implement the
  on-chain application layer

This lets Xian support privacy-sensitive flows without turning the validator
runtime into a general-purpose proving environment.

## Start Here

- [Architecture Overview](/introduction/architecture-overview) for the repo and
  runtime map
- [Why Python?](/introduction/why-python) for the language and product thesis
- [Quickstart](/getting-started/) for the smallest setup that matches your goal
- [Core Concepts](/concepts/) for the runtime model, Xian VM, and shielded/ZK
  stack
