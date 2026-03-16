# Dynamic Imports

Dynamic imports let you load a contract by name at runtime rather than hardcoding it with a static `import` statement. This is useful when the contract name is passed as a function argument or stored in state.

## Basic Usage

```python
import importlib

@export
def call_contract(contract_name: str, amount: float):
    module = importlib.import_module(contract_name)
    module.transfer(amount=amount, to=ctx.caller)
```

The `importlib` module is the only standard-library-style module available in Xian contracts. It is a built-in part of the contract runtime, not Python's standard `importlib`.

## When to Use Dynamic vs Static Imports

| Scenario | Use |
|----------|-----|
| You always call the same contract (e.g., `currency`) | Static: `import currency` |
| The contract name is passed by the user | Dynamic: `importlib.import_module(name)` |
| You build a DEX that works with any token | Dynamic: `importlib.import_module(token_contract)` |
| You build a registry that delegates to plugins | Dynamic: `importlib.import_module(plugin_name)` |

Static imports are resolved at submission time, so they fail early if the target does not exist. Dynamic imports are resolved at runtime, so a missing contract causes the transaction to fail -- not the submission.

## Validation Rules

The `import_module` function enforces strict rules on the contract name:

| Rule | Valid | Invalid |
|------|-------|---------|
| Lowercase only | `con_token` | `Con_Token` |
| Alphanumeric and underscores | `con_my_token` | `con-my-token` |
| No underscore prefix | `con_token` | `_con_token` |
| Must be a deployed contract | (exists on chain) | (not deployed) |

If the name fails validation or the contract does not exist, the transaction reverts.

## Example: Generic Token Wrapper

A contract that works with any LST-001 compatible token:

```python
import importlib

@export
def deposit(token_contract: str, amount: float):
    token = importlib.import_module(token_contract)
    token.transfer_from(amount=amount, to=ctx.this, main_account=ctx.caller)
    deposits[ctx.caller, token_contract] += amount

@export
def withdraw(token_contract: str, amount: float):
    assert deposits[ctx.caller, token_contract] >= amount, "Insufficient deposit"
    deposits[ctx.caller, token_contract] -= amount
    token = importlib.import_module(token_contract)
    token.transfer(amount=amount, to=ctx.caller)
```

## Example: Upgradeable Delegate

A proxy contract that delegates to a configurable implementation:

```python
import importlib

implementation = Variable()
owner = Variable()

@construct
def seed():
    owner.set(ctx.caller)
    implementation.set("con_impl_v1")

@export
def upgrade(new_impl: str):
    assert ctx.caller == owner.get(), "Only owner"
    implementation.set(new_impl)

@export
def execute(action: str, kwargs: dict):
    impl = importlib.import_module(implementation.get())
    return impl.handle(action=action, kwargs=kwargs)
```

## Combining Static and Dynamic Imports

You can mix both in the same contract:

```python
import currency
import importlib

@export
def swap(token_contract: str, amount: float):
    # Static import for the base currency
    currency.transfer(amount=amount, to=ctx.this)

    # Dynamic import for the user-specified token
    token = importlib.import_module(token_contract)
    token.transfer(amount=amount, to=ctx.caller)
```

## Security Considerations

Dynamic imports execute foreign code. The caller of your contract can pass any contract name, so be cautious:

- Validate the contract name against an allowlist if possible
- Use `importlib.enforce_interface()` to verify the contract has the expected shape before calling it (see [Interface Patterns](/smart-contracts/imports/interface-patterns))
- Remember that `ctx.caller` will be your contract's name when you call into the dynamically loaded module
