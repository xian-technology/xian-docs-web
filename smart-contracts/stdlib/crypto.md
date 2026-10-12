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

- `vk` is a valid 32-byte Ed25519 public key encoded as hex
- `signature` is a valid Ed25519 signature in hex
- the signature matches the UTF-8 encoded `msg` string

If the key and signature decode cleanly but the signature does not verify, it
returns `False`. Malformed hex inputs or an invalid Ed25519 public-key shape
can raise before signature verification runs, so validate untrusted public keys
with `crypto.key_is_valid(...)` before calling `crypto.verify(...)`.

This is a raw Ed25519 primitive. It does not look up the account registry or
follow key rotation and recovery. Do not use an account's original public key
here to authorize spending or approvals: that would retain old-key authority
after enrollment. Fresh-chain currency and stream contracts use authenticated
transaction callers. Protocols
using off-chain messages need a separately designed and reviewed authorization
scheme.

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

## Signature Acceptance

Verification rejects small-order public keys and signature points, malformed
point encodings, and noncanonical signature scalars. Use signatures produced
from randomly generated Ed25519 seeds. A syntactically valid key is not proof
that a signature is valid.

The node admission fast path and VM use strict Ed25519 verification. Deploy
validator runtime changes from the same pinned release across the network;
changing signature acceptance is consensus-sensitive.
