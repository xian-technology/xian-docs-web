# Crypto

The contract runtime exposes a small `crypto` module.

## Available Functions

```python
crypto.verify(vk, msg, signature)
crypto.key_is_valid(key)
```

## `crypto.verify(...)`

Returns `True` when the Ed25519 signature matches the message and verification
key.

## `crypto.key_is_valid(...)`

Returns `True` when the provided hex key is a valid 64-character hex string.

## Typical Use

Canonical permit-style flows use signature verification to authorize actions
without requiring a direct transaction from the approving account.
