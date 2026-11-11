# Testing

`ContractingClient` is the standard local test runtime for Xian contracts.

It lets you submit contracts, call exported functions, inspect state, and
exercise contract interactions without running a full node.

The client compiles and executes contracts under `xian_vm_v2`, the same numeric
and language rules used by the fresh chain. Each test can pass its own temporary
`storage_home` to start with clean state. Node simulation uses the target chain’s
state and transaction context for fee estimates.

`ContractingClient` rejects an explicit V1 profile or an injected V1 driver with
`ValueError`. `ParallelBatchExecutor` rejects an executor backed by a V1 driver.
Use fresh V2 storage for supported local tests.
Low-level native V1 tooling is reserved for historical verification and
migration; a V1 profile is not a local-client compatibility mode. Proxies expose
the same exported functions that a transaction can call. Test private helpers
through an exported function.

## What It Gives You

`ContractingClient` includes:

- the contract linter
- the local execution runtime
- storage behavior close to the real chain model
- support for multi-contract tests, events, and return-value inspection

```python
from contracting.local import ContractingClient

client = ContractingClient()
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

The base installation includes the native VM.
