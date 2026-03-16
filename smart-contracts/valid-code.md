# Valid Code & Restrictions

Xian contracts run in a restricted Python sandbox. This page lists exactly what's allowed and what's forbidden.

## Allowed Syntax

| Feature | Example | Notes |
|---------|---------|-------|
| Variables | `x = 1` | |
| Arithmetic | `+`, `-`, `*`, `/`, `//`, `%`, `**` | |
| Comparisons | `==`, `!=`, `<`, `>`, `<=`, `>=`, `is`, `is not`, `in`, `not in` | |
| Boolean logic | `and`, `or`, `not` | |
| If/elif/else | `if x > 0:` | |
| For loops | `for i in range(10):` | |
| While loops | `while x > 0:` | |
| Functions | `def f():` | Only at top level (no nesting) |
| Return | `return value` | |
| Assert | `assert x > 0, "msg"` | Primary error handling mechanism |
| Pass | `pass` | |
| Collections | `list`, `dict`, `set`, `tuple` | |
| List comprehensions | `[x for x in items]` | |
| Subscript/slice | `items[0]`, `items[1:3]` | |
| Augmented assign | `x += 1`, `x -= 1` | |
| Global | `global x` | |
| Imports | `import contract_name` | Module-level only, no stdlib |
| Starred | `*args` | In function calls |

## Forbidden Syntax

| Feature | Error Code | Why |
|---------|------------|-----|
| Classes | E006 | No OOP — use module-level functions |
| Try/except | E001 | Determinism — use `assert` instead |
| With statements | E001 | No context managers |
| Lambda | E001 | No anonymous functions |
| Yield / generators | E001 | No generator patterns |
| Async / await | E007 | No asynchronous code |
| Nested functions | E019 | No closures or inner functions |
| `from X import Y` | E004 | Use `import X` instead |
| Nested imports | E003 | Imports only at module level |
| Underscore names | E002 | `_x`, `x_`, `__x__` all forbidden |
| Multiple decorators | E010 | Max one per function |
| Nonlocal | E001 | No scope manipulation |
| MatMult (`@`) | E001 | Operator not allowed |
| Generator expressions | E001 | Use list comprehensions instead |

## Allowed Builtins

These Python builtins are available in contracts:

```
abs     all      any      ascii    bin      bool     bytearray  bytes
chr     dict     divmod   filter   float    format   frozenset  hex
int     isinstance  issubclass  len   list     map      max        min
oct     ord      pow      range    reversed round    set        sorted
str     sum      tuple    zip      Exception  True    False      None
```

## Forbidden Builtins

Everything not in the allowed list is blocked, including:

```
eval    exec     open     input    print    compile   __import__
globals  locals   vars    dir      getattr  setattr   delattr
type    object   super   property staticmethod classmethod
memoryview  breakpoint  exit    quit    help     copyright  license
```

Attempting to use any of these raises linter error E014.

## Allowed Type Annotations

For `@export` function arguments:

```python
str, int, float, bool, dict, list, Any
datetime.datetime, datetime.timedelta
```

Any other type annotation raises linter error E016. Missing annotations raise E017. Return type annotations raise E018.

## Linter Error Reference

| Code | Description |
|------|-------------|
| E001 | Illegal syntax type (try, with, lambda, yield, etc.) |
| E002 | Name starts or ends with underscore |
| E003 | Import inside function body |
| E004 | `from ... import` not allowed |
| E005 | Stdlib module import (os, sys, etc.) |
| E006 | Class definition |
| E007 | Async function |
| E008 | Invalid decorator (not `export` or `construct`) |
| E009 | Multiple `@construct` decorators |
| E010 | Multiple decorators on one function |
| E011 | Passing `contract=` or `name=` to ORM constructor |
| E012 | Tuple unpacking on ORM assignment |
| E013 | No `@export` function found |
| E014 | Forbidden builtin or reserved name |
| E015 | Function argument shadows ORM variable name |
| E016 | Invalid type annotation |
| E017 | Missing type annotation on `@export` argument |
| E018 | Return type annotation on `@export` function |
| E019 | Nested function definition |
| E020 | Syntax error |

Each error includes the exact line and column number for IDE integration.
