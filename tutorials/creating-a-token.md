# Creating a Fungible Token

This tutorial walks you through building a complete LST-001 compliant fungible token on Xian. You will implement balances, transfers, approvals, and events -- then test everything with `ContractingClient`.

## What is LST-001?

LST-001 is the Xian standard for fungible tokens. It defines the required functions and their signatures so that wallets, DEXes, and other contracts can interact with any compliant token.

Required functions:
- `transfer(amount, to)` -- send tokens from the caller to a recipient
- `approve(amount, to)` -- grant a spender permission to use tokens
- `transfer_from(amount, to, main_account)` -- spend tokens on behalf of another account
- `balance_of(address)` -- return an account's balance

## Step 1: State Declarations

Every token needs a `Hash` for balances and a `Hash` for metadata:

```python
balances = Hash(default_value=0)
metadata = Hash()
```

The `default_value=0` means any address that has never received tokens has a balance of `0` instead of `None`.

## Step 2: Events

LST-001 tokens should emit events for transfers and approvals so that wallets and block explorers can track activity:

```python
Transfer = LogEvent(
    event="Transfer",
    params={
        "from":   {"type": str, "idx": True},
        "to":     {"type": str, "idx": True},
        "amount": {"type": (int, float)},
    },
)

Approve = LogEvent(
    event="Approve",
    params={
        "owner":   {"type": str, "idx": True},
        "spender": {"type": str, "idx": True},
        "amount":  {"type": (int, float)},
    },
)
```

The `idx: True` parameters are indexed by CometBFT and searchable via `/tx_search`.

## Step 3: Constructor

Initialize the token supply and metadata when the contract is deployed:

```python
@construct
def seed():
    balances[ctx.caller] = 1_000_000
    metadata["token_name"] = "My Token"
    metadata["token_symbol"] = "MTK"
    metadata["token_logo_url"] = ""
    metadata["operator"] = ctx.caller
```

The deployer receives the entire initial supply.

## Step 4: Transfer

The basic transfer function moves tokens from the caller to a recipient:

```python
@export
def transfer(amount: float, to: str):
    assert amount > 0, "Cannot send negative balances"
    assert balances[ctx.caller] >= amount, "Not enough coins to send"

    balances[ctx.caller] -= amount
    balances[to] += amount

    Transfer({"from": ctx.caller, "to": to, "amount": amount})
```

Key points:
- Validate that the amount is positive
- Validate that the sender has enough balance
- Update both balances atomically
- Emit a `Transfer` event

## Step 5: Approve

Allow a spender (another address or contract) to spend tokens on the caller's behalf:

```python
@export
def approve(amount: float, to: str):
    assert amount > 0, "Cannot approve negative balances"
    balances[ctx.caller, to] += amount

    Approve({"owner": ctx.caller, "spender": to, "amount": amount})
```

The approval is stored as a multi-dimensional Hash entry: `balances[owner, spender]`.

## Step 6: Transfer From

Let an approved spender move tokens from one account to another:

```python
@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Cannot send negative balances"
    assert balances[main_account, ctx.caller] >= amount, "Not enough coins approved to send"
    assert balances[main_account] >= amount, "Not enough coins to send"

    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount

    Transfer({"from": main_account, "to": to, "amount": amount})
```

This function:
1. Checks the spender's allowance (`balances[main_account, ctx.caller]`)
2. Checks the owner's actual balance
3. Deducts from the allowance
4. Deducts from the owner's balance
5. Adds to the recipient's balance

## Step 7: Balance Query

```python
@export
def balance_of(address: str):
    return balances[address]
```

## Complete Contract

Here is the full token contract:

```python
balances = Hash(default_value=0)
metadata = Hash()

Transfer = LogEvent(
    event="Transfer",
    params={
        "from":   {"type": str, "idx": True},
        "to":     {"type": str, "idx": True},
        "amount": {"type": (int, float)},
    },
)

Approve = LogEvent(
    event="Approve",
    params={
        "owner":   {"type": str, "idx": True},
        "spender": {"type": str, "idx": True},
        "amount":  {"type": (int, float)},
    },
)

@construct
def seed():
    balances[ctx.caller] = 1_000_000
    metadata["token_name"] = "My Token"
    metadata["token_symbol"] = "MTK"
    metadata["token_logo_url"] = ""
    metadata["operator"] = ctx.caller

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Cannot send negative balances"
    assert balances[ctx.caller] >= amount, "Not enough coins to send"

    balances[ctx.caller] -= amount
    balances[to] += amount

    Transfer({"from": ctx.caller, "to": to, "amount": amount})

@export
def approve(amount: float, to: str):
    assert amount > 0, "Cannot approve negative balances"
    balances[ctx.caller, to] += amount

    Approve({"owner": ctx.caller, "spender": to, "amount": amount})

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Cannot send negative balances"
    assert balances[main_account, ctx.caller] >= amount, "Not enough coins approved to send"
    assert balances[main_account] >= amount, "Not enough coins to send"

    balances[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount

    Transfer({"from": main_account, "to": to, "amount": amount})

@export
def balance_of(address: str):
    return balances[address]
```

## Testing the Token

Create a test file `test_token.py`:

```python
import unittest
from contracting.client import ContractingClient


def my_token():
    balances = Hash(default_value=0)
    metadata = Hash()

    Transfer = LogEvent(
        event="Transfer",
        params={
            "from":   {"type": str, "idx": True},
            "to":     {"type": str, "idx": True},
            "amount": {"type": (int, float)},
        },
    )

    Approve = LogEvent(
        event="Approve",
        params={
            "owner":   {"type": str, "idx": True},
            "spender": {"type": str, "idx": True},
            "amount":  {"type": (int, float)},
        },
    )

    @construct
    def seed():
        balances[ctx.caller] = 1_000_000
        metadata["token_name"] = "My Token"
        metadata["token_symbol"] = "MTK"
        metadata["token_logo_url"] = ""
        metadata["operator"] = ctx.caller

    @export
    def transfer(amount: float, to: str):
        assert amount > 0, "Cannot send negative balances"
        assert balances[ctx.caller] >= amount, "Not enough coins to send"

        balances[ctx.caller] -= amount
        balances[to] += amount

        Transfer({"from": ctx.caller, "to": to, "amount": amount})

    @export
    def approve(amount: float, to: str):
        assert amount > 0, "Cannot approve negative balances"
        balances[ctx.caller, to] += amount

        Approve({"owner": ctx.caller, "spender": to, "amount": amount})

    @export
    def transfer_from(amount: float, to: str, main_account: str):
        assert amount > 0, "Cannot send negative balances"
        assert balances[main_account, ctx.caller] >= amount, "Not enough coins approved to send"
        assert balances[main_account] >= amount, "Not enough coins to send"

        balances[main_account, ctx.caller] -= amount
        balances[main_account] -= amount
        balances[to] += amount

        Transfer({"from": main_account, "to": to, "amount": amount})

    @export
    def balance_of(address: str):
        return balances[address]


class TestToken(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(my_token, name="con_my_token")
        self.token = self.client.get_contract("con_my_token")

    def tearDown(self):
        self.client.flush()

    # --- Initial state ---

    def test_initial_supply(self):
        balance = self.token.balance_of(address="sys")
        self.assertEqual(balance, 1_000_000)

    def test_metadata(self):
        name = self.client.get_var("con_my_token", "metadata", arguments=["token_name"])
        symbol = self.client.get_var("con_my_token", "metadata", arguments=["token_symbol"])
        self.assertEqual(name, "My Token")
        self.assertEqual(symbol, "MTK")

    # --- Transfer ---

    def test_transfer(self):
        self.token.transfer(amount=1000, to="alice")
        self.assertEqual(self.token.balance_of(address="alice"), 1000)
        self.assertEqual(self.token.balance_of(address="sys"), 999_000)

    def test_transfer_insufficient_balance(self):
        self.client.signer = "alice"
        with self.assertRaises(AssertionError):
            self.token.transfer(amount=100, to="bob")

    def test_transfer_negative_amount(self):
        with self.assertRaises(AssertionError):
            self.token.transfer(amount=-10, to="alice")

    def test_transfer_zero_amount(self):
        with self.assertRaises(AssertionError):
            self.token.transfer(amount=0, to="alice")

    # --- Approve ---

    def test_approve(self):
        self.token.approve(amount=500, to="alice")
        allowance = self.client.get_var(
            "con_my_token", "balances", arguments=["sys", "alice"]
        )
        self.assertEqual(allowance, 500)

    def test_approve_accumulates(self):
        self.token.approve(amount=500, to="alice")
        self.token.approve(amount=300, to="alice")
        allowance = self.client.get_var(
            "con_my_token", "balances", arguments=["sys", "alice"]
        )
        self.assertEqual(allowance, 800)

    # --- Transfer From ---

    def test_transfer_from(self):
        # sys approves alice for 500
        self.token.approve(amount=500, to="alice")

        # alice transfers 200 from sys to bob
        self.client.signer = "alice"
        self.token.transfer_from(amount=200, to="bob", main_account="sys")

        self.assertEqual(self.token.balance_of(address="bob"), 200)
        self.assertEqual(self.token.balance_of(address="sys"), 999_800)

        # Check remaining allowance
        remaining = self.client.get_var(
            "con_my_token", "balances", arguments=["sys", "alice"]
        )
        self.assertEqual(remaining, 300)

    def test_transfer_from_exceeds_allowance(self):
        self.token.approve(amount=100, to="alice")
        self.client.signer = "alice"
        with self.assertRaises(AssertionError):
            self.token.transfer_from(amount=200, to="bob", main_account="sys")

    def test_transfer_from_no_approval(self):
        self.client.signer = "alice"
        with self.assertRaises(AssertionError):
            self.token.transfer_from(amount=100, to="bob", main_account="sys")

    # --- Edge cases ---

    def test_transfer_to_self(self):
        self.token.transfer(amount=100, to="sys")
        self.assertEqual(self.token.balance_of(address="sys"), 1_000_000)

    def test_unknown_address_has_zero_balance(self):
        self.assertEqual(self.token.balance_of(address="nobody"), 0)


if __name__ == "__main__":
    unittest.main()
```

Run the tests:

```bash
python -m pytest test_token.py -v
```

## Deploying to the Network

Once your tests pass, deploy using `xian-py`:

```python
from xian_py.wallet import Wallet
from xian_py.xian import Xian

wallet = Wallet(private_key="your_private_key")
xian = Xian("http://node:26657", "xian-network-1", wallet)

# Read the contract source (without the wrapping function)
with open("my_token_contract.py") as f:
    code = f.read()

result = xian.submit_contract(
    name="con_my_token",
    code=code,
    stamps=500000,
)

print(f"Deployed at tx: {result['hash']}")
```

The contract source you submit should be the raw contract code (state declarations, constructor, and exported functions) -- not wrapped in a function. The function wrapper is only used for local testing with `ContractingClient`.

## Next Steps

- [Access Control](/smart-contracts/security/access-control) -- add admin functions and role-based access
- [Events](/smart-contracts/events) -- deeper dive into event patterns and subscriptions
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract) -- test your token with a DEX contract
