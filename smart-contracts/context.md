# Context Variables

The runtime injects `ctx` and block metadata into contract execution.

## `ctx` Properties

| Property | Meaning |
| --- | --- |
| `ctx.caller` | immediate caller: an account or another contract |
| `ctx.signer` | original transaction signer; unchanged across a call chain |
| `ctx.this` | contract currently executing |
| `ctx.owner` | runtime `__owner__` metadata, or `None` |
| `ctx.entry` | `(contract, function)` at the transaction entry point |
| `ctx.submission_name` | contract being deployed during module and constructor execution |

If account `alice` calls `contract_a`, which then calls `contract_b`, the
second call sees `ctx.signer == "alice"`, `ctx.caller == "contract_a"`, and
`ctx.this == "contract_b"`.

Use `ctx.caller` for immediate authorization. Use `ctx.signer` only when the
original external signer is intentionally the authority.

## Factory Deployment

Factories pass child source to the built-in `submission` contract. Validators
compile the source and persist canonical IR; factories do not submit executable
artifacts.

```python
import submission

CHILD_SOURCE = """
value = Variable()

@construct
def seed(label: str):
    value.set(label)

@export
def read() -> str:
    return value.get()
"""

@export
def deploy_child(name: str, label: str):
    submission.submit_contract(
        name=name,
        code=CHILD_SOURCE,
        owner=ctx.caller,
        constructor_args={"label": label},
    )
```

During the child's module and constructor execution:

- `ctx.this` and `ctx.submission_name` are the child name
- `ctx.caller` is the factory contract
- `ctx.signer` is the original transaction signer
- `ctx.entry` remains the outer transaction entry point

## Runtime Ownership

`ctx.owner` is separate from an application variable such as
`owner = Variable()`. Transfer runtime ownership through the authorized
submission surface:

```python
import submission

@export
def handoff(contract: str, new_owner: str):
    submission.change_owner(contract=contract, new_owner=new_owner)
```

## Block Metadata

| Value | Meaning |
| --- | --- |
| `now` | finalized block timestamp |
| `block_num` | executing block height |
| `block_hash` | executing block hash |
| `chain_id` | network chain identifier |

These values come from consensus context, not the validator's local clock.
