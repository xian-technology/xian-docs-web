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
    def transfer(to: str, amount: float):
        balances[ctx.caller] -= amount
        balances[to] += amount
        return True

client = ContractingClient()
client.flush()
client.submit(my_contract, name="con_test")
contract = client.get_contract("con_test")

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
        "amount": (int, float),
    })

    @construct
    def seed():
        balances[ctx.caller] = 1000

    @export
    def transfer(to: str, amount: float):
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount
        Transfer({"from": ctx.caller, "to": to, "amount": amount})

client = ContractingClient()
client.flush()
client.submit(token_with_events, name="con_token")
token = client.get_contract("con_token")
```

## Testing Return Values in Assertions

```python
import unittest

class TestReturnValues(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(my_contract, name="con_test")
        self.contract = self.client.get_contract("con_test")

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

Decimal-backed values are returned as `ContractingDecimal` objects. In normal
contract code, these usually come from values annotated or written with `float`
syntax:

```python
balance = contract.balance_of(address="sys")
# balance is a ContractingDecimal, but comparisons work
assert balance == 1000
assert balance >= 500
assert float(balance) == 1000.0
```

Current decimal policy:

- up to `61` whole digits
- up to `30` fractional digits
- extra fractional digits are truncated toward zero
- values outside the supported range raise an overflow error

## Handling Failures

When an assertion fails inside a contract, the call raises an `AssertionError` in your test:

```python
def test_transfer_fails_on_insufficient_balance(self):
    self.client.signer = "broke_user"
    with self.assertRaises(AssertionError) as cm:
        self.contract.transfer(to="alice", amount=100)
    self.assertIn("Insufficient balance", str(cm.exception))
```

State changes from a failed transaction are rolled back, just like on-chain execution.
