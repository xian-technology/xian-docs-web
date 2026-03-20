# APIs & Interfaces

Xian currently exposes several read and interaction surfaces. They are not all
equivalent.

## Main Surfaces

| Surface | Purpose |
|---------|---------|
| CometBFT RPC | canonical node RPC for tx broadcast, blocks, ABCI query |
| Dashboard REST | optional convenience API on top of CometBFT RPC |
| Dashboard WebSocket | optional real-time observer/subscription layer |
| BDS-backed ABCI query | optional indexed/history query layer on the node itself |
| GraphQL / PostGraphile | optional convenience layer over the BDS database |

## Which One To Use

- use **CometBFT RPC** and **ABCI query** for canonical low-level access
- use **BDS-backed ABCI query** for indexed/history reads when BDS is enabled
- use the **dashboard REST/WebSocket** service for explorer/operator UX
- use **GraphQL** only as an optional convenience layer when the BDS stack is enabled

## Quick Examples

```text
GET http://localhost:26657/status
GET http://localhost:8080/api/status
GET http://localhost:8080/api/contract/currency
GET http://localhost:8080/api/abci_query/get/currency.balances:alice
GET http://localhost:8080/api/abci_query/bds_status
GET http://localhost:8080/api/abci_query/bds_spool/limit=20/offset=0
GET http://localhost:8080/api/abci_query/simulate_tx/<hex_payload>
```
