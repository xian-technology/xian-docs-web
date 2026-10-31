# Valid Code & Restrictions

Xian contracts are ordinary Python syntax inside a restricted execution model.
The linter enforces that restricted subset before code is accepted.

## Allowed Syntax

| Feature | Example | Notes |
|---------|---------|-------|
| assignment | `x = 1` | |
| arithmetic | `+`, `-`, `*`, `/`, `//`, `%`, `**` | |
| comparisons | `==`, `!=`, `<`, `>`, `<=`, `>=`, `in`, `not in`, `is`, `is not` | |
| boolean logic | `and`, `or`, `not` | |
| `if` / `elif` / `else` | `if x > 0:` | |
| `for` / `while` | loops | metered like everything else |
| functions | `def f():` | top-level only |
| `return` | `return value` | |
| `assert` | `assert ok, "message"` | main validation pattern |
| f-strings | `f"Hello {name}"` | basic interpolation and allowed expressions only; conversions (`!r`, `!s`, `!a`), debug syntax (`{name=}`), and format specifications (`:04d`) are unsupported |
| collections | `list`, `dict`, `tuple`, `set()`, `frozenset()` | set literals and set comprehensions are blocked |
| list and dict comprehensions | `[x for x in items]`, `{k: v for k, v in items}` | generator expressions are not allowed |
| ternary expressions | `"yes" if ok else "no"` | lowered into Xian VM IR and metered like other expressions |
| subscripts / slices | `x[0]`, `x[1:3]` | |
| imports | `import currency` | module-level only for deployed contracts |

## Forbidden Syntax

| Feature | Error Code | Why |
|---------|------------|-----|
| `try/except`, `with`, `lambda`, `yield`, `yield from`, `nonlocal`, `@`, set literals, set comprehensions, semicolons, one-line compound statements | `E001` | outside the supported contract language |
| names starting or ending with `_` | `E002` | blocks Python internals / escape paths |
| import inside a function | `E003` | imports must be explicit and module-level |
| `from x import y` | `E004` | use `import x` then `x.y` |
| stdlib module import | `E005` | only deployed contracts and runtime modules are allowed |
| class definitions | `E006` | contracts are module/function based |
| async functions | `E007` | no async execution in contracts |
| invalid decorators | `E008` | only `@export` and `@construct` |
| multiple constructors | `E009` | only one constructor allowed |
| multiple decorators on one function | `E010` | single-decorator model |
| forbidden ORM kwargs | `E011` | runtime owns those names |
| tuple unpacking of ORM declarations | `E012` | storage declarations must be explicit |
| no `@export` function present | `E013` | contract needs a public API |
| forbidden builtin or reserved name | `E014` | unsafe builtins and reserved identifiers are blocked |
| exported arg shadows ORM name | `E015` | avoids confusing state collisions |
| invalid argument annotation | `E016` | exported args must use allowed types |
| missing export annotation | `E017` | exported args must be typed |
| invalid export return annotation | `E018` | export returns may only use allowed types |
| nested function definition | `E019` | avoids closures and hidden state |
| parse error | `E020` | ordinary syntax error |
| invalid decorator arguments | `E021` | `@export` only supports `typecheck=True/False`; `@construct` takes no arguments |
| profile-blocked syntax | `E022` | rejected by the active validation profile |
| profile-blocked builtin | `E023` | builtin is not supported by the active validation profile |

## Allowed Builtins

The builtin allowlist is intentionally small:

```text
Exception False None True abs all any ascii bin bool bytearray bytes chr
dict divmod filter float format frozenset hex import int isinstance issubclass len
list map max min oct ord pow range reversed round set sorted str sum tuple zip
```

Everything else is treated as forbidden.

Public attribute syntax is broader than the implemented method surface. An
expression such as `value.method()` passing compilation does not guarantee that
the method exists for that value in the native runtime. Check the supported
runtime behavior and execute contract tests against the native VM.

The runtime repository's [surface inventory and behavioral matrix](https://github.com/xian-technology/xian-contracting/tree/main/tests/surface)
tracks callable builtins, host APIs and public value members. It records missing
members separately from tested behavior. Nominal, boundary and invalid-input
cases cover every callable builtin; this does not establish correctness for
every input or complete Python compatibility.

String predicates, whitespace handling and upper/lower mappings use pinned
Unicode 15.0 semantics from the historical Python 3.12 runtime, including
contextual Greek final sigma. A newer host Python's Unicode database is not the
consensus definition. `isdigit()` includes Unicode digits, not every numeric
character; `isalpha()` tests letters, and `islower()` ignores uncased characters
while requiring at least one cased character.

`isinstance` and `issubclass` reject non-class descriptors and inspect class
tuples in order, stopping after a match. `Any` is an annotation marker and is
invalid for `isinstance`. The guarded `range` callable is a function, not a
class descriptor. Immutable `frozenset.copy()` preserves object identity.

## Allocation Guards

Allowed builtins are bounded by deterministic runtime limits:

- the Python harness limits `range(...)` to `131,072` entries; native ranges are lazy, with materialized collections limited to `131,072` entries.
- `bytes(n)` and `bytearray(n)` may allocate at most `131,072` bytes.
- string, bytes, bytearray, list, and tuple repetition with `*` may not exceed the same sequence or byte limits.
- integer multiplication, exponentiation, and left shifts may not create integers larger than `1,048,576` bits.
- `int(...)` string and bytes inputs may be at most `8,192` characters or bytes.
- three-argument `pow(base, exponent, modulus)` keeps the result bounded by the modulus, requires a nonnegative exponent, and rejects exponent values with more than `8,192` bits.
- returned contract values are charged by encoded size; keep responses small
  and paginate collections.
- submitted contract source may not exceed `131,072` bytes.

These guards prevent contracts from allocating large in-memory objects or huge
integers in a single operation while keeping validation deterministic.

## Allowed Export Signature Annotations

The same allowlist applies to exported arguments and exported return
annotations:

```python
str, int, float, bool, bytes, bytearray, dict, list, set, frozenset, Any
datetime.datetime, datetime.timedelta
```

In Xian, `float` in an export signature means a deterministic decimal-backed
value at runtime. Use `float` for user-facing decimal amounts, not Python
`Decimal`.

Examples:

```python
@export
def balance_of(address: str) -> float:
    return balances[address]

@export
def decode_batch(items: list[int]) -> dict[str, int]:
    return {
        "count": len(items),
    }
```

Subscripted container annotations are valid when the base type is allowed, for
example `list[int]` and `dict[str, int]`.

## Export Decorator Options

`@export` may be used in either of these forms:

```python
@export
def balance_of(address: str) -> float:
    return balances[address]

@export(typecheck=True)
def transfer(amount: float, to: str):
    balances[ctx.caller] -= amount
    balances[to] += amount
```

No positional decorator arguments are allowed. The only supported keyword is
`typecheck`, and it must be `True` or `False`.

Invalid annotations fail:

```python
@export
def bad(value: Decimal):
    return value
```

## Import Rules

Allowed imports are deployed contracts, for example `import currency`.

Runtime-provided modules such as `hashlib`, `datetime`, `random`, `importlib`,
`crypto`, `zk`, and `decimal` are injected directly into contract scope and do
not need `import` statements.

The Python standard library is not generally available to contracts beyond that
runtime surface.

## Practical Guidance

When in doubt:

- keep contract code flat and explicit
- keep one statement per line
- use `assert` instead of exception handling
- keep all imports at module scope
- prefer simple data structures
- test the contract locally with `ContractingClient`
