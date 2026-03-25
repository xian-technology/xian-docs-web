# Imports Overview

Contracts can depend on other deployed contracts.

## Two Patterns

- static import: `import currency`
- dynamic import: `importlib.import_module("con_example")`
- dynamic function call: `importlib.call("con_example", "transfer", {"amount": 10, "to": "bob"})`
- dynamic probes: `importlib.exists("con_example")`, `importlib.has_export("con_example", "transfer")`

## Important Restriction

This is contract import resolution, not Python package importing. Imports are
resolved against deployed contracts in state.

## Related Tools

- `importlib.import_module(...)`
- `importlib.exists(...)`
- `importlib.has_export(...)`
- `importlib.call(...)`
- `importlib.enforce_interface(...)`
- `importlib.owner_of(...)`
