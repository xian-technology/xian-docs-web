# Consensus & Finality

Xian uses unmodified upstream CometBFT **v0.40.0** for Byzantine Fault
Tolerant consensus. This is the supported source baseline; use the exact source
commit and archive checksum pinned by the accepted stack release. See
[Consensus Backend Compatibility](/node/upgrading#consensus-backend-compatibility)
for build provenance and the upstream tag's displayed-version caveat.

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

Consensus starts at round zero for each height. Validators can move to a later
round at the same height when they cannot agree on a proposal. The proposal
timeout controls how long a validator waits in that round for the proposal
block before voting nil. See
[CometBFT configuration](/node/configuration#rendered-home).

## Block Time

Contract time comes from the finalized block timestamp. CometBFT uses the
genesis time for the first block. For subsequent blocks, it takes the
voting-power-weighted median of timestamps in the previous block's commit
votes. See [CometBFT block construction](https://github.com/cometbft/cometbft/blob/v0.40.0/state/state.go#L216-L275).

That means:

- `now` in contracts uses chain time
- every transaction in the same block sees the same `now`
- consensus preserves nanosecond timestamps; contract `now` has UTC
  microsecond precision
- block policy controls when new blocks appear during idle periods

See [Time & Block Policy](/concepts/time-and-blocks) for precision, scheduling
and deadline rules.

## Version Discipline

Consensus depends on validators producing the same application state. In Xian,
validators must stay aligned on:

- network configuration
- `xian-abci` and `xian-contracting` versions
- the fixed `xian_vm_v2` runtime and gas policy
- the canonical Rust compiler and validator-derived VM IR
