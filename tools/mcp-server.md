# MCP Server

The maintained Xian MCP server is `xian-mcp-server`.

It exposes Xian wallet, query, transaction, indexed-read, crypto, and DEX
operations to AI assistants and other tool-calling systems.

## Important Safety Rule

This server can hold private keys and submit transactions.

Use it as a local tool. Do not expose it publicly and do not point it at
production wallets unless you have deliberately accepted that risk.

## Transport Modes

It supports two transport styles:

| Mode | Use case |
|------|----------|
| MCP over stdio | desktop assistants and MCP-native clients |
| HTTP / REST | web apps, custom tool-calling loops, and automation |

## What It Can Do

Current capability groups include:

- create or import wallets, including HD-wallet flows
- read balances, token holdings, contract state, and contract source
- send transactions and token transfers
- simulate transactions for chi estimation
- read indexed blocks, transactions, events, and state history
- inspect shielded wallet history and shielded output tags
- sign, verify, encrypt, and decrypt messages
- query DEX prices and execute buy/sell helper flows

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
