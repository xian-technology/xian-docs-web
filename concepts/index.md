# Core Concepts

These pages explain how Xian behaves as a deterministic application platform,
not just how to call one contract function at a time.

## Start With These Mental Models

- [Transaction Lifecycle](/concepts/transaction-lifecycle) for the path from
  signed payload to finalized block
- [Consensus & Finality](/concepts/consensus) for the CometBFT boundary and
  validator agreement
- [The ABCI Layer](/concepts/abci) for what `xian-abci` actually owns
- [State Model](/concepts/state-model) for how contract data is stored and
  committed
- [Chi & Metering](/concepts/chi) for execution pricing and limits
- [Deterministic Execution](/concepts/deterministic-execution) for the rules
  that keep every validator aligned

## Runtime-Specific Concepts

- [The Xian VM](/concepts/xian-vm) for the split between Python authoring and
  VM-native execution policy
- [Parallel Block Execution](/concepts/parallel-block-execution) for
  speculative serial-equivalent execution
- [Time & Block Policy](/concepts/time-and-blocks) for `now`, idle blocks, and
  block-production policy

## Privacy and ZK Concepts

- [Shielded & ZK Stack](/concepts/shielded-zk-stack) for the runtime verifier,
  `zk_registry`, `xian-zk`, shielded-note-token, shielded-commands, and relayer

If you are new to Xian, read this section after the
[Architecture Overview](/introduction/architecture-overview) and before diving
into the lower-level API or node docs.
