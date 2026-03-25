# APIs & Interfaces

Xian currently exposes several read and interaction surfaces. They are not all
equivalent.

## Main Surfaces

| Surface | Purpose |
|---------|---------|
| CometBFT RPC | canonical node RPC for tx broadcast, blocks, ABCI query |
| Xian Prometheus metrics | node-local time-series metrics for execution and BDS health |
| Dashboard REST | optional convenience API on top of CometBFT RPC |
| Dashboard WebSocket | optional real-time observer/subscription layer |
| BDS-backed ABCI query | optional indexed/history query layer on the node itself |
| GraphQL / PostGraphile | optional convenience layer over the BDS database |

## Which One To Use

- use **CometBFT RPC** and **ABCI query** for canonical low-level access
- use **Xian Prometheus metrics** and CometBFT metrics for remote monitoring and alerting
- use **BDS-backed ABCI query** for indexed/history reads when BDS is enabled
- use the **dashboard REST/WebSocket** service for explorer/operator UX
- use **GraphQL** only as an optional convenience layer when the BDS stack is enabled

Keep the read contract split clear:

- raw ABCI query is authoritative for current state
- BDS-backed ABCI query is the indexed/history layer and may lag briefly while
  catch-up is running
- GraphQL/PostGraphile sits on top of BDS and inherits that eventual
  consistency

## Quick Examples

```text
GET http://localhost:26657/status
GET http://localhost:8080/api/status
GET http://localhost:8080/api/monitoring
GET http://localhost:8080/api/contract/currency
GET http://localhost:8080/api/abci_query/contract_code/currency
GET http://localhost:8080/api/abci_query/get/currency.balances:alice
GET http://localhost:8080/api/abci_query/bds_status
GET http://localhost:8080/api/abci_query/bds_spool/limit=20/offset=0
GET http://localhost:26657/abci_query?path="/perf_status"
GET http://localhost:9108/metrics
GET http://localhost:8080/api/abci_query/simulate_tx/<hex_payload>
```
