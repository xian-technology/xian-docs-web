# Measuring Chi Costs

Use local metering for regression tests and node simulation for transaction
estimates against the target state and runtime configuration.

## Local Regression Test

```python
from contracting.execution.executor import Executor
from contracting.local import ContractingClient


def counter_contract():
    counter = Variable(default_value=0)

    @export
    def increment() -> int:
        counter.set(counter.get() + 1)
        return counter.get()


client = ContractingClient()
client.flush()
client.submit(counter_contract, name="con_counter")

executor = Executor(
    metering=True,
    driver=client.raw_driver,
    bypass_balance_amount=True,
)
output = executor.execute(
    sender="sys",
    contract_name="con_counter",
    function_name="increment",
    kwargs={},
    chi=1_000_000,
)

assert output["status_code"] == 0
assert output["chi_used"] < 10_000
```

`bypass_balance_amount=True` skips the local paid-fee balance precheck. Use it
only for isolated cost tests, never as a model for node execution.

Keep local assertions broad enough to detect regressions without treating one
development-machine measurement as a network fee quote.

## Node Estimate

Before submission, simulate the real call through an SDK:

```python
preview = client.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 10, "to": "alice"},
)

chi_used = preview["chi_used"]
```

Simulation does not commit state. Add bounded headroom because state can change
before the transaction is included.

## Cost Drivers

- VM computation and host operations
- storage reads and writes
- submitted transaction bytes
- returned value bytes
- cross-contract calls and native bridges such as ZK verification

Failed and out-of-chi executions roll back application writes and events.

For constants, see [Chi Cost Table](/reference/chi-costs). For the simulation
response and operator limits, see [Estimating Chi](/api/dry-runs).
