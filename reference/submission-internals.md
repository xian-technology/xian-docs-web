# Contract Submission Internals

Contract submission is an on-chain action, not a special side channel.

## High-Level Flow

1. the client prepares contract source and optional `constructor_args`
2. the transaction calls the built-in `submission` contract
3. `xian-contracting` normalizes source, lints it, compiles runtime code, and loads the child contract
4. the child module body and constructor run under a deployment context
5. the deployed source, runtime code, and provenance metadata are written to state
6. `submission` emits `ContractDeployed`

## Important Constraints

- user-submitted contract names should use the `con_` prefix
- contract names must start with a lowercase ASCII letter
- contract names may contain only lowercase ASCII letters, digits, and
  underscores
- the submitted source must pass the linter
- imports resolve to deployed contracts, not Python packages
- constructor arguments are provided as a dictionary
- child deployments go through the same `submission.submit_contract(...)` entrypoint
- raw submitted source is size-limited before analysis

## What Gets Stored

Each deployed contract stores:

- `__source__`: canonical human-facing source
- `__code__`: canonical runtime source
- `__owner__`
- `__developer__`
- `__deployer__`
- `__initiator__`
- `__submitted__`

`__source__` is normalized before storage, so comments are not preserved on
chain.

`__developer__` is the runtime field used for developer-reward attribution.
When a transaction executes across multiple contracts, the developer-reward
bucket is split across the participating contracts proportionally to metered
execution cost and then paid to the current `__developer__` recipients.

## Deployment Context

During child module-body execution and `@construct`, the child sees:

- `ctx.this = <child contract>`
- `ctx.caller = <immediate deployer>`
- `ctx.signer = <original external signer>`
- `ctx.owner = <final owner>`
- `ctx.entry = <outer transaction entrypoint>`
- `ctx.submission_name = <child contract>`

This is true for direct submission and for factory deployment through another
contract.

## Metering Notes

Deployment is not just charged for the final state writes.

It also includes:

- a fixed deployment-analysis surcharge
- a per-byte surcharge based on canonical stored source
- the normal write cost for `__source__`, `__code__`, and metadata

That makes repeated or large deployments economically bounded without adding a
special-case runtime loophole for contract factories.

## Why Submission Matters

Submission is security-sensitive because it sets the long-lived executable code
for a contract name. That is why the linter, import restrictions, and runtime
loader all participate in the submission path.

The name rule is intentionally strict because state keys use `.` and `:` as
reserved separators. Allowing those characters inside contract names creates
ambiguous keys and awkward import behavior.

It also owns the runtime metadata mutation surface for deployed contracts:

- `submission.change_developer(contract, new_developer)`
- `submission.change_owner(contract, new_owner)`

`change_owner(...)` updates the runtime `__owner__` field that drives
`ctx.owner` and runtime owner gating. It does not modify a contract's own
application-level `owner = Variable()` or `metadata["owner"]` pattern.
