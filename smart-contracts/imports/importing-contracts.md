# Importing Other Contracts

Static imports let one contract call functions on another deployed contract. The syntax is the same `import` statement you already know from Python, but the module loader only resolves names to deployed contracts -- never to the Python standard library.

## Basic Import

```python
import currency

@export
def buy_item(item_id: str, price: float):
    currency.transfer(amount=price, to=ctx.this)
    items[item_id] = ctx.caller
```

When this contract is submitted, the runtime verifies that `currency` exists as a deployed contract. If it does not exist, submission fails.

## Calling Functions on Imported Contracts

Once imported, you call exported functions on the contract object just like calling methods on a Python module:

```python
import currency

@export
def pay(to: str, amount: float):
    # Calls the transfer function on the currency contract
    currency.transfer(amount=amount, to=to)
```

You can only call `@export` functions. Private functions and the constructor are not accessible.

### Passing Arguments

Arguments must be passed by keyword:

```python
import currency

@export
def donate(amount: float):
    currency.transfer(amount=amount, to="charity_address")
```

### Capturing Return Values

If the imported function returns a value, you can capture it:

```python
import con_oracle

@export
def check_price(pair: str):
    price = con_oracle.get_price(pair=pair)
    assert price is not None, "No price available"
    return price
```

## How the Module Loader Works

The Xian module loader replaces Python's standard import machinery entirely:

1. When the contract is submitted, the linter checks every `import` statement.
2. Each imported name is looked up in the state database -- it must be a deployed contract.
3. Standard library imports (`import os`, `import sys`, `import json`, etc.) are **forbidden** and produce linter error **E005**.
4. `from X import Y` syntax is **forbidden** -- use `import X` and then `X.Y`. This produces linter error **E004**.
5. Imports must be at the module level (top of the file). Imports inside functions produce linter error **E003**.

### What Can Be Imported

| Allowed | Not Allowed |
|---------|-------------|
| Deployed contracts (`import currency`) | Standard library (`import os`) |
| Contracts starting with `con_` | Relative imports (`from . import x`) |
| The `importlib` module | `from X import Y` syntax |

### Context Changes During Cross-Contract Calls

When contract A calls contract B, the context updates:

```
User "alice" calls contract_a.action()
  ctx.caller = "alice"
  ctx.this   = "contract_a"

  contract_a calls currency.transfer(...)
    ctx.caller = "contract_a"   # changed to the calling contract
    ctx.this   = "currency"     # now executing in currency
    ctx.signer = "alice"        # always the original transaction signer
```

This is how the currency contract knows that `contract_a` is the immediate caller, which is critical for allowance patterns and access control.

## Multiple Imports

You can import as many contracts as you need:

```python
import currency
import con_dex
import con_oracle

@export
def swap(token_in: str, amount: float):
    price = con_oracle.get_price(pair=token_in)
    currency.transfer(amount=amount, to=ctx.this)
    con_dex.execute_swap(token=token_in, amount=amount, price=price)
```

## Import vs ForeignHash / ForeignVariable

If you only need to **read** another contract's state (not call its functions), consider using `ForeignVariable` or `ForeignHash` instead. These are read-only and do not execute any foreign code.

See [Foreign Variables & Hashes](/smart-contracts/storage/foreign) for details.
