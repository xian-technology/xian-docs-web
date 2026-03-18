# Consensus & Finality

Xian uses CometBFT for Byzantine Fault Tolerant consensus.

## What CometBFT Does

- gossips transactions and blocks between peers
- orders transactions into blocks
- coordinates validator voting
- gives instant finality once a block is committed

## What Xian Adds on Top

Xian does not replace consensus. It provides the deterministic application
behind it:

- contract execution
- state storage
- app-hash generation
- contract/query APIs

## Finality Model

Once a block is committed by the validator set, it is final. Xian does not use
probabilistic reorg-style finality.

## Block Time

Contract time comes from the finalized block timestamp agreed by consensus.
That means:

- `now` in contracts is chain time, not local validator clock time
- every transaction in the same block sees the same `now`
- different block-production policies only change whether time advances during
  idle periods

## Version Discipline

Consensus depends on validators producing the same application state. In Xian,
that means validators must stay aligned on:

- network configuration
- `xian-abci` and `xian-contracting` versions
- CPython minor version
