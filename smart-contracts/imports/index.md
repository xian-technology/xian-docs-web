# Imports & Interfaces

Xian contracts can call other deployed contracts. There are two mechanisms: static imports (resolved at submission time) and dynamic imports (resolved at runtime). An interface system lets you verify that a contract implements the functions you expect.

## Import Methods

| Method | Syntax | Resolved | Use Case |
|--------|--------|----------|----------|
| [Static import](/smart-contracts/imports/importing-contracts) | `import currency` | Submission time | Known contracts with fixed names |
| [Dynamic import](/smart-contracts/imports/dynamic-imports) | `importlib.import_module("name")` | Runtime | Contract name passed as argument |
| [Interface check](/smart-contracts/imports/interface-patterns) | `importlib.enforce_interface()` | Runtime | Validate a contract's shape before calling it |

## Quick Links

- [Importing Contracts](/smart-contracts/imports/importing-contracts) -- static imports, calling functions, how the module loader works
- [Dynamic Imports](/smart-contracts/imports/dynamic-imports) -- loading contracts by name at runtime with `importlib`
- [Interface Patterns](/smart-contracts/imports/interface-patterns) -- enforcing that a contract exposes the functions and variables you need
