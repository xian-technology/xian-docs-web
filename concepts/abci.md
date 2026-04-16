# The ABCI Layer

ABCI is the boundary between CometBFT and the Xian application.

In practice:

- CometBFT orders transactions, runs the validator protocol, and commits blocks
- `xian-abci` validates, executes, queries, snapshots, and exposes the
  application behavior behind that consensus engine

## What CometBFT Owns

CometBFT is responsible for:

- peer networking
- mempool propagation
- block proposal and voting
- final block commit
- canonical RPC for blocks, transactions, and consensus status

CometBFT does not understand contract semantics. It only knows how to drive a
deterministic application through the ABCI contract.

## What `xian-abci` Owns

`xian-abci` is the application implementation for Xian. It handles:

- mempool-side transaction checks
- block execution in `FINALIZE_BLOCK`
- state commit and app-hash production
- read-only query paths
- application snapshot export/import
- optional dashboard HTTP and WebSocket services

It also wires the execution runtime, whether that runtime is tracer-backed
Python or `xian_vm_v1`.

## Transaction Path Across The Boundary

At a high level, one transaction moves through these stages:

1. CometBFT receives and gossips the signed payload.
2. `xian-abci` performs mempool validation such as payload shape, nonce rules,
   and basic execution prechecks.
3. CometBFT includes the transaction in an ordered block.
4. `xian-abci` executes the block deterministically and produces state changes,
   events, receipts, and the new app hash.
5. CometBFT commits the block and finalizes the height.

That separation is why Xian can evolve contract execution without replacing the
consensus engine itself.

## Query Surfaces

The ABCI side is also where Xian exposes application queries.

Important query families include:

- current contract state and contract metadata
- transaction simulation
- indexed/BDS-backed history reads when the service-node stack is enabled
- performance and runtime health summaries
- application snapshot coordination

The dashboard service sits next to this layer. It does not change consensus; it
simply wraps or enriches CometBFT and ABCI-facing data for operator and
explorer use.

## Why This Boundary Matters

The ABCI split keeps responsibilities clear:

- CometBFT gives Xian finality and validator coordination
- Xian defines the application state machine

That is why Xian can remain Python-authored and contract-focused while still
using a mature BFT consensus engine underneath.
