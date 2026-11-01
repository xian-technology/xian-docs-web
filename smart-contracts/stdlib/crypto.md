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

The message is limited to 1 MiB (1,048,576) UTF-8 bytes. The public-key and
signature strings are limited to 64 and 128 encoded UTF-8 bytes, respectively;
valid hexadecimal encodings have exactly these lengths. Oversized operands
raise a resource-limit error before decoding or signature verification.
These limits apply in the native runtime and local Python harness, even when
metering is disabled.

Native verification charges a fixed verification cost plus work proportional
to the message and encoded key/signature bytes. The runtime charges before
decoding or verification, including for malformed inputs within the limits.
See the [hash and crypto cost table](/reference/chi-costs#hashing-and-signatures).

Typical uses include:

- permit-style approvals
- signed off-chain authorizations
- relayed action authorization patterns

## `crypto.key_is_valid(...)`

`crypto.key_is_valid(key)` is a lightweight shape check.

It returns `True` only when the provided string is:

- exactly 64 hex characters
- valid hexadecimal

In native execution, a string with the wrong byte length returns `False`
without copying or scanning its contents. This predicate does not perform
Ed25519 verification.

This is a format check, not a proof that the key controls funds or belongs to a
specific account role.

## Design Guidance

- hash or serialize the exact message format before users sign it
- keep message construction deterministic
- use `crypto.key_is_valid(...)` for input validation, not for authorization
- remember that signature verification is public and deterministic; there is no
  private key handling inside the contract runtime

## Signature Acceptance

The VM and node admission reject small-order public keys and signature points,
invalid point encodings, and noncanonical signature scalars. A syntactically
valid key is not proof that a signature is valid. Use signatures produced from
randomly generated Ed25519 seeds.

Signature acceptance affects transaction admission and contract execution.
Changes to these rules require a coordinated validator release; follow the
[upgrade procedure](/node/upgrading) rather than mixing verification policies
across validators.
