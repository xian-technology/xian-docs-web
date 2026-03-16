# Estimating Stamps

Dry runs (simulated transactions) let you execute a contract function and see the results -- stamps used, return value, state changes -- without actually committing anything to the blockchain. This is essential for estimating transaction costs before submitting real transactions.

## ABCI Query: simulate_tx

Simulate a transaction via the ABCI query path:

```
GET /api/abci_query/simulate_tx/{hex_encoded_payload}
```

### Payload Format

The payload is a JSON object, hex-encoded:

```json
{
    "contract": "currency",
    "function": "transfer",
    "kwargs": {
        "amount": 100,
        "to": "recipient_address"
    },
    "sender": "sender_address"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `contract` | `str` | The target contract name |
| `function` | `str` | The exported function to call |
| `kwargs` | `dict` | Keyword arguments for the function |
| `sender` | `str` | The address to simulate as `ctx.caller` and `ctx.signer` |

### Encoding the Payload

Hex-encode the JSON string:

```python
import json

payload = {
    "contract": "currency",
    "function": "transfer",
    "kwargs": {"amount": 100, "to": "recipient_address"},
    "sender": "sender_address",
}

hex_payload = json.dumps(payload).encode().hex()
# Use this in the URL: /api/abci_query/simulate_tx/{hex_payload}
```

### Response

The response includes the execution result:

```json
{
    "stamps_used": 342,
    "result": null,
    "status_code": 0,
    "state": [
        {
            "key": "currency.balances:sender_address",
            "value": "999900"
        },
        {
            "key": "currency.balances:recipient_address",
            "value": "100"
        }
    ]
}
```

| Field | Description |
|-------|-------------|
| `stamps_used` | Total stamps the transaction would consume |
| `result` | The return value of the function (if any) |
| `status_code` | `0` for success, `1` for failure |
| `state` | Preview of state changes that would be made |

If the transaction would fail (assertion error, out of stamps), the response shows the error:

```json
{
    "stamps_used": 128,
    "result": "AssertionError: Insufficient balance",
    "status_code": 1,
    "state": []
}
```

## Using xian-py

The Python SDK provides a `simulate` method that handles encoding and decoding:

```python
from xian_py.wallet import Wallet
from xian_py.xian import Xian

wallet = Wallet()
xian = Xian("http://localhost:26657", "xian-testnet-1", wallet)

result = xian.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_address"},
)

print(f"Stamps needed: {result['stamps_used']}")
print(f"Would succeed: {result['status_code'] == 0}")
```

## Use Cases

### Estimating Transaction Cost

Before submitting a transaction, simulate it to know the stamp cost:

```python
result = xian.simulate(
    contract="con_dex",
    function="swap",
    kwargs={"token_in": "con_token_a", "amount": 1000},
)

stamps_needed = result["stamps_used"]
# Add a safety margin (10-20%) for state changes between simulation and execution
stamps_with_margin = int(stamps_needed * 1.2)
```

### Previewing State Changes

Check what state changes a transaction would make without committing them:

```python
result = xian.simulate(
    contract="con_game",
    function="attack",
    kwargs={"target": "monster_1"},
)

for change in result["state"]:
    print(f"  {change['key']} -> {change['value']}")
```

### Validating Transaction Inputs

Check if a transaction would succeed before spending stamps:

```python
result = xian.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 999999999, "to": "bob"},
)

if result["status_code"] != 0:
    print(f"Transaction would fail: {result['result']}")
else:
    # Safe to submit the real transaction
    xian.send_tx(
        contract="currency",
        function="transfer",
        kwargs={"amount": 999999999, "to": "bob"},
        stamps=result["stamps_used"] + 100,
    )
```

## Important Notes

- Dry runs execute against the **current committed state**. If other transactions change the state between your simulation and your actual submission, the results may differ.
- Dry runs do **not** check nonce or signature validity -- they only execute the contract logic.
- Dry runs do **not** deduct stamps or modify any on-chain state.
- The stamp count from a dry run is a close estimate but may vary slightly if state changes between simulation and execution.
