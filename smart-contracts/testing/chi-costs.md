# Measuring Chi Costs

Use local metering for regression tests and node simulation for transaction
estimates against the target state and runtime configuration.

## Local Regression Test

```python
from contracting.local import ContractingClient


def counter_contract():
    counter = Variable(default_value=0)

    @export
    def increment() -> int:
        counter.set(counter.get() + 1)
        return counter.get()


client = ContractingClient(metering=True)
client.flush()
client.submit(counter_contract, name="con_counter")

output = client.executor.execute(
    sender="sys",
    contract_name="con_counter",
    function_name="increment",
    kwargs={},
    chi=100_000,
)

assert output["status_code"] == 0
assert output["chi_used"] < 10_000
```

Keep local assertions broad enough to detect regressions without treating one
development-machine measurement as a network fee quote. The local client's
default budget is 100,000 chi, below the default chain cap of 200,000 chi per
transaction.

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

Simulation does not commit state. For the same state, execution charges exactly
the simulated `chi_used`, so clients supply that value. If the state changes
before the transaction is included, the transaction can run out of chi; it
then fails, pays for the chi it used and changes nothing else, and can be
estimated again and resubmitted.

## Cost Drivers

- VM computation and host operations
- storage reads and writes
- submitted transaction bytes
- returned value bytes
- cross-contract calls and native bridges such as ZK verification

Failed and out-of-chi executions roll back application writes and events.

For constants, see [Chi Cost Table](/reference/chi-costs). For the simulation
response and operator limits, see [Estimating Chi](/api/dry-runs).
