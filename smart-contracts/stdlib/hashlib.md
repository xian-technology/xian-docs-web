# Hashlib

The runtime exposes a deterministic `hashlib` module with two helpers:

```python
hashlib.sha256(value)
hashlib.sha3(value)
```

## Input Handling

Both helpers accept strings. If the input is valid hex, it is interpreted as
bytes; otherwise it is hashed as UTF-8 text.

## Output

Both return lowercase hex strings.

## Common Uses

- deterministic identifiers
- permit message hashing
- compact lookup keys
