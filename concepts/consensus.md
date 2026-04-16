# Consensus & Finality

Xian uses CometBFT for Byzantine Fault Tolerant consensus.

## What CometBFT Does

- gossips transactions and blocks between peers
- orders transactions into blocks
- coordinates validator voting
- finalizes blocks once the validator threshold is reached

## What Xian Adds

Xian provides the deterministic application behind that consensus engine:

- contract execution
- state storage and app-hash generation
- query surfaces
- node-local runtime features such as simulation, metrics, and indexed services

## Finality Model

Once a block is committed, it is final. Xian does not use probabilistic
reorg-style finality.

## Block Time

Contract time comes from the finalized block timestamp agreed by consensus.

That means:

- `now` in contracts is chain time, not a local validator clock
- every transaction in the same block sees the same `now`
- block policy only changes when new blocks appear during idle periods

## Version Discipline

Consensus depends on validators producing the same application state. In Xian,
validators must stay aligned on:

- network configuration
- `xian-abci` and `xian-contracting` versions
- the selected execution engine and its policy
- the supported runtime for that engine

For tracer-backed networks, that includes the aligned CPython minor version and
tracer mode. For `xian_vm_v1`, that includes the native runtime plus the same
`bytecode_version`, `gas_schedule`, and authority settings.
