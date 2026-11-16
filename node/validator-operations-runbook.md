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
show the same chain ID. Keep validator consensus keys out of general-purpose
wallets and governance UIs. Registration requires a controlled signing workflow
for the validator account itself; a separate reward account or wrapper contract
cannot register that consensus identity.

## Onboard

1. Generate or reference validator material.
2. Join an accepted manifest, initialize the home, and start the node.
3. Confirm sync, peers, height, and app hash.
4. Review the registration fee, approve the exact amount, and call
   `validators.register(...)` directly from the validator account.
5. Confirm `pending` status, reward key, commission, registration bond, and
   profile metadata.
6. Add self-bond/delegation required by policy.
7. Complete manual approval or wait for hybrid/auto eligibility and rebalance.
   Voters first confirm that the candidate's node is synced and runs the
   registered consensus key: in a set of fewer than four validators one
   newcomer that does not sign holds a third or more of the power and halts
   the chain (see [Halt Recovery](#halt-recovery)).
8. Confirm the account is in `get_active_validators()`, has the expected power,
   and participates in consensus.

A healthy node is not an active validator until the on-chain set contains its
consensus key.

## Planned Exit

1. Record live bond, delegator count, registration bond, and pending unbonds.
   Delegations stay in the validator's pool after the exit; delegators
   undelegate (and claim pending rewards) themselves.
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

A validator absent from `downtime_jail_blocks` consecutive commits is jailed
with reason `downtime` (infraction `DOWNTIME`, slashed by `downtime_slash_bps`)
by the runtime, not by a vote. Once the node signs again and
`downtime_unjail_cooldown_hours` have passed, the operator calls `unjail()`
from the validator account and the validator re-enters the active set (also in
`manual` mode) if it meets the minimum stake, a seat is free and the epoch's
newcomer power cap allows it; otherwise `unjail()` says to retry next epoch.
Check `missed_blocks` in the validator record to see an open
count before it reaches the window.

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
For a reward-split change, verify `[validators, burn, foundation, developers]`
on multiple nodes, then inspect a fee-paying transaction and reconcile all four
buckets against its charged fee.

## Incident Boundary

- If the chain finalizes consistently, prefer a governed forward patch.
- If finalization stops because validators holding a third or more of the
  power are offline, follow [Halt Recovery](#halt-recovery).
- If app hashes diverge, stop and coordinate a recovery plan.

Preserve logs, heights, app hashes, runtime versions, snapshot checksums,
proposal/vote data, and transaction hashes. Freeze unrelated governance until
the incident is reconciled.

## Halt Recovery

When validators holding a third or more of the voting power stop signing at
once, CometBFT commits no further block: downtime jailing and governance both
need a committed block, so nothing on chain can repair the set. Signs: every
online node stays at the same height, the consensus state shows rounds
increasing with precommits below 2/3, and the app hashes of the last
committed height agree (if they differ, this is not a halt from offline power;
do not use this procedure).

The online operators restart the chain from its last committed state with
only the validators that still run. The recovery genesis keeps the chain id
and the state; it starts two heights after the export, skipping the height
the halted chain was voting on, so no height carries votes of both chains.

1. **Agree off chain** on the validators to keep (the online ones, together
   holding all the power of the new set), one genesis time in UTC later than
   the last block, and the halted height. Every kept validator must take part.
2. **Stop and back up.** Each kept operator stops its node and copies the whole
   node home (`config/`, `data/`, the Xian state directory) aside.
3. **Export.** Each runs `xian-export-state --output-path <home>/recovery`
   against the stopped node's state. Compare the `hash` and `number` of every
   `exported_state.json`: they must be identical (the root of the last
   committed height). An operator whose node lags re-syncs first.
4. **Build the genesis.** Each runs

   ```bash
   xian-recovery-genesis --exported-state <home>/recovery/exported_state.json \
     --chain-id <chain id> --genesis-time <agreed time> \
     --keep <key> [--keep <key> ...] --output <home>/recovery/genesis.json
   ```

   and publishes the SHA-256 of the file; all digests must match. The tool refuses a tampered export, a
   validator that is not active, and a genesis time before the last block. The
   validators not kept become approved, jailed for downtime (power 0) at the
   genesis time.
5. **Install.** Each replaces `config/genesis.json` with the recovery genesis,
   deletes everything in `data/` except `priv_validator_state.json` (keep it:
   it is what prevents double signing), deletes the Xian state directory, and
   starts the node.
6. **Verify.** The first block is the export's height + 2, every node reports
   the same height and app hash, the active set is the kept validators, and
   the others are jailed with reason `downtime`.
7. **Offline validators return** only after wiping the halted chain's data
   (keeping their keys and `priv_validator_state.json`) and syncing the
   recovery genesis; then they `unjail()` after the cooldown and re-enter the
   active set within the newcomer power cap.

A BDS indexer keeps its database: it continues with the recovered chain's
first block (the skipped height has no block). The history before the halt
lives in the BDS databases and the node-home backups, not in the recovered
nodes' block stores.

Rehearsed on a four-validator localnet: after one validator was jailed for
downtime, a second one stopped and the chain halted at height 156; the two
remaining operators built byte-identical recovery genesis files, kept their
`priv_validator_state.json`, and the chain committed height 158 within seconds
of the restart and went on with them. The stopped validator, restarted with
its old data, stayed at 156 and caused no evidence or jail.

## Rehearsal

Exercise onboarding, bond/delegation, unbond/claim, leave, jail/unjail,
downtime jailing, evidence idempotency, slashing, policy and reward-split
changes, state patching, snapshot recovery, and halt recovery on the pinned
[5-Validator Localnet E2E](/node/localnet-e2e) release state.

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
