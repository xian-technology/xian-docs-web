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
show the same chain ID. Use a controlled signing workflow for the validator
account itself; registration and validator votes use that account, not a separate
reward key. A wrapper contract cannot register that consensus identity. Keep
private keys out of console inputs and unrelated dapps.

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
7. Wait for automatic time anchoring if a record's `unlock_at` is `null`. Each
   recorded owner claims its own unbond only after its recorded unlock time;
   do not infer that time from the request block or local wall clock.

Reconcile starting stake against pending unbonds and any slashed value.

## Jail, Unjail, and Slash

Before a jail or slash vote, verify the target, evidence/incident reference,
active-set impact, replacement capacity, and quorum.

After jail, confirm the flag, reason, zero active power, and removal from the
active set. Governance unjailing returns an eligible account to approved
candidate status; activation follows the network's selection policy.

A validator absent from `downtime_jail_blocks` consecutive commits is jailed
with reason `downtime` (infraction `DOWNTIME`, slashed by `downtime_slash_bps`)
by the runtime, not by a vote. Once the node is healthy and synced and
`downtime_unjail_cooldown_hours` have passed, the operator calls `unjail()`
from the validator account and the validator re-enters the active set (also in
`manual` mode) if it meets the minimum stake, a seat is free and the epoch's
newcomer power cap allows it. If the cap would be exceeded, the call fails
and the jail remains; retry in a later epoch. Without a free seat, a successful
unjail leaves the validator as an approved candidate.
Check `missed_blocks` in the validator record to see an open
count before it reaches the window.

Runtime evidence supports `DUPLICATE_VOTE` and `LIGHT_CLIENT_ATTACK`.
`apply_evidence_penalty` is runtime-owned. Record the evidence ID/type/height,
policy rate, affected self-bond/delegations/pending unbonds, destination
balance, and active-set result. Repeating the same evidence ID must not slash
twice.

Governed `slash_member` is a separate reviewed action. Reconcile its result
before closing the incident.

When a result queues a penalty, record its `job_id` and monitor
`validator_penalties.get_pending_slash_job(job_id)` until `status` is
`complete`. The validator record's `pending_slash_count` counts its unfinished
jobs. The configured jail applies immediately unless it would remove the last
active validator; collection and debits advance in bounded batches over later
blocks. All unbond claims for that validator, stake changes, registration,
exits and unjailing wait until its jobs finish. Existing earned rewards remain
claimable.

After a node restart, check that the stored phase/cursor continues and the final
destination payment occurs once. Reconcile live principal, pending principal,
allocated but unpaid slash escrow, and completed destination payments. A job's
partially allocated amount is not a completed payment. Preserve the evidence
ID when retrying evidence delivery so the contract deduplicates it.

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
For a foundation owner rotation, verify that the destination is nonempty,
fits the currency account key limit, and uses lowercase for a 64-hex public
key. The current owner calls `change_owner` to nominate it. Confirm the
proposal with `get_pending_owner`, then call `accept_ownership` from the
receiving account. The current owner can call `cancel_ownership_transfer`
before acceptance and retains withdrawal authority until acceptance succeeds.

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

This explicit application-export recovery starts a new consensus history.
It does not carry the old native evidence stores or guarantee that pre-genesis
faults remain provable. Retaining the configured block-age limit cannot restore
that history. Before building the recovery genesis, operators must agree and
record how outstanding pre-genesis unbonds, slashable stake and other obligations
will be handled, and preserve the verified old stores and evidence separately.
Use ordinary replay or a verified full node-store restore when retaining the
existing consensus history is required.

1. **Agree off chain** on the validators to keep (the online ones, together
   holding all the power of the new set), one genesis time in UTC later than
   the last block, and the halted height. Every kept validator must take part.
2. **Stop and back up.** Each kept operator stops its node and copies the whole
   node home (`config/`, `data/`, the Xian state directory) aside.
3. **Confirm the checkpoint and export.** Obtain checkpoint JSON independently
   from a trusted node. For a stopped trusted node, use the
   `xian-node-store-inspect` tool shipped with the matching node image against
   its read-only mounted stores and accepted genesis; save its JSON output as
   `<home>/recovery/trusted-checkpoint.json`. Alternatively, save the decoded
   [`/evidence_policy` response](/api/#which-surface-to-use) from an independently
   trusted node. Compare the canonical string fields `height`, `app_hash` and
   exact `last_block_nanos` across the kept operators. A block H header's
   `app_hash` belongs to the preceding state; use the reported checkpoint root
   for state H, not that header field.

   Each then runs `xian-export-state --output-path <home>/recovery` against the
   stopped application state. Its `number`, `hash` and `nanos` must match the
   independently trusted checkpoint. Do not create a checkpoint by copying
   those fields from the same export: the state root alone does not authenticate
   its height or timestamp. An operator whose node lags re-syncs first.
4. **Build the genesis.** Each runs

   ```bash
   xian-recovery-genesis --exported-state <home>/recovery/exported_state.json \
     --trusted-checkpoint <home>/recovery/trusted-checkpoint.json \
     --chain-id <chain id> --genesis-time <agreed time> \
     --keep <key> [--keep <key> ...] --output <home>/recovery/genesis.json
   ```

   and publishes the SHA-256 of the file; all digests must match. The tool
   requires the independent checkpoint and refuses a mismatched export, a
   validator that is not active, and a genesis time at or before the last block.
   The validators not kept become approved, jailed for downtime (power 0) at the
   genesis time. Evidence retention is evaluated at the exported checkpoint
   before its growth schedule is anchored to the recovery genesis time; the
   halted interval does not grant extra retention growth. Its security
   checkpoint anchor is reset to the exported height and recovery time,
   and its previous checkpoint is cleared. This preserves the configured base limit,
   not the old native proof history.
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
