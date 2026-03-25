# Multi-Contract dApp Architecture

Multi-contract architectures are a first-class pattern in Xian.

## Building Blocks

- static imports for known contract dependencies
- dynamic imports through `importlib.import_module(...)`
- dynamic probes through `importlib.exists(...)` and `importlib.has_export(...)`
- dynamic exported-function dispatch through `importlib.call(...)`
- interface checks through `importlib.enforce_interface(...)`
- ownership lookups through `importlib.owner_of(...)`
- runtime metadata lookups through `importlib.contract_info(...)`
- cross-contract reads via `ForeignVariable` and `ForeignHash`

## Recommended Split

- keep token/accounting in one contract
- keep domain logic in another
- keep governance or upgrade coordination in a third, if needed

This keeps each contract smaller and easier to audit while still allowing
composable behavior.

See the smart-contract docs for:

- storage
- imports
- interface patterns
- security pitfalls around `ctx.caller` vs `ctx.signer`
