# Staking Mechanics

The current codebase does not expose a separate end-user staking CLI.

Validator membership and related economics are network-driven and governed by
the canonical contracts shipped in `xian-configs`, especially the `members`
contract and associated network presets.

## What Exists Today

- validator admission and removal logic live on-chain
- network economics are encoded in the canonical contracts and genesis assets
- operator setup is handled off-chain through `xian-cli` and `xian-stack`

## What This Means Operationally

If you are preparing a validator:

1. coordinate with the target network's governance and validator policy
2. prepare the node key material and profile locally
3. run the node with the approved network configuration

If you are documenting or integrating staking behavior, treat it as
network-specific until the protocol exposes a broader, stable public staking
surface.
