# Deploying and Interacting with a Contract

The simplest path is:

1. test locally with `xian-contracting`
2. submit with `xian-py`
3. inspect state and transaction results through the node APIs

## Submit a Contract

```python
from xian_py import Wallet, Xian

wallet = Wallet(private_key="YOUR_PRIVATE_KEY")
client = Xian("http://127.0.0.1:26657", wallet=wallet)

code = """
balances = Hash(default_value=0)

@construct
def seed():
    balances[ctx.caller] = 1_000_000

@export
def balance_of(address: str) -> float:
    return balances[address]
"""

result = client.submit_contract(
    name="con_example",
    code=code,
    stamps=500_000,
)
```

Contract names must start with a lowercase ASCII letter and then use only
lowercase ASCII letters, digits, and underscores. User-submitted contracts
should keep the `con_` prefix, so names like `con_example_token` are valid
while names like `con-example`, `con.example`, or `1con_bad` are rejected.

## Simulate Before You Send

```python
preview = client.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "bob"},
)
```

## Read Back State

```python
balance = client.get_state("currency", "balances", wallet.public_key)
source = client.get_contract("con_example")
```

## Inspect Through the Dashboard

If the dashboard service is running, you can also use:

- `/api/status`
- `/api/tx/<hash>`
- `/api/contract/<name>`
- `/api/abci_query/...`
