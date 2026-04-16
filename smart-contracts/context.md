# Context Variables

The `ctx` object is available in every exported function. It tells you who called the function, who signed the transaction, and which contract is executing.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.caller` | `str` | The immediate caller — either a user address or a contract name |
| `ctx.signer` | `str` | The original transaction signer (never changes in a call chain) |
| `ctx.this` | `str` | The name of the currently executing contract |
| `ctx.owner` | `str` or `None` | The runtime owner stored for the contract |
| `ctx.entry` | `tuple` | `(contract_name, function_name)` of the transaction entry point |
| `ctx.submission_name` | `str` or `None` | The name of the contract currently being deployed during module-body execution and `@construct` |

## How Context Changes in Call Chains

When contract A calls contract B, the context updates:

```
User "alice" calls contract_a.do_something()
  → ctx.signer = "alice"
  → ctx.caller = "alice"
  → ctx.this   = "contract_a"

  contract_a calls contract_b.helper()
    → ctx.signer = "alice"      (unchanged — always the original signer)
    → ctx.caller = "contract_a" (the immediate caller changed)
    → ctx.this   = "contract_b" (now executing in B)
```

This distinction is critical for security. A token contract should check `ctx.caller` for allowance-based transfers, but `ctx.signer` for direct transfers.

## Factory Deployment Context

Contracts can deploy child contracts by calling the built-in `submission`
contract.

During child module-body execution and the child `@construct`, the child sees
its own deployment context:

```python
import submission

@export
def deploy(name: str):
    code = """
value = Variable()

@construct
def seed():
    value.set({
        "this": ctx.this,
        "caller": ctx.caller,
        "signer": ctx.signer,
        "entry": ctx.entry,
        "submission_name": ctx.submission_name,
    })

@export
def get():
    return value.get()
"""

    submission.submit_contract(name=name, code=code)
```

If `con_factory.deploy("con_child")` is called by signer `alice`, then inside
the child module body and constructor:

- `ctx.this == "con_child"`
- `ctx.caller == "con_factory"`
- `ctx.signer == "alice"`
- `ctx.entry == ("con_factory", "deploy")`
- `ctx.submission_name == "con_child"`

This means factories can create child contracts without losing the original
transaction signer or the transaction entry point.

## Runtime Owner Metadata

`ctx.owner` comes from the contract's runtime `__owner__` metadata, not from an
application variable such as `owner = Variable()` or `metadata["owner"]`.

That runtime owner can be reassigned through the built-in `submission`
contract:

```python
import submission

@export
def handoff(contract: str, new_owner: str):
    submission.change_owner(contract=contract, new_owner=new_owner)
```

Changing the runtime owner affects runtime access control for owner-gated
contracts. It does not rewrite a contract's own state variables.

That metadata mutation surface is intentionally narrow: ordinary contracts do
not get a generic ability to rewrite another contract's runtime owner or
developer fields directly. Use the built-in `submission` path.

## Common Patterns

### Owner-only functions

```python
owner = Variable()

@construct
def seed():
    owner.set(ctx.caller)

@export
def admin_action():
    assert ctx.caller == owner.get(), "Only the owner can do this"
    # ... privileged logic
```

### Preventing cross-contract calls

```python
@export
def sensitive_action():
    assert ctx.caller == ctx.signer, "Must be called directly, not from another contract"
```

### Identifying the entry point

```python
@export
def process():
    entry_contract, entry_function = ctx.entry
    # Useful for logging or conditional logic based on how we were reached
```

## Environment Variables

In addition to `ctx`, exported functions have access to block-level environment variables injected by the runtime:

| Variable | Type | Description |
|----------|------|-------------|
| `now` | `Datetime` | Block timestamp (deterministic, agreed by validators) |
| `block_num` | `int` | Current block height |
| `block_hash` | `str` | Current block hash |
| `chain_id` | `str` | Network chain identifier |

```python
@export
def time_locked_withdraw(amount: float):
    assert now > unlock_time.get(), "Too early"
    balances[ctx.caller] -= amount
```

These values are the same for every transaction in the same block, ensuring deterministic execution.
