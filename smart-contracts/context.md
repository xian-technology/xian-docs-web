# Context Variables

The `ctx` object is available in every exported function. It tells you who called the function, who signed the transaction, and which contract is executing.

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.caller` | `str` | The immediate caller — either a user address or a contract name |
| `ctx.signer` | `str` | The original transaction signer (never changes in a call chain) |
| `ctx.this` | `str` | The name of the currently executing contract |
| `ctx.owner` | `str` or `None` | The owner set when the contract was deployed |
| `ctx.entry` | `tuple` | `(contract_name, function_name)` of the transaction entry point |
| `ctx.submission_name` | `str` or `None` | The name of the contract being submitted (only during submission) |

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
