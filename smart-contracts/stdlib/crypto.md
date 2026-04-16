# Crypto

The contract runtime exposes a small deterministic `crypto` module focused on
Ed25519 verification and key-shape validation.

## Available Functions

```python
crypto.verify(vk, msg, signature)
crypto.key_is_valid(key)
```

## `crypto.verify(...)`

`crypto.verify(vk, msg, signature)` returns `True` when:

- `vk` is a valid Ed25519 public key in lowercase hex
- `signature` is a valid Ed25519 signature in hex
- the signature matches the UTF-8 encoded `msg` string

If verification fails, it returns `False`.

Typical uses include:

- permit-style approvals
- signed off-chain authorizations
- relayed action authorization patterns

## `crypto.key_is_valid(...)`

`crypto.key_is_valid(key)` is a lightweight shape check.

It returns `True` only when the provided string is:

- exactly 64 hex characters
- valid hexadecimal

This is a format check, not a proof that the key controls funds or belongs to a
specific account role.

## Design Guidance

- hash or serialize the exact message format before users sign it
- keep message construction deterministic
- use `crypto.key_is_valid(...)` for input validation, not for authorization
- remember that signature verification is public and deterministic; there is no
  private key handling inside the contract runtime
