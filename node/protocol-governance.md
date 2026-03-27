# Protocol Governance & State Patches

Xian now treats forward state patching as the primary remediation path for
protocol mistakes that do not require rewriting finalized chain history.

The current model has two parts:

- on-chain approval through the canonical `governance` contract
- local validator possession of the exact approved patch bundle

That split is intentional. Governance decides **what** should happen and
**when** it should activate. Validators still need the exact bundle locally so
every node applies the same deterministic state change at the same block.

## What Governance Covers

The canonical `governance.s.py` contract in `xian-configs` currently supports:

- `state_patch` proposals
- `contract_call` proposals

For state patches, governance stores:

- `patch_id`
- `bundle_hash`
- `activation_height`
- approval status
- emergency flag
- optional summary / URI metadata

Important current behavior:

- proposal thresholds are snapshotted when the proposal is created
- membership changes after proposal creation do not change the required votes
- approved patches are scheduled on-chain by activation height
- validators only apply a patch if the local bundle matches the approved
  `bundle_hash`

## Local Bundle Directory

Validators load local patch bundles from:

```text
<cometbft-home>/config/state-patches
```

In the maintained stack this is typically:

```text
../xian-stack/.cometbft/config/state-patches
```

The runtime loads this inventory at startup. If a bundle file is malformed, the
node now fails fast instead of silently skipping patch execution later.

## Bundle Format

Current bundle shape:

```json
{
  "version": 1,
  "patch_id": "metering-fix-20260327",
  "activation_height": 123456,
  "chain_id": "xian-mainnet-1",
  "summary": "Correct meter output for edge-case branch",
  "uri": "ipfs://...",
  "changes": [
    {
      "key": "con_example.value",
      "value": "patched",
      "comment": "correct stored value"
    }
  ]
}
```

Current rules:

- `patch_id` must be a safe lowercase identifier
- `activation_height` must be positive
- `changes` must be non-empty
- duplicate keys are rejected
- direct `.__code__` writes are rejected
- contract source changes must be supplied as `contract_name.__source__`

When a bundle patches `.__source__`, the runtime derives and applies the
matching canonical `.__code__` artifact automatically.

## Normal Operator Flow

Use this when the chain is still progressing and the problem can be corrected
forward.

1. Build the patch bundle and distribute the exact file to validators.
2. Verify that validators report the same local `bundle_hash`.
3. Submit a `state_patch` governance proposal with:
   - `patch_id`
   - `bundle_hash`
   - `activation_height`
   - optional summary / URI
4. Reach the required approval threshold.
5. Let the chain continue until the activation block.
6. At that block, every validator applies the approved bundle and records the
   applied execution metadata on-chain.

This is the preferred remediation path for:

- correcting bad protocol state
- migrating contract storage
- replacing deployed contract source deterministically
- fixing logic mistakes after an upgrade, as long as consensus is still live

## Query Surfaces

These current ABCI query paths expose the patch pipeline:

```text
GET /api/abci_query/state_patch_bundles
GET /api/abci_query/scheduled_state_patches/<height>
```

Those do **not** require BDS. They reflect:

- the node's local bundle inventory
- the node's current on-chain view of scheduled approved patches

When BDS is enabled, historical applied patch data is also indexed through:

```text
GET /api/abci_query/state_patches
GET /api/abci_query/state_patches_for_block/123
GET /api/abci_query/state_patch/<execution_hash>
GET /api/abci_query/state_changes_for_patch/<execution_hash>
```

## Emergency Patches

Governance supports an `emergency` flag with a shorter minimum patch delay.

That is for cases where:

- the chain is still finalizing blocks
- the issue is urgent
- validators already have the approved local bundle

Emergency state patches are still forward patches. They are not historical
rewrites.

## What Forward Patching Does Not Solve

Forward patching reduces the need for rollbacks, but it does **not** eliminate
every recovery scenario.

If the bug itself breaks consensus progression, on-chain governance may not be
able to help because the chain cannot advance far enough to approve or execute
the proposal.

Typical example:

- a metering bug turns out to be nondeterministic for a special bytecode shape
- validators disagree during block execution
- the network stalls or splits before governance can finalize a remedy

In that case, the correct response is an operator-coordinated emergency
procedure:

1. stop validators from continuing divergent execution
2. agree on the fixed runtime version and recovery plan off-chain
3. restart the network on the fixed deterministic runtime
4. if the resulting chain state still needs correction, use a governed forward
   patch after the chain is live again

That means forward patching is the primary **live** remediation path, while
consensus-halting nondeterminism still requires off-chain validator
coordination first.
