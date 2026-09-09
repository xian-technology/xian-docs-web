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

For numeric values, this means:

- contract `float` values are stored as `ContractingDecimal`
- decimal values are encoded with the `__fixed__` marker
- the same numeric value always produces the same stored representation

## Practical Advice

- keep values JSON-like where possible
- avoid storing very large blobs
- remember that storage cost is byte-based
- use shorter key and field names when chi efficiency matters

## Read/Write Cost Reminder

- reads: `2` raw meter units per byte in the native VM
- writes: `25` meter units per byte

That byte count includes both key and value.

See [Chi Cost Table](/reference/chi-costs). Local Python harness measurements
use a separate meter and should not be used as exact node fee quotes.
