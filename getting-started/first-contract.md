# Your First Smart Contract

This guide walks you through writing, testing, and understanding a Xian smart contract from scratch.

## Step 1: Install xian-contracting

```bash
pip install xian-tech-contracting
```

The published PyPI package name is `xian-tech-contracting`. The import surface
remains `contracting`.

This gives you the contract runtime, the linter, and `ContractingClient` for local testing.

## Step 2: Write the Contract

Create a file called `test_counter.py`. We will write a simple counter contract and test it.

The contract is defined as a Python function. Its source code is extracted and compiled by the testing framework:

```python
def counter_contract():
    count = Variable()
    owner = Variable()

    @construct
    def seed():
        count.set(0)
        owner.set(ctx.caller)

    @export
    def increment():
        count.set(count.get() + 1)
        return count.get()

    @export
    def decrement():
        current = count.get()
        assert current > 0, "Count cannot go below zero"
        count.set(current - 1)
        return count.get()

    @export
    def get_count():
        return count.get()

    @export
    def reset():
        assert ctx.caller == owner.get(), "Only the owner can reset"
        count.set(0)
```

Let's break down what each part does:

### State Declarations

```python
count = Variable()
owner = Variable()
```

These declare persistent state. `count` stores the current counter value. `owner` stores the address of whoever deployed the contract. These values survive between transactions.

### Constructor

```python
@construct
def seed():
    count.set(0)
    owner.set(ctx.caller)
```

The `@construct` function runs once when the contract is deployed. It initializes `count` to 0 and records the deployer's address as the owner.

### Exported Functions

```python
@export
def increment():
    count.set(count.get() + 1)
    return count.get()
```

The `@export` decorator makes a function callable from outside the contract. All arguments to exported functions must have type annotations (this function takes no arguments, so none are needed).

### Access Control

```python
@export
def reset():
    assert ctx.caller == owner.get(), "Only the owner can reset"
    count.set(0)
```

The `assert` statement is the primary error-handling mechanism. If the assertion fails, the transaction reverts and no state changes are applied.

## Step 3: Write Tests

Add the test class to the same file:

```python
import unittest
from contracting.client import ContractingClient


def counter_contract():
    count = Variable()
    owner = Variable()

    @construct
    def seed():
        count.set(0)
        owner.set(ctx.caller)

    @export
    def increment():
        count.set(count.get() + 1)
        return count.get()

    @export
    def decrement():
        current = count.get()
        assert current > 0, "Count cannot go below zero"
        count.set(current - 1)
        return count.get()

    @export
    def get_count():
        return count.get()

    @export
    def reset():
        assert ctx.caller == owner.get(), "Only the owner can reset"
        count.set(0)


class TestCounter(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(counter_contract, name="con_counter")
        self.counter = self.client.get_contract("con_counter")

    def tearDown(self):
        self.client.flush()

    def test_initial_count_is_zero(self):
        result = self.counter.get_count()
        self.assertEqual(result, 0)

    def test_increment(self):
        result = self.counter.increment()
        self.assertEqual(result, 1)

    def test_multiple_increments(self):
        self.counter.increment()
        self.counter.increment()
        result = self.counter.increment()
        self.assertEqual(result, 3)

    def test_decrement(self):
        self.counter.increment()
        self.counter.increment()
        result = self.counter.decrement()
        self.assertEqual(result, 1)

    def test_decrement_below_zero_fails(self):
        with self.assertRaises(AssertionError) as cm:
            self.counter.decrement()
        self.assertIn("Count cannot go below zero", str(cm.exception))

    def test_reset_by_owner(self):
        self.counter.increment()
        self.counter.increment()
        self.counter.reset()
        self.assertEqual(self.counter.get_count(), 0)

    def test_reset_by_non_owner_fails(self):
        self.client.signer = "alice"
        with self.assertRaises(AssertionError) as cm:
            self.counter.reset()
        self.assertIn("Only the owner can reset", str(cm.exception))

    def test_owner_is_deployer(self):
        owner = self.client.get_var("con_counter", "owner")
        self.assertEqual(owner, "sys")  # default signer is "sys"


if __name__ == "__main__":
    unittest.main()
```

## Step 4: Run the Tests

```bash
python -m pytest test_counter.py -v
```

Expected output:

```
test_counter.py::TestCounter::test_initial_count_is_zero PASSED
test_counter.py::TestCounter::test_increment PASSED
test_counter.py::TestCounter::test_multiple_increments PASSED
test_counter.py::TestCounter::test_decrement PASSED
test_counter.py::TestCounter::test_decrement_below_zero_fails PASSED
test_counter.py::TestCounter::test_reset_by_owner PASSED
test_counter.py::TestCounter::test_reset_by_non_owner_fails PASSED
test_counter.py::TestCounter::test_owner_is_deployer PASSED
```

## Understanding the Test Setup

### ContractingClient

```python
self.client = ContractingClient()
```

Creates a local testing environment with an in-memory state database. No blockchain node is needed.

### flush()

```python
self.client.flush()
```

Clears all contracts and state. Called in `setUp()` and `tearDown()` to isolate each test.

### submit()

```python
self.client.submit(counter_contract, name="con_counter")
```

Deploys the contract. The function's source code is extracted, linted, compiled, and its constructor is executed.

### get_contract()

```python
self.counter = self.client.get_contract("con_counter")
```

Returns a handle that lets you call exported functions directly.

### Changing the Signer

```python
self.client.signer = "alice"
```

Changes who is "signing" the transaction. This affects `ctx.caller` and `ctx.signer` in the contract.

## Next Steps

- [Creating a Token](/tutorials/creating-a-token) -- build a full XSC-0001 fungible token
- [Contract Structure](/smart-contracts/contract-structure) -- deeper dive into contract anatomy
- [Storage](/smart-contracts/storage/) -- learn about Hash, Variable, and Foreign state access
- [Testing](/smart-contracts/testing/) -- advanced testing patterns
