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

When BDS is enabled, additional query paths are available under the same ABCI
query surface. These are still node queries, but backed by the optional BDS
index instead of the raw current-state driver.

These indexed reads are eventually consistent. The validator finalizes the
block first, then the BDS worker persists the indexed payload asynchronously.
So raw `/get/...` reads reflect current state immediately, while BDS-backed
history/index queries may lag briefly behind the latest committed block.
To make this resilient, the node writes finalized BDS payloads to a local
spool before the worker persists them to Postgres. If the node or database
restarts, BDS replays that spool on startup and catches the index back up.

Current BDS-backed ABCI query paths include:

```text
GET /api/abci_query/bds_status
GET /api/abci_query/bds_spool/limit=50/offset=0
GET /api/abci_query/blocks/limit=50/offset=0
GET /api/abci_query/block/123
GET /api/abci_query/block_by_hash/<hash>
GET /api/abci_query/tx/<hash>
GET /api/abci_query/txs_for_block/123
GET /api/abci_query/txs_by_sender/<address>/limit=50/offset=0
GET /api/abci_query/txs_by_contract/<contract>/limit=50/offset=0
GET /api/abci_query/events_for_tx/<hash>
GET /api/abci_query/events/<contract>/<event>/limit=50/offset=0
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
  and lag relative to the node's current block height.
- `/bds_spool` lists the currently pending spooled block payloads waiting to be
  indexed into Postgres.

Current catch-up behavior:

- if BDS was enabled and finalized blocks were spooled locally, the node can
  recover and catch up from that local spool after restarts or temporary DB
  downtime
- this is not yet a full historical reindex path for a node that never had BDS
  enabled in the first place
- a full backfill/reindex flow still needs to be added separately

Use the raw node paths for authoritative current state:

```text
GET /api/abci_query/get/<state_key>
GET /api/abci_query/contract/<name>
GET /api/abci_query/contract_methods/<name>
GET /api/abci_query/contract_vars/<name>
GET /api/abci_query/get_next_nonce/<address>
GET /api/abci_query/simulate_tx/<hex_payload>
```
