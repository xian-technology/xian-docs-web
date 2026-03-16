# Cheat Sheet

Quick reference for Xian smart contract development.

## State Declarations

```python
# Single value
owner = Variable()
counter = Variable(default_value=0)
typed_var = Variable(t=str)

# Key-value mapping
balances = Hash(default_value=0)
metadata = Hash()

# Read-only access to another contract's state
foreign_bal = ForeignHash(foreign_contract="currency", foreign_name="balances")
foreign_owner = ForeignVariable(foreign_contract="currency", foreign_name="owner")

# Event declaration
Transfer = LogEvent(
    event="Transfer",
    params={"from": {"type": str, "idx": True}, "to": {"type": str, "idx": True}, "amount": {"type": (int, float)}},
)
```

## Decorators

```python
@construct      # Runs once on deployment
def seed():
    owner.set(ctx.caller)

@export         # Public function (callable by txs and other contracts)
def transfer(to: str, amount: float):
    pass

def helper():   # Private function (only callable within this contract)
    pass
```

## Context Variables

| Variable | Type | Description |
|----------|------|-------------|
| `ctx.caller` | `str` | Immediate caller (user address or contract name) |
| `ctx.signer` | `str` | Original transaction signer (never changes in call chain) |
| `ctx.this` | `str` | Name of the currently executing contract |
| `ctx.owner` | `str` or `None` | Owner of the current contract |
| `ctx.entry` | `tuple` | `(contract, function)` of the transaction entry point |

## Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `now` | `Datetime` | Block timestamp (deterministic) |
| `block_num` | `int` | Current block height |
| `block_hash` | `str` | Current block hash |
| `chain_id` | `str` | Network chain identifier |

## Variable Operations

```python
owner.set("alice")          # Write
value = owner.get()         # Read (returns None or default_value if unset)
```

## Hash Operations

```python
balances["alice"] = 100         # Write single key
bal = balances["alice"]         # Read single key
balances["alice"] += 50         # Augmented assignment

balances["alice", "bob"] = 10   # Multi-dimensional key (up to 16 dimensions)
val = balances["alice", "bob"]  # Read multi-dimensional

all_vals = balances.all()           # Get all values
all_alice = balances.all("alice")   # Get all values with prefix
pairs = balances._items()           # Get key-value dict
balances.clear()                    # Delete all entries
balances.clear("alice")             # Delete entries with prefix
```

## Imports

```python
# Static import (resolved at submission time)
import currency
currency.transfer(amount=100, to="bob")

# Dynamic import (resolved at runtime)
import importlib
token = importlib.import_module("con_my_token")
token.transfer(amount=100, to="bob")

# Interface enforcement
importlib.enforce_interface(token, [
    importlib.Func("transfer", args=("amount", "to")),
    importlib.Var("balances", Hash),
])

# Check contract owner
owner = importlib.owner_of("con_my_token")
```

## Allowed Type Annotations

For `@export` function arguments:

```python
str, int, float, bool, dict, list, Any
datetime.datetime, datetime.timedelta
```

## Allowed Builtins

```
abs     all      any      ascii    bin      bool     bytearray  bytes
chr     dict     divmod   filter   float    format   frozenset  hex
int     isinstance  issubclass  len   list     map      max        min
oct     ord      pow      range    reversed round    set        sorted
str     sum      tuple    zip      Exception  True    False      None
```

## Forbidden Patterns

| Pattern | Alternative |
|---------|-------------|
| `class` | Use module-level functions and Hash/Variable |
| `try/except` | Use `assert` for error handling |
| `lambda` | Use named functions |
| `async/await` | Not supported |
| `yield` / generators | Use list comprehensions |
| `with` statements | Not supported |
| Nested functions | Define all functions at top level |
| `from X import Y` | Use `import X` then `X.Y` |
| Standard library | Use Xian runtime modules only |

## Events

```python
# Declare
Transfer = LogEvent(
    event="Transfer",
    params={
        "from": {"type": str, "idx": True},
        "to": {"type": str, "idx": True},
        "amount": {"type": (int, float)},
    },
)

# Emit
Transfer({"from": ctx.caller, "to": "bob", "amount": 100})
```

## Testing

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()

# Submit contract
client.submit(my_contract_func, name="con_test")

# Get handle and call functions
contract = client.get_contract("con_test")
contract.transfer(to="alice", amount=100)

# Read/write state directly
client.get_var("con_test", "balances", arguments=["alice"])
client.set_var("con_test", "balances", arguments=["alice"], value=9999)

# Change signer
client.signer = "alice"
```

## Common Assertions

```python
assert amount > 0, "Amount must be positive"
assert balances[ctx.caller] >= amount, "Insufficient balance"
assert ctx.caller == owner.get(), "Only owner"
assert ctx.caller == ctx.signer, "Direct calls only"
```
