# Contract Submission Internals

Contract deployment in Xian is an ordinary on-chain action routed through the
built-in `submission` contract.

## High-Level Flow

```mermaid
flowchart TD
  Client["Client prepares source and constructor arguments"]
  Submit["submission.submit_contract(...)"]
  Artifact{"Client supplied IR artifacts?"}
  Reject["Reject submission"]
  Compile["Normalize, lint, and compile canonical VM IR"]
  Execute["Run module body and constructor"]
  Store["Persist canonical source, VM IR, and metadata"]
  Event["Emit ContractDeployed"]

  Client --> Submit --> Artifact
  Artifact -->|"yes"| Reject
  Artifact -->|"no"| Compile --> Execute --> Store --> Event
```

## Source Submission

Xian deployments are source-backed.

`xian_vm_v1` requires submitted source for native deployment. Validators derive
the stored VM IR with the canonical Rust compiler and reject submitted
`deployment_artifacts`.

## Important Constraints

- user contracts must use the `con_` prefix
- contract names must use lowercase ASCII letters, digits, and underscores
- imports resolve to deployed contracts, not Python packages
- constructor args are supplied as a dictionary
- source must pass the linter
- source is compiled by the authoritative Rust compiler on every validator
- compiler admission allows at most 128 KiB source, 50,000 syntax nodes,
  nesting depth 64, 100,000 tokens total, and 4,096 tokens per logical line
- child deployments use the same submission surface

## Low-level Deployment Helpers

The active `submission` contract can use `Contract.deploy(...)` or the
instance-style submit helper:

```python
helper = Contract()
helper.submit(
    name,
    code,
    owner=None,
    constructor_args=None,
    developer=None,
    deployer=None,
    initiator=None,
)
```

`submit` accepts these arguments positionally or by keyword and returns `None`.
It can be retrieved as `send = helper.submit`; the unbound form is
`Contract.submit(helper, ...)`, with `self=helper` also accepted. Both forms use
the same source-backed deployment, constructor, metadata and metering path.
Missing, duplicate and unknown arguments are rejected.

These helpers require the currently executing contract to be `submission`.
Ordinary contracts, including child constructors, do not acquire that authority
by constructing a handle, retrieving an alias or supplying deployment metadata.
Factories should call `submission.submit_contract(...)` through an imported
contract. Child deployment and its constructor roll back with a failing parent
transaction.

`Contract()` creates an opaque execution-local handle. `Contract(None)` and
`Contract(driver=None)` are equivalent; other driver arguments are rejected
inside a contract. It does not expose the
storage driver or allow selecting another writable storage namespace. Handles
cannot be persisted, returned as public transaction results or transferred
across contract boundaries, including inside containers. The existing
`get_info`, `set_owner`, `set_developer` and `deploy` class methods can also be
retrieved from the handle; their authority checks remain unchanged.

For low-level metadata arguments, `None` selects the contextual default for
`developer`, `deployer` and `initiator`. An explicit value, including an empty
string, is preserved. The public submission contract supplies and validates
metadata on the normal application deployment path.

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

- submission analysis, source normalization, and VM compilation work
- stored source and VM IR size
- metadata writes
- constructor execution

This is why contract deployment is materially more expensive than a trivial
state update.

## Why Submission Is Security-Sensitive

Submission defines the long-lived executable identity behind a contract name.

That is why the submission path participates in:

- lint enforcement
- canonical source and VM IR generation and validation
- contract metadata ownership and developer attribution

The same contract also owns the narrow metadata mutation surface for:

- `submission.change_developer(...)`
- `submission.change_owner(...)`

Ordinary contracts do not get a generic low-level metadata mutation escape
hatch. Runtime owner and developer changes are intentionally routed through the
built-in `submission` contract path.
