# Hashlib

The runtime exposes a deterministic `hashlib` module with two helpers:

```python
hashlib.sha256(value)
hashlib.sha3(value)
```

## Input Rules

Both helpers accept a string.

The runtime interprets that string in one of two ways:

- if it is valid hex, it is decoded as bytes first
- otherwise it is UTF-8 encoded as ordinary text

This makes it convenient to hash either textual messages or already-encoded
byte-like payloads represented as hex strings.

## Output

Both functions return lowercase hex strings.

## Common Uses

- deterministic identifiers
- permit or authorization-message hashing
- compact code or config fingerprints
- note, payload, or commitment helper flows in privacy-oriented contracts

## Design Guidance

- be explicit about whether callers should pass text or hex
- keep the message format stable before hashing
- do not mix human-readable strings and raw-hex payload conventions casually
