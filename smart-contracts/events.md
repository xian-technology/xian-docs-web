# Events

Events let contracts emit structured, observable signals during execution. Wallets, block explorers, and other clients can subscribe to events in real time without polling — making them the primary way to react to on-chain activity.

## Defining an Event

Use `LogEvent` in your contract to declare an event with typed parameters:

```python
Transfer = LogEvent("Transfer", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float),
})
```

Each parameter entry has:

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | A type or tuple of types (`str`, `int`, `float`, `bool`, `decimal`) |
| `idx`  | No | If `True`, the parameter is indexed and searchable. Max **3 indexed** params per event. |

You can also use the shorthand forms:

- `"amount": int` instead of `{"type": int}`
- `"owner": indexed(str)` instead of `{"type": str, "idx": True}`

## Emitting an Event

Call the event object with a dict matching the declared params:

```python
@export
def transfer(amount: float, to: str):
    assert amount > 0, "Cannot send negative amount"
    assert balances[ctx.caller] >= amount, "Insufficient balance"

    balances[ctx.caller] -= amount
    balances[to] += amount

    Transfer({"from": ctx.caller, "to": to, "amount": amount})
```

The event is emitted only if the transaction succeeds. If the transaction fails (exception, out of chi, etc.), all events from that transaction are discarded along with the state changes.

## Complete Example: Token with Events

```python
balances = Hash(default_value=0)
approvals = Hash(default_value=0)
metadata = Hash()

Transfer = LogEvent("Transfer", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float),
})

Approve = LogEvent("Approve", {
    "owner": indexed(str),
    "spender": indexed(str),
    "amount": (int, float),
})

@construct
def seed():
    balances[ctx.caller] = 1_000_000
    metadata["token_name"] = "My Token"
    metadata["token_symbol"] = "MTK"

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Cannot send negative amount"
    assert balances[ctx.caller] >= amount, "Insufficient balance"

    balances[ctx.caller] -= amount
    balances[to] += amount

    Transfer({"from": ctx.caller, "to": to, "amount": amount})

@export
def approve(amount: float, to: str):
    assert amount >= 0, "Cannot approve negative amount"
    approvals[ctx.caller, to] = amount

    Approve({"owner": ctx.caller, "spender": to, "amount": amount})

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Cannot send negative amount"
    assert approvals[main_account, ctx.caller] >= amount, "Not enough approved"
    assert balances[main_account] >= amount, "Insufficient balance"

    approvals[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount

    Transfer({"from": main_account, "to": to, "amount": amount})
```

## Rules and Limits

- **Max 3 indexed parameters** per event. Indexed params are searchable via CometBFT's `/tx_search` and via WebSocket subscriptions.
- **Max 1024 bytes** per parameter value (UTF-8 encoded).
- **Types must be** `str`, `int`, `float`, `bool`, or `decimal` (ContractingDecimal).
- **At least one parameter** is required per event.
- **Non-indexed is the default**. Only indexed fields need `indexed(...)` or `idx: True`.
- **Events cost chi** - both indexed and non-indexed parameters incur write-meter costs during execution (25 meter units per encoded byte on tracer-backed execution).
- **Events are atomic** — if the transaction fails, all events are rolled back.
- **Event names are not globally unique**. Consumers should key by both `contract` and `event`.

## How Events Flow Through the System

```
Contract code
  │  Transfer({"from": "alice", "to": "bob", "amount": 100})
  ▼
LogEvent.write_event()
  │  Validates types, sizes, indexed count
  │  Charges chi cost
  │  Appends to driver.log_events
  ▼
Executor collects events
  │  On success: events included in tx output
  │  On failure: events discarded
  ▼
finalize_block (ABCI)
  │  Each event → standard ABCI Event protobuf
  │  Indexed params get index=true for CometBFT indexing
  ▼
CometBFT indexes the events
  │  Queryable via /tx_search
  │  Pushed to WebSocket subscribers
  ▼
Dashboard subscription manager
  │  Routes events to matching client subscriptions
  ▼
Your app / wallet / explorer
```

## Querying Events

### Via CometBFT RPC

After a transaction is finalized, you can search for it by event attributes:

```
GET /tx_search?query="Transfer.to='bob'"
GET /tx_search?query="Transfer.contract='currency' AND Transfer.from='alice'"
GET /tx_search?query="Approve.spender='dex_contract'"
```

Only indexed parameters (`idx: True`) are searchable this way.

### Via WebSocket Subscriptions

Connect to the dashboard WebSocket and subscribe to events in real time. See [WebSocket Subscriptions](/api/websockets) for the full API.

```javascript
const ws = new WebSocket("ws://localhost:8080/ws");

ws.onopen = () => {
    // Watch Transfer events on the currency contract
    ws.send(JSON.stringify({
        action: "subscribe",
        type: "event",
        contract: "currency",
        event: "Transfer",
    }));
};

ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === "contract_event") {
        console.log(`${data.event}: ${JSON.stringify(data.data)}`);
        // Transfer: {"from": "alice", "to": "bob", "amount": "100"}
    }
};
```

### Via Block Data Service (BDS)

If BDS is enabled, events become available through the node's indexed ABCI
query paths and, optionally, GraphQL. Those indexed reads are eventually
consistent with the latest finalized block because BDS ingests blocks
asynchronously after finalization.

Typical public query paths include:

```text
GET /api/abci_query/events/currency/Transfer/limit=50/offset=0
GET /api/abci_query/events_for_tx/<tx_hash>
```

Under the hood, BDS stores events in PostgreSQL with JSONB payloads and a GIN
index on indexed event data, which is what makes those richer filtered reads
possible. Direct SQL is an implementation detail and operator tool, not the
primary public API:

```sql
SELECT * FROM events
WHERE contract = 'currency'
  AND event = 'Transfer'
  AND data_indexed->>'to' = 'bob';
```

## Events vs State Changes

Events and state changes serve different purposes:

| | Events | State Changes |
|---|--------|--------------|
| **Purpose** | Signal that something happened | Persist new values |
| **Persistence** | In blocks and indexes, not in contract state | Written to contract storage |
| **Queryable** | By event name and indexed params | By state key |
| **Use case** | Notifications, activity feeds, audit logs | Account balances, ownership, contract data |
| **Cost** | write-meter cost | write-meter cost |

Use events when external observers need to know something happened. Use state when the contract itself needs to read the value later.
