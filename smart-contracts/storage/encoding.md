# Encoding & Caveats

Contract state is stored through a deterministic JSON-based encoding layer.

## Supported Special Types

The encoder has explicit markers for:

- contract `decimal`
- `datetime.datetime` / contract `Datetime`
- `datetime.timedelta` / contract `Timedelta`
- `bytes`
- very large integers

## Why This Matters

Consensus depends on every validator encoding the same value into the same byte
representation.

For numeric values, this means:

- integers outside the JSON safe range use the `__big_int__` marker
- decimal values are encoded with the `__fixed__` marker
- the same numeric value always produces the same stored representation

Time values use arrays of integers:

- `datetime.datetime` is `{"__time__":[year,month,day,hour,minute,second,microsecond]}`;
  three to seven integers are read
- `datetime.timedelta` is `{"__delta__":[days,seconds]}`, exactly two integers

A transaction whose arguments use any other payload for these markers is
rejected as not canonical.

## Practical Advice

- keep values JSON-like where possible
- avoid storing very large blobs
- remember that storage cost is byte-based
- use shorter key and field names when chi efficiency matters

## Read/Write Cost Reminder

- reads: `2` raw meter units per byte in the native VM
- writes: `25` meter units per byte

That byte count includes both key and value.

See [Numbers, division and rounding](/smart-contracts/numbers) for numeric limits and wire examples. See [Chi Cost Table](/reference/chi-costs) for metering.
