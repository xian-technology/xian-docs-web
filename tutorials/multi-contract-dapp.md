# Multi-Contract dApp

Multi-contract architecture is a normal pattern in Xian. You do not need to
force all business logic into one contract.

## A Practical Split

A common split is:

- one contract for token or accounting state
- one contract for domain logic
- one contract for governance, registry, or upgrade coordination

This keeps each contract smaller and makes permission boundaries easier to
reason about.

## The Main Building Blocks

Xian supports several composition tools:

- static imports for fixed dependencies
- `importlib.import_module(...)` for runtime-selected contracts
- `importlib.exists(...)` and `importlib.has_export(...)` for safe probing
- `importlib.call(...)` for dynamic exported-function dispatch
- `importlib.enforce_interface(...)` for contract-shape checks
- `ForeignVariable` and `ForeignHash` for read-only state access
- `importlib.contract_info(...)` and `importlib.code_hash(...)` for metadata and
  artifact verification

## Security Rules

The biggest design trap is confusing the immediate caller with the original
signer.

Across a contract-to-contract call:

- `ctx.caller` becomes the calling contract
- `ctx.signer` stays the original external user

Use that split deliberately when designing permission checks.

## Recommended Workflow

1. define the stable contract interfaces first
2. keep cross-contract writes explicit and minimal
3. use interface checks for anything that can be swapped or chosen dynamically
4. test the contracts together with `ContractingClient`
5. if you need allowlists, persist contract names or code hashes explicitly

## When Dynamic Dispatch Makes Sense

Dynamic dispatch is useful for:

- plugin registries
- governance-selected modules
- factory-driven integrations
- adapter patterns

If the dependency is fixed forever, prefer static imports instead.

## Related Pages

- [Imports Overview](/smart-contracts/imports/)
- [Importing Other Contracts](/smart-contracts/imports/importing-contracts)
- [Dynamic Imports](/smart-contracts/imports/dynamic-imports)
- [Multi-Contract Testing](/smart-contracts/testing/multi-contract)
