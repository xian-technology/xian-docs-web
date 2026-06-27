# Pruning And History Retention

Pruning controls how much local CometBFT block history a node keeps. It is a
disk-retention policy, not a consensus-state repair tool.

Use it deliberately. A pruned node can keep validating and serving current Xian
state, but it may be unable to answer historical block requests or rebuild local
indexes from the beginning of the chain.

## What Pruning Does

Xian pruning is block-history pruning through CometBFT `retain_height`.

At commit time, when pruning is enabled and the current block height is greater
than `blocks_to_keep`, the application returns:

```text
retain_height = current_height - blocks_to_keep
```

Example:

- `current_height = 150000`
- `blocks_to_keep = 100000`
- `retain_height = 50000`

That asks CometBFT to keep only the recent block-history window from that point
forward.

Pruning affects:

- local CometBFT block history available for RPC and replay
- local BDS reindex/rebuild range
- local forensic access to historical block and transaction data

Pruning does not separately remove:

- current Xian LMDB application state
- current contract state
- current nonce state
- already-indexed BDS/Postgres rows

## Configuration

The high-level node profile fields are:

```json
{
  "pruning_enabled": true,
  "blocks_to_keep": 100000
}
```

The rendered runtime config writes the same intent under `[xian]`:

```toml
[xian]
pruning_enabled = true
blocks_to_keep = 100000
```

The maintained templates currently default to:

```json
{
  "pruning_enabled": false,
  "blocks_to_keep": 100000
}
```

`blocks_to_keep` is a block count, not a wall-clock duration. On networks with
on-demand block production, the same block window can cover very different
amounts of real time depending on transaction volume.

## Enable During Setup

For a new node, set pruning through the profile-producing flow:

```bash
uv run xian setup node --mode join --network testnet --name validator-1 \
  --preset indexed --key-mode existing \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --enable-pruning --blocks-to-keep 100000 \
  --plan
```

Review the plan first. Then apply it:

```bash
uv run xian setup node --mode join --network testnet --name validator-1 \
  --preset indexed --key-mode existing \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --enable-pruning --blocks-to-keep 100000 \
  --start --yes
```

For remote hosts, keep the node profile or inventory value as the source of
truth and deploy through `xian-deploy`:

```bash
ansible-playbook playbooks/deploy.yml
ansible-playbook playbooks/health.yml
```

## Choosing A Retention Window

There is no universal safe value. Choose `blocks_to_keep` from the operator role
the node is expected to play.

Keep pruning disabled, or use a very large window, when the node is meant to be:

- an archival RPC source
- the recovery source for other operators
- a source for full local BDS rebuilds
- a forensic node used for historical debugging

Pruning is reasonable when:

- the node is a normal validator and disk pressure matters
- another trusted archival RPC source exists
- recent BDS snapshots are available for indexed deployments
- the team has agreed how much local history is enough for incident response

Practical sizing questions:

- How many blocks of BDS lag or outage should this node be able to recover from
  locally?
- How far back do operators need to inspect blocks without using an external
  archival source?
- How long can a BDS database remain corrupted before someone notices and needs
  to rebuild it?
- Does the network have another node that intentionally keeps full history?

## BDS Implications

BDS stores indexed history in Postgres, separately from CometBFT block history.
Pruning does not delete already-indexed BDS rows.

The important failure mode is rebuild:

- if BDS is healthy, a pruned node can continue serving indexed reads from
  Postgres
- if BDS is corrupted and must be reset, local rebuild only works for heights
  still retained by CometBFT
- if old CometBFT history is gone, use an archival RPC source or import a BDS
  snapshot from a healthy indexed node

For BDS recovery, see:

- [BDS Database Corruption: Reset And Rebuild](/node/managing#bds-database-corruption-reset-and-rebuild)
- [Missing History On Pruned Nodes](/node/managing#missing-history-on-pruned-nodes)
- [BDS Snapshot Export and Import](/node/managing#bds-snapshot-export-and-import)

Operational requirement for indexed deployments:

- keep at least one archival RPC source, or
- keep recent BDS snapshots from a healthy indexed node

## Snapshot And State-Sync Interaction

Application snapshots and pruning solve different problems.

Application snapshots and CometBFT state sync help a node bootstrap into recent
application state without replaying the entire chain from genesis.

Pruning controls how much block history the node keeps after it is running.

A common non-archival pattern is:

1. bootstrap from a trusted application snapshot or state-sync source
2. start the node and verify health
3. enable pruning for local disk retention
4. rely on an archival RPC source or BDS snapshots for historical data

Do not treat a pruned validator as an archival bootstrap source unless the
retained window is intentionally large enough for that role.

## Before Enabling Pruning

Use this checklist before enabling pruning on a real network node:

1. Confirm the node is not the only archival or recovery source.
2. Decide the retention target in blocks.
3. Confirm BDS is caught up if the node runs BDS.
4. Confirm recent BDS snapshots exist if indexed recovery matters.
5. Confirm at least one trusted archival RPC source exists for old history.
6. Record the policy in the network/operator runbook.
7. Apply the profile change during a normal maintenance window.

Useful checks:

```bash
uv run xian node health validator-1
uv run xian node status validator-1
python3 ./scripts/backend.py storage-report
```

Remote checks:

```bash
ansible-playbook playbooks/status.yml
ansible-playbook playbooks/health.yml
```

## If Retention Was Too Short

Disabling pruning later does not restore block history that has already been
pruned. It only changes future retention behavior.

If you need old history after it has been pruned locally, use one of these
paths:

- query or reindex from an archival RPC source
- restore a full node-home archive that still contains the required history
- import a BDS snapshot if the missing data is indexed-history data
- use a recovery plan only when the consensus state itself must be restored

Do not delete `.cometbft/data`, `.cometbft/xian`, or `.bds.db` as a routine
pruning adjustment. Those are node-history, application-state, and BDS database
decisions respectively.

## Operator Summary

- Enable pruning only after deciding who keeps archival history.
- Size `blocks_to_keep` by incident-response needs, not only by disk capacity.
- Pruning preserves current Xian application state but removes historical block
  history over time.
- BDS can keep indexed rows after pruning, but BDS reset from scratch needs
  retained history, an archival RPC source, or a BDS snapshot.
- Once local block history is pruned, turning pruning off does not bring it
  back.
