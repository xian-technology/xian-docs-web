# Validator Operations Runbook

Use this runbook on local or explicitly managed private networks. The current
codebase has no active public testnet or mainnet.

## Preflight

Record and independently review:

- manifest path/hash, chain ID, and genesis hash
- release manifest and image digests
- validator account and consensus-key fingerprint
- height and app hash from at least two nodes
- active validator policy and target validator record
- operator and reviewer identities

```bash
xian node status validator-1
xian node endpoints validator-1
xian node health validator-1
```

The signing wallet, governance console, node status, and reviewed manifest must
show the same chain ID. Never load validator consensus keys into a wallet or
governance UI.

## Onboard

1. Generate or reference validator material.
2. Join an accepted manifest, initialize the home, and start the node.
3. Confirm sync, peers, height, and app hash.
4. Review the registration fee, approve the exact amount, and call
   `validators.register(...)`.
5. Confirm `pending` status, reward key, commission, registration bond, and
   profile metadata.
6. Add self-bond/delegation required by policy.
7. Complete manual approval or wait for hybrid/auto eligibility and rebalance.
8. Confirm the account is in `get_active_validators()`, has the expected power,
   and participates in consensus.

A healthy node is not an active validator until the on-chain set contains its
consensus key.

## Planned Exit

1. Record live bond, delegators, registration bond, and pending unbonds.
2. Call `announce_leave()` and retain the deadline.
3. Keep the node online while the validator remains active.
4. After the leave delay, call `leave()` even if rebalance already made the
   validator inactive.
5. Confirm terminal status, removal from the active set, registration-bond
   refund, and complete pending-unbond records.
6. Stop the node only after multiple observers confirm consensus health.
7. Each recorded owner claims its own unbond after `unlock_at`.

Reconcile starting stake against pending unbonds and any slashed value.

## Jail, Unjail, and Slash

Before a jail or slash vote, verify the target, evidence/incident reference,
active-set impact, replacement capacity, and quorum.

After jail, confirm the flag, reason, zero active power, and removal from the
active set. Unjail only clears the jail flag; activation still follows the
network's selection policy.

Runtime evidence supports `DUPLICATE_VOTE` and `LIGHT_CLIENT_ATTACK`.
`apply_evidence_penalty` is runtime-owned. Record the evidence ID/type/height,
policy rate, affected self-bond/delegations/pending unbonds, destination
balance, and active-set result. Repeating the same evidence ID must not slash
twice.

Governed `slash_member` is a separate reviewed action. Reconcile its result
before closing the incident.

## Governance Changes

For membership, fee, reward, power, vote-type, or policy changes:

1. Build the typed proposal through a trusted client.
2. Inspect exact target, function, and payload.
3. Run readonly simulation when supported.
4. Obtain independent review.
5. Verify the snapshotted voters, weights, and threshold.
6. Prepare a forward fix or recovery action before approval.
7. Verify changed and unchanged policy fields after execution.

Rehearse registration-fee and selection-policy changes by onboarding a fresh
candidate and checking active-set behavior.

## Incident Boundary

- If the chain finalizes consistently, prefer a governed forward patch.
- If finalization stops or app hashes diverge, stop and coordinate a recovery
  plan.

Preserve logs, heights, app hashes, runtime versions, snapshot checksums,
proposal/vote data, and transaction hashes. Freeze unrelated governance until
the incident is reconciled.

## Rehearsal

Exercise onboarding, bond/delegation, unbond/claim, leave, jail/unjail,
evidence idempotency, slashing, policy change, state patching, and snapshot
recovery on the pinned [5-Validator Localnet E2E](/node/localnet-e2e) release
state.

Do not treat a single-node green test as a public-network rehearsal.

## Completion Checklist

- active set and power match policy
- no unexpected leaving, jailed, or approved validators remain
- every slash matches the recorded rate and destination
- each unbond is assigned to its true owner
- all nodes converge on height and app hash
- proposal, simulation, voter snapshot, transactions, and final state are
  archived
- evidence artifacts contain no signing secrets
