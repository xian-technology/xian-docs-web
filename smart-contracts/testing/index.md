# Testing

`ContractingClient` is the standard local test runtime for Xian contracts.

It lets you submit contracts, call exported functions, inspect state, and
exercise contract interactions without running a full node.

## What It Gives You

`ContractingClient` includes:

- the contract linter
- the local execution runtime
- storage behavior close to the real chain model
- support for multi-contract tests, events, and return-value inspection

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()

client.submit(my_contract_func, name="con_example")
contract = client.get_contract("con_example")
result = contract.some_function()
```

## What It Is Best For

Use it for:

- unit tests of contract logic
- storage and event assertions
- cross-contract integration tests
- building deployment artifacts before submission to a live network

## Related Guides

- [Unit Testing](/smart-contracts/testing/unit-testing)
- [Return Values & Events](/smart-contracts/testing/return-values)
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract)
- [Measuring Chi Costs](/smart-contracts/testing/chi-costs)

## Installation

```bash
python -m pip install xian-tech-contracting
```

This installs the local contract runtime, linter, and testing client.
