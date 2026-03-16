# Testing

Xian provides `ContractingClient` -- a local testing environment that lets you submit, execute, and inspect contracts without running a full node. It simulates the on-chain runtime with an in-memory state database.

## How It Works

`ContractingClient` spins up a local instance of the Xian contract executor. You submit contracts as Python functions, call their exported functions, and inspect state changes -- all in a standard Python test file.

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()  # clear all state

# Submit a contract
client.submit(my_contract_func, name="con_my_contract")

# Get a handle and call functions
contract = client.get_contract("con_my_contract")
contract.transfer(to="bob", amount=100)
```

## Quick Links

- [Unit Testing](/smart-contracts/testing/unit-testing) -- full guide to setting up tests with ContractingClient
- [Return Values & Events](/smart-contracts/testing/return-values) -- inspecting function outputs and emitted events
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract) -- testing contracts that import each other
- [Stamp Costs](/smart-contracts/testing/stamp-costs) -- measuring gas consumption in tests

## Installation

```bash
pip install xian-contracting
```

This gives you access to `ContractingClient`, the linter, and all runtime primitives (`Hash`, `Variable`, `ctx`, etc.).
