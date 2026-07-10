# Access Control Patterns

Access control starts with choosing the correct caller identity.

| Value | Meaning |
| --- | --- |
| `ctx.caller` | immediate account or contract calling this function |
| `ctx.signer` | original account that signed the transaction |

Use `ctx.caller` for ordinary authorization. Use `ctx.signer` only when the
original external account is intentionally the authority.

## Owner Check

```python
owner = Variable()

@construct
def seed():
    owner.set(ctx.caller)

@export
def set_config(key: str, value: str):
    assert ctx.caller == owner.get(), "Only owner"
    config[key] = value
```

This application-owned variable is separate from runtime `ctx.owner` metadata.
An application owner affects only functions that check it; a configured
runtime owner is enforced by the execution layer for calls to that contract.
Runtime ownership changes go through the authorized
`submission.change_owner(...)` surface.

## Direct Calls Only

Reject contract-mediated calls when the operation must come directly from the
signing account:

```python
@export
def claim():
    assert ctx.caller == ctx.signer, "Direct call required"
    assert not claimed[ctx.caller], "Already claimed"
    claimed[ctx.caller] = True
```

## Allowances

Delegated token spending uses the owner and immediate spender as a two-part
key:

```python
approvals = Hash(default_value=0)

@export
def approve(amount: float, to: str):
    assert amount >= 0, "Amount must be non-negative"
    approvals[ctx.caller, to] = amount

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert approvals[main_account, ctx.caller] >= amount, "Not approved"
    assert balances[main_account] >= amount, "Insufficient balance"
    approvals[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
```

## Roles and Delayed Actions

For multiple roles, store an explicit boolean or role value per account and
check it in every privileged export. For high-impact changes, store the exact
pending action and an unlock time based on `now`, then authorize and validate
again at execution.

Multi-signature and governance designs require more than counting approvals:
freeze the eligible signer set and threshold for each proposal, prevent repeat
votes, bind approvals to an exact action, and make execution one-time.

## Checklist

- authorize every privileged path with `ctx.caller`
- document any deliberate use of `ctx.signer`
- distinguish application ownership from runtime ownership
- bind approvals to an exact owner, spender, action, and scope
- test direct calls, contract calls, duplicate approvals, and role changes
