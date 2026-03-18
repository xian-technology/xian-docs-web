# Validator Responsibilities

Validators are not just infrastructure operators. They are part of the
replicated state machine and must preserve deterministic execution across the
network.

## Core Responsibilities

- run the supported software version and Python version
- keep the node online and healthy
- protect validator key material
- monitor block height, peer connectivity, and RPC health
- stay aligned with approved network configuration

## Determinism Requirements

Validators must avoid:

- drifting to a different CPython minor version
- patching contract-runtime code independently
- running ad hoc forks of `xian-abci` or `xian-contracting`

Any of those can change bytecode metering or execution semantics and cause
state divergence.

## Operational Practice

- validate new runtime changes before rollout
- use localnet or smoke coverage for pre-upgrade checks
- keep snapshots and state handling disciplined
- expose only the ports that your deployment model actually requires
