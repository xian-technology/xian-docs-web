# Linter

Xian has two related linting surfaces:

- the Rust compiler core's diagnostics (`xian-tech-compiler-core`, also built
  to WebAssembly as `@xian-tech/compiler` for the IDE and the playground)
- the optional standalone `xian-linter` package and HTTP service

Both use the Rust `xian-compiler-core` as the authoritative contract-language
and diagnostic surface. The standalone package calls it directly, adds PyFlakes
warnings and validates the compiled V2 IR with the native VM's validator
(`xian-tech-vm-core`) by default. It does not install the contract runtime
package `xian-tech-contracting`.

The published PyPI package name for the standalone service is
`xian-tech-linter`. The import package and console command remain
`xian_linter` and `xian-linter`.

## Using The Compiler Diagnostics

Use `diagnose_contract` from the compiler package when you are already inside
Python:

```python
from xian_compiler_core import diagnose_contract

source = """
balances = Hash(default_value=0)

@export
def transfer(amount: decimal, to: str):
    assert amount > 0, "Amount must be positive"
    balances[ctx.caller] -= amount
    balances[to] += amount
"""

errors = diagnose_contract("con_example", source)

for error in errors:
    print(error["code"], error.get("range"), error["message"])
```

`contracting.artifacts.diagnose_contract_source(module_name=..., source=...)`
returns the same list for code that already uses the contract runtime. The
compiler returns structured diagnostics with:

- `code`
- `message`
- `severity`
- an optional `range` containing start/end line and column values

Line numbers start at 1. Columns count Unicode code points from 0 in both
compiler diagnostics and PyFlakes warnings.

## Using The Standalone HTTP Service

Install the base package for inline use, or the server extra for the HTTP
service:

Use linter 0.4.3 with the [V2 compiler and VM checkout](/getting-started/dev-environment#contract-only-setup). From its parent directory:

```bash
git clone https://github.com/xian-technology/xian-linter.git
cd xian-linter
git checkout --detach 3f193379cf3c52ab2833222451cae1b804665cdb
uv sync --frozen --extra server
```

Start the service:

```bash
uv run --no-sync xian-linter
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

Request bodies are streamed with a `1,000,000` byte cap before decoding; raw
and base64 endpoints stop reading once the cap is exceeded, regardless of
Content-Length. `/lint_gzip`
also enforces the same cap after decompression and rejects extreme gzip
compression ratios. Compiler admission is stricter: contract source may not
exceed `131,072` UTF-8 bytes. All endpoints accept an optional
`whitelist_patterns` query parameter. A non-empty comma-separated list of
exact names replaces the default list of names suppressed by PyFlakes:

```text
POST /lint?whitelist_patterns=my_helper,con_example
```

Omitting the parameter or supplying an empty HTTP value uses the defaults.
In Python, pass `whitelist_patterns=[]` to `lint_code_inline` to disable
name suppression.

All endpoints default to `xian_vm_v2`. A request can also name the profile explicitly.

```text
POST /lint?mode=xian_vm_v2
```

## Validation

The `xian_vm_v2` mode checks compiler diagnostics, PyFlakes warnings and native
IR validity. Use runtime tests or node preflight flows to check execution,
storage, imports and host calls.

Inline usage:

```python
from xian_linter import lint_code_sync

errors = lint_code_sync(source)
```

### Raw Source Example

```bash
curl -X POST "http://localhost:8000/lint?mode=xian_vm_v2" \
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
codes across the compiler and standalone service.

Compiler admission is deterministic and rejects inputs that exceed any of
these bounds:

| Bound | Maximum | Diagnostic |
|------|---------|------------|
| UTF-8 source bytes | `131,072` | `xian.limit.source_bytes` |
| syntax nodes | `50,000` | `xian.limit.syntax_nodes` |
| syntax nesting depth | `64` | `xian.limit.syntax_depth` |
| lexical tokens | `100,000` | `xian.limit.tokens` |
| tokens on one logical line (an f-string counts one per character of its content) | `4,096` | `xian.limit.logical_line_tokens` |
| canonical IR JSON bytes | `1,048,576` | `xian.limit.ir_json_bytes` |
| whole-program analysis work units | `1,000,000` | `xian.limit.compile_work` |

## Error Codes

| Code | Meaning |
|------|---------|
| `E000` | standalone wrapper processing error |
| `xian.lint.E0xx` (E001–E003, E005, E008–E019, E021–E024) | contract-language semantic rules such as imports, decorators, annotations, exports, and reserved names |
| `xian.syntax.*` | parser or unsupported syntax-tree diagnostics |
| `xian.ir.*` | canonical IR lowering diagnostics |
| `xian.limit.*` | deterministic compiler admission bounds |
| `W001` | PyFlakes warning from the standalone service |
| `XVM002` | native Xian VM IR validation failed |

See [Valid Code & Restrictions](/smart-contracts/valid-code) for the supported
language surface.
