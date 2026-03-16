# APIs & Interfaces

Xian provides several ways to interact with the network: a REST API served by the dashboard, ABCI query paths for direct state access, and WebSocket subscriptions for real-time events.

## Access Methods

| Method | Use Case | Endpoint |
|--------|----------|----------|
| [REST API](/api/rest) | Node status, blocks, transactions, contract inspection | `http://node:8080/api/...` |
| [ABCI Queries](/api/rest#abci-query-paths) | State reads, nonce lookups, contract metadata | `http://node:8080/api/abci_query/...` |
| [Dry Runs](/api/dry-runs) | Simulate transactions without state changes | `http://node:8080/api/abci_query/simulate_tx/...` |

## Quick Examples

### Check node status

```
GET http://localhost:8080/api/status
```

### Read a contract's state

```
GET http://localhost:8080/api/abci_query/get/currency.balances:alice
```

### Get a contract's source code

```
GET http://localhost:8080/api/contract/currency
```

### Simulate a transaction

```
GET http://localhost:8080/api/abci_query/simulate_tx/{hex_encoded_payload}
```
