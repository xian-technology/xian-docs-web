# Testing Multi-Contract Interactions

Many contracts depend on other contracts -- a DEX imports a token, a game imports a currency, a governance contract imports a staking module. `ContractingClient` handles this by letting you submit multiple contracts and test their interactions.

## The Key Rule

Submit contracts in dependency order. If contract B imports contract A, submit A first.

## Basic Example: DEX Importing a Token

### Define the Token Contract

```python
def token_contract():
    balances = Hash(default_value=0)

    @construct
    def seed():
        balances[ctx.caller] = 1_000_000

    @export
    def transfer(amount: float, to: str):
        assert amount > 0, "Amount must be positive"
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount

    @export
    def approve(amount: float, to: str):
        assert amount > 0, "Amount must be positive"
        balances[ctx.caller, to] += amount

    @export
    def transfer_from(amount: float, to: str, main_account: str):
        assert amount > 0, "Amount must be positive"
        assert balances[main_account, ctx.caller] >= amount, "Not enough approved"
        assert balances[main_account] >= amount, "Insufficient balance"
        balances[main_account, ctx.caller] -= amount
        balances[main_account] -= amount
        balances[to] += amount

    @export
    def balance_of(address: str):
        return balances[address]
```

### Define the DEX Contract

The DEX imports the token by name. The `import` statement in the contract source references the name the token was submitted under:

```python
def dex_contract():
    import con_token

    pools = Hash(default_value=0)

    @export
    def deposit(amount: float):
        con_token.transfer_from(amount=amount, to=ctx.this, main_account=ctx.caller)
        pools[ctx.caller] += amount

    @export
    def withdraw(amount: float):
        assert pools[ctx.caller] >= amount, "Insufficient pool balance"
        pools[ctx.caller] -= amount
        con_token.transfer(amount=amount, to=ctx.caller)

    @export
    def pool_balance(address: str):
        return pools[address]
```

### Write the Tests

```python
import unittest
from contracting.client import ContractingClient


class TestDex(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()

        # Submit token first (the DEX depends on it)
        self.client.submit(token_contract, name="con_token")
        self.token = self.client.get_contract("con_token")

        # Submit DEX second
        self.client.submit(dex_contract, name="con_dex")
        self.dex = self.client.get_contract("con_dex")

    def tearDown(self):
        self.client.flush()

    def test_deposit(self):
        # sys has 1,000,000 tokens from constructor
        # Approve the DEX to spend tokens on behalf of sys
        self.token.approve(amount=5000, to="con_dex")

        # Deposit into the DEX
        self.dex.deposit(amount=5000)

        # Check balances
        self.assertEqual(self.dex.pool_balance(address="sys"), 5000)
        self.assertEqual(self.token.balance_of(address="con_dex"), 5000)
        self.assertEqual(self.token.balance_of(address="sys"), 995_000)

    def test_deposit_without_approval_fails(self):
        with self.assertRaises(AssertionError):
            self.dex.deposit(amount=5000)

    def test_withdraw(self):
        self.token.approve(amount=5000, to="con_dex")
        self.dex.deposit(amount=5000)

        self.dex.withdraw(amount=2000)

        self.assertEqual(self.dex.pool_balance(address="sys"), 3000)
        self.assertEqual(self.token.balance_of(address="sys"), 997_000)

    def test_withdraw_exceeds_pool(self):
        self.token.approve(amount=1000, to="con_dex")
        self.dex.deposit(amount=1000)

        with self.assertRaises(AssertionError):
            self.dex.withdraw(amount=2000)

    def test_multiple_users(self):
        # sys deposits
        self.token.approve(amount=1000, to="con_dex")
        self.dex.deposit(amount=1000)

        # Give alice some tokens
        self.token.transfer(amount=500, to="alice")

        # Alice deposits
        self.client.signer = "alice"
        self.token.approve(amount=500, to="con_dex")
        self.dex.deposit(amount=500)

        self.assertEqual(self.dex.pool_balance(address="sys"), 1000)
        self.assertEqual(self.dex.pool_balance(address="alice"), 500)


if __name__ == "__main__":
    unittest.main()
```

## Context Flow in Multi-Contract Calls

Understanding how `ctx` changes is critical when testing multi-contract interactions:

```
self.client.signer = "alice"
self.dex.deposit(amount=100)
```

Inside `con_dex.deposit()`:
- `ctx.caller` = `"alice"` (the user called the DEX)
- `ctx.signer` = `"alice"`
- `ctx.this` = `"con_dex"`

When `con_dex` calls `con_token.transfer_from()`:
- `ctx.caller` = `"con_dex"` (the DEX is calling the token)
- `ctx.signer` = `"alice"` (unchanged)
- `ctx.this` = `"con_token"`

This is why the DEX uses `transfer_from` with `main_account=ctx.caller` -- inside the token contract, `ctx.caller` is `"con_dex"`, which must have an allowance from `"alice"`.

## Dynamic Imports in Tests

For contracts that use `importlib.import_module()`, submit the target contract before calling the function that imports it:

```python
def registry_contract():
    import importlib

    registered = Hash(default_value=False)

    @export
    def register(token_name: str):
        token = importlib.import_module(token_name)
        registered[token_name] = True

class TestRegistry(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(token_contract, name="con_token")
        self.client.submit(registry_contract, name="con_registry")
        self.registry = self.client.get_contract("con_registry")

    def test_register_existing_token(self):
        self.registry.register(token_name="con_token")
        is_reg = self.client.get_var("con_registry", "registered", arguments=["con_token"])
        self.assertTrue(is_reg)
```

## Tips

- Always submit dependencies before the contracts that import them.
- Use `client.signer` to simulate different users in the same test.
- Use `client.set_var()` to set up preconditions (e.g., pre-fund an account) without going through contract functions.
- Call `client.flush()` between tests to prevent state leakage.
