# Common Pitfalls

This page covers the most frequent mistakes that lead to bugs or vulnerabilities in Xian smart contracts.

## 1. Forgetting to Check ctx.caller

The most dangerous mistake. Without an access control check, anyone can call your admin functions:

```python
# BAD -- anyone can call this
@export
def mint(amount: float):
    balances[ctx.caller] += amount

# GOOD -- only the owner can mint
@export
def mint(amount: float):
    assert ctx.caller == owner.get(), "Only owner"
    balances[ctx.caller] += amount
```

## 2. Confusing ctx.caller and ctx.signer

These are different when contracts call other contracts:

```
User "alice" -> contract_a.action() -> contract_b.do_work()

Inside contract_b:
  ctx.signer = "alice"       # the original transaction signer
  ctx.caller = "contract_a"  # the immediate caller
```

**When to use which:**

| Check | Use Case |
|-------|----------|
| `ctx.caller` | Allowance/approval checks (who is calling me right now?) |
| `ctx.signer` | Identifying the end user (who initiated this transaction?) |
| `ctx.caller == ctx.signer` | Ensuring a direct call (no intermediary contract) |

A common mistake is using `ctx.signer` for access control in a function that should restrict who can call it directly:

```python
# BAD -- a malicious contract could trick alice into calling it,
# then call your contract; ctx.signer would still be "alice"
@export
def admin_action():
    assert ctx.signer == owner.get(), "Only owner"

# GOOD -- checks the immediate caller
@export
def admin_action():
    assert ctx.caller == owner.get(), "Only owner"
```

## 3. Not Validating Amounts

Always check that numeric inputs are positive. Negative amounts can reverse the intended direction of a transfer:

```python
# BAD -- negative amount would ADD to sender and SUBTRACT from receiver
@export
def transfer(to: str, amount: float):
    balances[ctx.caller] -= amount
    balances[to] += amount

# GOOD -- validate first
@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

## 4. Mutable Default Values in Hash

When you read a `list` or `dict` from a `Hash`, you get a **copy**. Modifying the copy does not update storage. You must write it back explicitly:

```python
# BAD -- the append modifies a copy, not the stored value
@export
def add_item(item: str):
    items = data["list"]
    items.append(item)
    # data["list"] is unchanged!

# GOOD -- write back after modification
@export
def add_item(item: str):
    items = data["list"]
    items.append(item)
    data["list"] = items
```

This applies to any mutable value (`list`, `dict`) stored in a `Hash` or `Variable`.

## 5. Integer Overflow

Python integers have arbitrary precision, but mixing integers with floating-point arithmetic can lose precision. Use `Decimal` types through the contracting runtime for financial calculations:

```python
# BAD -- float precision issues
@export
def calculate(amount: float):
    result = amount * 0.1 + amount * 0.2
    # May not equal amount * 0.3 due to float rounding

# GOOD -- the runtime stores floats as ContractingDecimal
# which preserves precision. Stick to the Hash/Variable system:
@export
def calculate(amount: float):
    balances[ctx.caller] -= amount
    # The -= operation uses ContractingDecimal internally
```

All `float` values stored in `Hash` or `Variable` are automatically converted to `ContractingDecimal`, which provides exact decimal arithmetic.

## 6. Random is Not Truly Random

The `random` module in Xian contracts is **deterministic**. It is seeded from block data so that all validators produce the same result. This means:

- The outcome is predictable if you know the block hash and transaction index
- Do not use `random` for high-stakes outcomes where prediction matters
- Miners/validators can potentially influence the seed

```python
import random

@export
def roll_dice():
    # This is deterministic -- all validators get the same result
    # But a sophisticated attacker could predict or influence the outcome
    return random.randint(1, 6)
```

For applications where unpredictability is critical, consider commit-reveal schemes or external randomness oracles.

## 7. Missing Balance Checks Before Subtraction

Always verify the sender has enough balance before subtracting. With `default_value=0`, a subtraction on a zero balance creates a negative balance:

```python
# BAD -- creates negative balance if sender has 0
@export
def transfer(to: str, amount: float):
    balances[ctx.caller] -= amount
    balances[to] += amount

# GOOD
@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

## 8. Not Handling the Zero Address

Sending tokens to an empty string or to a nonexistent address is valid -- the tokens are effectively burned. If this is unintended, validate the recipient:

```python
@export
def transfer(to: str, amount: float):
    assert len(to) > 0, "Recipient cannot be empty"
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount
```

## 9. Re-Entrancy via Cross-Contract Calls

While Xian does not have the same re-entrancy risk as Ethereum (no raw `call` opcode), a similar pattern can occur when your contract calls an external contract that calls back into yours:

```python
# RISKY -- external contract could call back before state is updated
@export
def withdraw(amount: float):
    external_token.transfer(amount=amount, to=ctx.caller)
    balances[ctx.caller] -= amount  # state updated after external call

# SAFER -- update state before making external calls
@export
def withdraw(amount: float):
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount  # state updated first
    external_token.transfer(amount=amount, to=ctx.caller)
```

The general rule: **update your own state before calling external contracts**.

## 10. Storing Sensitive Data On-Chain

All state is publicly readable. Do not store secrets, private keys, or passwords in contract state:

```python
# BAD -- anyone can read this via the API
secret = Variable()

@construct
def seed():
    secret.set("my_secret_password")

# Use commit-reveal patterns or off-chain secret management instead
```

## Security Checklist

Before deploying a contract, verify:

- [ ] Every admin function checks `ctx.caller` against an authorized address
- [ ] All numeric inputs are validated (`amount > 0`, balance checks)
- [ ] State is updated before external contract calls
- [ ] `ctx.caller` vs `ctx.signer` is used correctly for each function
- [ ] Mutable values (lists, dicts) are written back after modification
- [ ] No sensitive data is stored in contract state
- [ ] Edge cases are tested (zero amounts, empty strings, unauthorized callers)
