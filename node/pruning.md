# Pruning and History Retention

Pruning limits local CometBFT block history. It reduces disk use but also limits
historical RPC, replay, forensics, and local BDS rebuilds.

It does not remove current Xian LMDB state or already indexed BDS rows.

## Configuration

```json
{
  "pruning_enabled": true,
  "blocks_to_keep": 100000
}
```

When the current height exceeds the window, Xian returns:

```text
retain_height = current_height - blocks_to_keep
```

`blocks_to_keep` is a block count, not a duration. An on-demand network can
cover a very different wall-clock period with the same value as a periodic
network.

## Choose a Retention Window

Keep pruning disabled or use a large window when the node is:

- an archival RPC or forensic source
- a recovery source for other operators
- expected to rebuild BDS from genesis using local history

Pruning is appropriate when another trusted archival source or recent BDS
snapshot exists and the retained window covers the expected outage and
incident-response period.

## BDS Impact

BDS stores history separately in Postgres. Pruning does not delete indexed
rows, but it affects recovery:

- a healthy BDS continues indexing and serving its retained database
- a reset BDS can rebuild only from block history available through its RPC
  source
- missing older blocks require an archival RPC source or imported BDS snapshot

Do not run a full reset/reindex until the historical source is confirmed.

## Bootstrap History

Peer-to-peer application state sync is disabled. A node bootstraps by replaying
the complete block history from genesis, or by restoring a verified full
node-store snapshot. Replay cannot recover blocks that every available source
has already pruned. Maintain an archival source or a suitable full-store backup.

A full node-store snapshot must contain coherent Xian application state and
CometBFT state, block and evidence data. Retain the complete still-live evidence
window at its checkpoint. Older block bodies may be pruned only when the
required historical metadata remains available. A recent application-state
export alone does not provide those consensus stores and is insufficient for
node bootstrap.

Retiring an application security-checkpoint floor does not promise physical
deletion after an exact number of epochs. Stock CometBFT can retain older
header, commit, validator and evidence metadata below the block-store body
`Base`. Measure actual store use when planning disk capacity; a body-pruning
window is not a complete proof-metadata garbage-collection schedule.

An existing pruned node is not automatically an archival source or a valid
full-store snapshot publisher. Verify snapshot chain identity, genesis,
checkpoint and trust material before offering it to other operators. See
[Bootstrap and Snapshots](/node/configuration#bootstrap-and-snapshots) and
[Snapshot Restore Boundaries](/node/recovery-plans#snapshot-restore-boundaries).

## Before Enabling

1. Confirm another archival/recovery source exists.
2. Choose a block window from outage and forensic requirements.
3. Confirm BDS is caught up if enabled.
4. Confirm BDS snapshots or an archival RPC exist for indexed recovery.
5. Apply the profile change during a maintenance window.
6. Record the policy in the operator runbook.

```bash
xian node health validator-1
xian node status validator-1
python3 ../xian-stack/scripts/backend.py storage-report
```

Disabling pruning later does not restore blocks already removed.

## Do Not Conflate Storage Layers

- CometBFT data contains consensus block history.
- Xian LMDB contains current application state and committed metadata.
- BDS Postgres contains indexed history.

Deleting one is not a routine adjustment to another. Use an explicit recovery
or rebuild procedure and preserve the trust material required for that layer.

## Related Pages

- [Recovery Plans](/node/recovery-plans)
- [BDS Indexed Queries](/api/bds)
- [Starting, Stopping and Monitoring](/node/managing)
