# xian-py

`xian-py` is the official Python SDK for interacting with the Xian blockchain. It handles wallet management, transaction building and signing, state queries, and contract deployment.

## Installation

```bash
pip install xian-py
```

## Wallet Management

### Creating a New Wallet

```python
from xian_py.wallet import Wallet

# Generate a new random wallet
wallet = Wallet()

print(wallet.public_key)   # Ed25519 public key (hex string)
print(wallet.private_key)  # Ed25519 private key (hex string)
```

### Restoring from Private Key

```python
from xian_py.wallet import Wallet

wallet = Wallet(private_key="your_private_key_hex")
```

### HD Wallet with Mnemonic

For BIP-39 mnemonic-based key derivation:

```python
from xian_py.wallet import HDWallet

# Generate a new HD wallet with a mnemonic
hd_wallet = HDWallet()
print(hd_wallet.mnemonic)     # 24-word mnemonic phrase
print(hd_wallet.public_key)   # derived public key
print(hd_wallet.private_key)  # derived private key

# Restore from mnemonic
hd_wallet = HDWallet(mnemonic="your twenty four word mnemonic phrase ...")
```

## Xian Client

The `Xian` class is the main interface for interacting with a node:

```python
from xian_py.wallet import Wallet
from xian_py.xian import Xian

wallet = Wallet(private_key="your_private_key_hex")
xian = Xian(
    node_url="http://localhost:26657",
    chain_id="xian-testnet-1",
    wallet=wallet,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `node_url` | `str` | CometBFT RPC endpoint |
| `chain_id` | `str` | Network chain identifier |
| `wallet` | `Wallet` | Wallet for signing transactions |

## Methods

### send()

Send TAU (the native currency) to an address:

```python
result = xian.send(
    amount=100,
    to="recipient_public_key_hex",
    stamps=50000,
)
```

### send_tx()

Send a general transaction to any contract function:

```python
result = xian.send_tx(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_address"},
    stamps=50000,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `contract` | `str` | Target contract name |
| `function` | `str` | Exported function to call |
| `kwargs` | `dict` | Keyword arguments for the function |
| `stamps` | `int` | Maximum stamps to spend |

### submit_contract()

Deploy a new contract to the network:

```python
code = """
balances = Hash(default_value=0)

@construct
def seed():
    balances[ctx.caller] = 1_000_000

@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
"""

result = xian.submit_contract(
    name="con_my_token",
    code=code,
    stamps=500000,
)
```

### get_balance()

Get the TAU balance for an address:

```python
balance = xian.get_balance(address="public_key_hex")
print(balance)  # e.g., 1000.0
```

### get_state()

Read a state value by its full key:

```python
value = xian.get_state(
    contract="currency",
    variable="balances",
    arguments=["alice"],
)
print(value)  # e.g., 500
```

### get_contract()

Retrieve the source code of a deployed contract:

```python
source = xian.get_contract(name="currency")
print(source)
```

### approve()

Approve another address or contract to spend TAU on your behalf:

```python
result = xian.approve(
    amount=1000,
    to="con_dex",
    stamps=50000,
)
```

### simulate()

Simulate a transaction without committing state changes:

```python
result = xian.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_address"},
)

print(f"Stamps needed: {result['stamps_used']}")
print(f"Success: {result['status_code'] == 0}")
```

## Complete Example

A full workflow: create a wallet, connect to the network, check balance, and send a transaction:

```python
from xian_py.wallet import Wallet
from xian_py.xian import Xian

# Create or restore a wallet
wallet = Wallet(private_key="your_64_char_hex_private_key")

# Connect to a node
xian = Xian(
    node_url="http://localhost:26657",
    chain_id="xian-testnet-1",
    wallet=wallet,
)

# Check balance
balance = xian.get_balance(address=wallet.public_key)
print(f"Balance: {balance} TAU")

# Simulate a transfer first
sim = xian.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 50, "to": "recipient_public_key"},
)
print(f"Estimated stamps: {sim['stamps_used']}")

if sim["status_code"] == 0:
    # Execute the real transaction with a safety margin
    result = xian.send_tx(
        contract="currency",
        function="transfer",
        kwargs={"amount": 50, "to": "recipient_public_key"},
        stamps=sim["stamps_used"] + 1000,
    )
    print(f"Transaction hash: {result['hash']}")
else:
    print(f"Transaction would fail: {sim['result']}")
```

## Deploying a Contract

```python
from xian_py.wallet import Wallet
from xian_py.xian import Xian

wallet = Wallet(private_key="your_private_key")
xian = Xian("http://localhost:26657", "xian-testnet-1", wallet)

contract_code = """
counter = Variable()

@construct
def seed():
    counter.set(0)

@export
def increment():
    counter.set(counter.get() + 1)
    return counter.get()

@export
def get_count():
    return counter.get()
"""

result = xian.submit_contract(
    name="con_counter",
    code=contract_code,
    stamps=500000,
)

print(f"Deployed: {result['hash']}")

# Now call the contract
result = xian.send_tx(
    contract="con_counter",
    function="increment",
    kwargs={},
    stamps=50000,
)
```
