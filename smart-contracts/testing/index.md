# Testing

`ContractingClient` is the standard local test runtime for Xian contracts.

It lets you submit contracts, call exported functions, inspect state, and
exercise contract interactions without running a full node.

Set `vm_profile="xian_vm_v2"` to use the Rust compiler and native VM for local deployments, exports and cross-contract calls. The default client uses the historical V1 harness. Use a temporary storage directory per profile. Node simulation includes the target state and transaction context used for fee estimates.

## What It Gives You

`ContractingClient` includes:

- the contract linter
- the local execution runtime
- storage behavior close to the real chain model
- support for multi-contract tests, events, and return-value inspection

```python
from contracting.local import ContractingClient

client = ContractingClient(vm_profile="xian_vm_v2")
client.flush()

client.submit(my_contract_func, name="con_example")
contract = client.get_contract_proxy("con_example")
result = contract.some_function()
```

## What It Is Best For

Use it for:

- unit tests of contract logic
- storage and event assertions
- cross-contract integration tests
- checking source and artifacts before submitting source to a live network

## Related Guides

- [Unit Testing](/smart-contracts/testing/unit-testing)
- [Return Values & Events](/smart-contracts/testing/return-values)
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract)
- [Measuring Chi Costs](/smart-contracts/testing/chi-costs)

## Installation

Use the V2 source checkout and environment described in [Contract-only setup](/getting-started/dev-environment#contract-only-setup). Run the examples with its `uv run` command.

The V2 extra installs the native VM used by the local client.
