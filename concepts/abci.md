# The ABCI Layer

ABCI is the boundary between CometBFT and the Xian application.

In Xian, `xian-abci` implements the application side of that boundary and
`CometBFT` owns consensus, networking, and block ordering.

## Core Responsibilities

`xian-abci` handles:

- `CHECK_TX` style validation before mempool admission
- block execution in `FINALIZE_BLOCK`
- state commit and app-hash generation
- read-only queries

## Important Behavior

- successful transactions emit standard ABCI events for contract events
- `simulate_tx` is handled in-process, not by a sidecar socket
- dashboard REST and WebSocket endpoints proxy or enrich CometBFT-facing data

## Why This Boundary Matters

Consensus does not know contract semantics. CometBFT only needs a deterministic
application that validates, executes, and commits the same state transitions on
every validator.
