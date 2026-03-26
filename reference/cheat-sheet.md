# Cheat Sheet

Quick reference for current Xian contract development.

## State Primitives

```python
owner = Variable()
balances = Hash(default_value=0)
metadata = Hash()

foreign_owner = ForeignVariable(
    foreign_contract="currency",
    foreign_name="owner",
)

foreign_balances = ForeignHash(
    foreign_contract="currency",
    foreign_name="balances",
)
```

## Events

```python
TransferEvent = LogEvent(
    event="Transfer",
    params={
        "from": {"type": str, "idx": True},
        "to": {"type": str, "idx": True},
        "amount": {"type": (int, float, decimal)},
    },
)
```

## Decorators

```python
@construct
def seed():
    owner.set(ctx.caller)

@export
def transfer(to: str, amount: float):
    pass

def helper():
    pass
```

## Export Signature Types

Allowed for exported arguments and exported return annotations:

```python
str, int, float, bool, dict, list, Any
datetime.datetime, datetime.timedelta
```

## Context

| Name | Meaning |
|------|---------|
| `ctx.caller` | immediate caller |
| `ctx.signer` | original transaction signer |
| `ctx.this` | current contract name |
| `ctx.owner` | current contract owner |
| `ctx.entry` | `(contract, function)` entry point |
| `ctx.submission_name` | child contract name during deployment |

## Environment Values

| Name | Meaning |
|------|---------|
| `now` | deterministic block time |
| `block_num` | current block height |
| `block_hash` | current block hash |
| `chain_id` | network id |

## Imports

```python
import currency
import hashlib
import datetime
import random
import importlib
import crypto
import zk
import decimal
```

Do not use `from x import y`.

For dynamic function dispatch, prefer the explicit helper:

```python
importlib.call(
    "con_token",
    "balance_of",
    {"account": "alice"},
)
```

The helper only resolves exported functions. It does not expose generic
attribute lookup.

Probe helpers:

```python
importlib.exists("con_token")
importlib.has_export("con_token", "balance_of")
importlib.owner_of("con_token")
importlib.contract_info("con_token")
importlib.code_hash("con_token")
importlib.code_hash("con_token", kind="source")
```

ZK verification:

```python
zk.is_available()
zk.verify_groth16_bn254(vk_hex, proof_hex, public_inputs)
```

`importlib.enforce_interface(...)`, `importlib.owner_of(...)`, and
`importlib.contract_info(...)` also accept an imported contract module if you
already resolved one.

Factory deployments use the built-in submission contract:

```python
import submission

@export
def deploy_child(name: str, code: str, owner: str = None):
    submission.submit_contract(
        name=name,
        code=code,
        owner=owner,
        constructor_args={},
    )
```

Deployed contracts record immutable provenance in state:

- `__deployer__`: immediate deployer
- `__initiator__`: original external signer
- `__developer__`: current mutable developer field

Runtime ownership can be transferred through `submission.change_owner(...)`.
That updates `__owner__` / `ctx.owner`, not a contract's own `owner = Variable()`
pattern.

## Read / Write Patterns

```python
owner.set("alice")
current_owner = owner.get()

balances["alice"] = 100
balances["alice", "con_dex"] = 25

bal = balances["alice"]
allowance = balances["alice", "con_dex"]
```

Client-side direct inspection:

```python
client.get_var("con_token", "balances", arguments=["alice"])
client.set_var("con_token", "balances", arguments=["alice"], value=500)
```

## Common Assertions

```python
assert amount > 0, "Amount must be positive"
assert balances[ctx.caller] >= amount, "Insufficient balance"
assert ctx.caller == owner.get(), "Only owner"
assert ctx.caller == ctx.signer, "Direct calls only"
```

## Common Token Surface

```python
@export
def transfer(amount: float, to: str):
    ...

@export
def approve(amount: float, to: str):
    ...

@export
def transfer_from(amount: float, to: str, main_account: str):
    ...

@export
def balance_of(address: str) -> float:
    ...
```

## Disallowed Patterns

- classes
- nested functions
- `try/except`
- `lambda`
- `async`
- generators / `yield`
- stdlib imports
- names starting or ending with `_`
