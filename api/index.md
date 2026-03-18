# APIs & Interfaces

Xian currently exposes several read and interaction surfaces. They are not all
equivalent.

## Main Surfaces

| Surface | Purpose |
|---------|---------|
| CometBFT RPC | canonical node RPC for tx broadcast, blocks, ABCI query |
| Dashboard REST | optional convenience API on top of CometBFT RPC |
| Dashboard WebSocket | optional real-time observer/subscription layer |
| GraphQL / BDS | optional indexed read layer when the BDS stack is running |

## Which One To Use

- use **CometBFT RPC** and **ABCI query** for canonical low-level access
- use the **dashboard REST/WebSocket** service for explorer/operator UX
- use **GraphQL** only when the optional BDS stack is enabled

## Quick Examples

```text
GET http://localhost:26657/status
GET http://localhost:8080/api/status
GET http://localhost:8080/api/contract/currency
GET http://localhost:8080/api/abci_query/get/currency.balances:alice
GET http://localhost:8080/api/abci_query/simulate_tx/<hex_payload>
```
