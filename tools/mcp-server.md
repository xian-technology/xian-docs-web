# MCP Server

The maintained Xian MCP server is `xian-mcp-server`.

It exposes Xian wallet, query, transaction, indexed-read, crypto, and DEX
operations to AI assistants and other tool-calling systems.

## Important Safety Rule

This server can hold private keys and submit transactions.

Use it as a local tool. Do not expose it publicly and do not point it at
production wallets unless you have deliberately accepted that risk.

Secret-bearing wallet tools are now disabled by default. To enable wallet
creation/export, transaction submission helpers, signing, encryption, and
decryption, set:

```bash
XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS=1
```

Without that opt-in, the MCP server still exposes the safer read/query/indexed
inspection surface, but it rejects the unsafe wallet operations.

Those unsafe tools are also omitted from `tools/list` and the HTTP `/tools`
discovery surface until you opt in, so downstream tool-calling systems only
see the read-safe default surface.

## Transport Modes

It supports two transport styles:

| Mode | Use case |
|------|----------|
| MCP over stdio | desktop assistants and MCP-native clients |
| HTTP / REST | web apps, custom tool-calling loops, and automation |

In HTTP mode, the same tool registry is exposed as:

- `GET /tools` for discovery
- `POST /tools/{name}` for invocation

## What It Can Do

Current capability groups include:

- read balances, token holdings, contract state, and contract source
- simulate transactions for chi estimation
- read indexed blocks, transactions, events, and state history
- inspect shielded wallet history and shielded output tags
- verify messages and inspect DEX prices

With `XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS=1`, it can also:

- create or import wallets, including HD-wallet flows
- send transactions and token transfers
- sign, encrypt, and decrypt messages
- execute DEX buy/sell helper flows

The implementation sits on top of the maintained Xian SDKs rather than inventing
its own chain protocol.

## Typical Uses

- local AI-assisted wallet operations
- agent workflows that need structured Xian tools
- prototyping higher-level automation before building a dedicated app backend

## Related Tools

- [xian-py](/tools/xian-py)
- [xian-js](/tools/xian-js)
- [xian-intentkit](/tools/xian-intentkit)
