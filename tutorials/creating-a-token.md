# Creating a Fungible Token

This example implements the required XSC-0001 functions, separate balances and
allowances, display metadata, and transfer/approval events.

## Contract

```python
TOKEN_CODE = '''
balances = Hash(default_value=0)
approvals = Hash(default_value=0)
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
    metadata["token_logo_url"] = ""
    metadata["token_website"] = ""
    metadata["total_supply"] = 1_000_000
    metadata["operator"] = ctx.caller

@export
def change_metadata(key: str, value: Any):
    assert ctx.caller == metadata["operator"], "Only operator"
    assert key in [
        "token_name",
        "token_symbol",
        "token_logo_url",
        "token_website",
    ], "Metadata key is not editable"
    metadata[key] = value

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    assert to != "", "Recipient is required"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
    TransferEvent({"from": ctx.caller, "to": to, "amount": amount})

@export
def approve(amount: float, to: str):
    assert amount >= 0, "Amount must be non-negative"
    assert to != "", "Spender is required"
    approvals[ctx.caller, to] = amount
    ApproveEvent({"from": ctx.caller, "to": to, "amount": amount})

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert approvals[main_account, ctx.caller] >= amount, "Insufficient allowance"
    assert balances[main_account] >= amount, "Insufficient balance"
    approvals[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
    TransferEvent({"from": main_account, "to": to, "amount": amount})

@export
def balance_of(address: str) -> float:
    return balances[address]
'''
```

`approve` overwrites the existing allowance. `transfer_from` spends the
allowance stored at `approvals[owner, spender]`.

## Test Locally

```python
from contracting.local import ContractingClient

client = ContractingClient()
client.flush()
client.submit(TOKEN_CODE, name="con_example_token")
token = client.get_contract_proxy("con_example_token")

token.transfer(amount=100, to="alice")
assert token.balance_of(address="alice") == 100
assert token.balance_of(address="sys") == 999_900
```

Add failure tests for negative amounts, insufficient balances, allowance
limits, unauthorized metadata changes, and empty recipients.

## Deploy Source

```python
from xian_py import Wallet, Xian

wallet = Wallet(private_key="your_private_key_hex")
with Xian("http://127.0.0.1:26657", wallet=wallet) as client:
    result = client.deploy_contract(
        "con_example_token",
        TOKEN_CODE,
        args={"name": "Example Token", "symbol": "EXT"},
        chi=500_000,
        mode="checktx",
        wait_for_tx=True,
    )
```

Validators compile the submitted source. See
[XSC-0001](/smart-contracts/standards/xsc-0001) before adding extensions.
