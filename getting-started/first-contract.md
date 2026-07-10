# Your First Smart Contract

Use `ContractingClient` to compile and test contracts without running a node.

## Install

Xian's core Python packages require Python 3.14.

```bash
uv add xian-tech-contracting pytest
```

The package name is `xian-tech-contracting`; imports use `contracting`.

## Contract and Test

Create `test_counter.py`:

```python
import pytest

from contracting.local import ContractingClient


def counter_contract():
    count = Variable()
    owner = Variable()

    @construct
    def seed():
        count.set(0)
        owner.set(ctx.caller)

    @export
    def increment() -> int:
        count.set(count.get() + 1)
        return count.get()

    @export
    def reset():
        assert ctx.caller == owner.get(), "Only the owner can reset"
        count.set(0)


@pytest.fixture
def client():
    local = ContractingClient()
    local.flush()
    local.submit(counter_contract, name="con_counter")
    yield local
    local.flush()


def test_increment(client):
    counter = client.get_contract_proxy("con_counter")
    assert counter.increment() == 1
    assert counter.increment() == 2


def test_only_owner_can_reset(client):
    counter = client.get_contract_proxy("con_counter")
    with pytest.raises(AssertionError, match="Only the owner"):
        counter.reset(signer="alice")
```

Run it:

```bash
uv run pytest -q
```

`Variable` stores durable contract state. `@construct` runs once at deployment,
and `@export` marks externally callable functions. Failed assertions roll back
the transaction's writes and events.

## Next Steps

- [Contract Structure](/smart-contracts/contract-structure)
- [Storage](/smart-contracts/storage)
- [Testing](/smart-contracts/testing/)
- [Deploying and Interacting](/getting-started/deploying)
