# Contract Submission Internals

Contract submission is an on-chain action, not a special side channel.

## High-Level Flow

1. the client prepares contract source and optional `constructor_args`
2. the transaction calls the built-in `submission` contract
3. `xian-contracting` lints, compiles, and loads the contract
4. the constructor runs once if present
5. the deployed source and metadata are written to state

## Important Constraints

- user-submitted contract names should use the `con_` prefix
- the submitted source must pass the linter
- imports resolve to deployed contracts, not Python packages
- constructor arguments are provided as a dictionary

## Why Submission Matters

Submission is security-sensitive because it sets the long-lived executable code
for a contract name. That is why the linter, import restrictions, and runtime
loader all participate in the submission path.
