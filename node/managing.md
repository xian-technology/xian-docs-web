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

## Dashboard and GraphQL

Optional services:

- dashboard: port `8080` by default
- GraphQL/PostGraphile: port `5000` when BDS is enabled

Use the dashboard for chain inspection and WebSocket subscriptions.

Use the node's ABCI query surface for canonical reads:

- raw current-state reads like `/get/...`, `/contract/...`, and
  `/simulate_tx/...`
- BDS-backed indexed/history reads like `/blocks/...`, `/tx/...`,
  `/events/...`, and `/state_history/...` when BDS is enabled
- BDS operator reads like `/bds_status` and `/bds_spool/...` to inspect queue,
  spool, and indexed-head health

Use GraphQL only when you want a convenience query layer over the BDS
database.

## BDS Catch-Up and Reindex

If BDS is enabled and the node already wrote finalized payloads to its local
spool, the worker replays that spool automatically after restart or temporary
database downtime.

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
- import a BDS/Postgres snapshot from another node

## Multi-Node Testing

Local multi-node consensus testing lives in `xian-stack` localnet:

```bash
python3 ./scripts/backend.py localnet-init --nodes 4 --topology integrated --clean
python3 ./scripts/backend.py localnet-up --wait-for-health
python3 ./scripts/backend.py localnet-status
python3 ./scripts/backend.py localnet-down
```
