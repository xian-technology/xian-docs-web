# Upgradeability Patterns

Xian does not treat arbitrary in-place contract code replacement as a normal
application pattern. The safe default is to treat deployed contracts as
immutable interfaces.

## What That Means In Practice

- do not assume you can rewrite code under the same contract name later
- prefer deploying a new contract and migrating users or callers explicitly
- keep upgrade authority outside of ordinary user flows

## Safer Patterns

### 1. Versioned Contracts

Deploy a new contract name and migrate consumers deliberately:

- `con_token_v1`
- `con_token_v2`

This is the simplest and safest pattern.

### 2. Registry / Router Contracts

Keep a small registry that points to the current implementation:

```python
implementation = Variable()

@export
def set_implementation(name: str):
    assert ctx.caller == owner.get(), "Only owner"
    implementation.set(name)
```

Clients query the registry, not hard-coded implementation addresses.

### 3. Governance-Controlled Migration

For protocol-level contracts, upgrade through governance and explicit migration
steps:

- deploy replacement contract
- migrate or re-seed state where necessary
- switch calling contracts or registries
- announce the new canonical address/interface

## Patterns To Avoid

- hidden backdoors that can arbitrarily rewrite contract behavior
- upgrade logic spread across many contracts without one clear authority
- mixing user funds and migration logic without explicit pause/move phases

The simpler the upgrade path, the easier it is to reason about security and
determinism.
