# REST API Reference

The REST API described here belongs to the optional dashboard service, not to
CometBFT itself. It proxies selected RPC calls and adds convenience endpoints.

Base URL:

```text
http://<dashboard-host>:8080
```

## Core Endpoints

### Node / Network

- `GET /api/status`
- `GET /api/net_info`
- `GET /api/validators`
- `GET /api/consensus`
- `GET /api/monitoring`

### Blocks / Transactions

- `GET /api/blockchain`
- `GET /api/block/{height}`
- `GET /api/block_results/{height}`
- `GET /api/tx/{hash}`
- `GET /api/unconfirmed_txs`

For transaction lookups, the original submitted transaction and the execution
result are separate:

- `result.tx` is the submitted transaction input
- `result.tx_result.data` is Xian's decoded execution output

### Contracts / ABCI

- `GET /api/contract/{name}`
- `GET /api/abci_query/{path}`

## Important Notes

- the dashboard must be running for these routes to exist
- the dashboard is outside the consensus path
- the dashboard decodes ABCI `value` and `key` fields for convenience

## Contract Source

```text
GET /api/contract/currency
```

Returns the current contract source fetched through the node's query layer.

For the canonical runtime form, query:

```text
GET /api/abci_query/contract_code/currency
```

## ABCI Query Pass-Through

The dashboard exposes arbitrary ABCI query paths under:

```text
GET /api/abci_query/{path}
```

Examples:

```text
GET /api/abci_query/get/currency.balances:alice
GET /api/abci_query/get_next_nonce/<address>
GET /api/abci_query/contract/currency
GET /api/abci_query/contract_code/currency
GET /api/abci_query/contract_methods/currency
GET /api/abci_query/contract_vars/currency
GET /api/abci_query/simulate_tx/<hex_payload>
GET /api/abci_query/perf_status
```

## Monitoring Summary

```text
GET /api/monitoring
```

This route backs the dashboard's operator cards. It aggregates:

- the node's decoded `/perf_status` ABCI query
- the node's decoded `/bds_status` ABCI query when BDS is enabled
- CometBFT `unconfirmed_txs`

Use it for explorer/operator UX. For canonical reads, keep using CometBFT RPC
and direct ABCI query paths.

When BDS is enabled, additional query paths are available under the same ABCI
query surface. These are still node queries, but backed by the optional BDS
index instead of the raw current-state driver.

These indexed reads are eventually consistent. The validator finalizes the
block first, then the BDS worker persists the indexed payload asynchronously.
So raw `/get/...` reads reflect current state immediately, while BDS-backed
history/index queries may lag briefly behind the latest committed block.
To make this resilient without keeping disk I/O in the validator hot path,
BDS now keeps newly finalized blocks in an in-memory pending buffer and
persists them in strict contiguous height order. If the indexed head is
missing a height, BDS fetches the missing blocks from local CometBFT RPC in
the background while newer live blocks remain pending.

That means BDS can safely receive new block data while it is still catching up:

- if live block `N+2` arrives while `N+1` is missing, `N+2` stays pending
- the catch-up worker fetches and builds `N+1`
- BDS persists `N+1`, then `N+2`, preserving a single canonical chain order

The local spool is still available for offline maintenance, snapshot import,
and explicit recovery workflows, but it is no longer the primary live-path
durability mechanism.

Current BDS-backed ABCI query paths include:

```text
GET /api/abci_query/bds_status
GET /api/abci_query/bds_spool/limit=50/offset=0
GET /api/abci_query/perf_status
GET /api/abci_query/blocks/limit=50/offset=0
GET /api/abci_query/block/123
GET /api/abci_query/block_by_hash/<hash>
GET /api/abci_query/tx/<hash>
GET /api/abci_query/txs_for_block/123
GET /api/abci_query/txs_by_sender/<address>/limit=50/offset=0
GET /api/abci_query/txs_by_contract/<contract>/limit=50/offset=0
GET /api/abci_query/events_for_tx/<hash>
GET /api/abci_query/events/<contract>/<event>/limit=50/offset=0
GET /api/abci_query/events/<contract>/<event>/limit=50/after_id=500
GET /api/abci_query/developer_rewards/<recipient_key>
GET /api/abci_query/state/<prefix>/limit=50/offset=0
GET /api/abci_query/state_history/<key>/limit=50/offset=0
GET /api/abci_query/state_for_tx/<hash>
GET /api/abci_query/state_for_block/123
GET /api/abci_query/contracts/limit=50/offset=0
GET /api/abci_query/state_patches
GET /api/abci_query/state_patches_for_block/123
GET /api/abci_query/state_patch/<hash>
GET /api/abci_query/state_changes_for_patch/<hash>
```

Operator-oriented BDS inspection:

- `/bds_status` reports worker state, queue depth, spool size, indexed head,
  lag relative to the node's current block height, filesystem storage metrics,
  and warning/error alerts.
- `/bds_spool` lists the block payloads currently present on the local spool
  for offline recovery or maintenance workflows.
- `/perf_status` reports the node's current execution/performance snapshot,
  including recent block timing and tracer metadata.

Cursor-based event consumption:

- `/events/<contract>/<event>/limit=.../after_id=...` returns events with
  strictly larger BDS event IDs in ascending order.
- Use `after_id` for resumable consumers and long-running watchers.
- The older `offset` form is still useful for ad hoc browsing, but `after_id`
  is the better shape for application event consumers.

Developer reward aggregation:

- `/developer_rewards/<recipient_key>` returns the cumulative indexed
  `developer_reward` total for that recipient across contract executions.
- The payload also includes reward row count, distinct transaction count,
  distinct contract count, and first/last indexed block and timestamp fields.
- This is a BDS-backed aggregate. It requires BDS to be enabled on the node and
  reflects the indexed view, not an unindexed raw-state scan.

Current catch-up behavior:

- during live operation, BDS keeps new finalized blocks pending in memory and
  backfills any missing heights from local CometBFT RPC automatically
- if the node or database restarts, BDS resumes from the indexed head and
  continues catch-up from local or remote CometBFT RPC
- the local spool remains useful for explicit offline recovery and imported
  payloads, but it is not required for ordinary live catch-up
- for full historical backfill, use `xian-bds-reindex` against local or remote
  CometBFT RPC
- if the local node has already pruned away the required block history, local
  reindex is no longer enough and an archival RPC source or imported BDS
  snapshot is needed

Use the raw node paths for authoritative current state:

```text
GET /api/abci_query/get/<state_key>
GET /api/abci_query/contract/<name>
GET /api/abci_query/contract_methods/<name>
GET /api/abci_query/contract_vars/<name>
GET /api/abci_query/get_next_nonce/<address>
GET /api/abci_query/simulate_tx/<hex_payload>
GET /api/abci_query/perf_status
```
