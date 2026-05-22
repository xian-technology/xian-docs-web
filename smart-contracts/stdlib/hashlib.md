# Hashlib

The runtime exposes a deterministic `hashlib` module with explicit text and
hex helpers:

```python
hashlib.sha256_text(value)
hashlib.sha256_hex(value)
hashlib.sha3_text(value)
hashlib.sha3_hex(value)
```

## Input Rules

All helpers accept a string.

Use the `_text` helpers when the value is an ordinary contract message,
identifier, JSON string, canonical payload, permit message, or other
human-readable value. The runtime hashes the exact UTF-8 bytes of the string.

Use the `_hex` helpers only when the value is already encoded as raw bytes in
hex form. Hex input must be unprefixed, have an even number of characters, and
must not contain whitespace.

```python
payload_hash = hashlib.sha3_text("transfer:alice:bob:10")
byte_hash = hashlib.sha3_hex("68656c6c6f")
```

`hashlib.sha3_text("68656c6c6f")` hashes those ten text characters.
`hashlib.sha3_hex("68656c6c6f")` decodes the hex first and hashes `hello`.

## Output

All functions return lowercase hex strings.

## Common Uses

- deterministic identifiers
- permit or authorization-message hashing
- compact code or config fingerprints
- note, payload, or commitment helper flows in privacy-oriented contracts

## Design Guidance

- choose `_text` or `_hex` at the call site; do not normalize untrusted input by guessing
- keep the message format stable before hashing
- include fixed separators, field names, or lengths when hashing multiple fields
- use `_hex` only for validated byte payloads, not for user-facing identifiers
