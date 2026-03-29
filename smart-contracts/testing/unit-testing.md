# Unit Testing with ContractingClient

`ContractingClient` is the primary tool for testing Xian smart contracts locally. It simulates the on-chain environment with an in-memory state database, letting you submit contracts, call functions, inspect state, and switch signers.

## Setup

Install the contracting library:

```bash
pip install xian-tech-contracting
```

Create your test file:

```python
import unittest
from contracting.client import ContractingClient

class TestMyContract(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()  # clear all state between tests

    def tearDown(self):
        self.client.flush()
```

## Constructor

```python
client = ContractingClient(signer="sys")
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `signer` | `str` | `"sys"` | Default transaction signer for all operations |

The `signer` sets the default `ctx.caller` and `ctx.signer` for all contract calls made through this client.

## Submitting Contracts

### submit()

Submit a contract to the local environment:

```python
client.submit(f, name="con_my_contract", constructor_args={})
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `f` | function | A Python function whose source code is the contract |
| `name` | `str` | The on-chain name for the contract |
| `constructor_args` | `dict` | Arguments passed to the `@construct` function |

The function `f` is not called directly. Its **source code** is extracted, compiled, and executed in the sandbox. This means you define your contract as a regular Python function:

```python
def my_token():
    balances = Hash(default_value=0)
    owner = Variable()

    @construct
    def seed(initial_supply=1000000):
        balances[ctx.caller] = initial_supply
        owner.set(ctx.caller)

    @export
    def transfer(to: str, amount: float):
        assert amount > 0, "Amount must be positive"
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount

    @export
    def balance_of(address: str):
        return balances[address]

client.submit(my_token, name="con_my_token", constructor_args={"initial_supply": 500000})
```

If you use the lower-level storage API directly:

```python
from contracting.storage.contract import Contract

Contract(driver=client.raw_driver).submit(
    name="con_fixture",
    code=source,
    constructor_args={"initial_supply": 500000},
)
```

the deployment and its `@construct` writes use that same driver. That keeps
constructor state visible to the rest of the current test client instead of
writing into a separate temporary driver.

## Getting a Contract Handle

### get_contract()

Returns a contract object you can call functions on:

```python
contract = client.get_contract("con_my_token")
```

Call exported functions directly on the handle:

```python
contract.transfer(to="bob", amount=100)
balance = contract.balance_of(address="bob")
```

## Reading and Writing State

### get_var()

Read a state variable directly:

```python
# Read a Variable
owner = client.get_var("con_my_token", "owner")

# Read a Hash entry
balance = client.get_var("con_my_token", "balances", arguments=["alice"])

# Read a multi-dimensional Hash entry
approval = client.get_var("con_my_token", "approvals", arguments=["alice", "bob"])
```

### set_var()

Write a state variable directly (useful for test setup):

```python
# Set a Variable
client.set_var("con_my_token", "owner", value="new_owner")

# Set a Hash entry
client.set_var("con_my_token", "balances", arguments=["alice"], value=1000)
```

## Changing the Signer

### signer property

Change who is signing transactions:

```python
# Default signer is "sys"
contract.transfer(to="bob", amount=100)  # ctx.caller = "sys"

# Change signer
client.signer = "alice"
contract.transfer(to="bob", amount=50)   # ctx.caller = "alice"

# Change again
client.signer = "bob"
contract.transfer(to="carol", amount=25) # ctx.caller = "bob"
```

## Flushing State

### flush()

Clear all contracts and state from the local environment:

```python
client.flush()
```

Always call `flush()` in `setUp()` or `tearDown()` to isolate tests from each other.

## Complete Example

A full unittest file testing a token contract:

```python
import unittest
from contracting.client import ContractingClient


def token_contract():
    balances = Hash(default_value=0)
    metadata = Hash()

    @construct
    def seed():
        balances[ctx.caller] = 1_000_000
        metadata["name"] = "Test Token"
        metadata["symbol"] = "TST"

    @export
    def transfer(to: str, amount: float):
        assert amount > 0, "Amount must be positive"
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount

    @export
    def balance_of(address: str):
        return balances[address]

    @export
    def approve(to: str, amount: float):
        assert amount > 0, "Amount must be positive"
        balances[ctx.caller, to] += amount

    @export
    def transfer_from(to: str, amount: float, main_account: str):
        assert amount > 0, "Amount must be positive"
        assert balances[main_account, ctx.caller] >= amount, "Not enough approved"
        assert balances[main_account] >= amount, "Insufficient balance"
        balances[main_account, ctx.caller] -= amount
        balances[main_account] -= amount
        balances[to] += amount


class TestToken(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(token_contract, name="con_token")
        self.token = self.client.get_contract("con_token")

    def tearDown(self):
        self.client.flush()

    def test_initial_balance(self):
        # Constructor runs as "sys" (default signer)
        balance = self.token.balance_of(address="sys")
        self.assertEqual(balance, 1_000_000)

    def test_transfer(self):
        self.token.transfer(to="alice", amount=1000)
        self.assertEqual(self.token.balance_of(address="alice"), 1000)
        self.assertEqual(self.token.balance_of(address="sys"), 999_000)

    def test_transfer_insufficient_balance(self):
        with self.assertRaises(AssertionError):
            self.client.signer = "alice"
            self.token.transfer(to="bob", amount=100)

    def test_transfer_negative_amount(self):
        with self.assertRaises(AssertionError):
            self.token.transfer(to="alice", amount=-10)

    def test_approve_and_transfer_from(self):
        # sys approves alice to spend 500
        self.token.approve(to="alice", amount=500)

        # alice transfers from sys to bob
        self.client.signer = "alice"
        self.token.transfer_from(to="bob", amount=200, main_account="sys")

        self.assertEqual(self.token.balance_of(address="bob"), 200)
        self.assertEqual(self.token.balance_of(address="sys"), 999_800)

    def test_transfer_from_exceeds_allowance(self):
        self.token.approve(to="alice", amount=100)

        self.client.signer = "alice"
        with self.assertRaises(AssertionError):
            self.token.transfer_from(to="bob", amount=200, main_account="sys")

    def test_metadata(self):
        name = self.client.get_var("con_token", "metadata", arguments=["name"])
        symbol = self.client.get_var("con_token", "metadata", arguments=["symbol"])
        self.assertEqual(name, "Test Token")
        self.assertEqual(symbol, "TST")

    def test_direct_state_manipulation(self):
        # Directly set a balance for test setup
        self.client.set_var("con_token", "balances", arguments=["charlie"], value=9999)
        self.assertEqual(self.token.balance_of(address="charlie"), 9999)


if __name__ == "__main__":
    unittest.main()
```

Run the tests:

```bash
python -m pytest test_token.py -v
```

Or with unittest:

```bash
python -m unittest test_token.py -v
```
