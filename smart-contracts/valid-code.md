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
| collections | `list`, `dict`, `set`, `tuple` | |
| list comprehensions | `[x for x in items]` | generator expressions are not allowed |
| subscripts / slices | `x[0]`, `x[1:3]` | |
| imports | `import currency`, `import hashlib` | module-level only |

## Forbidden Syntax

| Feature | Error Code | Why |
|---------|------------|-----|
| `try/except`, `with`, `lambda`, `yield`, `yield from`, `nonlocal`, `@` | `E001` | blocked syntax in the sandbox |
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

## Allowed Builtins

The current builtin allowlist is intentionally small:

```text
Exception False None True abs all any ascii bin bool bytearray bytes chr
dict divmod filter float format frozenset hex int isinstance issubclass len
list map max min oct ord pow range reversed round set sorted str sum tuple zip
```

Everything else is treated as forbidden.

## Allowed Export Signature Annotations

The same allowlist applies to exported arguments and exported return
annotations:

```python
str, int, float, bool, dict, list, Any
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
def stream_window(stream_id: str) -> dict:
    return {
        "begins": streams[stream_id, "begins"],
        "closes": streams[stream_id, "closes"],
    }
```

Invalid annotations still fail:

```python
@export
def bad(value: Decimal):
    return value
```

## Import Rules

Allowed imports fall into two buckets:

- deployed contracts, for example `import currency`
- runtime-provided modules such as `hashlib`, `datetime`, `random`,
  `importlib`, `crypto`, `zk`, and `decimal`

The Python standard library is not generally available to contracts.

## Practical Guidance

When in doubt:

- keep contract code flat and explicit
- use `assert` instead of exception handling
- keep all imports at module scope
- prefer simple data structures
- test the contract locally with `ContractingClient`
