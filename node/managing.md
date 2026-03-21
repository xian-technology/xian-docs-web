# Starting, Stopping & Monitoring

Use `xian-cli` for operator-facing lifecycle commands. Use `xian-stack`
directly only for backend validation or low-level debugging.

## Start and Stop

```bash
uv run xian node start validator-1
uv run xian node stop validator-1
```

If the node profile enables the dashboard, `xian node start` also brings up the
optional dashboard service on the configured host/port.

## Status

```bash
uv run xian node status validator-1
```

`node status` reports:

- whether the node home is initialized
- the resolved manifest and profile paths
- the `xian-stack` backend state when available
- optional live RPC reachability

`doctor` is the broader workspace and node-health preflight:

```bash
uv run xian doctor validator-1
```

## Backend Commands

From `xian-stack`, the stable machine-readable backend is:

```bash
python3 ./scripts/backend.py start --no-service-node
python3 ./scripts/backend.py status --no-service-node
python3 ./scripts/backend.py stop --no-service-node
```

For BDS-enabled integrated runs:

```bash
python3 ./scripts/backend.py start --service-node
```

Host-side storage inspection from `xian-stack`:

```bash
python3 ./scripts/backend.py storage-report
make storage-report
```

## Monitoring Layers

Use the monitoring surfaces in this order:

- CometBFT RPC and raw ABCI query for canonical low-level reads
- Xian Prometheus metrics plus CometBFT metrics for alerting and time-series
  monitoring
- dashboard REST/WebSocket for operator UX and exploration
- BDS-backed ABCI query for indexed/history reads
- GraphQL/PostGraphile only as an optional convenience layer over BDS

## Dashboard and GraphQL

Optional services:

- dashboard: port `8080` by default
- Xian Prometheus metrics: port `9108` by default
- Prometheus: port `9090` by default
- Grafana: port `3000` by default
- GraphQL/PostGraphile: port `5000` when BDS is enabled

Use the dashboard for chain inspection and WebSocket subscriptions.

Use Prometheus and Grafana for remote monitoring, alerting, and retention.

From `xian-stack`:

```bash
make monitoring-up
make monitoring-down
make monitoring-bds-up
make monitoring-bds-down
make monitoring-fidelity-up
make monitoring-fidelity-down
```

What gets scraped:

- CometBFT metrics on `:26660`
- Xian metrics on `:9108`

In the Docker stack, Xian performance snapshots are enabled by default so the
dashboard can show recent execution timing without additional setup. Override
that with `XIAN_PERF_ENABLED=0` if you explicitly want to disable the
`/perf_status` snapshot path.

What the dashboard adds without duplicating the main node cards:

- execution health from `/perf_status`
- mempool pressure from `unconfirmed_txs`
- BDS lag, queue, spool, and alerts from `/bds_status`

Use the node's ABCI query surface for canonical reads:

- raw current-state reads like `/get/...`, `/contract/...`, and
  `/simulate_tx/...`
- BDS-backed indexed/history reads like `/blocks/...`, `/tx/...`,
  `/events/...`, and `/state_history/...` when BDS is enabled
- BDS operator reads like `/bds_status` and `/bds_spool/...` to inspect queue,
  spool, and indexed-head health
- performance reads like `/perf_status` to inspect recent block timing and
  tracer metadata

Use GraphQL only when you want a convenience query layer over the BDS
database.

## BDS Catch-Up and Reindex

When BDS is enabled, the validator finalizes blocks first and BDS indexes them
asynchronously. Live finalized blocks are buffered in memory and persisted in
strict contiguous block order.

If BDS sees a gap, it catches up from CometBFT RPC automatically while newer
live blocks keep arriving.

Example:

- indexed head is `100`
- live block `102` arrives before `101` was indexed
- BDS keeps `102` pending
- the catch-up worker fetches `101` from RPC
- BDS writes `101`, then `102`

So yes: BDS can receive new block data and simultaneously retrieve missed data.
It just never persists them out of order.

For explicit offline spool maintenance:

```bash
uv run xian-bds-spool compact --offline
uv run xian-bds-spool drain --offline
```

What these are for:

- `compact`: remove stale spool files that are already covered by the indexed
  BDS head
- `drain`: persist the currently pending local spool into Postgres on an
  existing BDS database

Use `drain` when BDS was temporarily unavailable but the local spool still has
the missing finalized blocks. Do not use it as a cold-bootstrap replacement for
historical indexing.

For full historical backfill, use:

```bash
uv run xian-bds-reindex
```

Useful options:

```bash
uv run xian-bds-reindex --start-height 1000
uv run xian-bds-reindex --end-height 5000
uv run xian-bds-reindex --rpc-url http://127.0.0.1:26657
uv run xian-bds-reindex --reset
```

What this needs:

- local or remote CometBFT RPC access
- retained block history for the heights you want to index

If the local node has already pruned away the required history, local reindex
cannot reconstruct it. In that case the practical options are:

- reindex from an archival RPC source
- import a BDS snapshot from another node

## Chain State Snapshots

Application-state snapshots are separate from BDS snapshots.

Use them when you want CometBFT state sync or a clean local application-state
archive:

```bash
uv run xian-state-snapshot list
uv run xian-state-snapshot export
uv run xian-state-snapshot export --output-path ./xian-state-snapshot.tar.gz
uv run xian-state-snapshot import --input-path ./xian-state-snapshot.tar.gz
```

What these snapshots contain:

- latest Xian application height and app hash
- contract state
- nonce state

What they do not contain:

- full CometBFT `data/` history
- BDS/Postgres data

Use `snapshot_url` restore when you already have a full prepared node-home
archive.

Use `xian-state-snapshot` plus CometBFT state sync when you want protocol-level
application snapshot bootstrap.

To consume peer-served application snapshots through state sync, configure the
node with trusted RPC servers and trust metadata:

```bash
uv run xian-configure-node \
  --moniker validator-1 \
  --validator-privkey <hex> \
  --copy-genesis \
  --statesync-enable \
  --statesync-rpc-server http://rpc-1.example:26657 \
  --statesync-rpc-server http://rpc-2.example:26657 \
  --statesync-trust-height 123456 \
  --statesync-trust-hash <trusted-block-hash>
```

Current model:

- snapshot export is manual
- snapshot serving/loading is implemented through the ABCI snapshot lifecycle
- imported snapshots are stored locally so the node can serve them afterward

## Pruning

Current pruning is block-history pruning through `retain_height`.

What this means operationally:

- the current LMDB application state remains available
- historical local replay/reindex depends on retained block history
- pruned nodes are fine for normal operation but not ideal as archival sources

If you enable pruning and later need historical rebuilds beyond the retained
window, use:

- an archival RPC source
- a full-home snapshot
- or a BDS snapshot / reindex workflow, depending on what data you need

## BDS Snapshot Export and Import

For faster bootstrap, migration, or recovery, BDS can now be exported and
imported separately from the live chain state:

```bash
uv run xian-bds-snapshot export --output-path ./xian-bds-snapshot.tar.gz
uv run xian-bds-snapshot import --input-path ./xian-bds-snapshot.tar.gz
```

Recommended use:

- export from a healthy indexed node
- import into a stopped node before bringing BDS online
- let the local spool replay or `xian-bds-reindex` fill any remaining gap after
  the imported indexed height

Snapshot import is the best path when:

- BDS is being enabled for the first time on a large network
- the local node is pruned and cannot rebuild full history from its own RPC
- you want a faster bootstrap than replaying the whole chain from scratch

## Storage and Retention

Docker images themselves are immutable layers. The thing that grows during node
operation is host-side storage:

- CometBFT data under `.cometbft`
- Xian state under `.cometbft/xian`
- the local BDS spool under `.cometbft/xian/bds-spool`
- Postgres data under `.bds.db`
- Docker build cache, image layers, writable layers, and container logs

Use the stack storage report to inspect the Xian-specific paths:

```bash
python3 ./scripts/backend.py storage-report
```

Use `/bds_status` to inspect the BDS worker, indexed head, spool size, and
low-disk alerts.

Operational guidance:

- on pruned nodes, local BDS reindex only works for heights the node still
  retains
- on archival nodes, local BDS reindex can rebuild the full index directly from
  RPC
- if neither local history nor spool is sufficient, use an archival RPC source
  or import a BDS snapshot from another node

## Multi-Node Testing

Local multi-node consensus testing lives in `xian-stack` localnet:

```bash
python3 ./scripts/backend.py localnet-init --nodes 4 --topology integrated --clean
python3 ./scripts/backend.py localnet-up --wait-for-health
python3 ./scripts/backend.py localnet-status
python3 ./scripts/backend.py localnet-down
```
