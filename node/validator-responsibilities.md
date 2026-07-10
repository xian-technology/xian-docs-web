# Validator Responsibilities

Validators are responsible for more than uptime. They are part of the
replicated state machine, so operational discipline directly affects consensus.

## Core Responsibilities

Validators are expected to:

- run the supported software versions for the network they joined
- protect validator and operator key material
- keep the node online, healthy, and correctly peered
- monitor height, sync status, mempool health, and runtime metrics
- apply approved network upgrades and recovery procedures in a coordinated way

## Determinism Discipline

The current supported validator runtime is the fixed `xian_vm_v1` path.

Validators must stay aligned on:

- `xian-abci` and `xian-contracting`
- the native VM runtime capability
- the fixed native VM gas schedule
- canonical Rust source-to-IR compilation for submitted contracts

Ad hoc local runtime changes are dangerous because validators replay the same
deterministic VM state machine.

## Operational Safety

Good validator posture includes:

- testing changes in localnet or smoke flows before rollout
- keeping snapshots, state-sync inputs, and patch bundles organized
- exposing only the ports your deployment model actually needs
- separating validator duties from optional BDS and sidecar extras when necessary
- watching for mismatches in execution, metrics, and indexed-service recovery

## What Validators Should Not Do

Validators should not:

- patch consensus-sensitive runtime code independently
- drift onto uncoordinated runtime versions
- improvise execution-policy settings on a live network
- treat optional dashboards, BDS, or relayers as if they were part of
  consensus-critical state

The safest posture is boring consistency.
