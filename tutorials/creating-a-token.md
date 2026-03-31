# Creating a Fungible Token

This tutorial builds a minimal XSC-0001-compatible fungible token and shows the
parts that matter for the current runtime: balances, allowances, events, and a
basic local deployment flow.

## The Standard Surface

The core token interface is:

```python
@export
def transfer(amount: float, to: str):
    ...

@export
def approve(amount: float, to: str):
    ...

@export
def transfer_from(amount: float, to: str, main_account: str):
    ...

@export
def balance_of(address: str) -> float:
    ...
```

## Step 1: Declare State

```python
balances = Hash(default_value=0)
metadata = Hash()

TransferEvent = LogEvent("Transfer", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float, decimal),
})

ApproveEvent = LogEvent("Approve", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float, decimal),
})
```

`balances[address]` stores token balances. `balances[owner, spender]` stores
allowances.

## Step 2: Seed Metadata And Initial Supply

```python
@construct
def seed(name: str = "Example Token", symbol: str = "EXT"):
    balances[ctx.caller] = 1_000_000
    metadata["token_name"] = name
    metadata["token_symbol"] = symbol
    metadata["operator"] = ctx.caller
```

## Step 3: Implement Transfers

```python
@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"

    balances[ctx.caller] -= amount
    balances[to] += amount

    TransferEvent({"from": ctx.caller, "to": to, "amount": amount})
```

## Step 4: Implement Allowances

Current Xian token contracts treat `approve` as an overwrite, not an additive
increment:

```python
@export
def approve(amount: float, to: str):
    assert amount >= 0, "Cannot approve negative balances"
    balances[ctx.caller, to] = amount

    ApproveEvent({"from": ctx.caller, "to": to, "amount": amount})
```

## Step 5: Implement transfer_from

```python
@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert balances[main_account, ctx.caller] >= amount, "Insufficient allowance"
    assert balances[main_account] >= amount, "Insufficient balance"

    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount

    TransferEvent({"from": main_account, "to": to, "amount": amount})
```

## Step 6: Add A Read API

```python
@export
def balance_of(address: str) -> float:
    return balances[address]
```

Return annotations like `-> float` are valid in the current linter as long as
they use the normal export allowlist.

## Complete Contract

```python
balances = Hash(default_value=0)
metadata = Hash()

TransferEvent = LogEvent("Transfer", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float, decimal),
})

ApproveEvent = LogEvent("Approve", {
    "from": indexed(str),
    "to": indexed(str),
    "amount": (int, float, decimal),
})

@construct
def seed(name: str = "Example Token", symbol: str = "EXT"):
    balances[ctx.caller] = 1_000_000
    metadata["token_name"] = name
    metadata["token_symbol"] = symbol
    metadata["operator"] = ctx.caller

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
    TransferEvent({"from": ctx.caller, "to": to, "amount": amount})

@export
def approve(amount: float, to: str):
    assert amount >= 0, "Cannot approve negative balances"
    balances[ctx.caller, to] = amount
    ApproveEvent({"from": ctx.caller, "to": to, "amount": amount})

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert balances[main_account, ctx.caller] >= amount, "Insufficient allowance"
    assert balances[main_account] >= amount, "Insufficient balance"
    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
    TransferEvent({"from": main_account, "to": to, "amount": amount})

@export
def balance_of(address: str) -> float:
    return balances[address]
```

## Local Test

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()
client.submit(token_contract, name="con_example_token")
token = client.get_contract("con_example_token")

assert token.balance_of(address="sys") == 1_000_000
token.transfer(amount=100, to="alice")
assert token.balance_of(address="alice") == 100
```

## Deploy With xian-py

```python
from xian_py import Wallet, Xian

wallet = Wallet(private_key="your_private_key_hex")
client = Xian("http://127.0.0.1:26657", wallet=wallet)

result = client.submit_contract(
    name="con_example_token",
    code=TOKEN_CODE,
    args={"name": "Example Token", "symbol": "EXT"},
    stamps=500_000,
)
```

After deployment, you can query balances or submit token transfers through the
same client.

## Next Steps

- add XSC-0002 permit support if you want signature-based approvals
- add metadata governance controls for the operator
- write tests for zero, negative, unauthorized, and allowance edge cases
