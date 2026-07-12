# MCP Server

The maintained Xian MCP server is `xian-mcp-server`.

It exposes Xian wallet, query, transaction, indexed-read, crypto, and DEX
operations to AI assistants and other tool-calling systems.

## Important Safety Rule

This server can hold private keys and submit transactions.

Use it as a local tool. Do not expose it publicly and do not point it at
production wallets unless you have deliberately accepted that risk.

Secret-bearing wallet tools are disabled by default. To enable wallet
creation/export, transaction submission helpers, signing, encryption, and
decryption, set:

```bash
XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS=1
```

Without that opt-in, the MCP server exposes the safer read/query/indexed
inspection surface and rejects the unsafe wallet operations.

Those unsafe tools are also omitted from `tools/list` and the HTTP `/tools`
discovery surface until you opt in, so downstream tool-calling systems only
see the read-safe default surface.

HTTP mode binds to `127.0.0.1` by default and does not allow browser CORS by
default. IPv6 loopback uses the raw bind host `::1`, while URLs bracket the
literal, for example `http://[::1]:8100/tools`. If you enable unsafe tools or
bind HTTP to a non-loopback address, including the IPv6 wildcard `::`, set
`XIAN_MCP_HTTP_TOKEN` and send it as an `Authorization: Bearer ...` header.

## Network Configuration

Configure the target network explicitly. Local development defaults are:

| Variable | Purpose | Local default |
|----------|---------|-------------------------------|
| `XIAN_NODE_URL` | Node RPC URL | `http://127.0.0.1:26657` |
| `XIAN_GRAPHQL` | GraphQL endpoint | `http://127.0.0.1:5000/graphql` |
| `XIAN_CHAIN_ID` | Chain ID used for transaction payloads | `xian-local-1` |
| `XIAN_INCLUDE_RAW` | Include raw SDK payloads in responses | `false` |
| `XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS` | Enable wallet creation/import, sends, signing, encryption/decryption, and DEX trade helpers | `false` |
| `HTTP_HOST` | HTTP bind address | `127.0.0.1` |
| `HTTP_PUBLISH_HOST` | Docker Compose host-publish address; use raw `::1` for IPv6 loopback publishing | unset |
| `HTTP_PORT` | HTTP bind port | `8100` |
| `XIAN_MCP_HTTP_TOKEN` | Bearer token for HTTP tools; required for unsafe tools or non-loopback binds | unset |
| `XIAN_MCP_HTTP_CORS_ORIGINS` | Comma-separated browser origins allowed to call HTTP mode | unset |
| `XIAN_MCP_DEX_PLAN_TTL_SECONDS` | Process-local DEX plan lifetime, bounded to 30-900 seconds | `300` |
| `XIAN_MCP_DEX_PLAN_MAX_ENTRIES` | Maximum stored DEX plans before oldest-first eviction, bounded to 1-1000 | `256` |

When in doubt, read `result.node_info.network` from the node's `/status`
response and use that value for `XIAN_CHAIN_ID`.

For a local stack node, point the MCP server at the local RPC and
GraphQL endpoints (stack defaults shown):

```bash
XIAN_NODE_URL=http://127.0.0.1:26657
XIAN_GRAPHQL=http://127.0.0.1:5000/graphql
XIAN_CHAIN_ID=xian-local-1
```

Use the chain ID from the node's `/status` response when running against a
custom local network.

## Transport Modes

It supports two transport styles:

| Mode | Use case |
|------|----------|
| MCP over stdio | desktop assistants and MCP-native clients |
| HTTP / REST | web apps, custom tool-calling loops, and automation |

In HTTP mode, the same tool registry is exposed as:

- `GET /tools` for discovery
- `POST /tools/{name}` for invocation

For local read-only HTTP use:

```bash
uv run xian-mcp-http
curl http://localhost:8100/tools
```

For IPv6 loopback on a bare-metal process, set `HTTP_HOST=::1` and call
`http://[::1]:8100/tools`. For Docker Compose host publishing, set
`HTTP_PUBLISH_HOST=::1`; keep `HTTP_HOST` scoped to the container bind address
you need.

For Docker Compose or unsafe wallet/signing tools, configure a token:

```bash
export XIAN_MCP_HTTP_TOKEN="$(openssl rand -hex 32)"
export XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS=1
docker compose up xian-mcp-http

curl http://localhost:8100/tools \
  -H "Authorization: Bearer ${XIAN_MCP_HTTP_TOKEN}"
```

Browser clients must opt in with exact origins:

```bash
XIAN_MCP_HTTP_CORS_ORIGINS=http://localhost:3000
```

## What It Can Do

Capability groups include:

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

## DEX Tools

The DEX tools use the canonical DEX contract names:

- `con_pairs` for pair discovery and reserves
- `con_dex` for router-level liquidity and swap behavior
- `con_dex_helper` for single-pair `buy` and `sell` helper flows

`get_dex_price`, `dex_list_pairs`, `dex_get_pair`, the `dex_quote_*` tools, and
the `dex_plan_*` tools are read-only. `buy_on_dex`, `sell_on_dex`, and the
`dex_submit_*` tools submit transactions and therefore require
`XIAN_MCP_ENABLE_UNSAFE_WALLET_TOOLS=1`.

For the agent-oriented flow, call a `dex_plan_*` tool and show its complete
audit JSON before asking for authorization. It includes the exact calls,
amounts, recipient, deadline, warnings, an opaque `plan_id`, canonical SHA-256
digest, and issue/expiry timestamps. After approval, call the matching
`dex_submit_*` tool with only `private_key`, `plan_id`, and the optional
`simulate` flag. The server retrieves its immutable canonical copy; callers
cannot replace the calls, amounts, or recipient between planning and execution.

Plans are short-lived, single-use, bounded in memory, and local to one server
process. A submission attempt consumes the plan before wallet checks,
simulation, or transaction submission, including when an approval succeeds but
a later router call fails. Concurrent submission and replay therefore fail.
Plans also become invalid after expiry, oldest-first capacity eviction, or a
server restart; create and confirm a fresh plan rather than retrying an old ID.
Simulation is enabled by default.

For event-driven agents, choose the delivery guarantee explicitly:

- `dex_wait_live_event` performs a bounded wait on the node's CometBFT
  WebSocket. It is low latency and does not require BDS, but it has no replay
  cursor and can miss events across disconnects or restarts. Start the wait
  before the activity being observed.
- `dex_list_events` reads BDS-indexed DEX history with an `after_id` cursor.
  Use it for restart-safe recovery, reconciliation, and historical queries.

Services that must not miss events should combine the live wait for
responsiveness with indexed cursor reads for recovery.

The buy/sell helpers send exact decimal amount and slippage values and convert
`deadline_min` into the Xian VM datetime payload expected by the canonical DEX
contracts. The target network must already have the canonical DEX contracts and
liquidity for the requested pair.

## Typical Uses

- local AI-assisted wallet operations
- agent workflows that need structured Xian tools
- prototyping higher-level automation before building a dedicated app backend

## Related Tools

- [xian-py](/tools/xian-py)
- [xian-js](/tools/xian-js)
- [xian-intentkit](/tools/xian-intentkit)
