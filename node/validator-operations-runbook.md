# Validator Operations Runbook

This runbook covers validator onboarding, planned exit and unbonding,
jail/unjail, evidence and slashing, governance configuration changes, and
incident recovery.

Use it against a local or explicitly managed private network. The current
codebase has no active public testnet or mainnet. A draft `xian-mainnet-1`
manifest is rehearsal material, not a public-network invitation.

## Before Any Operation

Record these inputs before touching node or chain state:

- network manifest path and SHA-256
- release-manifest hash and pinned image digests
- chain id and genesis hash
- validator account and consensus-key fingerprint
- current height and app hash from at least two nodes
- current `validators.get_policy_config()` result
- current validator record and relevant balances
- operator, reviewer, and incident-lead names

Then verify the local process:

```bash
uv run xian node status validator-1
uv run xian node endpoints validator-1
uv run xian node health validator-1
```

The browser wallet must show the same chain id as the governance console and
the reviewed manifest. Direct lifecycle calls such as `register()`,
`announce_leave()`, and `claim_unbond()` require a reviewed wallet or SDK
transaction. The governance console handles validator-governance proposals;
it never holds validator keys.

## Onboard A Validator

### 1. Prepare The Node

Generate or reference validator material, join the private-network manifest,
initialize the home, and start the node:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
uv run xian network join validator-1 \
  --network-manifest ./private-network-manifest.json \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
uv run xian node init validator-1
uv run xian node start validator-1
uv run xian node health validator-1
```

Do not publish consensus private-key material or copy it into the governance
console.

### 2. Register On-Chain

Review the registration fee and fund/approve the exact amount before calling:

```text
validators.register(
  reward_key=<operator reward account>,
  requested_validator_power=<positive integer>,
  commission_bps_value=<0..policy max>,
  moniker=<operator label>,
  network_endpoint=<optional read-only endpoint>,
  metadata_uri=<optional profile URI>
)
```

Confirm the returned record has:

- `status = pending`
- `pending_registration = true`
- the intended registration bond, reward key, commission, and profile
- no unexpected jail or slash state

If the candidate needs stake to satisfy policy gates, use `bond_self(amount)`.
Delegators use `delegate(validator, amount, reward_key)` and should independently
record their ownership and reward key.

### 3. Complete Admission

Admission depends on `selection_mode`:

- `manual`: active validators approve `add_member` and finalization activates
  the candidate directly
- `hybrid`: `add_member` changes the candidate to `approved`; a later rebalance
  selects eligible bonded candidates
- `auto_top_n`: no add-member vote is used; wait for the eligibility epoch and
  rebalance

Confirm the active record, effective power, reward key, bond totals, and
consensus participation. A node that is healthy but not in
`get_active_validators()` is not an active validator.

Candidate rollback is `unregister()` while the account is pending or approved.
It refunds the registration bond and moves stake/delegation into unbond records.
An active validator must use the exit workflow instead.

## Planned Exit And Unbond

1. Record the validator record, delegator list, registration bond, live stake,
   and existing pending-unbond ids.
2. Call `announce_leave()` and preserve its `pending_leave_at` value.
3. Keep the validator node online while it remains in the active set. Do not
   stop at announcement time.
4. Monitor the governance console through any automatic rebalance. A leaving
   validator may be removed from the active set before the leave deadline.
5. After `pending_leave_at`, call `leave()` even if a rebalance already made the
   validator inactive.
6. Confirm terminal `status = left`, `active = false`, zero live self/delegated
   bond, registration-bond refund, and the complete pending-unbond set.
7. Stop the node only after multiple observers agree that the account is out of
   the active set and consensus remains healthy.
8. After each `unlock_at`, the recorded owner calls `claim_unbond(unbond_id)`.

The operator cannot claim delegator unbonds. Every delegator must track and
claim its own records. Reconcile the sum of live stake before exit against
pending-unbond amounts plus any applied slash.

## Jail And Unjail

A governed jail proposal uses:

```json
{
  "member": "<validator account>",
  "reason": "<reviewed incident reason>"
}
```

Before voting, confirm the target, evidence/incident reference, current active
set, replacement capacity, and effect on quorum. After approval, confirm:

- `jailed = true`
- `jail_reason` and `last_jailed_at`
- zero active power and removal from the active set
- bonding/delegation is closed
- replacement/rebalance behavior matches policy

Unjail uses the validator account string as the proposal argument. Unjail only
clears the jail flag; it does not promise immediate activation. Confirm
`last_unjailed_at`, candidate/approved status, bond gates, eligibility epoch,
and a later rebalance or manual admission as required.

## Evidence And Slashing

Supported runtime evidence types are:

- `DUPLICATE_VOTE`
- `LIGHT_CLIENT_ATTACK`

`apply_evidence_penalty(...)` is runtime-owned and rejects normal callers. An
operator or governance UI must not impersonate the evidence driver.

For every evidence incident, record:

- evidence id, type, height, and observed time
- validator record before/after
- configured slash basis points and jail flag
- live self-bond, delegation, and slashable pending-unbond amounts
- slash result and destination balance delta
- active-set and quorum impact

The contract deduplicates by evidence id. Replaying the same id must return a
duplicate result without another slash. Pending unbonds are slashable only when
the infraction height is at or before their creation block.

A governed `slash_member` payload is separate from runtime evidence:

```json
{
  "member": "<validator account>",
  "slash_bps": 500,
  "reason": "<reviewed reason>",
  "infraction_height": 12345
}
```

`slash_bps` must be an integer from 1 through 10000. Reconcile the result
before closing the proposal or incident.

## Governance Fee And Configuration Changes

Use the governance console's typed proposal builder, inspect the exact call,
run simulation, and obtain an independent review before wallet signing.

The contract validates proposal payloads before creating a proposal:

| Vote type | Accepted payload |
| --- | --- |
| `change_registration_fee` | positive numeric value; zero is rejected because registration transfers must be positive |
| `update_policy` | non-empty object containing only documented policy fields with correct integer/boolean/string types |
| `jail_member` | object with non-empty `member` and optional string `reason` |
| `unjail_member` | non-empty validator account string |
| `slash_member` | object with member, integer `slash_bps`, optional reason, and optional non-negative integer infraction height |
| `set_member_power` | object with member and positive integer power |
| `reward_change` | four positive numeric values summing to exactly 1 |
| `dao_payout` | object with an existing `contract_name`, positive `amount`, and non-empty `to` |
| `chi_cost_change` | positive numeric value |
| `change_types` | non-empty unique list retaining every immutable recovery vote type |
| `topic_vote` | object with one non-empty `topic` field |

For a registration-fee change, prove a candidate can approve and pay the new
fee on the rehearsal network. For `update_policy`, record every changed key and
verify untouched keys remain identical.

`change_types` cannot remove these recovery controls:

- membership: `add_member`, `remove_member`
- safety: `jail_member`, `unjail_member`, `slash_member`
- voting power: `set_member_power`
- candidate admission: `change_registration_fee`
- transaction cost: `chi_cost_change`
- vote-surface restoration: `change_types`
- validator policy: `update_policy`

`reward_change`, `dao_payout`, and `topic_vote` remain configurable. Review
changes to those optional types, but omission cannot disable the recovery set.

Prepare a forward-fix or rollback proposal before approving a configuration
change. Thresholds and eligible voters are snapshotted at proposal creation,
so verify the snapshot as well as current membership.

## Incident And Rollback

Use this decision boundary:

- chain is finalizing consistently: prefer a governed forward state patch
- chain is stalled or validators disagree on app hash: stop and coordinate a
  recovery plan

For a validator incident:

1. Assign an incident lead and freeze unrelated governance changes.
2. Capture height/app hash from multiple validators and preserve logs.
3. Decide whether the validator stays online, is jailed, or begins planned
   exit; do not improvise multiple transitions at once.
4. Reconcile evidence and slash scope before proposing a penalty.
5. Verify quorum after any active-set change.
6. Record the proposal, vote snapshot, transaction hashes, and final validator
   record.

For chain recovery, follow [Recovery Plans](/node/recovery-plans). Validators
must agree off-chain on trusted height, block hash, app hash, runtime versions,
snapshot checksum, and the exact recovery plan before applying it. Do not use a
recovery plan as a routine validator rollback.

## Local And Private-Network Rehearsal

Run the whole workflow from one pinned release state:

1. Start the [5-Validator Localnet E2E](/node/localnet-e2e) topology.
2. Record manifest/release hashes, genesis, starting height, and app hash.
3. Register a candidate; exercise manual or hybrid approval and selection.
4. Exercise self-bond, delegation, undelegation, unlock, and claim.
5. Announce leave, trigger a rebalance during the delay, then complete leave.
6. Exercise jail and unjail with governance vote snapshots.
7. Inject supported test evidence through the runtime path; repeat the evidence
   id to prove idempotency and reconcile the slash destination.
8. Simulate and approve a registration-fee and policy change; verify malformed
   payload rejection.
9. Exercise a forward state patch and a snapshot-based recovery plan.
10. Confirm all nodes converge on the same final height/app hash and archive the
    evidence bundle.

Repeat on a private topology with peer discovery, validator churn, and snapshot
restore. A green single-node or local-only test is not a public-network
rehearsal.

## Completion Checklist

- no validator is unexpectedly `leaving`, `jailed`, or `approved`
- active set and effective powers match the intended policy
- every slash matches the configured rate and destination
- every unbond is assigned to its real owner and tracked to claim
- governance payload, simulation, voter snapshot, and final state are archived
- all participating nodes agree on height/app hash
- no private signing material appears in logs or evidence artifacts
