# Interface Patterns

When working with dynamic imports, you often need to verify that a contract implements the functions and variables you expect before calling it. The `importlib` module provides tools for interface enforcement.

## enforce_interface

`importlib.enforce_interface()` checks that a module exposes a set of required functions and variables. If the module does not match, an `AssertionError` is raised.

```python
import importlib

token_interface = [
    importlib.Func("transfer", args=("amount", "to")),
    importlib.Func("approve", args=("amount", "to")),
    importlib.Func("transfer_from", args=("amount", "to", "main_account")),
    importlib.Var("balances", Hash),
]

@export
def register_token(token_contract: str):
    token = importlib.import_module(token_contract)
    importlib.enforce_interface(token, token_interface)
    # If we get here, the contract has all required functions and variables
    registered_tokens[token_contract] = True
```

## importlib.Func

Defines a required function signature:

```python
importlib.Func(name, args)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `str` | The function name that must exist as an `@export` |
| `args` | `tuple` | Tuple of argument names the function must accept |

Examples:

```python
# Function "transfer" must accept "amount" and "to"
importlib.Func("transfer", args=("amount", "to"))

# Function "get_price" must accept "pair"
importlib.Func("get_price", args=("pair",))

# Function "seed" with no required args
importlib.Func("seed", args=())
```

## importlib.Var

Defines a required state variable:

```python
importlib.Var(name, var_type)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `str` | The variable name that must exist in the contract |
| `var_type` | type | Either `Variable` or `Hash` |

Examples:

```python
# Contract must have a Hash called "balances"
importlib.Var("balances", Hash)

# Contract must have a Variable called "owner"
importlib.Var("owner", Variable)
```

## importlib.owner_of

Returns the owner of a deployed contract, or `None` if no owner was set:

```python
import importlib

@export
def check_owner(contract_name: str):
    owner = importlib.owner_of(contract_name)
    return owner
```

This reads the `__owner__` metadata that is set when a contract is submitted.

## Complete Example: Token Registry

A registry contract that only accepts tokens conforming to the LST-001 standard:

```python
import importlib

registered = Hash(default_value=False)
token_count = Variable()

lst001_interface = [
    importlib.Func("transfer", args=("amount", "to")),
    importlib.Func("approve", args=("amount", "to")),
    importlib.Func("transfer_from", args=("amount", "to", "main_account")),
    importlib.Func("balance_of", args=("address",)),
]

@construct
def seed():
    token_count.set(0)

@export
def register(token_contract: str):
    assert not registered[token_contract], "Already registered"

    token = importlib.import_module(token_contract)
    importlib.enforce_interface(token, lst001_interface)

    registered[token_contract] = True
    token_count.set(token_count.get() + 1)

@export
def is_registered(token_contract: str):
    return registered[token_contract]
```

## Complete Example: DEX with Interface Validation

A simple swap contract that validates both token contracts before executing:

```python
import importlib

pairs = Hash()
liquidity = Hash(default_value=0)

token_interface = [
    importlib.Func("transfer", args=("amount", "to")),
    importlib.Func("transfer_from", args=("amount", "to", "main_account")),
]

@export
def add_pair(token_a: str, token_b: str):
    mod_a = importlib.import_module(token_a)
    mod_b = importlib.import_module(token_b)

    importlib.enforce_interface(mod_a, token_interface)
    importlib.enforce_interface(mod_b, token_interface)

    pair_key = token_a + ":" + token_b
    assert pairs[pair_key] is None, "Pair already exists"
    pairs[pair_key] = True

@export
def swap(token_in: str, token_out: str, amount: float):
    pair_key = token_in + ":" + token_out
    assert pairs[pair_key], "Pair not registered"

    mod_in = importlib.import_module(token_in)
    mod_out = importlib.import_module(token_out)

    mod_in.transfer_from(amount=amount, to=ctx.this, main_account=ctx.caller)
    mod_out.transfer(amount=amount, to=ctx.caller)
```

## When to Use enforce_interface

- **Dynamic imports from user input** -- always validate before calling
- **Plugin systems** -- ensure plugins conform to your expected API
- **Token registries** -- verify LST-001 compliance before listing
- **DEX contracts** -- confirm tokens support `transfer` and `transfer_from`

You do not need to enforce interfaces on static imports, because the contract is resolved at submission time and you can inspect its code directly.
