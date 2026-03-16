# Linter

The Xian linter performs static analysis on contract source code to catch invalid syntax, forbidden patterns, and security issues before deployment. Code that fails the linter cannot be submitted to the network.

## Two Ways to Use the Linter

### 1. Built into xian-contracting

The linter is included in the `xian-contracting` package. Use it programmatically:

```python
from contracting.compilation.linter import Linter

source = """
balances = Hash(default_value=0)

@construct
def seed():
    balances[ctx.caller] = 1_000_000

@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    balances[ctx.caller] -= amount
    balances[to] += amount
"""

linter = Linter()
errors = linter.check(source)

if errors:
    for error in errors:
        print(f"Line {error['line']}, Col {error['col']}: [{error['code']}] {error['message']}")
else:
    print("No errors found")
```

### 2. Standalone xian-linter Service

The `xian-linter` package provides a standalone HTTP service for linting:

```bash
pip install xian-linter
xian-linter  # starts on port 5000 by default
```

Send contract source code via POST:

```bash
curl -X POST http://localhost:5000/lint \
  -H "Content-Type: application/json" \
  -d '{"code": "import os\n\n@export\ndef hack():\n    os.system(\"rm -rf /\")"}'
```

Response:

```json
{
    "errors": [
        {
            "code": "E005",
            "message": "Import of stdlib module 'os' is not allowed",
            "line": 1,
            "col": 0
        }
    ],
    "valid": false
}
```

A clean contract returns:

```json
{
    "errors": [],
    "valid": true
}
```

## Error Codes

| Code | Description | Example |
|------|-------------|---------|
| E001 | Illegal syntax type | `try/except`, `with`, `lambda`, `yield`, `nonlocal` |
| E002 | Name starts or ends with underscore | `_private`, `name_`, `__dunder__` |
| E003 | Import inside function body | `def f(): import x` |
| E004 | `from ... import` not allowed | `from currency import transfer` |
| E005 | Standard library module import | `import os`, `import sys`, `import json` |
| E006 | Class definition | `class Token:` |
| E007 | Async function | `async def fetch():` |
| E008 | Invalid decorator | `@something` (only `@export` and `@construct` allowed) |
| E009 | Multiple `@construct` decorators | Two functions with `@construct` |
| E010 | Multiple decorators on one function | `@export` + `@construct` on same function |
| E011 | Passing `contract=` or `name=` to ORM constructor | `Hash(contract="x", name="y")` |
| E012 | Tuple unpacking on ORM assignment | `a, b = Hash(), Hash()` |
| E013 | No `@export` function found | Contract has no public API |
| E014 | Forbidden builtin or reserved name | `eval()`, `exec()`, `rt` |
| E015 | Function argument shadows ORM variable name | `def f(balances: int):` when `balances = Hash()` exists |
| E016 | Invalid type annotation | `def f(x: MyClass):` |
| E017 | Missing type annotation on `@export` argument | `def transfer(to, amount):` |
| E018 | Return type annotation on `@export` function | `def f(x: int) -> int:` |
| E019 | Nested function definition | `def outer(): def inner():` |
| E020 | Syntax error | Invalid Python syntax |

## Structured Error Output

Each error is a dictionary with precise position information:

```python
{
    "code": "E005",
    "message": "Import of stdlib module 'os' is not allowed",
    "line": 1,
    "col": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `code` | `str` | Error code (E001-E020) |
| `message` | `str` | Human-readable description |
| `line` | `int` | Line number (1-based) |
| `col` | `int` | Column number (0-based) |

## Example: Multiple Errors

```python
source = """
import os

class Token:
    pass

def _private():
    pass

@export
def transfer(to, amount):
    try:
        pass
    except:
        pass
"""

linter = Linter()
errors = linter.check(source)
```

Output:

```
Line 1, Col 0: [E005] Import of stdlib module 'os' is not allowed
Line 3, Col 0: [E006] Class definition not allowed
Line 6, Col 0: [E002] Name '_private' starts with underscore
Line 10, Col 0: [E017] Missing type annotation on @export argument 'to'
Line 10, Col 0: [E017] Missing type annotation on @export argument 'amount'
Line 11, Col 4: [E001] Try/except not allowed
```

## Integration with Testing

Run the linter as part of your test suite to catch errors early:

```python
import unittest
from contracting.compilation.linter import Linter


class TestContractLinting(unittest.TestCase):
    def test_contract_passes_linter(self):
        source = open("my_contract.py").read()
        linter = Linter()
        errors = linter.check(source)
        self.assertEqual(errors, [], f"Linter errors: {errors}")
```
