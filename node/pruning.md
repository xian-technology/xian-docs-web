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

## Snapshots and State Sync

Snapshots and state sync bootstrap recent application/consensus state. Pruning
controls block retention after the node is running. A node bootstrapped near the
head is not automatically an archival source.

The patched backend retains evidence proof prerequisites separately from block
bodies. A state-synced node also stores its authenticated pre-checkpoint proof
cache in `data/evidence.db`, with its required-history journal in
`data/state.db`. These records support evidence verification and are not a
full-block archive or a BDS rebuild source.

`GET /evidence_history?height=<height>` on the CometBFT RPC serves a historical
header, canonical commit and validator set from native retained data or that
cache, including available proofs below the block body pruning base. It accepts
positive historical heights below the node's latest block height and returns
an error when the proof is unavailable. Consumers must authenticate the response
against trusted headers. Validator membership and voting power are proof inputs;
the response does not establish current proposer priorities. Ordinary block
and validator RPC retention semantics are unchanged.

Keep at least one reachable source for the full live evidence window when
offering snapshots to peers. A joining node refuses incomplete history rather
than proceeding to catch-up. See
[Verified Evidence History](/node/configuration#verified-evidence-history)
for trust, resource limits and restart behavior.

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
