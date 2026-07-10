# Events

Events are structured signals emitted during contract execution. Use them for
activity feeds, notifications, and audit trails; use storage when the contract
must read a value later.

## Define and Emit

```python
TransferEvent = LogEvent(
    "Transfer",
    {
        "from": indexed(str),
        "to": indexed(str),
        "amount": (int, float, decimal),
    },
)

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"

    balances[ctx.caller] -= amount
    balances[to] += amount
    TransferEvent({"from": ctx.caller, "to": to, "amount": amount})
```

Indexed fields can be filtered by CometBFT event search. Keep indexing limited
to fields applications actually query.

## Rules

- declare `LogEvent` at module scope
- give every event a stable name and field schema
- pass one dictionary matching that schema when emitting
- use deterministic contract types
- failed transactions discard their events with their writes
- event emission consumes chi

## Read Events

CometBFT search can filter indexed attributes:

```text
GET /tx_search?query="Transfer.to='bob'"
```

The dashboard WebSocket provides live, non-durable delivery:

```json
{"action":"subscribe","type":"event","contract":"currency","event":"Transfer"}
```

BDS provides durable indexed history and cursors:

```text
/events/currency/Transfer/limit=50/after_id=0
/events_for_tx/<tx_hash>
```

BDS is eventually consistent with finalized state. Use the event ID cursor for
resumable consumers.

## Events vs. State

| Events | State |
| --- | --- |
| describe that an action occurred | stores values used by later contract calls |
| live and indexed-history consumption | direct current-state queries |
| discarded on failed execution | writes rolled back on failed execution |

Events are not a substitute for balances, ownership, or authorization state.

## Related Pages

- [WebSocket Subscriptions](/api/websockets)
- [BDS Indexed Queries](/api/bds)
- [Inspecting Return Values and Events](/smart-contracts/testing/return-values)
