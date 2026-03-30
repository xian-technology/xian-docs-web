# xian-intentkit

`xian-intentkit` is the AI-agent stack for Xian-native wallets, balances,
transfers, contract calls, transactions, indexed-event reads, current Xian DEX
quote/trade flows, and agent-facing automation flows.

It stays its own repo and product. The Xian stack integration is intentionally
thin:

- `xian-intentkit` owns its own Compose topology and app env contract
- `xian-stack` owns the adapter layer and generated env handoff
- `xian-cli` owns the operator-facing profile flags

## Web Interface

Yes. `xian-intentkit` has a normal web interface and API.

With the stack-managed local/default ports:

- frontend: `http://127.0.0.1:38000`
- API: `http://127.0.0.1:38080`

For most users, the frontend is the normal way to:

- create an agent
- inspect its wallet and linked accounts
- enable skills
- define autonomous tasks
- review autonomous chats and tool calls

The API is useful for scripted provisioning, tests, and integration with other
operator tooling.

## What You Need To Run An Agent

In practice, you do not need another major Xian-side feature before using
IntentKit agents autonomously. You need a complete runtime setup and a clear
agent/task definition.

Minimum requirements:

- a running `xian-intentkit` frontend and API
- a reachable Xian network
- at least one configured LLM provider
- a wallet for the agent
- the right enabled skills for what the agent is allowed to do

Recommended for serious Xian automation:

- run against a service node so indexed reads and event-triggered workflows are
  available
- fund the agent with a dedicated limited-purpose wallet
- keep the agent’s skill surface narrow

## Normal Setup Flow

In a normal operator or user workflow, the sequence is:

1. start `xian-intentkit`
2. open the frontend
3. create an agent
4. define the agent purpose
5. select the model
6. enable only the skills the agent should use
7. link any external accounts the workflow needs
8. create one or more autonomous tasks
9. monitor the resulting autonomous chats and tool calls

For node operators using the stack-managed integration, the usual entrypoint is:

```bash
uv run xian network join mainnet-agent-node \
  --network mainnet \
  --template embedded-backend \
  --service-node \
  --enable-intentkit \
  --intentkit-network-id xian-mainnet \
  --init-node

uv run xian node start mainnet-agent-node
uv run xian node endpoints mainnet-agent-node
```

For local/private runs, the same model applies: bring up the frontend/API,
point it at the intended Xian network, then create agents and tasks through the
UI or API.

## Defining The Agent

An autonomous agent is usually the combination of:

- the agent purpose
- the enabled skills
- the model
- the wallet/account context
- one or more autonomous tasks

The purpose should answer:

- what the agent is responsible for
- what it is allowed to optimize for
- what it must never do

Example:

- “Monitor a Xian DEX pair, react to significant price changes, trade with a
  capped amount, verify the emitted events, and notify Telegram and X.”

## Defining The Goal

The “goal” is usually not one global hidden setting. In practice it is split
between prompt-like instructions and hard configuration.

Put these in the agent purpose or autonomous-task prompt:

- the business objective
- the event or schedule to react to
- the order of operations
- the wording/format of notifications

Put these in hard config where possible:

- which wallet the agent uses
- which skills are enabled
- which network it targets
- linked X / Telegram accounts
- the specific autonomous trigger type

If something must not be violated, prefer config and skill restrictions over
hoping the model follows a soft instruction forever.

## Autonomous Tasks

IntentKit currently supports two important autonomous patterns for Xian:

- scheduled tasks
- event-triggered tasks

### Scheduled Tasks

Use scheduled tasks when the agent should check something periodically, for
example:

- every 5 minutes inspect a pair
- every hour summarize recent trading activity
- every day post a report

### Xian Event Tasks

Use Xian event tasks when the workflow should react to on-chain activity, for
example:

- a DEX `Sync` event moves beyond a price-change threshold
- a contract emits a specific event for a watched pair or address
- a transfer or execution event should wake the agent immediately

This is the recommended pattern for near-real-time Xian automation.

## A Good Default Pattern

For a normal autonomous Xian trading or monitoring agent, the recommended
current pattern is:

1. run `xian-intentkit` against a service node
2. create an agent in the frontend
3. give it a narrow purpose
4. enable only the Xian and notification skills it needs
5. create an autonomous task with:
   - `trigger_type="xian_event"`
   - `xian_event={contract,event,filters?,cooldown_seconds?}`
6. let the event-trigger service wake from node websocket activity
7. let IntentKit confirm the authoritative indexed events before acting
8. execute the on-chain action
9. verify the resulting transaction and events
10. send the side effects, such as Telegram or X notifications

## Guardrails And Production Safety

If the agent can move funds or post externally, treat these as required design
concerns:

- use a dedicated agent wallet, not an operator’s main wallet
- keep balances capped
- enable only the skills the workflow requires
- prefer dedicated Xian skills over generic contract-write tools for critical
  operations
- limit the workflow to specific contracts, pairs, or tokens
- keep clear cooldowns and thresholds
- review autonomous chat history regularly

The current system is capable enough for real autonomous workflows, but
production safety still comes mostly from good wallet discipline and a narrow
skill/config surface.

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

For Xian event-triggered agents, this is the normal recommended posture.

## Current Xian Skill Surface

The current Xian skill category inside `xian-intentkit` covers:

- wallet details and balances
- token transfers and approvals
- contract state reads and read-only contract calls
- writable contract transactions
- transaction inspection
- transaction-scoped indexed event inspection
- indexed event listing
- node and BDS status reads
- dedicated Xian DEX quote and trade helpers

The dedicated DEX tools are:

- `xian_dex_quote`
- `xian_dex_trade`

They are intentionally narrow and match the current live Xian DEX contracts:

- `con_dex`
- `con_pairs`
- `con_dex_helper`

Today they focus on single-pair quote and helper-based buy/sell execution.
Advanced multi-hop routing and custom DEX integrations still use the generic
Xian contract-call and contract-transaction tools.

## Autonomous Trading Pattern

For an autonomous Xian trading agent, the recommended current pattern is:

1. run `xian-intentkit` against a service node
2. configure an autonomous task with:
   - `trigger_type="xian_event"`
   - `xian_event={contract,event,filters?,cooldown_seconds?}`
3. let the Xian event trigger service wake from node websocket traffic
4. let IntentKit confirm and drain the matching indexed events before execution
5. quote planned trades with `xian_dex_quote`
6. execute through `xian_dex_trade`
7. verify the confirmed receipt and emitted indexed events with
   `xian_get_transaction` and `xian_get_events_for_tx`
8. only trigger side effects such as social posting after that confirmation

This is intentionally a hybrid model:

- node websocket traffic provides near-real-time wake-ups
- indexed BDS events plus Redis cursors remain the source of truth
- a periodic indexed sync loop stays active so websocket reconnects or BDS lag
  do not cause missed triggers

This is better than trying to “fire cron immediately.” Cron remains the right
tool for periodic tasks; Xian event triggers are a separate reactive path that
reuses the same autonomous execution entrypoint.

## Linking External Accounts

For notification or social workflows, the agent may need linked external
accounts.

Examples:

- Telegram bot/chat configuration for `telegram_send_message`
- linked X account for `twitter_post_tweet`

For X posting, the linked-account flow is the preferred normal setup:

- enable X user authentication for the app
- configure the X OAuth callback URL
- let IntentKit link the agent through its existing `/auth/twitter` flow

This avoids having to inject per-agent X access-token secrets into every live
workflow runner.

## End-To-End Workflow Tests

There are now two IntentKit-side workflow paths for this pattern:

### Deterministic Skill/Trigger Harness

This one is still useful for CI and focused development:

1. a Xian indexed event wakes the event-trigger service
2. the task checks a `price_change_pct` threshold
3. the agent executes a Xian DEX sell through `xian_dex_trade`
4. the agent posts to Telegram
5. the agent posts to X

It uses the real trigger service and real skills, but it still mocks:

- the indexed event feed
- the DEX transport layer
- the Telegram/X delivery endpoints

Run it from the IntentKit repo:

```bash
cd /Users/endogen/Projekte/xian/xian-intentkit
uv run python scripts/test_xian_trade_social_workflow.py --threshold-pct 3.0
```

The default fixture feed contains two events:

- event `1` with `price_change_pct=1.5`, which should be ignored
- event `2` with `price_change_pct=6.4`, which should trigger the workflow

The script prints a JSON summary with:

- `acted_on_event_ids`
- `trade_calls`
- `telegram_payloads`
- `twitter_payloads`
- `final_cursor`

For automated validation, the targeted test set is:

```bash
cd /Users/endogen/Projekte/xian/xian-intentkit
REDIS_HOST=localhost uv run pytest -q \
  tests/skills/test_telegram.py \
  tests/skills/test_twitter.py \
  tests/core/test_xian_event_triggers.py \
  tests/core/test_xian_trade_social_workflow.py
```

### Live Localnet Workflow

There is now also a real live runner for the same workflow. It uses:

- a real Xian localnet
- a real service node with BDS enabled
- a real IntentKit local API and autonomous worker
- a real DEX pack deployed during the run
- a real `con_pairs.Sync` event trigger with reserve-based threshold detection
- a real agent-side `xian_dex_trade`
- a real Telegram post
- a real X post

The live runner is:

```bash
cd /Users/endogen/Projekte/xian/xian-intentkit
uv run python scripts/test_xian_trade_social_live.py --allow-live-posts
```

Required env vars in all modes:

- `INTENTKIT_E2E_TELEGRAM_BOT_TOKEN`
- `INTENTKIT_E2E_TELEGRAM_CHAT_ID`

The live runner now supports two X posting modes:

- `linked_account`
  - set `INTENTKIT_E2E_TWITTER_AUTH_MODE=linked_account`
  - no per-run X access-token env vars are required
  - the runner creates a normal agent, requests the existing IntentKit
    `/auth/twitter` URL, and waits until that agent has a linked X account
  - also set `INTENTKIT_E2E_TWITTER_REDIRECT_URI` or `INTENTKIT_E2E_APP_URL`
- `self_key`
  - set `INTENTKIT_E2E_TWITTER_AUTH_MODE=self_key`
  - requires:
    - `INTENTKIT_E2E_TWITTER_CONSUMER_KEY`
    - `INTENTKIT_E2E_TWITTER_CONSUMER_SECRET`
    - `INTENTKIT_E2E_TWITTER_ACCESS_TOKEN`
    - `INTENTKIT_E2E_TWITTER_ACCESS_TOKEN_SECRET`

Common optional overrides:

- `INTENTKIT_E2E_API_URL`
- `INTENTKIT_E2E_TWITTER_AUTH_MODE`
- `INTENTKIT_E2E_TWITTER_REDIRECT_URI`
- `INTENTKIT_E2E_APP_URL`
- `INTENTKIT_E2E_MODEL`
- `INTENTKIT_E2E_THRESHOLD_PCT`
- `INTENTKIT_E2E_TRIGGER_SELL_AMOUNT`
- `INTENTKIT_E2E_AGENT_SELL_AMOUNT`

Add `--open-auth-url` if you want linked-account mode to open the X OAuth URL in
your default browser automatically.

The script prints a JSON summary with the deployed DEX contracts, the founder
trigger trade hash, the agent trade hash, the skill-call sequence, and the
on-chain events emitted by the agent trade.

## Generated Env

The stack adapter writes `xian-intentkit/deployment/.env`.

Derived values include:

- `APP_BASE_URL`
- `AWS_S3_CDN_URL`
- the selected `XIAN_<NETWORK>_RPC_URL`
- the selected `XIAN_<NETWORK>_CHAIN_ID`
- `XIAN_EVENT_TRIGGER_ENABLED`
- `XIAN_EVENT_TRIGGER_POLL_INTERVAL_SECONDS`
- `XIAN_EVENT_TRIGGER_BATCH_LIMIT`

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
