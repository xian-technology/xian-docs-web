# Contract Structure

A Xian contract is a single Python module. The normal pattern is:

1. module-level declarations
2. an optional `@construct` function
3. one or more `@export` functions
4. private helper functions

## Module-Level Declarations

Persistent state and events are declared at module scope:

```python
balances = Hash(default_value=0)
owner = Variable()
metadata = Hash()

TransferEvent = LogEvent(
    event="Transfer",
    params={
        "from": {"type": str, "idx": True},
        "to": {"type": str, "idx": True},
        "amount": {"type": (int, float, decimal)},
    },
)
```

Module scope is also where contract imports live. Runtime modules such as
`hashlib`, `datetime`, `random`, `importlib`, `crypto`, `zk`, and `decimal`
are injected automatically and do not need `import` statements:

```python
import currency

def commitment(label: str):
    return hashlib.sha3(label)
```

Do not put executable setup logic at module scope. Initialization belongs in
`@construct`.

## Constructor

The `@construct` function runs once at submission time.

```python
@construct
def seed(initial_supply: int = 1_000_000):
    owner.set(ctx.caller)
    balances[ctx.caller] = initial_supply
```

Current rules:

- only one constructor is allowed
- constructor parameters do not need annotations
- the constructor is not callable after deployment
- constructor work is metered and must stay deterministic

## Exported Functions

`@export` defines the public API of the contract.

```python
@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

Current rules:

- a contract must expose at least one `@export`
- every exported argument must have a whitelisted annotation
- exported return annotations are allowed when they use a whitelisted type
- only one decorator is allowed per function

Whitelisted annotation types are:

```python
str, int, float, bool, dict, list, Any
datetime.datetime, datetime.timedelta
```

Subscripted `list[...]` and `dict[...]` forms are allowed too, as long as the
base type is still one of those whitelisted types.

## Private Helpers

Functions without decorators are private to the contract module:

```python
def calculate_fee(amount: float) -> float:
    return amount * 0.01

@export
def transfer_with_fee(to: str, amount: float):
    fee = calculate_fee(amount)
    balances[ctx.caller] -= amount
    balances[to] += amount - fee
```

Private helpers:

- can be called only inside the same contract
- do not need annotations
- must still obey the same sandbox rules
- cannot be nested inside another function

## Naming Rules

The linter rejects names that start or end with `_`:

- `_private`
- `name_`
- `__dunder__`

That rule exists to block Python internals and avoid sandbox escapes.

Other important naming rules:

- deployed contract names must start with `con_` unless they are seeded system
  contracts
- deployed contract names must start with a lowercase ASCII letter
- deployed contract names may contain only lowercase ASCII letters, digits, and
  underscores
- special characters such as `.`, `:`, `-`, and spaces are rejected
- the special identifier `rt` is reserved
