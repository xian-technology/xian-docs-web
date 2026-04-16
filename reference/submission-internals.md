# Contract Submission Internals

Contract deployment in Xian is an ordinary on-chain action routed through the
built-in `submission` contract.

## High-Level Flow

1. a client prepares contract source, constructor args, and optionally
   `deployment_artifacts`
2. the transaction calls `submission.submit_contract(...)`
3. the runtime normalizes and lints the source
4. if deployment artifacts are provided, the runtime validates them against the
   canonical compiler output
5. the child module body and constructor run under deployment context
6. canonical source, execution artifacts, and metadata are written to chain
   state
7. `ContractDeployed` is emitted

## Source Submission Vs Artifact Submission

Xian supports both source-backed and artifact-backed deployment flows, but they
are not identical.

- tracer-backed execution can use the canonical source-backed path
- `xian_vm_v1` requires valid `deployment_artifacts` for native deployment

Those artifacts include the canonical source plus the VM artifact payload used
by the native runtime.

## Important Constraints

- user contracts should keep the `con_` prefix
- contract names must use lowercase ASCII letters, digits, and underscores
- imports resolve to deployed contracts, not Python packages
- constructor args are supplied as a dictionary
- source must pass the linter
- child deployments use the same submission surface

## What Gets Stored

Every deployed contract stores metadata such as:

- `__source__`
- `__owner__`
- `__developer__`
- `__deployer__`
- `__initiator__`
- `__submitted__`

For execution artifacts:

- `__xian_ir_v1__` is the persisted VM IR for `xian_vm_v1`
- tracer-backed and tooling paths may also persist `__code__`

`__source__` is the human-facing canonical source. It is normalized before
storage.

## Deployment Context

During child module-body execution and `@construct`, the child sees:

- `ctx.this = <child contract>`
- `ctx.caller = <immediate deployer>`
- `ctx.signer = <original external signer>`
- `ctx.owner = <final owner>`
- `ctx.entry = <outer transaction entrypoint>`
- `ctx.submission_name = <child contract>`

That is true for direct deployment and for factory-style child deployment.

## Metering Notes

Deployment is metered too. The cost is not only the final state writes.

Deployment accounting includes:

- submission analysis and validation work
- stored artifact size
- metadata writes
- constructor execution

This is why contract deployment is materially more expensive than a trivial
state update.

## Why Submission Is Security-Sensitive

Submission defines the long-lived executable identity behind a contract name.

That is why the submission path participates in:

- lint enforcement
- canonical artifact generation and validation
- contract metadata ownership and developer attribution

The same contract also owns the narrow metadata mutation surface for:

- `submission.change_developer(...)`
- `submission.change_owner(...)`
