# Datetime

The runtime injects a deterministic `datetime` module and the `now` environment
variable.

## Available Types

```python
datetime.datetime(...)
datetime.datetime.strptime(...)
datetime.timedelta(...)
datetime.WEEKS
datetime.DAYS
datetime.HOURS
datetime.MINUTES
datetime.SECONDS
```

`datetime.datetime` accepts integer components and years from 1 through 9999.
Duplicate, unknown and excess arguments fail. `datetime.timedelta` converts its
five components with `int()` and checks duration bounds before constructing a
value. Its `minutes`, `hours`, `days` and `weeks` fields floor toward negative
infinity; for example, `datetime.timedelta(seconds=-1).minutes` is `-1`.

## Parsing Text

`strptime` uses an explicit numeric format subset in both the Python harness and
the native VM. Results do not depend on the machine's locale or timezone database.

| Directives | Meaning |
| --- | --- |
| `%Y`, `%y` | Four-digit year, two-digit year |
| `%m`, `%d` | Month, day of month |
| `%H`, `%I`, `%M`, `%S` | 24-hour or 12-hour clock, minute, second |
| `%f` | One to six decimal microsecond digits |
| `%j` | Day of year |
| `%U`, `%W` | Week number, with Sunday or Monday as the first weekday |
| `%w`, `%u` | Weekday: Sunday=0 or Monday=1 |
| `%G`, `%V` | ISO week year and week number |
| `%%` | Literal percent sign |

Numeric fields use ASCII digits. Literal Unicode text is allowed; whitespace in
the format matches one or more whitespace characters. Repeated numeric
directives, a trailing `%`, and directives outside this table fail. In particular,
`%F`, month/weekday names, locale expansions, AM/PM (`%p`) and timezone directives
are unsupported.

Omitted fields default to `1900-01-01 00:00:00`. The two-digit-year pivot is 69:
69–99 map to 1969–1999 and 00–68 to 2000–2068. Fractions are padded on the right
to six microsecond digits. `%I` has no AM/PM marker, so its values are interpreted
as AM, with 12 representing midnight.

Do not combine `%Y` with `%y`, `%H` with `%I`, `%U` with `%W`, or `%w` with `%u`.
An ISO week date requires `%G`, `%V` and one weekday directive; it cannot be mixed
with calendar year/month/day, day-of-year, or `%U`/`%W` fields.

Parsing also has a deterministic work limit. Formats whose numeric-field widths
require excessive parsing work fail even in unmetered execution; a transaction's
chi budget can stop parsing earlier. Keep formats short and explicit, and test
the exact input/format combination used by the contract.

```python
date = datetime.datetime.strptime("2026-02-03", "%Y-%m-%d")
# 2026-02-03 00:00:00

time = datetime.datetime.strptime("23:45:01.12", "%H:%M:%S.%f")
# 1900-01-01 23:45:01.120000

week = datetime.datetime.strptime("2024-W01-1", "%G-W%V-%u")
# 2024-01-01 00:00:00
```

## Duration Arithmetic

Multiply a duration by an integer to scale it:

```python
delay = datetime.DAYS * 7
```

Duration-by-duration multiplication preserves the historical Xian wrapper rule.
Each operand is normalized into whole days and a nonnegative remainder below
86,400 seconds. The day components are multiplied together, and the remainder
components are multiplied together; the resulting components form a duration.
This is an unusual compatibility rule, not ordinary dimensional time arithmetic.

```python
a = datetime.timedelta(days=2)
b = datetime.timedelta(days=3)
assert (a * b).days == 6

c = datetime.timedelta(days=1, seconds=2)
d = datetime.timedelta(days=2, seconds=3)
assert (c * d).seconds == 172806  # two days plus six seconds
```

Negative operands are normalized first. A duration of -1 second has components
-1 day and 86,399 seconds; multiplying it by itself therefore produces
7,464,873,601 seconds. Prefer integer scaling when expressing a multiple of a
time interval. Operations outside the supported normalized duration range fail
instead of wrapping.

## Example

```python
unlock_at = Variable()

@construct
def seed():
    unlock_at.set(now + datetime.DAYS * 7)

@export
def withdraw():
    assert now >= unlock_at.get(), "Too early"
```

## Policy Examples

The meaning of `now` stays the same across all networks. What changes is
whether chain time advances while the network is idle.

On an `on_demand` network:

- no idle blocks are produced
- `now` does not move until another block is created

On a `periodic` network with `10s` empty blocks:

- chain time advances roughly every 10 seconds
- deadlines can expire even if no user transactions are submitted

That means contracts should treat time as a condition checked during execution,
not as a background scheduler.

## Notes

- `now` comes from block context, not local wall-clock time
- `now` is the finalized consensus block timestamp
- every transaction in the same block sees the same `now`
- the exposed `Datetime` and `Timedelta` types are restricted runtime wrappers
- these types are also valid for exported-function annotations
