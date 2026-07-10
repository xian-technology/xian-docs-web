# Unit Testing with ContractingClient

`ContractingClient` compiles and executes contracts locally without a node.
Use it to call exports, change signers, inspect state, and test rollback.

## Setup

```bash
uv add xian-tech-contracting pytest
```

```python
import pytest

from contracting.local import ContractingClient


@pytest.fixture
def client():
    local = ContractingClient()
    local.flush()
    yield local
    local.flush()
```

## Submit and Call

```python
def token_contract():
    balances = Hash(default_value=0)

    @construct
    def seed(initial_supply: int):
        balances[ctx.caller] = initial_supply

    @export
    def transfer(amount: float, to: str):
        assert amount > 0, "Amount must be positive"
        assert balances[ctx.caller] >= amount, "Insufficient balance"
        balances[ctx.caller] -= amount
        balances[to] += amount

    @export
    def balance_of(address: str) -> float:
        return balances[address]


def test_transfer(client):
    client.submit(
        token_contract,
        name="con_token",
        constructor_args={"initial_supply": 1_000},
    )
    token = client.get_contract_proxy("con_token")

    token.transfer(to="alice", amount=100)

    assert token.balance_of(address="alice") == 100
    assert client.get_var("con_token", "balances", arguments=["sys"]) == 900
```

The default signer is `sys`. Override it for a call when testing another
account:

```python
token.transfer(to="bob", amount=25, signer="alice")
```

A proxy captures `client.signer` when the proxy is created. If you change the
client-wide signer instead, create a new proxy afterward.

## Direct State Helpers

Use direct state access only for assertions and controlled test setup:

```python
owner = client.get_var("con_app", "owner")
balance = client.get_var("con_token", "balances", arguments=["alice"])

client.set_var("con_token", "balances", arguments=["alice"], value=500)
```

These helpers are local-test APIs, not network mutation endpoints.

## Test Failures and Rollback

```python
with pytest.raises(AssertionError, match="Insufficient balance"):
    token.transfer(to="bob", amount=10_000)
```

After a failed call, assert that state and emitted events were not partially
committed.

## Metering

Pass `metering=True` when a test needs local chi measurements. Treat those
values as regression signals; use node simulation for estimates against the
effective network runtime and configuration.

## Isolation

Create a fresh client per test or call `flush()` between tests. Do not let
contracts, state, signer selection, or environment overrides leak across test
cases.

## Related Pages

- [Your First Smart Contract](/getting-started/first-contract)
- [Measuring Chi Costs](/smart-contracts/testing/chi-costs)
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract)
