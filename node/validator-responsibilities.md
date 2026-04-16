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

The exact alignment rules depend on the network's execution engine.

Tracer-backed networks require validators to stay aligned on:

- `xian-abci` and `xian-contracting`
- tracer mode
- the supported CPython minor version

`xian_vm_v1` networks require validators to stay aligned on:

- `xian-abci` and `xian-contracting`
- the native VM runtime capability
- `bytecode_version`
- `gas_schedule`
- native authority posture

In both cases, ad hoc local runtime changes are dangerous.

## Operational Safety

Good validator posture includes:

- testing changes in localnet or smoke flows before rollout
- keeping snapshots, state-sync inputs, and patch bundles organized
- exposing only the ports your deployment model actually needs
- separating validator duties from optional service-node extras when necessary
- watching for mismatches in execution, metrics, and indexed-service recovery

## What Validators Should Not Do

Validators should not:

- patch consensus-sensitive runtime code independently
- drift onto uncoordinated runtime versions
- improvise execution-policy settings on a live network
- treat optional dashboards, BDS, or relayers as if they were part of
  consensus-critical state

The safest posture is boring consistency.
