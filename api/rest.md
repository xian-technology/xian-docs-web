# REST API Reference

The REST API belongs to the optional Xian dashboard service. It proxies selected
CometBFT calls and adds explorer-oriented convenience routes. It is not the
node's consensus RPC.

Dashboard backend default (`single-node-dev` publishes port `18080` instead):

```text
http://127.0.0.1:8080
```

## Endpoints

| Area | Routes |
| --- | --- |
| node | `/api/config`, `/api/status`, `/api/net_info`, `/api/validators`, `/api/validator_dashboard`, `/api/consensus`, `/api/monitoring` |
| blocks and txs | `/api/blockchain`, `/api/block/{height}`, `/api/block_results/{height}`, `/api/tx/{hash}`, `/api/unconfirmed_txs` |
| contracts | `/api/contract/{name}`, `/api/contracts`, `/api/recent_events` |
| addresses | `/api/addresses`, `/api/address/{address}` |
| Xian queries | `/api/abci_query/{path}` |

Address, event, and history-oriented routes require BDS when their underlying
indexed query is not available from current node state.

## ABCI Query Pass-Through

The dashboard decodes ABCI key/value fields and exposes the node query path
under `/api/abci_query/`:

```text
GET /api/abci_query/get/currency.balances:alice
GET /api/abci_query/keys/currency.balances/limit=50
GET /api/abci_query/get_next_nonce/<address>
GET /api/abci_query/contract_source/currency
GET /api/abci_query/contract_ir/currency
GET /api/abci_query/contract_methods/currency
GET /api/abci_query/simulate_tx/<hex_payload>
GET /api/abci_query/perf_status
```

`get_next_nonce` returns the sender's committed nonce plus one, or zero when
the sender has no committed nonce. Pending submissions leave it unchanged.

For a scalar `/get/<key>` query, inspect `response.info`. A decimal uses `"decimal"` and an integer uses `"int"`. The base64-decoded ABCI `response.value` is canonical numeric text, including for a wide integer. Nested numbers inside a structured value use the V2 wire tags. This scalar query format is separate from the JSON simulation envelope.

For key scans, send the returned `next_after_hex` as `after_hex` on the next
request, with the same prefix. It encodes the full UTF-8 storage key and works
for keys containing `/` or `%`. Stop when `next_after_hex` is `null`. For a
path-safe `next_after` cursor, use the `after` parameter.

Persisted `set()` and `frozenset()` wrappers use tagged JSON for both top-level
and nested query values. A top-level wrapper has ABCI `info="dict"`; for example,
`set([1, 2])` is represented as:

```json
{"__set__":{"codec":"xian-set-1","items":[["int","1"],["int","2"]]}}
```

`__frozenset__` identifies the immutable wrapper. Typed members preserve tuple
and frozen-set nesting, bounded integers and exact decimals.
Use a compatible runtime decoder or preserve this tagged representation;
converting it to an ordinary JSON list loses type information. Dictionary-view
algebra produces a distinct execution-only built-in set; convert it explicitly
with `set(value)` before persistence. See
[Storage](/smart-contracts/storage) for supported values and reserved codec tags.

See [BDS Indexed Queries](/api/bds) for indexed block, transaction, event,
state-history, token, candle, shielded, reward, and patch paths.

## Bounded Archive Pages

Use these ABCI paths for complete pagination over contract names, open
validator proposals and pending unbonds:

| Path | Items | Continuation |
| --- | --- | --- |
| `/contracts_page/limit=25/after=<namespace>` | `items`: name, submission time, developer and source availability | `next_after`: exclusive namespace cursor; names ascend |
| `/validators_open_votes_page/limit=25/cursor=<id>` | `items`: pending proposals, including `proposal_id` | `next_cursor`: next proposal ID to inspect, inclusive; IDs descend |
| `/validators_pending_unbonds_page/<owner>/limit=100/cursor=<id>` | `unbonds`, including `unbond_id` | `next_cursor`: next unbond ID to inspect, inclusive; creation order |

Omit the cursor for the first page. Each route caps its item limit at 100;
contract and proposal pages default to 25, and unbond pages default to 100.
Follow the returned continuation until it is `null`. An empty page can still
have a continuation: contract/proposal reads inspect at most 1,000 namespaces
or proposal IDs per request. Do not stop pagination solely because an item
array is empty. Treat namespace cursors as opaque UTF-8 strings, URL-encode
them once, and reject repeated or non-progressing cursors in a client loop.

For example, a proposal page can be:

```json
{"items":[],"next_cursor":2000,"limit":25}
```

The next request uses `/validators_open_votes_page/cursor=2000/limit=25`.
A claimed unbond can invalidate its saved cursor; refresh the first page
when the node reports a stale cursor. These pages describe the latest
committed state at each request, rather than a multi-request historical
snapshot.

The `/contracts` route supports date/name sorting and offset pagination
for archives of at most 100 contracts within one bounded scan.
`/validators_open_votes` supports lifetime proposal counts up to 1,000.
`/validators_pending_unbonds/<owner>` returns the complete list only when it
fits in 100 entries. Larger archives return a nonzero ABCI code explaining
which page route to use. Check that code and its log before decoding a value;
an error is not an empty successful list.

Pending-unbond records can have `unlock_at: null` while automatic processing
waits for a later finalized block to anchor a positive unbonding period. Preserve
that null value; it does not mean zero, the Unix epoch, or immediate claimability.
A validator summary with `pending_unbond_count > 0` and
`next_unbond_unlock_at: null` is waiting for an anchor. A dated next unlock is
only the earliest dated record; other records can have later or pending unlocks.
See [Unbonding](/node/staking#unbonding).

## Contract and Transaction Responses

`GET /api/contract/{name}` returns stored canonical source and VM metadata
through the node query layer. The stored IR is available through
`contract_ir/<name>`.

Look up a transaction by its CometBFT transaction hash with `GET /api/tx/{hash}`.
The dashboard returns the transaction object at the top level.

- `tx` is the base64-encoded submitted transaction.
- `tx_result.data` is the base64-encoded execution receipt.
- `tx_decoded` and `tx_result.data_decoded` give the corresponding decoded
  values when the dashboard can decode them.

SDKs should normally decode these shapes instead of duplicating dashboard
response handling.

## Explorer

Open **Block explorer** and choose **Blocks**, **Contracts**, **Addresses**,
or **Events**. Search accepts block heights, CometBFT transaction hashes,
addresses, contract names, and state keys. Use the detail URLs to share a block,
transaction, contract, or address.

```text
/explorer
/explorer/contracts
/explorer/addresses
/explorer/events
/explorer/block/<height>
/explorer/tx/<hash>
/explorer/contract/<name>
/explorer/address/<address>
```

Open a transaction from its block to see its execution result and any fee
rewards recorded in the receipt. The Rewards table shows the amount in XIAN,
the recipient, and the source contract or validator when the receipt includes
it. A delegation pool credit goes to the `validators` contract for the
validator shown on that row. A failed transaction can also include fee rewards.

The explorer labels indexed rows sourced from genesis as **Chain genesis**.
That label identifies the chain's initial state.

Block details and stored contract source come from the node. Transaction
lookups and receipt rewards use its CometBFT transaction index. Indexed address
and event history and reward summaries use BDS. The backend restricts
explorer targets to the configured node and known peers.

The contract explorer's `/api/contracts` endpoint returns bounded name-ascending
pages selected by `after`; it does not reconstruct global date sorting or
offsets. The validator dashboard keeps its `open_votes` and
`local_pending_unbonds` arrays and exposes `open_votes_next_cursor` and
`local_pending_unbonds_next_cursor`. Select subsequent pages with
`open_votes_cursor` and `pending_unbonds_cursor`. Next/First controls retain
the selected cursors across polling, including sparse empty pages.

## Consistency

Direct `/get/...` queries read committed application state. BDS-backed routes
are derived asynchronously from finalized blocks and may lag during catch-up.
Check `/api/abci_query/bds_status` when an indexed read must include a recent
transaction. Database waits run outside the consensus state lock, so an
unavailable indexer does not hold transaction admission or block commits.

Direct CometBFT `abci_query` requests accept `height=0` or the exact latest
committed Xian height. Other heights and `prove=true` return a nonzero ABCI
response code with an explanation. The response envelope reports the committed
application height; indexed rows may refer to earlier blocks.

Use BDS state-history routes for historical changes. See
[State Model](/concepts/state-model) for the boundary between the two views.

## Security

The dashboard does not provide wallet authentication or TLS termination. Bind
it to loopback/private infrastructure or place it behind a protected reverse
proxy.

The maintained stack requires both `--public-query` and
`XIAN_PUBLIC_QUERY_ENABLED=1` before publishing query services. This does not
publish the live CometBFT RPC.

The dashboard enforces configurable REST rate, burst, concurrency, and tracked
client limits. Broad explorer and `/api/abci_query/...` routes use the more
restrictive expensive-route limits. Treat simulation as bounded operator-funded
compute even though it does not commit state.

## Related Pages

- [API Overview](/api/)
- [BDS Indexed Queries](/api/bds)
- [WebSocket Subscriptions](/api/websockets)
- [GraphQL](/api/graphql)
