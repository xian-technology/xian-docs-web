# WebSocket Subscriptions

The optional dashboard exposes `/ws` for live blocks, node status, state
changes, and contract events.

```js
const ws = new WebSocket("ws://127.0.0.1:8080/ws");
```

The stack and a directly started dashboard process use port `8080` by default.

## Message Types

| Type | Meaning |
| --- | --- |
| `new_block` | a committed block; broadcast to every client |
| `node_status` | dashboard connection status for the node |
| `state_change` | a subscribed state key changed |
| `contract_event` | a subscribed `LogEvent` was emitted |

Subscriptions are connection-local and must be recreated after reconnecting.

## State Subscriptions

```json
{"action":"subscribe","type":"state","key":"currency.balances:alice"}
```

Keys support `fnmatch` wildcards:

```json
{"action":"subscribe","type":"state","key":"currency.balances:*"}
```

Response message:

```json
{
  "type": "state_change",
  "key": "currency.balances:alice",
  "value": "999.5"
}
```

State values are encoded as strings; parse numeric values with a
precision-preserving client.

## Event Subscriptions

```json
{
  "action": "subscribe",
  "type": "event",
  "contract": "currency",
  "event": "Transfer"
}
```

Omit `event` for every event from the matching contract. Both fields support
wildcards.

```json
{
  "type": "contract_event",
  "contract": "currency",
  "event": "Transfer",
  "signer": "alice",
  "caller": "alice",
  "data": {"from":"alice","to":"bob","amount":"100"}
}
```

## Manage Subscriptions

```text
{"action":"list"}
{"action":"unsubscribe","type":"state","key":"currency.balances:alice"}
{"action":"unsubscribe","type":"event","contract":"currency","event":"Transfer"}
{"action":"unsubscribe_all"}
```

Every command returns `{"status":"ok", ...}` or
`{"status":"error", ...}`.

## Minimal Client

```js
const ws = new WebSocket("ws://127.0.0.1:8080/ws");

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({
    action: "subscribe",
    type: "event",
    contract: "currency",
    event: "Transfer",
  }));
});

ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.type === "contract_event") {
    console.log(message.data);
  }
});
```

## Limits and Delivery

The dashboard applies configurable limits for total clients, clients per
address, state and event subscriptions, inbound message size, and queued
outbound messages. A slow consumer can lose its connection; reconnect and
resubscribe.

This feed is live and non-durable. Use BDS event IDs and SDK watchers when an
application must resume without missing events.

The dashboard is outside consensus. Restarting it drops subscriptions but does
not affect block production.

## Related Pages

- [BDS Indexed Queries](/api/bds)
- [xian-py](/tools/xian-py)
- [xian-js](/tools/xian-js)
