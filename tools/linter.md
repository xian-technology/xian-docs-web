# Linter

Xian has two related linting surfaces:

- the core contract linter in `xian-contracting`
- the optional standalone `xian-linter` HTTP service

Both ultimately enforce the same contract-language rules.

## Using The Core Linter

Use `contracting.compilation.linter.Linter` when you are already inside Python:

```python
from contracting.compilation.linter import Linter

source = """
balances = Hash(default_value=0)

@export
def transfer(to: str, amount: float):
    assert amount > 0, "Amount must be positive"
    balances[ctx.caller] -= amount
    balances[to] += amount
"""

linter = Linter()
errors = linter.check(source) or []

for error in errors:
    print(error.code.value, error.line, error.col, error.message)
```

The core linter returns structured `LintError` objects with:

- `code`
- `message`
- `line`
- `col`
- `end_line`
- `end_col`

## Using The Standalone HTTP Service

Install the server extras:

```bash
pip install "xian-linter[server]"
```

Start the service:

```bash
xian-linter
```

The default listen address is `http://localhost:8000`.

## HTTP Endpoints

The service accepts raw, base64, or gzip request bodies:

- `POST /lint`
- `POST /lint_base64`
- `POST /lint_gzip`

### Raw Source Example

```bash
curl -X POST http://localhost:8000/lint \
  -H "Content-Type: text/plain" \
  --data-binary $'import os\n\n@export\ndef hack():\n    os.system("rm -rf /")'
```

### Base64 Example

```bash
base64 < contract.py > contract.py.b64
curl -X POST http://localhost:8000/lint_base64 --data-binary @contract.py.b64
```

### Gzip Example

```bash
gzip -c contract.py > contract.py.gz
curl -X POST http://localhost:8000/lint_gzip \
  -H "Content-Type: application/gzip" \
  --data-binary @contract.py.gz
```

## Response Shape

The HTTP service returns:

```json
{
  "success": false,
  "errors": [
    {
      "code": "E005",
      "message": "Cannot import stdlib module 'os'",
      "severity": "error",
      "position": {
        "line": 1,
        "col": 0,
        "end_line": 1,
        "end_col": 9
      }
    }
  ]
}
```

`xian-linter` may also include PyFlakes warnings with code `W001`.

## Error Codes

| Code | Meaning |
|------|---------|
| `E001` | illegal syntax form |
| `E002` | name starts or ends with underscore |
| `E003` | import inside a function |
| `E004` | `from x import y` used |
| `E005` | stdlib import attempted |
| `E006` | class definition |
| `E007` | async function |
| `E008` | invalid decorator |
| `E009` | multiple constructors |
| `E010` | multiple decorators on one function |
| `E011` | forbidden ORM kwarg |
| `E012` | tuple unpacking for ORM declarations |
| `E013` | no exported function |
| `E014` | forbidden builtin or reserved name |
| `E015` | exported arg shadows ORM name |
| `E016` | invalid exported argument annotation |
| `E017` | missing exported argument annotation |
| `E018` | invalid exported return annotation |
| `E019` | nested function |
| `E020` | syntax error |

See [Valid Code & Restrictions](/smart-contracts/valid-code) for the current
language surface.
