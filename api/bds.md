# BDS Indexed Queries

BDS is the optional Blockchain Data Service index for Xian nodes. It persists
finalized blocks into Postgres and exposes indexed reads through two surfaces:

- ABCI query paths on the node RPC endpoint
- GraphQL through the optional PostGraphile sidecar

Use BDS when you need block history, transaction history, event feeds, DEX OHLCV
candles, state history, token portfolios, shielded wallet feeds, developer
reward summaries, or applied state patch history.

## Endpoints

Direct node RPC:

```text
POST http://<node-rpc>:26657/abci_query?path="/bds_status"
POST http://<node-rpc>:26657/abci_query?path="/tx/<tx_hash>"
```

Dashboard pass-through:

```text
GET http://<dashboard-host>:18080/api/abci_query/bds_status
GET http://<dashboard-host>:18080/api/abci_query/tx/<tx_hash>
```

GraphQL:

```text
POST http://<query-host>:5000/graphql
```

The maintained stack binds GraphQL to `127.0.0.1` by default. Public indexed
query exposure is explicit through the `public-query` posture, and it does not
also publish live RPC.

## Consistency

BDS is derived from finalized blocks. A transaction can be finalized before its
indexed transaction row, event rows, and state-history rows are visible.

Check `/bds_status` before relying on indexed reads after writes:

```text
GET /api/abci_query/bds_status
```

High-signal fields:

| Field | Meaning |
| --- | --- |
| `worker_running` | live BDS worker is active |
| `current_block_height` | latest node height observed by BDS status |
| `indexed.indexed_height` | highest contiguous block persisted by BDS |
| `height_lag` | node height minus indexed height |
| `queue_depth` | in-memory finalized blocks waiting to persist |
| `spool_pending_count` | local spool entries waiting to be drained |
| `alerts` | operator-facing warnings |

For read-after-write flows, wait until `indexed.indexed_height` reaches the
block height that contains the transaction, or until `/tx/<tx_hash>` returns a
row.

## Field Names

ABCI BDS responses use explicit transaction-hash names:

- Python and raw ABCI rows use `tx_hash`
- xian-js normalizes that to `txHash`
- GraphQL follows the generated PostGraphile schema and exposes
  `Transaction.hash`

ABCI transaction rows returned by `/tx/...`, `/txs_by_sender/...`,
`/txs_by_contract/...`, and the SDK helpers use `tx_hash`, not a generic
`hash` field.

## Common Queries

### Blocks

```text
GET /api/abci_query/blocks/limit=50/offset=0
GET /api/abci_query/block/123
GET /api/abci_query/block_by_hash/<block_hash>
```

### Transactions

```text
GET /api/abci_query/tx/<tx_hash>
GET /api/abci_query/txs_for_block/123
GET /api/abci_query/txs_for_block/<block_hash>
GET /api/abci_query/txs_by_sender/<address>/limit=50/offset=0
GET /api/abci_query/txs_by_contract/<contract>/limit=50/offset=0
```

`txs_for_block` accepts either a block height or a block hash.

### Addresses And Contracts

```text
GET /api/abci_query/addresses/limit=50/offset=0
GET /api/abci_query/contract_summary/currency
GET /api/abci_query/token_contracts/limit=100/offset=0
```

Use `/addresses/...` for recent indexed sender activity. Use
`/contract_summary/<contract>` when an explorer needs a compact contract page
summary without joining several tables on the client.

### Events

```text
GET /api/abci_query/events_for_tx/<tx_hash>
GET /api/abci_query/events/currency/Transfer/limit=50/offset=0
GET /api/abci_query/events/currency/Transfer/limit=50/after_id=500
GET /api/abci_query/recent_events/limit=50/offset=0
```

Use offset pagination for browsing. Use `after_id` for event consumers and
projectors because it resumes from a stable event ID and returns events with
larger IDs.

### DEX Candles

```text
GET /api/abci_query/dex_candles/7/interval=5m/limit=100
GET /api/abci_query/dex_candles/7/source=xian_pairs_v1/interval=1h/start=1767225600/end=1767312000
```

`/dex_candles/<market_id>` returns server-side OHLCV buckets from a whitelisted
candle source. The default source is `xian_pairs_v1`, which derives candles from
indexed `con_pairs.Swap` events using the indexed `pair` field. Additional DEX
source specs can be added without changing the public candle response shape.

`interval` accepts seconds or `s`, `m`, `h`, `d`, and `w` suffixes. `start` and
`end` accept Unix seconds, which is the preferred format for SDK and dashboard
callers. `contract=...` is available only as a same-schema override for a
source; define a separate source spec for a DEX with different event fields.

Each candle includes `source`, `market_id`, `pair_id` when numeric,
`bucket_start`, `bucket_end`, `open`, `high`, `low`, `close`, `volume_token0`,
`volume_token1`, `trade_count`, `first_block_height`, `last_block_height`,
`first_event_id`, and `last_event_id`. Price and volume fields are strings so
clients can preserve database decimal precision.

### State History

```text
GET /api/abci_query/state/currency/limit=50/offset=0
GET /api/abci_query/state/currency.balances:<address>/limit=50/offset=0
GET /api/abci_query/state_previous/currency.balances:<address>
GET /api/abci_query/state_history/currency.balances:<address>/limit=50/offset=0
GET /api/abci_query/state_for_tx/<tx_hash>
GET /api/abci_query/state_for_block/123
GET /api/abci_query/state_for_block/<block_hash>
```

`/state/<prefix>/...` scans current indexed state keys by prefix.
`/state_history/<key>/...` returns historical writes for one full state key.
`/state_previous/<key>` returns the current value plus the previous-write
metadata.

### Token Portfolios

```text
GET /api/abci_query/token_balances/<address>/limit=100/offset=0
GET /api/abci_query/token_balances/<address>/limit=100/offset=0/include_zero=true
```

By default, token portfolio reads omit zero-balance tokens. Add
`include_zero=true` when a wallet needs the full indexed token set.

### Developer Rewards

```text
GET /api/abci_query/developer_rewards/<recipient_key>
```

The response aggregates indexed developer rewards for the recipient, including
the total reward value, rewarded transaction count, distinct rewarded contract
count, and first/last indexed reward metadata.

### Shielded Feeds

```text
GET /api/abci_query/shielded_output_tags/<tag>/limit=50/offset=0/kind=sync_hint
GET /api/abci_query/shielded_output_tags/<tag>/limit=50/after_id=500/kind=sync_hint
GET /api/abci_query/shielded_wallet_history/<tag>/limit=50/after_note_index=0/kind=sync_hint
```

Supported tag kinds are `sync_hint` and `discovery_tag`. Wallet recovery should
prefer `shielded_wallet_history` because it resumes by note index and only
returns payloads visible to the requested tag.

### State Patches

Patch inventory queries that inspect local governance patch files do not
require BDS:

```text
GET /api/abci_query/state_patch_bundles
GET /api/abci_query/scheduled_state_patches/123
```

Historical applied patch queries are BDS-backed:

```text
GET /api/abci_query/state_patches/limit=50/offset=0
GET /api/abci_query/state_patches_for_block/123
GET /api/abci_query/state_patch/<patch_hash>
GET /api/abci_query/state_changes_for_patch/<patch_hash>
```

Empty arrays or `null` results are normal when no patch has been applied.

### Operator Reads

```text
GET /api/abci_query/bds_status
GET /api/abci_query/bds_spool/limit=50/offset=0
```

`/bds_spool/...` returns local pending spool entries as a list. A healthy live
node usually returns an empty list.

## GraphQL Examples

PostGraphile generates GraphQL from the BDS database schema. The useful root
fields include:

- `allBlocks`
- `blockByHeight`
- `blockByBlockHash`
- `allTransactions`
- `transactionByHash`
- `allEvents`
- `stateByKey`
- `allStateChanges`
- `allStatePatchRecords`
- `allShieldedOutputTags`
- `allRewards`

Example transaction lookup:

```graphql
query TransactionByHash($hash: String!) {
  transactionByHash(hash: $hash) {
    hash
    blockHeight
    sender
    contract
    function
    success
    chiUsed
  }
}
```

Recent transactions:

```graphql
{
  allTransactions(first: 20, orderBy: BLOCK_HEIGHT_DESC) {
    nodes {
      hash
      blockHeight
      contract
      function
      success
    }
  }
}
```

Block heights are GraphQL `BigInt` values in the generated schema, so pass them
as strings when using variables:

```graphql
query BlockByHeight($height: BigInt!) {
  blockByHeight(height: $height) {
    height
    blockHash
    txCount
  }
}
```

Variables:

```json
{ "height": "123" }
```

## SDK Examples

### xian-py

```python
from xian_py import Xian

with Xian("http://127.0.0.1:26657") as client:
    status = client.get_bds_status()
    tx = client.get_indexed_tx("<tx_hash>")
    by_sender = client.list_txs_by_sender("<address>", limit=10)
    by_contract = client.list_txs_by_contract("currency", limit=10)
    events = client.list_events("currency", "Transfer", limit=10)
    candles = client.list_dex_candles(7, interval="5m", limit=100)
    history = client.get_state_history("currency.balances:<address>", limit=10)
```

`IndexedTransaction.tx_hash` is the canonical transaction-hash field.

### xian-js

```ts
import { XianClient } from "@xian-tech/client";

const client = new XianClient({ rpcUrl: "http://127.0.0.1:26657" });

const status = await client.getBdsStatus();
const tx = await client.getIndexedTx("<tx_hash>");
const bySender = await client.listTxsBySender("<address>", { limit: 10 });
const byContract = await client.listTxsByContract("currency", { limit: 10 });
const events = await client.listEvents("currency", "Transfer", { limit: 10 });
const candles = await client.listDexCandles(7, { interval: "5m", limit: 100 });
const history = await client.getStateHistory("currency.balances:<address>", {
  limit: 10,
});
```

`XianIndexedTransaction.txHash` is the canonical transaction-hash field.

### xian-cli

```bash
xian client query indexed-tx --node-url http://127.0.0.1:26657 <tx_hash>
xian client query txs-by-sender --node-url http://127.0.0.1:26657 <address> --limit 10
xian client query txs-by-contract --node-url http://127.0.0.1:26657 currency --limit 10
```

These commands emit JSON with `tx_hash`.

## Query Hygiene

- Keep `limit` bounded, especially on public query endpoints.
- Use filtered routes such as sender, contract, event, state key, or block
  before broad scans.
- Use `/dex_candles/<market_id>` for candlestick charts instead of aggregating
  swap events in each client.
- Prefer `after_id` for event consumers and `after_note_index` for shielded
  wallet recovery.
- Treat BDS and GraphQL as indexed read models, not as the authoritative
  current-state source.
- Use raw `/get/...` ABCI queries for immediate current-state reads.

## Related Pages

- [REST API](/api/rest)
- [GraphQL](/api/graphql)
- [Runtime Features](/node/runtime-features)
- [Starting, Stopping & Monitoring](/node/managing)
