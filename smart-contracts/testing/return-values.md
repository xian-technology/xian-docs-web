# Inspecting Return Values & Events

When you call a contract function through `ContractingClient`, the return value comes back directly. You can also inspect the full execution output including events and state changes.

## Return Values

Calling an exported function on a contract handle returns whatever the function returns:

```python
def my_contract():
    balances = Hash(default_value=0)

    @construct
    def seed():
        balances[ctx.caller] = 1000

    @export
    def balance_of(address: str):
        return balances[address]

    @export
    def transfer(amount: decimal, to: str):
        balances[ctx.caller] -= amount
        balances[to] += amount
        return True

client = ContractingClient(vm_profile="xian_vm_v2")
client.flush()
client.submit(my_contract, name="con_test")
contract = client.get_contract_proxy("con_test")

# Return value comes back directly
balance = contract.balance_of(address="sys")
assert balance == 1000

result = contract.transfer(to="alice", amount=100)
assert result is True
```

Functions that do not have an explicit `return` statement return `None`:

```python
@export
def set_value(key: str, value: str):
    data[key] = value
    # no return statement

result = contract.set_value(key="name", value="test")
assert result is None
```

## Checking Events

When a contract emits events via `LogEvent`, you can inspect them through the execution output. Pass `return_full_output=True` to get the complete result dictionary instead of just the return value:

```python
def token_with_events():
    balances = Hash(default_value=0)

    Transfer = LogEvent("Transfer", {
        "from": indexed(str),
        "to": indexed(str),
        "amount": (int, decimal),
    })

    @construct
    def seed():
        balances[ctx.caller] = 1000

    @export
    def transfer(amount: decimal, to: str):
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount
        Transfer({"from": ctx.caller, "to": to, "amount": amount})

client = ContractingClient(vm_profile="xian_vm_v2")
client.flush()
client.submit(token_with_events, name="con_token")
token = client.get_contract_proxy("con_token")

output = token.transfer(to="alice", amount=100, return_full_output=True)

assert output["status_code"] == 0
assert output["result"] is None
assert output["events"][0]["event"] == "Transfer"
assert output["events"][0]["data_indexed"]["to"] == "alice"
```

When `return_full_output=True` is passed to a contract call, failed calls return
the failure output dictionary instead of raising `AssertionError`.

## Testing Return Values in Assertions

```python
import unittest

class TestReturnValues(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient(vm_profile="xian_vm_v2")
        self.client.flush()
        self.client.submit(my_contract, name="con_test")
        self.contract = self.client.get_contract_proxy("con_test")

    def test_balance_returns_correct_value(self):
        balance = self.contract.balance_of(address="sys")
        self.assertEqual(balance, 1000)

    def test_unknown_address_returns_default(self):
        balance = self.contract.balance_of(address="nobody")
        self.assertEqual(balance, 0)

    def test_transfer_returns_true(self):
        result = self.contract.transfer(to="alice", amount=50)
        self.assertTrue(result)
```

## Numeric Return Types

The native local Python client returns an exact decimal object. Raw ABCI simulation and transaction results instead carry a `__fixed__` wrapper for the same value and a `__big_int__` wrapper for an integer outside the JSON safe range. Compare it with an integer or
an off-chain `Decimal` created from text.

```python
from decimal import Decimal

balance = contract.balance_of(address="sys")
assert balance == Decimal("1000")
```

See [Numbers, division and rounding](/smart-contracts/numbers) for result limits and rounding.

## Handling Failures

When an assertion fails inside a contract, the call raises an `AssertionError` in your test:

```python
def test_transfer_fails_on_insufficient_balance(self):
    with self.assertRaises(AssertionError) as cm:
        self.contract.transfer(to="alice", amount=100, signer="broke_user")
    self.assertIn("Insufficient balance", str(cm.exception))
```

State changes from a failed transaction are rolled back, just like on-chain execution.
