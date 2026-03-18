# Encoding & Caveats

Contract state is stored through a deterministic JSON-based encoding layer.

## Supported Special Types

The encoder has explicit markers for:

- `ContractingDecimal`
- `datetime.datetime` / contract `Datetime`
- `datetime.timedelta` / contract `Timedelta`
- `bytes`
- very large integers

## Why This Matters

Consensus depends on every validator encoding the same value into the same byte
representation.

## Practical Advice

- keep values JSON-like where possible
- avoid storing very large blobs
- remember that storage cost is byte-based
- use shorter key and field names when stamp efficiency matters

## Read/Write Cost Reminder

- reads: `1` stamp per byte
- writes: `25` stamps per byte

That byte count includes both key and value.
