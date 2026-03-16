# Hashes & Multihashes

A `Hash` is a key-value mapping that persists on-chain. Use it for collections like balances, approvals, or any data indexed by one or more keys.

## Declaration

```python
balances = Hash(default_value=0)
metadata = Hash()
approvals = Hash(default_value=0)
```

### With Default Value

```python
balances = Hash(default_value=0)
```

Reading a key that was never set returns `default_value` instead of `None`.

## Single-Key Access

```python
@export
def transfer(to: str, amount: float):
    sender = ctx.caller
    assert balances[sender] >= amount, "Insufficient"
    balances[sender] -= amount
    balances[to] += amount
```

Use bracket notation like a Python dict. Augmented assignment (`+=`, `-=`) works.

## Multi-Dimensional Keys

Hashes support up to **16 dimensions** by passing tuple keys:

```python
# Two dimensions: approvals[owner, spender]
approvals = Hash(default_value=0)

@export
def approve(spender: str, amount: float):
    approvals[ctx.caller, spender] = amount

@export
def allowance(owner: str, spender: str):
    return approvals[owner, spender]
```

Three dimensions:

```python
# inventory[player, zone, item_type]
inventory = Hash(default_value=0)

@export
def add_item(zone: str, item: str, qty: int):
    inventory[ctx.caller, zone, item] += qty
```

### Key Constraints

- Maximum **16** dimensions (keys in the tuple)
- Maximum **1024 bytes** per key (total encoded length)
- Keys cannot contain `:` or `.` characters (reserved for internal encoding)
- Slices (`hash[1:3]`) are not supported
- The `in` operator (`key in hash`) is not supported — check the value directly

## Iterating Over Entries

### `all(*args)` — Get All Values

```python
# Get all balances
all_values = balances.all()

# Get all approvals for a specific owner
owner_approvals = approvals.all("alice")
```

For multi-dimensional hashes, pass prefix keys to filter. `all("alice")` returns all values where the first key is `"alice"`.

### `_items(*args)` — Get Key-Value Pairs

```python
# Get all key-value pairs
pairs = balances._items()
# Returns: {"alice": 100, "bob": 200}

# With prefix filter
alice_items = approvals._items("alice")
# Returns: {"alice:bob": 50, "alice:carol": 100}
```

### `clear(*args)` — Delete Entries

```python
# Delete all entries
balances.clear()

# Delete entries with prefix
approvals.clear("alice")  # Remove all of Alice's approvals
```

## Type Handling

- `float` and `Decimal` values are automatically converted to `ContractingDecimal` on read
- `list` and `dict` values return defensive copies (modifying the returned value doesn't change the stored value)

```python
@export
def modify_list():
    data["items"] = [1, 2, 3]

    items = data["items"]   # returns a copy
    items.append(4)         # modifies the copy only

    data["items"] = items   # must write back explicitly
```

## Example: Full Token Contract

```python
balances = Hash(default_value=0)
metadata = Hash()

@construct
def seed():
    balances[ctx.caller] = 1_000_000
    metadata["name"] = "My Token"
    metadata["symbol"] = "MTK"

@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    assert balances[ctx.caller] >= amount, "Insufficient balance"
    balances[ctx.caller] -= amount
    balances[to] += amount

@export
def balance_of(account: str):
    return balances[account]
```
