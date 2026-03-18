# Audit Checklist

Use this list before shipping a contract to a real network.

## Authorization

- every privileged function checks `ctx.caller`
- any use of `ctx.signer` is intentional and justified
- no privileged path can be reached through an unexpected contract-to-contract
  call

## Inputs And State

- all amounts are range-checked
- all recipient / contract names are validated where needed
- hash and variable defaults are understood
- mutable values loaded from state are written back after mutation

## Cross-Contract Behavior

- external calls happen after local invariants are established
- failures in external calls do not leave local bookkeeping inconsistent
- imported contract interfaces are narrow and explicit

## Token / Money Flows

- balances cannot become negative through missing checks
- approvals overwrite or decrement exactly as intended
- stream / vesting math is tested around boundaries and time transitions

## Events And Observability

- important state transitions emit events
- indexed event fields match expected query patterns
- event names are stable and documented

## Testing

- happy-path tests exist for every export
- unauthorized caller tests exist for every privileged export
- edge cases are covered for zero, negative, empty, expired, and duplicate
  inputs
- stamp-heavy paths are exercised locally

## Deployment Discipline

- contract name is final and intentional
- migration or rollback plan exists if this replaces older logic
- metadata and operator/owner settings are correct
