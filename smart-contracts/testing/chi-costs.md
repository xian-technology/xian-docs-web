# Measuring Chi Costs

Chi are the gas unit on Xian. Every metered compute step, read, and write
costs chi. During development, you can enable metering in tests to measure
how many chi your contract functions consume.

## Enabling Metering

Pass `metering=True` when constructing `ContractingClient`:

```python
from contracting.client import ContractingClient

client = ContractingClient(metering=True)
```

With metering enabled, contract calls use the same tracer mode that the runtime
would use on-chain. On the default pure-Python backend that means deterministic
line buckets; on the native backend it means exact instruction metering.

This local testing path is primarily a tracer-backed measurement tool. VM-native
networks still use the same chi budget concept, but `xian_vm_v1` meters through
its VM gas schedule rather than the Python tracer callbacks described here.

## How Chi Are Calculated

The tracer-backed chi cost of a transaction has these components:

1. **Compute costs** -- each Python opcode has a cost (2-1610 compute units)
2. **Read costs** -- 1 meter unit per byte of key + value read from storage
3. **Write costs** -- 25 meter units per byte of key + value written to storage
4. **Payload costs** -- submitted transaction bytes and returned value bytes are metered

The raw compute units are converted to chi using the formula:

```
chi_used = (raw_cost // 1000) + 5
```

The `+ 5` is the base transaction cost that every transaction pays regardless of computation.

## Cost Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `READ_COST_PER_BYTE` | 1 | tracer meter unit per byte for storage reads |
| `WRITE_COST_PER_BYTE` | 25 | tracer meter units per byte for storage writes |
| `CHI_PER_T` | 20 | How many chi one XIAN buys. `T` stands for the native token. |
| Runtime raw safety ceiling | 50,000,000,000 raw units | overflow guard before the submitted chi budget cap |
| Max line events (`python_line_v1`) | 800,000 | Maximum line callbacks per transaction |
| Max instruction events (`native_instruction_v1`) | 3,250,000 | Maximum native instruction callbacks per transaction |
| Max write data | 128 KiB | Maximum write data per transaction |
| Max return value | 128 KiB | Maximum serialized return payload |

For `xian_vm_v1`, storage and payload accounting still matter, but compute is
charged through the VM-native gas schedule instead of these tracer-event limits.
The current VM host-operation schedule has its own read charge and shares the
same `25` units-per-byte write cost.

## Checking Chi Used

When metering is enabled, you need to set a chi limit for execution. Use the `Executor` class directly for detailed chi analysis:

```python
from contracting.client import ContractingClient
from contracting.execution.executor import Executor

client = ContractingClient()
client.flush()


def simple_contract():
    counter = Variable()

    @construct
    def seed():
        counter.set(0)

    @export
    def increment():
        counter.set(counter.get() + 1)
        return counter.get()


client.submit(simple_contract, name="con_counter")

# Use Executor with metering
executor = Executor(metering=True)

output = executor.execute(
    sender="sys",
    contract_name="con_counter",
    function_name="increment",
    chi=1_000_000,  # chi limit
    kwargs={},
)

print(f"Chi used: {output['chi_used']}")
print(f"Result: {output['result']}")
print(f"Status code: {output['status_code']}")
```

The output dictionary contains:

| Key | Description |
|-----|-------------|
| `chi_used` | Total chi consumed by the transaction |
| `result` | The return value of the function |
| `status_code` | `0` for success, `1` for failure |
| `state` | List of state changes made |

## Example: Comparing Chi Costs

```python
import unittest
from contracting.client import ContractingClient
from contracting.execution.executor import Executor


def cost_test_contract():
    data = Hash(default_value=0)
    counter = Variable()

    @construct
    def seed():
        counter.set(0)

    @export
    def write_small():
        data["x"] = 1

    @export
    def write_large():
        for i in range(50):
            data[str(i)] = i * i

    @export
    def read_only():
        return counter.get()


class TestChiCosts(unittest.TestCase):
    def setUp(self):
        self.client = ContractingClient()
        self.client.flush()
        self.client.submit(cost_test_contract, name="con_cost")
        self.executor = Executor(metering=True)

    def execute(self, function_name, kwargs=None):
        return self.executor.execute(
            sender="sys",
            contract_name="con_cost",
            function_name=function_name,
            chi=1_000_000,
            kwargs=kwargs or {},
        )

    def test_write_costs_more_than_read(self):
        read_output = self.execute("read_only")
        write_output = self.execute("write_small")

        self.assertGreater(
            write_output["chi_used"],
            read_output["chi_used"],
        )

    def test_large_write_costs_more(self):
        small_output = self.execute("write_small")
        large_output = self.execute("write_large")

        self.assertGreater(
            large_output["chi_used"],
            small_output["chi_used"],
        )

    def test_chi_under_limit(self):
        output = self.execute("write_large")
        self.assertLess(output["chi_used"], 100_000)


if __name__ == "__main__":
    unittest.main()
```

## Out of Chi

If a contract exceeds its chi limit, the transaction fails and all state changes are rolled back. The chi are still consumed (charged to the sender):

```python
output = executor.execute(
    sender="sys",
    contract_name="con_cost",
    function_name="write_large",
    chi=10,  # very low limit
    kwargs={},
)

assert output["status_code"] == 1  # failure
# chi_used will equal the chi limit
```

## Tips for Optimizing Chi Costs

- **Minimize writes** -- writes cost 25x more than reads per byte
- **Use shorter keys** -- key length is part of the byte cost
- **Avoid unnecessary reads** -- cache values in local variables within a function
- **Batch operations** -- fewer function calls across contracts means less overhead
- **Use default values** -- `Hash(default_value=0)` avoids storing zero entries explicitly
