# x402 Exact Payment Example

The x402 Exact Payment example shows HTTP 402 pay-per-request settlement using
native Xian token transfers.

The machine-readable example manifest lives at
`xian-configs/examples/x402-exact/example.json`.

## Composition

- template: `single-node-indexed`
- contracts: `xian-configs/examples/x402-exact/contracts/`
- app code: `xian-py/examples/x402_exact`
- services: paid API and facilitator-style payment flow

## Commands

```bash
cd ~/xian/xian-cli
uv run xian example show x402-exact
uv run xian example starter x402-exact
```
