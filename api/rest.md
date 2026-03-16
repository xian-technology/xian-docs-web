# REST API Reference

The Xian dashboard exposes a REST API that proxies to CometBFT and provides additional convenience endpoints for contract inspection and state queries.

Base URL: `http://<node_host>:8080`

## Node & Network Endpoints

### GET /api/status

Returns the node's current status including node info, sync state, and latest block.

```
GET /api/status
```

### GET /api/net_info

Returns network information including connected peers and listener addresses.

```
GET /api/net_info
```

### GET /api/validators

Returns the current validator set with voting power.

```
GET /api/validators
```

### GET /api/consensus

Returns the current consensus state.

```
GET /api/consensus
```

## Block Endpoints

### GET /api/blockchain

Returns metadata for a range of blocks.

```
GET /api/blockchain?minHeight=1&maxHeight=10
```

### GET /api/block/{height}

Returns a specific block by height, including all transactions.

```
GET /api/block/12345
```

### GET /api/block_results/{height}

Returns the execution results for all transactions in a block, including events and state changes.

```
GET /api/block_results/12345
```

## Transaction Endpoints

### GET /api/tx/{hash}

Returns a specific transaction by its hash, including execution result.

```
GET /api/tx/ABCDEF1234567890...
```

### GET /api/unconfirmed_txs

Returns transactions currently in the mempool waiting for inclusion.

```
GET /api/unconfirmed_txs
```

## Contract Endpoints

### GET /api/contract/{name}

Returns the source code of a deployed contract.

```
GET /api/contract/currency
```

Response:

```json
{
    "name": "currency",
    "code": "balances = Hash(default_value=0)\n..."
}
```

## ABCI Query Endpoints

### GET /api/abci_query/{path}

General-purpose ABCI query endpoint. The `path` determines what is queried.

```
GET /api/abci_query/{path}
```

## ABCI Query Paths

These paths are passed as the `path` parameter to `/api/abci_query/`:

### GET /get/{key}

Read a raw state value by its full key.

```
GET /api/abci_query/get/currency.balances:alice
```

Returns the stored value (JSON encoded). The key format is `contract.variable:key1:key2`.

### GET /health

Check if the ABCI application is healthy.

```
GET /api/abci_query/health
```

### GET /get_next_nonce/{address}

Returns the next expected nonce for a given address. Used by SDKs to construct transactions.

```
GET /api/abci_query/get_next_nonce/ed30796abc4ab47a97bfb37d50ef10f0fdc4beb42e78ceb35e2873a1735e4e85
```

Response:

```json
{
    "next_nonce": 42
}
```

### GET /contract/{name}

Returns contract source code via the ABCI query path.

```
GET /api/abci_query/contract/currency
```

### GET /contract_methods/{name}

Returns the list of exported functions and their argument signatures.

```
GET /api/abci_query/contract_methods/currency
```

Response:

```json
{
    "methods": [
        {
            "name": "transfer",
            "arguments": [
                {"name": "amount", "type": "float"},
                {"name": "to", "type": "str"}
            ]
        },
        {
            "name": "approve",
            "arguments": [
                {"name": "amount", "type": "float"},
                {"name": "to", "type": "str"}
            ]
        }
    ]
}
```

### GET /contract_vars/{name}

Returns the list of state variables declared by a contract.

```
GET /api/abci_query/contract_vars/currency
```

Response:

```json
{
    "variables": ["balances", "metadata"],
    "hashes": ["balances", "metadata"]
}
```

### GET /keys/{prefix}

Returns all state keys matching a prefix. Useful for discovering what keys a contract has written.

```
GET /api/abci_query/keys/currency.balances
```

Response:

```json
{
    "keys": [
        "currency.balances:alice",
        "currency.balances:bob",
        "currency.balances:carol"
    ]
}
```

### GET /simulate_tx/{hex_encoded_payload}

Simulates a transaction without committing state changes. See [Dry Runs](/api/dry-runs) for details.

## Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Not found (contract, block, or transaction does not exist) |
| 500 | Internal server error |

Error responses include a JSON body with an `error` field describing the problem.
