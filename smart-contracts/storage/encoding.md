# Storage Encoding & Caveats

All state values are serialized to JSON before being stored in the underlying database. Xian uses a custom JSON encoder that handles Python types not natively supported by JSON.

## Encoding Format

Values are stored as compact JSON strings (no extra spaces). The encoder uses special type markers to preserve type information through the serialization round-trip.

### Type Markers

| Python Type | JSON Marker | Example Input | Stored JSON |
|-------------|-------------|---------------|-------------|
| `Datetime` | `__time__` | `Datetime(2024, 1, 15, 12, 30)` | `{"__time__":[2024,1,15,12,30,0,0]}` |
| `Timedelta` | `__delta__` | `Timedelta(days=7)` | `{"__delta__":[7,0]}` |
| `bytes` | `__bytes__` | `b"hello"` | `{"__bytes__":"68656c6c6f"}` |
| `Decimal` | `__fixed__` | `Decimal("3.14")` | `{"__fixed__":"3.14"}` |
| Large `int` | `__big_int__` | `2**256` | `{"__big_int__":"115792089237..."}` |

Standard JSON types are stored directly:

| Python Type | Stored As |
|-------------|-----------|
| `str` | JSON string |
| `int` (small) | JSON number |
| `float` | JSON number |
| `bool` | JSON boolean |
| `None` | JSON null |
| `list` | JSON array |
| `dict` | JSON object |

## Examples

### Simple Values

```
Key: con_token.balances:alice
Value: 1000000
Stored: 1000000
```

```
Key: con_token.metadata:name
Value: "My Token"
Stored: "My Token"
```

### Decimal Values

Floats from contract arithmetic are stored as `ContractingDecimal` using the `__fixed__` marker to preserve precision:

```
Key: con_token.balances:bob
Value: Decimal("99.5")
Stored: {"__fixed__":"99.5"}
```

### Datetime Values

```
Key: con_lock.unlock_time
Value: Datetime(2025, 6, 1, 0, 0)
Stored: {"__time__":[2025,6,1,0,0,0,0]}
```

The array contains `[year, month, day, hour, minute, second, microsecond]`.

### Timedelta Values

```
Key: con_vesting.period
Value: Timedelta(days=30)
Stored: {"__delta__":[30,0]}
```

The array contains `[days, seconds]`.

### Bytes Values

```
Key: con_store.data:signature
Value: b"\xde\xad\xbe\xef"
Stored: {"__bytes__":"deadbeef"}
```

Bytes are hex-encoded.

### Large Integers

Integers that exceed the safe JSON integer range are stored using the `__big_int__` marker:

```
Key: con_math.result
Value: 2**256
Stored: {"__big_int__":"115792089237316195423570985008687907853269984665640564039457584007913129639936"}
```

### Nested Structures

Lists and dicts are serialized recursively, with type markers applied to any non-standard values inside:

```
Key: con_game.player_stats:alice
Value: {"score": Decimal("99.5"), "joined": Datetime(2024, 3, 1)}
Stored: {"score":{"__fixed__":"99.5"},"joined":{"__time__":[2024,3,1,0,0,0,0]}}
```

## Compact JSON

All stored JSON uses compact encoding with no spaces -- `json.dumps(value, separators=(",", ":"))`. This minimizes storage costs since write costs are calculated per byte.

## Key Format

Storage keys follow the pattern `contract.variable:key1:key2`:

```
currency.balances:alice              # Single-key Hash
currency.balances:alice:bob          # Multi-dimensional Hash (approvals)
con_nft.owner                        # Variable (no key suffix)
```

The key is also included in the byte-cost calculation for reads and writes.

## Determinism

JSON encoding in Xian is deterministic:

- Dictionary key order is preserved (guaranteed since Python 3.7)
- No floating-point ambiguity (decimals are stored as strings via `__fixed__`)
- Compact format eliminates whitespace variation
- All validators encode the same value to the identical byte string

This determinism is critical because the state root hash (app_hash) must match across all validators after every block.

## Caveats

### Float Precision

All `float` values in contracts are automatically converted to `ContractingDecimal` on read. This prevents floating-point rounding errors:

```python
# In a contract:
balances["alice"] = 0.1 + 0.2  # stored as Decimal("0.3"), not 0.30000000000000004
```

### Mutable Defaults

When you read a `list` or `dict` from a `Hash`, you get a **copy**. Modifying the returned value does not change storage:

```python
data["items"] = [1, 2, 3]

items = data["items"]  # this is a copy
items.append(4)        # modifies the copy, not storage

data["items"] = items  # must write back explicitly
```

### None vs Default

If a `Hash` has `default_value=0` and you read a key that was never set, you get `0` (the default). If you explicitly store `None`, reading that key returns `None`, not the default. The default only applies to keys that have never been written to.
