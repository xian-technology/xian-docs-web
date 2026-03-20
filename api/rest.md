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
GET /api/abci_query/contract_methods/currency
GET /api/abci_query/contract_vars/currency
GET /api/abci_query/simulate_tx/<hex_payload>
```

When BDS is enabled, additional query paths may be available under the same
ABCI query surface, such as indexed state/history helpers.
