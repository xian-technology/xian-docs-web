# REST API Reference

The REST API belongs to the optional Xian dashboard service. It proxies selected
CometBFT calls and adds explorer-oriented convenience routes. It is not the
node's consensus RPC.

Stack-managed default:

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

For key scans, follow the returned `next_after` cursor instead of loading an
unbounded prefix.

See [BDS Indexed Queries](/api/bds) for indexed block, transaction, event,
state-history, token, candle, shielded, reward, and patch paths.

## Contract and Transaction Responses

`GET /api/contract/{name}` returns stored canonical source and VM metadata
through the node query layer. The stored IR is available through
`contract_ir/<name>`.

For transaction lookups:

- `result.tx` is the submitted transaction
- `result.tx_result.data` contains Xian's encoded execution output

SDKs should normally decode these shapes instead of duplicating dashboard
response handling.

## Explorer

The dashboard includes:

```text
/explorer
/explorer/contracts
/explorer/addresses
/explorer/events
```

Indexed address and event views require BDS. The explorer may support
inspection of a connected peer, but the backend restricts targets to the
configured node and known peers; it is not a general HTTP proxy.

## Consistency

Direct `/get/...` queries read committed application state. BDS-backed routes
are derived asynchronously from finalized blocks and may lag during catch-up.
Check `/api/abci_query/bds_status` when an indexed read must include a recent
transaction.

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
