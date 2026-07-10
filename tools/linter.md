# Linter

Xian has two related linting surfaces:

- the core contract linter in `xian-contracting`
- the optional standalone `xian-linter` HTTP service

Both use the Rust `xian-compiler-core` as the authoritative contract-language
and diagnostic surface. The standalone package also runs PyFlakes and can run
optional native IR validation in `xian_vm_v1` mode.

The published PyPI package name for the standalone service is
`xian-tech-linter`. The import package and console command remain
`xian_linter` and `xian-linter`.

## Using The Core Linter

Use `diagnose_contract_source` when you are already inside Python:

```python
from contracting.artifacts import diagnose_contract_source

source = """
balances = Hash(default_value=0)

@export
def transfer(amount: float, to: str):
    assert amount > 0, "Amount must be positive"
    balances[ctx.caller] -= amount
    balances[to] += amount
"""

errors = diagnose_contract_source(
    module_name="con_example",
    source=source,
)

for error in errors:
    print(error["code"], error.get("range"), error["message"])
```

The compiler returns structured diagnostics with:

- `code`
- `message`
- `severity`
- an optional `range` containing start/end line and column values

## Using The Standalone HTTP Service

Install the base package for inline use, or the server extra for the HTTP
service:

```bash
uv add xian-tech-linter
uv add "xian-tech-linter[server]"
```

Install the VM extra when you want native Xian VM IR validation as part of
`xian_vm_v1` mode:

```bash
uv add "xian-tech-linter[vm]"
uv add "xian-tech-linter[server,vm]"
```

Start the service:

```bash
xian-linter
```

The default listen address is `http://localhost:8000`.

HTTP mode binds to loopback by default. To publish it beyond the local
machine, set an explicit host and put it behind a rate-limited reverse proxy:

```bash
XIAN_LINTER_HOST=0.0.0.0 XIAN_LINTER_PORT=8000 xian-linter
```

For IPv6 loopback, use the raw bind host and a bracketed URL:

```bash
XIAN_LINTER_HOST=::1 XIAN_LINTER_PORT=8000 xian-linter
# http://[::1]:8000
```

Browser CORS defaults to local origins. Set `XIAN_LINTER_CORS_ORIGINS` to a
comma-separated allowlist when a hosted IDE or frontend needs browser access.
The built-in local development allowlist includes Vite loopback origins such as
`http://localhost:5173`, `http://127.0.0.1:5173`, and `http://[::1]:5173`.

## HTTP Endpoints

The service accepts raw, base64, or gzip request bodies:

- `POST /lint`
- `POST /lint_base64`
- `POST /lint_gzip`

Request bodies are capped at `1,000,000` bytes before decoding. `/lint_gzip`
also enforces the same cap after decompression and rejects extreme gzip
compression ratios. Compiler admission is stricter: contract source may not
exceed `131,072` UTF-8 bytes. All endpoints also accept an optional comma-separated
`whitelist_patterns` query parameter when a controlled integration needs to
allow additional PyFlakes names:

```text
POST /lint?whitelist_patterns=my_helper,con_*
```

All endpoints use the default source-linting mode unless a mode is selected:

```text
POST /lint?mode=xian_vm_v1
```

The alias `lint_mode=xian_vm_v1` is also accepted for integrations that already
use `mode` for their own routing.

## Lint Modes

The standalone package supports two modes:

| Mode | What it checks |
|------|----------------|
| `python` | authoritative Rust compiler diagnostics plus PyFlakes warnings; the name is retained for API compatibility |
| `xian_vm_v1` | the same Rust compiler diagnostics and PyFlakes warnings, plus native IR validation when `xian_vm_core` is installed |

The VM mode is linting only. It does not execute the contract or simulate
storage, imports, environment values, or host syscalls. Use runtime tests or
node preflight flows for execution behavior.

Inline usage:

```python
from xian_linter import lint_code_sync

errors = lint_code_sync(source, mode="xian_vm_v1")
```

### Raw Source Example

```bash
curl -X POST "http://localhost:8000/lint?mode=xian_vm_v1" \
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
      "code": "xian.lint.E005",
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

`xian-linter` may also include PyFlakes warnings with code `W001`. Processing
errors from the wrapper itself are returned as `E000`; native VM IR validation
failures are returned as `XVM002`. Compiler diagnostics use stable `xian.*`
codes in both modes.

Compiler admission is deterministic and rejects inputs that exceed any of
these bounds:

| Bound | Maximum | Diagnostic |
|------|---------|------------|
| UTF-8 source bytes | `131,072` | `xian.limit.source_bytes` |
| syntax nodes | `50,000` | `xian.limit.syntax_nodes` |
| syntax nesting depth | `64` | `xian.limit.syntax_depth` |
| lexical tokens | `100,000` | `xian.limit.tokens` |
| tokens on one logical line | `4,096` | `xian.limit.logical_line_tokens` |

## Error Codes

| Code | Meaning |
|------|---------|
| `E000` | standalone wrapper processing error |
| `xian.lint.E001` through `xian.lint.E023` | contract-language semantic rules such as imports, decorators, annotations, exports, and reserved names |
| `xian.syntax.*` | parser or unsupported syntax-tree diagnostics |
| `xian.ir.*` | canonical IR lowering diagnostics |
| `xian.limit.*` | deterministic compiler admission bounds |
| `W001` | PyFlakes warning from the standalone service |
| `XVM002` | native Xian VM IR validation failed |

See [Valid Code & Restrictions](/smart-contracts/valid-code) for the supported
language surface.
