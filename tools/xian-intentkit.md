# xian-intentkit

`xian-intentkit` is the AI-agent stack for Xian-native wallets, balances,
transfers, contract calls, transactions, indexed-event reads, and agent-facing
automation flows.

It stays its own repo and product. The Xian stack integration is intentionally
thin:

- `xian-intentkit` owns its own Compose topology and app env contract
- `xian-stack` owns the adapter layer and generated env handoff
- `xian-cli` owns the operator-facing profile flags

## What The Stack Integration Does

When a node profile enables `xian-intentkit`:

- `xian node start <name>` starts the Xian runtime and the stack-managed
  IntentKit services
- `xian node stop <name>` stops both
- `xian node endpoints <name>` prints the frontend and API URLs
- `xian node health <name>` includes IntentKit reachability checks
- `xian-stack` generates `xian-intentkit/deployment/.env` from the IntentKit
  example env, current operator env, and stack-derived Xian values

This keeps upstream sync manageable because the stack does not copy the
IntentKit service definitions into `xian-stack`.

## Profile Fields

Relevant node-profile fields:

- `intentkit_enabled`
- `intentkit_network_id`
- `intentkit_host`
- `intentkit_port`
- `intentkit_api_port`

Common join flow for a service node:

```bash
uv run xian network join mainnet-agent-node \
  --network mainnet \
  --template embedded-backend \
  --service-node \
  --enable-intentkit \
  --intentkit-network-id xian-mainnet \
  --enable-monitoring \
  --init-node
```

Then start it normally:

```bash
uv run xian node start mainnet-agent-node
uv run xian node endpoints mainnet-agent-node
uv run xian node health mainnet-agent-node
```

## Network Slot Mapping

The stack integration maps node posture to one of four current IntentKit Xian
slots:

- canonical mainnet -> `xian-mainnet`
- canonical testnet -> `xian-testnet`
- canonical devnet -> `xian-devnet`
- local or private stack-managed network -> `xian-localnet`

`xian-localnet` is the generic slot for private or operator-managed Xian
networks. The stack adapter fills in the actual RPC URL and chain ID for that
runtime.

## Service-Node Recommendation

Basic Xian wallet and transaction flows only need RPC access.

If you want indexed transaction inspection, event listing, and the broader
service-node read surface inside `xian-intentkit`, run the node as a service
node so the BDS-backed ABCI query paths are available.

## Generated Env

The stack adapter writes `xian-intentkit/deployment/.env`.

Derived values include:

- `APP_BASE_URL`
- `AWS_S3_CDN_URL`
- the selected `XIAN_<NETWORK>_RPC_URL`
- the selected `XIAN_<NETWORK>_CHAIN_ID`

All other IntentKit settings still come from the normal IntentKit env contract.
That includes LLM provider keys such as `OPENAI_API_KEY` or
`OPENROUTER_API_KEY`.

## Pricing

USD pricing is deployment-configurable. It is not hardcoded into the stack.

The stack-owned passthrough values are:

- `XIAN_INTENTKIT_PRICE_STRATEGY`
- `XIAN_INTENTKIT_PRICE_FIXED_USD`
- `XIAN_INTENTKIT_PRICE_SOLANA_MINT`
- `XIAN_INTENTKIT_PRICE_MARKET_URL`

Those values are written into the selected IntentKit network slot.

## Current Xian Mainnet Example

For the current live Xian network deployment, the bridged Solana token example
is:

```bash
XIAN_INTENTKIT_PRICE_STRATEGY=solana_jupiter
XIAN_INTENTKIT_PRICE_SOLANA_MINT=GnaXkbmMV1zGK6bRCQnM9Jd6Jv2Hjw5b2PFVBaKEE5At
XIAN_INTENTKIT_PRICE_MARKET_URL=https://raydium.io/swap/?inputMint=sol&outputMint=GnaXkbmMV1zGK6bRCQnM9Jd6Jv2Hjw5b2PFVBaKEE5At
```

That produces the corresponding IntentKit env for the selected mainnet slot:

```bash
XIAN_MAINNET_PRICE_STRATEGY=solana_jupiter
XIAN_MAINNET_PRICE_SOLANA_MINT=GnaXkbmMV1zGK6bRCQnM9Jd6Jv2Hjw5b2PFVBaKEE5At
XIAN_MAINNET_PRICE_MARKET_URL=https://raydium.io/swap/?inputMint=sol&outputMint=GnaXkbmMV1zGK6bRCQnM9Jd6Jv2Hjw5b2PFVBaKEE5At
```

For another Xian-based deployment, change those pricing values without changing
the core stack code.
