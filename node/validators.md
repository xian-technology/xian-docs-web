# Becoming a Validator

Becoming a validator in Xian has two separate parts:

- operator setup through `xian-cli` and `xian-stack`
- on-chain admission through the canonical membership contract shipped in
  `xian-configs/contracts/members.s.py` and submitted as `masternodes`

Protocol-level changes that affect validator policy or state patching also go
through `xian-configs/contracts/governance.s.py`, submitted as `governance`.

## Local Setup

Generate validator material:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
```

Join or create the target network profile:

```bash
uv run xian network join validator-1 --network mainnet \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
```

For canonical networks, that profile now inherits pinned published
`xian-node` image digests from the network manifest by default. Use
`--node-image-mode local_build` only when you intentionally want a
source-built local override.

Initialize the node home:

```bash
uv run xian node init validator-1
```

Start and verify:

```bash
uv run xian node start validator-1
uv run xian node status validator-1
uv run xian node endpoints validator-1
uv run xian node health validator-1
```

The local setup only prepares the node. It does not make the key part of the
active validator set by itself.

## Current Canonical Network Defaults

The maintained local, devnet, and testnet bundles in `xian-configs` currently
pin the validator-membership contract with these policy values:

| Key | Current bundled value |
| --- | --- |
| `genesis_registration_fee` | `100000` |
| `default_node_power` | `10` |
| `selection_mode` | `manual` |
| `max_validators` | `5` |
| `power_mode` | `equal` |
| `rebalance_interval` | `1` |
| `activation_delay_epochs` | `0` |
| `unbonding_period_days` | `7` |
| `min_self_bond` | `0` |
| `min_total_bond` | `0` |
| `max_commission_bps` | `10000` |
| `max_active_set_churn` | `1` |
| `min_bond_margin_bps` | `0` |
| `manual_override_enabled` | `true` |
| `slash_destination` | `dao` |
| `duplicate_vote_slash_bps` | `500` |
| `duplicate_vote_jail` | `true` |
| `light_client_attack_slash_bps` | `1000` |
| `light_client_attack_jail` | `true` |

That means the current bundled networks still run in explicit vote-driven
membership mode rather than automatic top-N admission.

## Validator Lifecycle

The canonical validator record tracks:

- validator account / consensus public key
- `status`
- current `active` membership flag
- `jailed` state and `jail_reason`
- requested and active validator power
- `reward_key`
- profile metadata: `moniker`, `network_endpoint`, `metadata_uri`
- registration bond held by `masternodes`
- `self_bond`, `total_delegated`, and `total_bond`
- commission rate in basis points
- delegator count
- timestamps for registration, join, leave, and pending leave

The lifecycle is:

1. Prepare the node and key locally.
2. Submit `masternodes.register(...)` on-chain.
3. Escrow the registration bond into the `masternodes` contract.
4. Set the requested validator profile fields:
   `reward_key`, `requested_validator_power`, `commission_bps_value`,
   `moniker`, `network_endpoint`, and `metadata_uri`.
5. Enter `pending` status.
6. Become `active` according to the current selection mode.
7. Optionally announce exit with `announce_leave()`, then finish with
   `leave()`.

Status values used by the contract today include:

- `pending`: registered, not yet active
- `active`: currently in the validator set
- `leaving`: announced leave, waiting out the leave delay
- `left`: clean exit completed
- `removed`: governed removal completed
- `withdrawn`: pending candidate unregistered before activation
- `approved`: approved / eligible but not currently in the active set

## Selection Modes

`members.s.py` supports three validator-set selection modes.

| Mode | Admission behavior | Rebalance behavior |
| --- | --- | --- |
| `manual` | `add_member` governance vote is required and directly activates the validator | automatic rebalancing is disabled |
| `auto_top_n` | a registered candidate can become active without an `add_member` vote | eligible validators are ranked by total bonded stake and selected automatically |
| `hybrid` | an `add_member` vote is required first, but activation still happens through rebalancing | approved candidates compete for active slots by bonded stake |

Important differences:

- In `manual`, `rebalance()` rejects with `Auto selection disabled.`
- In `auto_top_n`, a candidate only needs to register, satisfy bond gates, and
  wait out any activation delay before it can enter on rebalance.
- In `hybrid`, registration alone is not enough. Governance must approve
  `add_member`, which moves the validator into the approved candidate pool.

## Power Modes

The active set may use different rules for translating candidate state into
CometBFT voting power.

| `power_mode` | Active validator power |
| --- | --- |
| `equal` | every active validator gets power `10` |
| `requested` | active power follows each validator's requested power |
| `stake_weighted` | active power becomes `int(self_bond + total_delegated)` with a minimum of `1` |

On current bundled networks, `power_mode` is still `equal`.

## Rebalance Semantics

When `selection_mode` is `auto_top_n` or `hybrid`, the contract chooses the
active set by calling `rebalance()`. That function is exported publicly, and
the ABCI runtime also triggers an automatic epoch rebalance during
`finalize_block` when a new rebalance epoch begins.

Selection uses these rules:

- only non-jailed validators are eligible
- validators with `pending_leave` are excluded
- `self_bond` must satisfy `min_self_bond`
- `self_bond + total_delegated` must satisfy `min_total_bond`
- `activation_delay_epochs` is enforced through `eligible_at_epoch`
- candidates are ranked by `total_bond`
- ties are broken lexicographically by account key

Replacement behavior is intentionally conservative:

- incumbents stay in the set unless they fall out of eligibility or a
  challenger beats them by the configured `min_bond_margin_bps`
- at most `max_active_set_churn` incumbents are replaced per rebalance epoch
- validators pushed out of the set become `approved`, not deleted

## Governance Around Membership

The `masternodes` contract uses its own vote surface for validator operations.
Supported vote types are currently:

- `add_member`
- `remove_member`
- `jail_member`
- `unjail_member`
- `slash_member`
- `set_member_power`
- `change_registration_fee`
- `reward_change`
- `dao_payout`
- `chi_cost_change`
- `change_types`
- `update_policy`
- `topic_vote`

Current vote behavior:

- only active validators can open proposals
- the proposer automatically casts the first `yes`
- vote count and vote weight are snapshotted when the proposal is created
- the current bundled policy stores a 4/5 count threshold and a 4/5 weight
  threshold
- approval is reached when snapshotted `yes_weight` reaches the required
  weight threshold
- snapshotted vote count still matters for reporting and early-rejection logic
- each validator's recorded `yes` / `no` choice is stored per proposal for
  audit views and governance dashboards
- proposals expire after 7 days if still pending

On current bundled networks, validator voting weight comes from active
`validator_power`, not just one-validator-one-vote.

Validator-governance proposals emit lifecycle events for submission, votes,
approval, rejection, and expiry.

Validators can use the [Governance Web Console](/node/governance-web) to view
open proposals, connect the browser wallet, vote, and inspect per-validator
vote records.

## Manual Overrides In Non-Manual Modes

When the network is not in `manual` mode:

- `add_member` votes are allowed only in `hybrid`
- `remove_member`, `set_member_power`, `jail_member`, and `unjail_member`
  require `manual_override_enabled = true`
- `slash_member` votes remain allowed even when manual overrides are disabled

That split lets an auto-selected validator set keep automatic admission rules
while still retaining or disabling specific manual override hooks.

## Reward Behavior

The validator slice of transaction fees is no longer split equally per node.

The runtime now does this:

1. Take the validator bucket from the `rewards` contract split.
2. Divide that bucket across active validators in proportion to
   `validator_power`.
3. Send each validator's share to its `reward_key`, with delegation commission
   and pro-rata stake sharing applied afterward.

See [Staking Mechanics](/node/staking) for the detailed self-bond,
delegation, commission, and unbonding model.
