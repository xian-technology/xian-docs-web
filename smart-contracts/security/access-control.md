# Access Control Patterns

Access control determines who can call which functions. In Xian, this is built on two context values: `ctx.caller` (the immediate caller) and `ctx.signer` (the original transaction signer).

## Owner-Only Functions

The most common pattern. Store the deployer's address at construction time and check it on sensitive operations:

```python
owner = Variable()

@construct
def seed():
    owner.set(ctx.caller)

@export
def set_config(key: str, value: str):
    assert ctx.caller == owner.get(), "Only the owner can configure"
    config[key] = value

@export
def transfer_ownership(new_owner: str):
    assert ctx.caller == owner.get(), "Only the owner can transfer ownership"
    owner.set(new_owner)
```

This pattern controls your contract's own state. It is separate from the
runtime `__owner__` metadata that powers `ctx.owner` and runtime owner gating.

If you deploy a contract with a runtime owner and want to transfer that runtime
control later, use the built-in `submission.change_owner(...)` path:

```python
import submission

@export
def handoff_runtime_owner(contract: str, new_owner: str):
    submission.change_owner(contract=contract, new_owner=new_owner)
```

Use the runtime owner path when you want the execution engine itself to enforce
who may call exported functions on that contract. Use an `owner = Variable()`
pattern when you want application-defined ownership logic inside the contract.

That runtime metadata mutation surface is intentionally restricted to the
built-in `submission` contract path. Arbitrary contracts cannot directly
rewrite another contract's runtime owner or developer metadata.

## Preventing Cross-Contract Calls

Some functions should only be callable by end users (externally owned accounts), not by other contracts. Check that `ctx.caller` equals `ctx.signer`:

```python
@export
def claim_airdrop():
    assert ctx.caller == ctx.signer, "Must be called directly, not from another contract"
    assert not claimed[ctx.caller], "Already claimed"
    claimed[ctx.caller] = True
    balances[ctx.caller] += airdrop_amount.get()
```

Why this matters: if another contract calls your function, `ctx.caller` is that contract's name. A malicious contract could exploit this to act on behalf of its caller in unexpected ways.

## Allowance Pattern (Approve / Transfer From)

The standard pattern for letting a third party (often another contract) spend tokens on your behalf:

```python
balances = Hash(default_value=0)
approvals = Hash(default_value=0)

@export
def approve(amount: float, to: str):
    assert amount >= 0, "Amount must be non-negative"
    approvals[ctx.caller, to] = amount

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert approvals[main_account, ctx.caller] >= amount, "Not enough approved"
    assert balances[main_account] >= amount, "Insufficient balance"

    approvals[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount
```

How it works:
1. Alice calls `approve(amount=100, to="con_dex")` -- this gives the DEX permission to spend 100 of Alice's tokens
2. The DEX calls `transfer_from(amount=50, to="con_dex", main_account="alice")` -- inside the token contract, `ctx.caller` is `"con_dex"`, which matches the approval

## Role-Based Access

For contracts that need more than one privileged role:

```python
owner = Variable()
operators = Hash(default_value=False)

@construct
def seed():
    owner.set(ctx.caller)

@export
def add_operator(address: str):
    assert ctx.caller == owner.get(), "Only owner"
    operators[address] = True

@export
def remove_operator(address: str):
    assert ctx.caller == owner.get(), "Only owner"
    operators[address] = False

@export
def execute_trade(pair: str, amount: float):
    assert operators[ctx.caller] or ctx.caller == owner.get(), "Not authorized"
    # ... trade logic
```

## Multi-Signature Pattern

Require multiple approvals before executing a sensitive action:

```python
signers = Hash(default_value=False)
signer_count = Variable()
threshold = Variable()
proposals = Hash()
approvals = Hash(default_value=0)
executed = Hash(default_value=False)

@construct
def seed():
    signers[ctx.caller] = True
    signer_count.set(1)
    threshold.set(1)

@export
def add_signer(address: str):
    assert signers[ctx.caller], "Not a signer"
    assert not signers[address], "Already a signer"
    signers[address] = True
    signer_count.set(signer_count.get() + 1)

@export
def set_threshold(new_threshold: int):
    assert signers[ctx.caller], "Not a signer"
    assert new_threshold > 0, "Threshold must be positive"
    assert new_threshold <= signer_count.get(), "Threshold exceeds signer count"
    threshold.set(new_threshold)

@export
def propose(proposal_id: str, action: str):
    assert signers[ctx.caller], "Not a signer"
    assert proposals[proposal_id] is None, "Proposal already exists"
    proposals[proposal_id] = action
    approvals[proposal_id] = 0

@export
def approve_proposal(proposal_id: str):
    assert signers[ctx.caller], "Not a signer"
    assert proposals[proposal_id] is not None, "Proposal not found"
    assert not executed[proposal_id], "Already executed"
    assert not approvals[proposal_id, ctx.caller], "Already approved"

    approvals[proposal_id, ctx.caller] = True
    approvals[proposal_id] += 1

    if approvals[proposal_id] >= threshold.get():
        executed[proposal_id] = True
        return True

    return False
```

## Time-Locked Actions

Require a waiting period before executing sensitive operations:

```python
pending_action = Variable()
action_unlock_time = Variable()
lock_duration = Variable()

@construct
def seed():
    owner.set(ctx.caller)
    lock_duration.set(datetime.timedelta(days=2))

@export
def propose_action(action: str):
    assert ctx.caller == owner.get(), "Only owner"
    pending_action.set(action)
    action_unlock_time.set(now + lock_duration.get())

@export
def execute_action():
    assert ctx.caller == owner.get(), "Only owner"
    assert pending_action.get() is not None, "No pending action"
    assert now >= action_unlock_time.get(), "Action is still locked"

    action = pending_action.get()
    pending_action.set(None)
    # ... execute the action
```

## Combining Patterns

Real contracts often combine several patterns. A production token might use owner-only for admin functions, allowances for third-party transfers, and direct-call restriction on airdrops:

```python
owner = Variable()
balances = Hash(default_value=0)
approvals = Hash(default_value=0)

@construct
def seed():
    owner.set(ctx.caller)
    balances[ctx.caller] = 1_000_000

@export
def mint(amount: float):
    # Owner-only
    assert ctx.caller == owner.get(), "Only owner"
    assert amount > 0, "Amount must be positive"
    balances[owner.get()] += amount

@export
def transfer(amount: float, to: str):
    # Anyone can transfer their own tokens
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount

@export
def approve(amount: float, to: str):
    # Allowance for third-party spending
    assert amount >= 0, "Amount must be non-negative"
    approvals[ctx.caller, to] = amount

@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, "Amount must be positive"
    assert approvals[main_account, ctx.caller] >= amount, "Not enough approved"
    assert balances[main_account] >= amount, "Insufficient balance"
    approvals[main_account, ctx.caller] -= amount
    balances[main_account] -= amount
    balances[to] += amount

@export
def claim_airdrop():
    # Direct calls only (no contracts)
    assert ctx.caller == ctx.signer, "No contract calls"
    assert not claimed[ctx.caller], "Already claimed"
    claimed[ctx.caller] = True
    balances[ctx.caller] += 100
```
