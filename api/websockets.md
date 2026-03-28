# WebSocket Subscriptions

The dashboard exposes a WebSocket endpoint at `/ws` that supports real-time subscriptions to state changes and contract events. Clients connect once and receive only the updates they care about — no polling required.

## Connecting

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");
```

Replace `localhost:8080` with the dashboard address of the node you want to connect to.

Once connected, you'll automatically receive `new_block` messages for every block the node commits. To receive state changes or contract events, you need to subscribe explicitly.

The built-in dashboard UI uses that same socket for its live activity feed:

- blocks and decoded transaction summaries stream automatically
- global contract-event and global state-change watching stay opt-in because
  they can get noisy on busy nodes

## Message Types

All messages are JSON. Every message has a `type` field.

### Messages You Receive

| Type | Description | When |
|------|-------------|------|
| `new_block` | Block summary with height, hash, proposer, and decoded transaction list | Every committed block |
| `node_status` | CometBFT connection status (`"online"` or `"offline"`) | On connect/disconnect |
| `state_change` | A state key you subscribed to was modified | On matching tx |
| `contract_event` | A contract event you subscribed to was emitted | On matching tx |

### Messages You Send

| Field | Description |
|-------|-------------|
| `action` | One of: `subscribe`, `unsubscribe`, `unsubscribe_all`, `list` |
| `type` | Subscription type: `"state"` or `"event"` |
| Additional fields | Depend on the subscription type (see below) |

Every action returns a JSON response with `"status": "ok"` or `"status": "error"`.

`new_block` messages include a `txs` array with decoded payload summaries when
the raw transaction could be decoded. Each tx summary currently includes:

- `tx_hash`
- `contract`
- `function`
- `sender`
- `stamps_supplied`

## State Subscriptions

Watch specific state keys for changes. Supports glob patterns.

### Subscribe to a Key

```json
{"action": "subscribe", "type": "state", "key": "currency.balances:alice"}
```

When a transaction modifies `currency.balances:alice`, you receive:

```json
{
    "type": "state_change",
    "key": "currency.balances:alice",
    "value": "999.5"
}
```

### Glob Patterns

You can use `*` and `?` wildcards (standard `fnmatch` syntax):

```json
{"action": "subscribe", "type": "state", "key": "currency.balances:*"}
```

This matches all balance changes for any address on the `currency` contract.

More pattern examples:

| Pattern | Matches |
|---------|---------|
| `currency.balances:alice` | Exact key |
| `currency.balances:*` | All balances on `currency` |
| `con_mytoken.*` | All state keys on `con_mytoken` |
| `*.balances:alice` | Alice's balance on any token contract |
| `con_dex.pairs:*:*` | All trading pairs on a DEX |

### Unsubscribe

```json
{"action": "unsubscribe", "type": "state", "key": "currency.balances:alice"}
```

## Event Subscriptions

Watch for contract events emitted by smart contracts (via `LogEvent`).

### Subscribe to a Specific Event

```json
{
    "action": "subscribe",
    "type": "event",
    "contract": "currency",
    "event": "Transfer"
}
```

When the `currency` contract emits a `Transfer` event, you receive:

```json
{
    "type": "contract_event",
    "event": "Transfer",
    "contract": "currency",
    "signer": "alice",
    "caller": "alice",
    "data": {
        "from": "alice",
        "to": "bob",
        "amount": "100"
    }
}
```

### Subscribe to All Events from a Contract

Omit the `event` field to receive all events:

```json
{"action": "subscribe", "type": "event", "contract": "currency"}
```

### Subscribe to All Events on All Contracts

```json
{"action": "subscribe", "type": "event", "contract": "*"}
```

### Glob Patterns for Events

Both `contract` and `event` support glob patterns:

| Pattern | Matches |
|---------|---------|
| `contract: "currency", event: "Transfer"` | Transfer events on `currency` |
| `contract: "currency"` | All events on `currency` |
| `contract: "con_*"` | All events on user-submitted contracts |
| `contract: "*"` | All events on all contracts |
| `contract: "*", event: "Transfer"` | Transfer events on any contract |

### Unsubscribe

```json
{"action": "unsubscribe", "type": "event", "contract": "currency", "event": "Transfer"}
```

## Management Commands

### List Active Subscriptions

```json
{"action": "list"}
```

Response:

```json
{
    "status": "ok",
    "action": "list",
    "state": ["currency.balances:alice", "currency.balances:*"],
    "events": [
        {"contract": "currency", "event": "Transfer"},
        {"contract": "*", "event": null}
    ]
}
```

### Clear All Subscriptions

```json
{"action": "unsubscribe_all"}
```

## Full Example: Wallet Balance Watcher

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");
const MY_ADDRESS = "your_public_key_here";

ws.onopen = () => {
    // Watch my balance on the main currency
    ws.send(JSON.stringify({
        action: "subscribe",
        type: "state",
        key: `currency.balances:${MY_ADDRESS}`,
    }));

    // Watch incoming transfers to me
    ws.send(JSON.stringify({
        action: "subscribe",
        type: "event",
        contract: "currency",
        event: "Transfer",
    }));

    console.log("Subscribed to balance and transfers");
};

ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);

    switch (data.type) {
        case "state_change":
            console.log(`Balance updated: ${data.value}`);
            break;

        case "contract_event":
            if (data.data.to === MY_ADDRESS) {
                console.log(`Received ${data.data.amount} from ${data.data.from}`);
            }
            break;

        case "new_block":
            // Update block height in UI
            break;

        case "node_status":
            console.log(`Node is ${data.status}`);
            break;
    }
};
```

## Full Example: DEX Price Monitor (Python)

```python
import asyncio
import json
import websockets

async def monitor_dex():
    async with websockets.connect("ws://localhost:8080/ws") as ws:
        # Watch all state changes on the DEX contract
        await ws.send(json.dumps({
            "action": "subscribe",
            "type": "state",
            "key": "con_dex.prices:*",
        }))

        # Watch swap events
        await ws.send(json.dumps({
            "action": "subscribe",
            "type": "event",
            "contract": "con_dex",
            "event": "Swap",
        }))

        async for message in ws:
            data = json.loads(message)

            if data["type"] == "state_change":
                pair = data["key"].split(":")[-1]
                print(f"Price update {pair}: {data['value']}")

            elif data["type"] == "contract_event":
                swap = data["data"]
                print(f"Swap: {swap['amount_in']} {swap['token_in']} -> {swap['token_out']}")

asyncio.run(monitor_dex())
```

## Full Example: Multi-Token Portfolio Tracker

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");
const MY_ADDRESS = "your_public_key_here";
const TOKENS = ["currency", "con_usdt", "con_eth", "con_btc"];

ws.onopen = () => {
    // Subscribe to balance on each token
    for (const token of TOKENS) {
        ws.send(JSON.stringify({
            action: "subscribe",
            type: "state",
            key: `${token}.balances:${MY_ADDRESS}`,
        }));
    }
};

ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === "state_change") {
        // Extract token name from key: "con_usdt.balances:addr" → "con_usdt"
        const token = data.key.split(".")[0];
        console.log(`${token}: ${data.value}`);
    }
};
```

## Architecture

```
Your App / Wallet / Explorer
  │
  │  WebSocket connection to /ws
  │  Sends: subscribe/unsubscribe messages
  │  Receives: state_change, contract_event, new_block
  │
  ▼
Dashboard (aiohttp)
  │  SubscriptionManager tracks per-client filters
  │  Routes matching events to the right clients
  │
  │  Persistent WS connection
  ▼
CometBFT (/websocket)
  │  Subscribes to NewBlock + Tx events
  │  Receives all committed transactions
  ▼
ABCI App (finalize_block)
  │  StateChange events: all state mutations
  │  Contract events: LogEvent emissions from contracts
  ▼
Smart Contract Execution
```

## Notes

- **No polling needed.** The server pushes updates only when matching changes occur.
- **New blocks always broadcast** to all connected clients regardless of subscriptions.
- **State change values are strings.** Parse them in your client if you need numeric types.
- **Subscriptions are per-connection.** If you disconnect and reconnect, you need to re-subscribe.
- **The dashboard must be enabled** on the node (`dashboard_enabled = true` in config.toml). Not all nodes run the dashboard.
- **This is a read-only observer.** The subscription system does not affect consensus or block production. If the dashboard restarts, subscriptions are lost but the chain continues normally.
