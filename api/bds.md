# BDS Indexed Queries

BDS is the optional Postgres-backed Blockchain Data Service. It indexes
finalized blocks and exposes history through node ABCI queries and the optional
GraphQL sidecar.

Use BDS for blocks, transactions, events, state history, token portfolios, DEX
candles, shielded wallet feeds, developer rewards, and applied state patches.
Use direct ABCI state queries for authoritative current values.

## Endpoints

```text
POST http://<rpc>:26657/abci_query?path="/bds_status"
GET  http://<dashboard>:8080/api/abci_query/bds_status
POST http://<query-host>:5000/graphql
```

The stack binds query services to loopback by default. Public query exposure
requires explicit opt-in and does not publish live RPC.

## Consistency

BDS persists finalized blocks asynchronously and in contiguous height order.
A transaction may be finalized before its indexed rows are visible.

High-signal `/bds_status` fields include:

| Field | Meaning |
| --- | --- |
| `worker_running` | index worker state |
| `current_block_height` | node height observed by BDS |
| `indexed.indexed_height` | highest contiguous indexed height |
| `height_lag` | difference between node and indexed height |
| `queue_depth` | finalized blocks waiting to persist |
| `spool_pending_count` | recovery spool entries waiting to drain |
| `alerts` | operator warnings and errors |

For read-after-write behavior, wait for the indexed height to reach the
transaction's block or poll the indexed transaction path.

## Query Families

```text
# Blocks and transactions
/blocks/limit=50/offset=0
/block/<height>
/block_by_hash/<hash>
/tx/<tx_hash>
/txs_for_block/<height-or-hash>
/txs_by_sender/<address>/limit=50/offset=0
/txs_by_contract/<contract>/limit=50/offset=0

# Events
/events_for_tx/<tx_hash>
/events/<contract>/<event>/limit=50/offset=0
/events/<contract>/<event>/limit=50/after_id=<cursor>
/recent_events/limit=50/offset=0

# State and tokens
/state/<prefix>/limit=50/offset=0
/state_previous/<key>
/state_history/<key>/limit=50/offset=0
/state_for_tx/<tx_hash>
/state_for_block/<height-or-hash>
/token_contracts/limit=100/offset=0
/token_balances/<address>/limit=100/offset=0

# Specialized projections
/dex_candles/<market_id>/interval=5m/limit=100
/developer_rewards/<recipient_key>
/shielded_output_tags/<tag>/limit=50/after_id=<cursor>/kind=sync_hint
/shielded_wallet_history/<tag>/limit=50/after_note_index=<cursor>/kind=sync_hint
```

Use `after_id` for resumable event consumption and `after_note_index` for
shielded wallet recovery. Offset pagination is intended for browsing.

Transaction hashes are named `tx_hash` in raw/Python rows, `txHash` in
`xian-js`, and `hash` in the generated GraphQL transaction type.

## State Patches

Local inventory and scheduled-chain reads do not require BDS:

```text
/state_patch_bundles
/scheduled_state_patches/<height>
```

Historical applied-patch queries do:

```text
/state_patches/limit=50/offset=0
/state_patches_for_block/<height>
/state_patch/<patch_hash>
/state_changes_for_patch/<patch_hash>
```

## SDK Use

```python
from xian_py import Xian

with Xian("http://127.0.0.1:26657") as client:
    status = client.get_bds_status()
    tx = client.get_indexed_tx("<tx_hash>")
    events = client.list_events("currency", "Transfer", after_id=0)
```

```ts
const status = await client.getBdsStatus();
const tx = await client.getIndexedTx("<tx_hash>");
const events = await client.listEvents("currency", "Transfer", { afterId: 0 });
```

## Query Guidance

- keep limits bounded
- prefer filtered routes over broad scans
- use the candle endpoint rather than aggregating swaps in every client
- monitor indexed height and alerts during recovery
- use an archival RPC source or imported BDS snapshot when local block history
  has been pruned
- avoid running a live writer and a reset/reindex against the same database

## Related Pages

- [GraphQL](/api/graphql)
- [REST API](/api/rest)
- [Starting, Stopping and Monitoring](/node/managing)
