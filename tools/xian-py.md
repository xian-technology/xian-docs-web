# xian-py

`xian-py` is the external Python SDK for talking to a Xian node.

## Installation

Base install:

```bash
pip install xian-py
```

Optional extras:

```bash
pip install "xian-py[hd]"   # mnemonic / HD wallet support
pip install "xian-py[eth]"  # Ethereum wallet helpers
```

## Public API

The intended top-level imports are:

```python
from xian_py import Wallet, Xian, XianAsync, XianException, run_sync, to_contract_time
```

`HDWallet` and `EthereumWallet` live in `xian_py.wallet`; they are optional
helpers, not part of the small top-level API.

## Wallets

### Basic Wallet

```python
from xian_py import Wallet

wallet = Wallet()
print(wallet.public_key)
print(wallet.private_key)
```

Restore from an existing private key:

```python
wallet = Wallet(private_key="your_private_key_hex")
```

### HD Wallet

```python
from xian_py.wallet import HDWallet

wallet = HDWallet()
print(wallet.mnemonic_str)
child = wallet.get_wallet([0, 0])
print(child.public_key)
```

HD wallet support requires `xian-py[hd]`.

## Synchronous Client

```python
from xian_py import Wallet, Xian

wallet = Wallet()
client = Xian("http://127.0.0.1:26657", wallet=wallet)
```

Constructor parameters:

- `node_url`
- optional `chain_id`
- optional `wallet`

If `chain_id` is omitted, the client fetches it from the node.

## Async Client

```python
import asyncio
from xian_py import Wallet, XianAsync

async def main():
    wallet = Wallet()
    async with XianAsync("http://127.0.0.1:26657", wallet=wallet) as client:
        return await client.get_balance(wallet.public_key)

asyncio.run(main())
```

Use `XianAsync` directly inside async code. The sync wrapper intentionally
raises if you call it from an already-running event loop.

## Common Methods

### get_balance

```python
balance = client.get_balance(address=wallet.public_key)
balance = client.get_balance(contract="currency")
```

### get_state

`get_state` takes the contract name, variable name, and zero or more key parts:

```python
value = client.get_state("currency", "balances", wallet.public_key)
allowance = client.get_state("currency", "balances", wallet.public_key, "con_dex")
```

### get_contract

```python
source = client.get_contract("currency")
clean_source = client.get_contract("currency", clean=True)
```

### send_tx

```python
result = client.send_tx(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_public_key"},
    stamps=50_000,
)
```

### send

`send` is a convenience wrapper for token transfers:

```python
result = client.send(
    amount=100,
    to_address="recipient_public_key",
    token="currency",
    stamps=50_000,
)
```

### approve

`approve` is a convenience wrapper that approves another contract to spend a
token on behalf of the wallet:

```python
result = client.approve(
    contract="con_dex",
    token="currency",
    amount=1_000,
)
```

### get_approved_amount

```python
amount = client.get_approved_amount("con_dex", token="currency")
```

### simulate

```python
result = client.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_public_key"},
)

print(result["status"])
print(result["stamps_used"])
print(result["state"])
```

The dry-run result currently comes from the node simulator and uses:

- `status`
- `stamps_used`
- `state`
- `result`
- `payload`

### submit_contract

```python
code = """
counter = Variable()

@construct
def seed():
    counter.set(0)

@export
def increment() -> int:
    counter.set(counter.get() + 1)
    return counter.get()
"""

result = client.submit_contract(
    name="con_counter",
    code=code,
    args={},
    stamps=500_000,
)
```

## Other Helpers

Also available:

- `get_tx(tx_hash)`
- `get_nodes()`
- `get_genesis()`
- `get_chain_id()`

See the repo README for package-level development and compatibility notes.
