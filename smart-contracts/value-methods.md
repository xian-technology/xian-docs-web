# Value Methods

Contract values expose a bounded, deterministic selection of Python-style
methods. The [runtime surface inventory](https://github.com/xian-technology/xian-contracting/tree/main/tests/surface)
records the exact reviewed names, examples and remaining exclusions. Source
acceptance alone does not establish that every host Python API is available.

## Bound Methods and Arguments

A method can be assigned to a local variable or passed to a local helper or
callback. It retains the original receiver, including mutations made after the
method was retrieved.

```python
values = [3, 1]
append = values.append
order = values.sort
values.extend([2])
append(4)
order(reverse=True)
assert values == [4, 3, 2, 1]

render = "item={:02d}".format
assert list(map(render, [3, 1])) == ["item=03", "item=01"]
```

Direct and bound calls use the same method signatures. Allowed keyword arguments
remain method-specific: `text.split(sep=",", maxsplit=1)` and
`values.sort(key=key_function, reverse=True)` accept keywords; `values.append(4)`
takes a positional argument. Unknown keywords, duplicate arguments and keyword
arguments for positional-only parameters fail. Receiver/method lookup happens
before evaluating call arguments.

Bound methods are execution-local values. They cannot be written to `Variable`
or `Hash`, returned as transaction results, or passed across a contract boundary,
including when nested inside a list or dictionary. Pass ordinary data between
contracts and retrieve methods inside the receiving execution.

The same boundary rule applies to local functions, global storage handles and
event definitions, whose meaning belongs to their originating contract. Checks
also cover values inserted into shared arguments by a callee. Ordinary data
containers retain their shared identity across contract calls. An explicit
read-only foreign-contract storage reference remains tied to its named contract.

Native string representations of bound methods are deterministic, such as
`<bound method list.append>`. They omit host object addresses and therefore do
not reproduce CPython's address-bearing representation.

Method aliases do not imply support for every module function or constructor
alias. Call `hashlib.sha3`, `decimal`, `datetime.datetime` and
`datetime.timedelta` directly; retrieving those callables and invoking the
retrieved value is not supported by the native VM.

## Collections and Numeric Values

| Value | Supported behavior and examples |
| --- | --- |
| Dictionary | `popitem()` removes the last inserted pair; inserting a removed key places it at the end. Empty dictionaries fail. |
| Dictionary keys/items views | Live iteration, `isdisjoint`, intersection, union, difference and symmetric difference. Use `set([...])`; set literals are outside the contract syntax. |
| Dictionary values view | Live value iteration; it does not expose key/item set operations. |
| View `.mapping` | A live, read-only mapping proxy with indexing, membership, iteration, `len`, `get`, `keys`, `values`, `items` and `copy`. |
| Range | `start`, `stop`, `step`, `count` and `index`; these queries do not materialize the range. A missing value makes `index` fail. |
| Integer/boolean | `bit_length`, `bit_count`, `is_integer`, `as_integer_ratio`, `conjugate`, `to_bytes` and `from_bytes`; numeric attributes include `real`, `imag`, `numerator` and `denominator`. |
| Binary float | `is_integer`, `as_integer_ratio`, `hex`, `fromhex`, `conjugate`, `real` and `imag`. |

Mapping proxies retain their source dictionary and reflect subsequent changes.
They cannot be persisted or returned across a VM boundary. Use `proxy.copy()`
to obtain an ordinary dictionary snapshot when a serializable value is needed.

View set operations use deterministic set ordering. One compatibility limitation
remains: Python distinguishes a built-in set produced by view algebra from the
deterministic wrapper returned by the contract's `set()` constructor. The native
VM currently represents both with the same set type. Comparisons between these
results, views and constructor-created sets are therefore not fully equivalent;
do not rely on that type distinction in a contract.

```python
entries = {"a": 1, "b": 2}
view = entries.keys().mapping
assert entries.popitem() == ("b", 2)
entries["c"] = 3
assert view["c"] == 3
snapshot = view.copy()

number = 257
encoded = number.to_bytes(length=2, byteorder="big", signed=False)
assert encoded.hex() == "0101"
assert int.from_bytes(encoded, byteorder="big", signed=False) == number
```

Decimal literals and explicit `float("1.5")` values are different runtime types:
the former use Xian's deterministic decimal wrapper, while the latter produce
binary64 floats. Do not assume they expose the same methods or rounding behavior.

## Text and Binary Operations

String methods include searching and partitioning, trimming, prefix/suffix
removal, splitting, padding, translation, character predicates and case
transformations. `bytes` and `bytearray` expose their corresponding byte-oriented
operations; bytearray mutation retains aliases to the original object.

```python
assert "Straße".casefold() == "strasse"
assert "prefix-value".removeprefix("prefix-") == "value"
assert "a,b,c".rsplit(",", 1) == ["a,b", "c"]
assert "-42".zfill(6) == "-00042"

data = bytearray(b"abc")
alias = data
data.insert(1, 120)
data.remove(98)
data.reverse()
assert alias.hex() == "637861"
```

Unicode predicates, case folding, capitalization, title casing and other case
transformations use pinned Unicode 15.0 rules. They do not inherit a validator's
host Unicode version. Native strings contain Unicode scalar values; isolated
surrogates are unsupported. Byte predicates and case conversion operate on ASCII
byte values, not Unicode characters.

`hex(sep=":", bytes_per_sep=1)` accepts a one-character ASCII string or byte
separator. A positive grouping size counts from the right, a negative size from
the left, and zero disables grouping. The grouping size must fit a signed 32-bit
integer. An omitted separator differs from an
explicit `None`, which is invalid.

## Encodings

Native `str.encode` and binary `decode` support the following deterministic
encoding families. Use the canonical names in contract source.

| Canonical name | Example aliases |
| --- | --- |
| `utf-8` | `utf8`, `u8`, `cp65001` |
| `ascii` | `us-ascii`, `646` |
| `latin-1` | `latin1`, `iso-8859-1`, `cp819` |

Encoding names are case-insensitive; spaces and underscores normalize to hyphens.
Other encodings, including UTF-16, are unsupported. This is narrower than a host
Python installation's codec registry; validate contracts against the native VM.

The error-handler names are case-sensitive and limited to `strict` (the default),
`ignore`, `replace` and `backslashreplace`. An unsupported handler fails even when
the input contains no errors. Strict decoding rejects malformed input;
replacement decoding emits the Unicode replacement character, while replacement
encoding uses `?` for unrepresentable characters.

```python
encoded = "café".encode(encoding="utf-8")
assert encoded.hex() == "636166c3a9"
assert encoded.decode(encoding="utf-8") == "café"
assert "é".encode("latin-1").hex() == "e9"
assert b"\xff".decode("ascii", errors="replace") == "\ufffd"
```

Generated binary and encoded text outputs are limited to 131,072 bytes;
materialized sequences are limited to 131,072 items. Output growth, allocation
limits and chi apply to direct and bound calls alike.

## Formatting

`str.format` accepts positional and named fields, and `str.format_map` takes a
mapping for named fields. Supported conversions include `!s`, `!r` and `!a`.
Field lookup is restricted to the same public value surface as ordinary contract
expressions; formatting does not grant access to private attributes or Python
internals. Format widths and output growth are bounded.

Nonempty format specifications are type-specific. In particular, the fixed
Xian decimal wrapper does not support them; convert it to text before applying
string padding. Binary floats and raw Decimal values have their own numeric
formatting behavior. Numeric `n` formatting uses a fixed C-locale policy rather
than the validator's locale.

```python
text = "{name}: {amount:04d} {label!r}".format(name="alice", amount=7, label="ok")
assert text == "alice: 0007 'ok'"
assert "{name}/{value}".format_map({"name": "x", "value": 3}) == "x/3"
```

Automatic and explicit numeric field numbering cannot be mixed in one format.
F-strings use the same value formatter, including conversions and dynamic format
specifications built from allowed contract expressions:

```python
name = "alice"
amount = 7
width = 4
assert f"{name!r}:{amount:0{width}d}" == "'alice':0007"
```

Widths, precision and formatted output are bounded. A format can fail because it
exceeds a resource limit even when the same expression succeeds in unrestricted
Python. See [Allowed Syntax](/smart-contracts/valid-code#allowed-syntax) for the
surrounding expression restrictions.

## Deliberate Exclusions

The language follows a reviewed historical surface, rather than automatically
adopting APIs from a newer host Python. `float.from_number`, `Decimal.from_number`
and `bytearray.resize` are outside this surface. Exceptions expose their argument
payload through `args`; `add_note` and traceback access are not supported.

Test both successful and failing paths against the native runtime. Method-name
coverage is not proof for all input combinations, aliases or resource bounds;
the shared inventory and native/historical regression suites provide the detailed
evidence for each supported operation.
