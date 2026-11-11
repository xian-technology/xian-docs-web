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
| f-strings | `f"{amount:04d}"` | allowed expressions, `!s`/`!r`/`!a` conversions and bounded format specifications, including dynamic widths |
| collections | `list`, `dict`, `tuple`, `set()`, `frozenset()` | set literals and set comprehensions are blocked |
| list and dict comprehensions | `[x for x in items]`, `{k: v for k, v in items}` | generator expressions are not allowed |
| ternary expressions | `"yes" if ok else "no"` | lowered into Xian VM IR and metered like other expressions |
| subscripts / slices | `x[0]`, `x[1:3]` | |
| imports | `import currency` | module-level only for deployed contracts |

Inside an f-string format specification, write padding and precision directly,
as in `f"{amount:04d}"` or `f"{price:.{digits}f}"`. The compiler rejects literal
specification text containing backslashes, braces, quotes or control characters.
Braces around a width or precision expression still delimit a replacement field.
Ordinary f-string text outside the specification supports escapes.

## Forbidden Syntax

The compiler reports unsupported Python syntax as
`xian.syntax.unsupported_statement.<kind>`,
`xian.syntax.unsupported_expression.<kind>` or
`xian.syntax.unsupported_operator.<kind>`, and contract-language rule
violations as `xian.lint.E0xx`.

| Feature | Diagnostic | Why |
|---------|------------|-----|
| `try/except` | `xian.syntax.unsupported_statement.try` | outside the supported contract language |
| `with` / `async with` | `xian.syntax.unsupported_statement.with` | outside the supported contract language |
| `del` | `xian.syntax.unsupported_statement.delete` | remove dict entries with `pop(key)` instead |
| `global`, `nonlocal` | `xian.syntax.unsupported_statement.global` / `.nonlocal` | no hidden shared state |
| `match`, annotated assignment (`x: int = 0`), `type` aliases | `xian.syntax.unsupported_statement.match` / `.ann_assign` / `.type_alias` | outside the supported contract language |
| `from x import y` | `xian.syntax.unsupported_statement.import_from` | use `import x` then `x.y` |
| class definitions | `xian.syntax.unsupported_statement.class_def` | contracts are module/function based |
| async functions, `async for`, `await` | `xian.syntax.unsupported_statement.async_function_def` / `.async_for`, `xian.syntax.unsupported_expression.await` | no async execution in contracts |
| `lambda`, `yield`, `yield from`, `:=`, generator expressions | `xian.syntax.unsupported_expression.lambda` / `.yield` / `.named_expr` / `.generator_exp` | outside the supported contract language |
| set literals, set comprehensions | `xian.syntax.unsupported_expression.set` / `.set_comp` | use `set(...)` |
| `@` (matrix multiplication) | `xian.syntax.unsupported_operator.mat_mult` | outside the supported contract language |
| ordinary syntax error | `xian.syntax.parse_error` | source does not parse |
| augmented multiplication (`x *= y`) | `xian.lint.E001` | write `x = x * y` |
| one-line compound statements (`if x: y` on one line) | `xian.lint.E001` | bodies must start on their own line |
| names starting or ending with `_` | `xian.lint.E002` | blocks Python internals / escape paths |
| import inside a function | `xian.lint.E003` | imports must be explicit and module-level |
| stdlib module import | `xian.lint.E005` | only deployed contracts and runtime modules are allowed |
| invalid decorators | `xian.lint.E008` | only `@export` and `@construct` |
| multiple constructors | `xian.lint.E009` | only one constructor allowed |
| multiple decorators on one function | `xian.lint.E010` | single-decorator model |
| forbidden ORM kwargs | `xian.lint.E011` | runtime owns those names |
| tuple unpacking of ORM declarations | `xian.lint.E012` | storage declarations must be explicit |
| no `@export` function present | `xian.lint.E013` | contract needs a public API |
| forbidden builtin or reserved name | `xian.lint.E014` | unsafe builtins and reserved identifiers are blocked |
| exported arg shadows ORM name | `xian.lint.E015` | avoids confusing state collisions |
| invalid argument annotation | `xian.lint.E016` | exported args must use allowed types |
| missing export annotation | `xian.lint.E017` | exported args must be typed |
| invalid export return annotation | `xian.lint.E018` | export returns may only use allowed types |
| nested function definition | `xian.lint.E019` | avoids closures and hidden state |
| invalid decorator arguments | `xian.lint.E021` | `@export` only supports `typecheck=True/False`; `@construct` takes no arguments |

## Allowed Builtins

The builtin allowlist is intentionally small:

```text
Exception False None True abs all any ascii bin bool bytearray bytes chr
decimal dict divmod filter format frozenset hex import int isinstance issubclass len
list map max min mul_div_ceil mul_div_floor oct ord pow quantize range reversed set sqrt sorted str sum tuple zip
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

See [Value Methods](/smart-contracts/value-methods) for callable method values,
keyword signatures, collection views, text/binary operations and their limits.

String predicates, whitespace handling and case mappings use pinned
Unicode 15.0 semantics from the historical Python 3.12 runtime, including
contextual Greek final sigma. A newer host Python's Unicode database is not the
consensus definition. `isdigit()` includes Unicode digits, not every numeric
character; `isalpha()` tests letters, and `islower()` ignores uncased characters
while requiring at least one cased character. Native strings contain Unicode
scalar values; isolated surrogate code points are unsupported.

`isinstance` and `issubclass` reject non-class descriptors and inspect class
tuples in order, stopping after a match. `Any` is an annotation marker and is
invalid for `isinstance`. The guarded `range` callable is a function, not a
class descriptor. Immutable `frozenset.copy()` preserves object identity.

## Allocation Guards

Allowed builtins are bounded by deterministic runtime limits:

- `range(...)` values are lazy; materialized collections are limited to
  `131,072` entries.
- `bytes(n)` and `bytearray(n)` may allocate at most `131,072` bytes.
- string, bytes, bytearray, list, and tuple repetition with `*` may not exceed the same sequence or byte limits.
- exposed integer values have at most 512 magnitude bits. Decimal results have up to 61 whole and 30 fractional digits.
- `int(...)` string and bytes inputs may be at most `8,192` characters or bytes.
- three-argument `pow(base, exponent, modulus)` keeps the result bounded by the modulus, requires a nonnegative integer exponent, and enforces the V2 integer bounds.
- returned contract values are charged by encoded size; keep responses small
  and paginate collections.
- submitted contract source may not exceed `131,072` bytes.

These guards prevent contracts from allocating large in-memory objects or huge
integers in a single operation while keeping validation deterministic.

## Allowed Export Signature Annotations

The same allowlist applies to exported arguments and exported return
annotations:

```python
str, int, decimal, bool, bytes, bytearray, dict, list, set, frozenset, Any
datetime.datetime, datetime.timedelta
```

Use `decimal` for fractional values. Numeric annotations are enforced even on plain `@export` functions. See [Numbers, division and rounding](/smart-contracts/numbers).

Examples:

```python
@export
def balance_of(address: str) -> decimal:
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
def balance_of(address: str) -> decimal:
    return balances[address]

@export(typecheck=True)
def transfer(amount: decimal, to: str):
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
`crypto`, `zk`, and the `decimal` constructor are injected directly into contract scope and do
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
