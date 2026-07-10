# Common Pitfalls

## Authorization Context

`ctx.caller` is the immediate caller. `ctx.signer` is the original transaction
signer and remains unchanged across contract calls.

Use `ctx.caller` for direct authorization and allowance checks. Use
`ctx.caller == ctx.signer` when a function must reject contract-mediated calls.

```python
@export
def admin_action():
    assert ctx.caller == owner.get(), "Only owner"
```

Using `ctx.signer` here could let an intermediate contract act while preserving
the owner's signer identity.

## Amount and Balance Checks

Negative or unchecked amounts can reverse a transfer or create negative
balances.

```python
@export
def transfer(amount: float, to: str):
    assert to != "", "Recipient is required"
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

Validate bounds, identifiers, deadlines, and collection sizes before changing
state.

## Mutable Stored Values

Values read from `Hash` or `Variable` are defensive copies. Write a modified
list or dictionary back to storage:

```python
items = data["items"]
items.append(value)
data["items"] = items
```

## Persistent State

Ordinary Python globals are recreated for each execution. Persistent data must
use `Variable` or `Hash`.

```python
counter = Variable(default_value=0)

@export
def bump():
    counter.set(counter.get() + 1)
```

## External Calls

Update and validate your own state before calling another contract. Xian rolls
back the full transaction when a nested call fails, but successful callbacks
can still observe incorrectly ordered state.

Apply checks-effects-interactions and guard any workflow that must not be
re-entered.

## Numeric Semantics

Contract `float` values are deterministic decimal-backed numbers, not binary
Python floats. They support 61 whole digits and 30 fractional digits; extra
fractional digits truncate toward zero and out-of-range values fail.

Use `int` for integral quantities and test rounding/boundary behavior for
amounts and rates.

## Randomness

Contract `random` is deterministic and derived from public execution context.
It is suitable for reproducible sampling, not adversarially unpredictable
lotteries. Use a reviewed commit-reveal or oracle design when manipulation or
prediction matters.

## Secrets

Contract source, state, events, transaction inputs, and public outputs are
observable. Never store passwords, private keys, seed phrases, or unencrypted
secrets on-chain.

## Deployment Checklist

- every privileged export authorizes the correct caller
- direct-call requirements distinguish caller from signer
- amounts, balances, identifiers, deadlines, and collection sizes are bounded
- state is updated before external calls
- mutable values are written back
- no durable data relies on Python globals
- numeric precision and truncation are tested
- emitted events contain no secrets
- failure tests assert complete rollback
- deployment uses reviewed source, constructor arguments, owner, and developer
  metadata

See [Audit Checklist](/smart-contracts/security/audit-checklist) for the
short review form.
