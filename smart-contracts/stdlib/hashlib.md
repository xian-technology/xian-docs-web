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

## Historical Aliases

`hashlib.sha256(hex_str)` and `hashlib.sha3(hex_str)` preserve the historical
hexadecimal-first behavior. Valid hex is decoded before hashing; ASCII whitespace
is allowed between complete bytes. Input that cannot be decoded is hashed as
UTF-8 text. Both accept `hex_str` as a keyword argument.

For example, `hashlib.sha256("68")` hashes the byte for `h`, while
`hashlib.sha256("hello")` hashes UTF-8 text. Use the explicit `_text` or `_hex`
helpers for new message formats so the interpretation is evident at the call site.

## Payload Limits and Chi

Limits count UTF-8 bytes, not Python characters. One MiB is 1,048,576 bytes;
for example, `"é"` occupies two UTF-8 bytes.

| Input | Maximum |
| --- | ---: |
| `_text` | 1 MiB |
| `_hex` | 2 MiB encoded input, representing at most 1 MiB decoded bytes |
| historical alias, before hex detection | 2 MiB raw input, including whitespace |
| historical alias, valid hex branch | 1 MiB decoded bytes |
| historical alias, fallback text branch | 1 MiB UTF-8 text |

An oversized input raises a resource-limit error. These limits apply to both
native execution and the local Python harness, including unmetered calls.
They apply regardless of whether the string came from an argument, storage,
concatenation, or another contract. They are limits on hashing, not a general
128 KiB string-size restriction.

Native execution charges by supplied input bytes before copying, hex detection,
decoding or hashing. Historical aliases charge for the entire raw input,
including whitespace and a failed hex-detection pass. A fallback text input
larger than 1 MiB therefore fails after the charged detection step. Direct
calls, stored function aliases, and iterator callbacks use the same per-call
work prices. See the [hash and crypto cost table](/reference/chi-costs#hashing-and-signatures).

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
