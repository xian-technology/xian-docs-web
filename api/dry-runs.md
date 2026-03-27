# Estimating Stamps

Xian supports dry runs through the `simulate_tx` ABCI query path. This executes
contract logic against the current committed state and then restores the
underlying driver state.

## Query Path

Low-level path:

```text
/simulate_tx/<hex_encoded_payload>
```

Dashboard form:

```text
GET /api/abci_query/simulate_tx/<hex_encoded_payload>
```

The SDK usually talks to the underlying CometBFT RPC `abci_query` endpoint
directly.

## Payload Shape

The payload is JSON, encoded to hex:

```json
{
  "sender": "sender_public_key",
  "contract": "currency",
  "function": "transfer",
  "kwargs": {
    "amount": 100,
    "to": "recipient_public_key"
  }
}
```

## Response Shape

The current simulator returns:

```json
{
  "payload": {
    "sender": "sender_public_key",
    "contract": "currency",
    "function": "transfer",
    "kwargs": {
      "amount": 100,
      "to": "recipient_public_key"
    }
  },
  "status": 0,
  "state": [
    {
      "key": "currency.balances:sender_public_key",
      "value": "999900"
    }
  ],
  "stamps_used": 342,
  "result": "None"
}
```

Key fields:

- `status`: `0` for success, `1` for failure
- `stamps_used`: estimated stamps consumed
- `state`: preview of writes that would occur
- `result`: safe string representation of the function result or failure

## SDK Example

```python
from xian_py import Wallet, Xian

wallet = Wallet()
client = Xian("http://127.0.0.1:26657", wallet=wallet)

result = client.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_public_key"},
)

print(result["status"])
print(result["stamps_used"])
print(result["state"])
```

## Important Caveats

- dry runs do not commit writes
- dry runs are estimates against the current committed state, not a future state
- nonce/signature admission rules are not the focus of the simulator itself
- state can change between simulation and real submission
- `simulate_tx` executes in-process on the node, so operators should not expose
  it as unrestricted public compute on validator RPC endpoints
- if you expose dry runs to users, front them with gateway-level protections
  such as rate limiting, request timeouts, concurrency caps, and preferably a
  dedicated service-node or API tier
