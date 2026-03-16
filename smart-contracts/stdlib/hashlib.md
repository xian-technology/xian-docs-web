# Hashlib

The `hashlib` module provides cryptographic hash functions for contracts.

## Functions

### `hashlib.sha256(data)`

Compute the SHA-256 hash of a string.

```python
import hashlib

@export
def hash_message(message: str):
    return hashlib.sha256(message)
# Returns: hex string (64 characters)
```

### `hashlib.sha3(data)`

Compute the SHA-3 (Keccak-256) hash of a string.

```python
import hashlib

@export
def hash_sha3(message: str):
    return hashlib.sha3(message)
# Returns: hex string (64 characters)
```

## Input Handling

Both functions accept:
- **Plain strings** — encoded to UTF-8 before hashing
- **Hex strings** — decoded from hex before hashing (if valid hex)

## Example: Commit-Reveal Scheme

```python
import hashlib

commitments = Hash()
reveals = Hash()

@export
def commit(commitment: str):
    """Submit a hash of your secret value."""
    assert commitments[ctx.caller] is None, "Already committed"
    commitments[ctx.caller] = commitment

@export
def reveal(secret: str):
    """Reveal your secret and verify it matches the commitment."""
    expected = hashlib.sha256(secret)
    assert commitments[ctx.caller] == expected, "Doesn't match commitment"
    reveals[ctx.caller] = secret
```

## Example: Deterministic IDs

```python
import hashlib

@export
def create_order(item: str, price: float):
    order_id = hashlib.sha256(
        str(ctx.caller) + str(item) + str(price) + str(now)
    )
    orders[order_id] = {"item": item, "price": price, "buyer": ctx.caller}
    return order_id
```
