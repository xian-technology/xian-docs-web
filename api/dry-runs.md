# Estimating Chi

Xian supports dry runs through the `simulate_tx` ABCI query path. This executes
contract logic against the node's committed application state and then drops
the simulated writes.

Operationally, the node handles dry runs through a bounded subprocess worker so
free simulation does not run inside the main validator execution path.

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

```mermaid
flowchart TD
  SDK["SDK or caller builds JSON payload"]
  Encode["Hex-encode simulate_tx payload"]
  Query["CometBFT abci_query"]
  Worker["Bounded simulation subprocess"]
  Runtime["xian_vm_v2 against committed application state"]
  Drop["Drop simulated writes"]
  Result["Return status, chi_used, result, and write preview"]

  SDK --> Encode
  Encode --> Query
  Query --> Worker
  Worker --> Runtime
  Runtime --> Drop
  Drop --> Result
```

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

The simulator returns:

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
      "value": {"__fixed__": "999900"}
    }
  ],
  "chi_used": 342,
  "result": null
}
```

Key fields:

- `status`: `0` for success, `1` for failure
- `chi_used`: estimated chi consumed
- `state`: preview of writes that would occur
- `result` contains the return value or a failure description. The raw ABCI response uses `{"__fixed__":"1.25"}` for a decimal and `{"__big_int__":"9007199254740993"}` for a wide integer, `{"__delta__":[1,0]}` for a timedelta and `{"__bytearray__":"00ff"}` for a bytearray, including inside write previews and nested objects. Tuples become arrays. Persistable sets retain their `__set__` or `__frozenset__` envelope. If a returned dictionary has a non-string key at any nesting depth, V2 reports a failed call and discards its writes and events.

The Python and JavaScript SDKs decode the raw envelope according to their result types. MCP presents decimals as strings. See [Numeric wire values](/smart-contracts/numbers#transactions-and-sdks).

When the node refuses or aborts a dry run, you get the same envelope with
`status = 1`. Typical operator-controlled failure cases are:

- simulation disabled on this node
- simulation capacity exceeded on this node
- simulation timed out on this node
- simulation chi budget exceeded during readonly execution (the budget is the
  smaller of the node's `simulation_max_chi` and the chain's `max_tx_chi`)

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
print(result["chi_used"])
print(result["state"])
```

## Important Caveats

- dry runs do not commit writes
- dry runs are estimates against the node's current state view, not a predicted
  later state
- simulation does not authenticate the supplied sender or prove that a nonce
  or signature will pass transaction admission
- cost estimation does not reserve the eventual transaction's fee budget;
  a paid transaction sees its balance after that reservation, so an estimate
  cannot establish affordability or guarantee the same balance-dependent result
- state can change between simulation and real submission
- the node serializes queries with state transitions and keeps finalized,
  uncommitted block writes separate from the query view
- block metadata is supplied by the simulator; values derived from time,
  height, or randomness are not a prediction of the eventual transaction block
- `simulate_tx` is free compute, so operators should not expose it as an
  unrestricted public validator RPC endpoint
- if you expose dry runs to users, front them with gateway-level protections
  such as rate limiting, request timeouts, concurrency caps, and preferably a
  dedicated BDS-backed or API tier

## Operator Controls

Readonly simulation is node-local and configurable as top-level keys in
`config/xian.toml`:

```toml
simulation_enabled = true
simulation_max_concurrency = 2
simulation_timeout_ms = 3000
simulation_max_chi = 1000000
```

What these keys do:

- `simulation_enabled`: turn the `simulate_tx` query path on or off
- `simulation_max_concurrency`: maximum concurrent dry runs accepted by this node
- `simulation_timeout_ms`: wall-clock timeout for one dry run worker
- `simulation_max_chi`: operator cap on the readonly chi budget

The node simulates with `min(simulation_max_chi, max_tx_chi)`, where
`max_tx_chi` is the chain's per-transaction cap from the genesis fee policy
(200,000 chi by default). `simulation_max_chi` can therefore only lower the
budget; a dry run never reports success for more chi than a submitted
transaction may supply. A governed change to the fee policy applies to
simulation once it is committed. See
[Chain Chi Caps](/concepts/chi#chain-chi-caps).

See [Runtime Features](/node/runtime-features) for the operator-facing runtime
reference and [Node Profiles](/node/profiles) for the high-level `xian-cli`
profile flow.
