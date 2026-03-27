# Staking Mechanics

Xian still does not expose a separate end-user staking CLI, but validator
economics and validator admission are now explicit on-chain surfaces.

Validator governance is network-driven and comes from the canonical contracts
shipped in `xian-configs`, especially:

- `members.s.py`, submitted as `masternodes`
- `rewards.s.py`
- `governance.s.py`

## What Exists Today

- validator admission and removal live on-chain
- candidates register with a bond through `masternodes.register(...)`
- active validators vote on validator onboarding, offboarding, and validator
  power changes
- validator governance proposals use snapshotted voter weights
- validator voting power drives both CometBFT validator power and the validator
  share of tx-fee rewards
- validator rewards can be redirected to an explicit payout address through
  `reward_key`
- operator setup is still handled off-chain through `xian-cli` and
  `xian-stack`

## What This Means Operationally

If you are preparing a validator:

1. coordinate with the target network's governance and validator policy
2. prepare the node key material and profile locally
3. register the validator on-chain and provide the desired validator metadata
4. wait for the validator-set approval vote to finalize
5. run the node with the approved network configuration

If you are documenting or integrating staking behavior, treat it as
network-specific, but no longer treat validator economics as an opaque manual
process. The canonical validator-governance contract now defines:

- the validator bond gate
- validator statuses and lifecycle
- validator power
- payout routing for validator rewards
