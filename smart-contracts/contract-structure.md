# Contract Structure

A Xian smart contract is a single Python file with three sections: state declarations, an optional constructor, and one or more exported functions.

## Module-Level State

State variables are declared at the top of the file. They persist on-chain between transactions.

```python
balances = Hash(default_value=0)
owner = Variable()
metadata = Hash()
```

These are the only statements allowed at module level (besides imports). You cannot put logic, loops, or function calls at the top level — only `Variable()`, `Hash()`, `ForeignVariable()`, `ForeignHash()`, `LogEvent()` declarations and `import` statements.

See [Storage](/smart-contracts/storage/) for details on each type.

## Constructor

The `@construct` decorator marks a function that runs **once** when the contract is deployed. It is never callable again.

```python
@construct
def seed():
    owner.set(ctx.caller)
    balances[ctx.caller] = 1_000_000
    metadata["name"] = "My Token"
```

Rules:
- Only **one** `@construct` function per contract
- The function name can be anything (it gets renamed internally)
- Arguments are passed via `constructor_args` during submission
- No type annotations required on constructor arguments

## Exported Functions

The `@export` decorator makes a function callable from outside the contract — by users submitting transactions or by other contracts.

```python
@export
def transfer(to: str, amount: float):
    sender = ctx.caller
    assert balances[sender] >= amount, "Insufficient balance"
    balances[sender] -= amount
    balances[to] += amount
```

Rules:
- At least **one** `@export` function is required per contract
- All arguments **must** have type annotations
- Return type annotations are **not allowed**
- Allowed annotation types: `str`, `int`, `float`, `bool`, `dict`, `list`, `Any`, `datetime.datetime`, `datetime.timedelta`

## Private Functions

Any function without a decorator is private — it can only be called from within the same contract.

```python
def calculate_fee(amount):
    return amount * 0.01

@export
def transfer_with_fee(to: str, amount: float):
    fee = calculate_fee(amount)
    balances[ctx.caller] -= amount
    balances[to] += amount - fee
    balances["fee_pool"] += fee
```

Private functions:
- Are automatically name-mangled with a `__` prefix internally
- Cannot be called by external transactions or other contracts
- Do **not** require type annotations
- Cannot be nested (no functions inside functions)

## Imports

Contracts can import other deployed contracts:

```python
import currency

@export
def buy_item(item_id: str, price: float):
    currency.transfer(to=ctx.this, amount=price)
    items[item_id] = ctx.caller
```

See [Imports](/smart-contracts/imports/) for details. Standard library modules (`import os`, `import sys`, etc.) are not allowed — only deployed contracts and the [standard library](/smart-contracts/stdlib/) modules provided by the runtime.

## Naming Rules

- Names starting or ending with `_` (underscore) are **forbidden** — this prevents access to Python internals like `__class__`, `__globals__`, etc.
- Contract names submitted by users must start with `con_`, be lowercase, and not exceed 64 characters
- The identifier `rt` is reserved and cannot be used
