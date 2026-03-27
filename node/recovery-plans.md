# Recovery Plans

Recovery plans are the operator-side answer to the question: "What if we
actually need to roll back or restore to a known-good state?"

They are intentionally **not** a normal on-chain feature.

Use a recovery plan only when:

- forward state patching is not enough
- the chain has already stalled or split
- operators need a single canonical restore procedure

If the chain is still progressing, prefer governed forward state patches.

## What A Recovery Plan Is

A recovery plan is a JSON document consumed by `xian-cli`.

Current required fields:

```json
{
  "schema_version": 1,
  "name": "metering-incident-20260327",
  "chain_id": "xian-mainnet-1",
  "target_height": 123456,
  "trusted_block_hash": "ABCD...",
  "trusted_app_hash": "EFGH...",
  "reason": "Recover pre-divergence state after nondeterministic metering bug",
  "artifact": {
    "kind": "snapshot_url",
    "uri": "https://example.invalid/recovery.tar.gz",
    "sha256": "..."
  }
}
```

Optional sections:

- `runtime.xian_abci_version`
- `runtime.cometbft_version`
- `follow_up_state_patch.patch_id`
- `follow_up_state_patch.bundle_hash`
- `follow_up_state_patch.activation_height`

Current supported artifact kinds:

- `snapshot_url`

That artifact is restored through the existing snapshot/node-home restore path.

## What The CLI Does

`xian-cli` now provides two commands:

```bash
uv run xian recovery validate ./recovery-plan.json validator-1
uv run xian recovery apply ./recovery-plan.json validator-1 --yes
```

`validate` checks:

- the plan shape
- the local node profile and network manifest
- `chain_id` alignment
- that the node home is initialized
- optional live RPC alignment when the status endpoint is reachable

`apply` does the guided destructive work:

- validates the plan again
- stops the local `xian-stack` node unless `--skip-stop` is used
- creates a backup archive of the current node home unless `--skip-backup` is used
- restores the recovery snapshot archive
- verifies the archive `sha256` when the plan provides one
- optionally starts the node again with `--start-node`

## Example Workflow

1. Agree off-chain on the recovery plan and artifact.
2. Distribute the same plan JSON to every validator.
3. Run:

```bash
uv run xian recovery validate ./recovery-plan.json validator-1
```

4. Confirm the output matches the intended chain, home, and trusted hashes.
5. Apply the plan:

```bash
uv run xian recovery apply ./recovery-plan.json validator-1 --yes
```

6. If you want the helper to restart immediately:

```bash
uv run xian recovery apply ./recovery-plan.json validator-1 --yes --start-node
```

Important boundary:

- the CLI can validate and restore artifacts
- it cannot create social consensus for you
- validators still need coordinated agreement on the plan before applying it

## What The CLI Does Not Prove Automatically

The recovery plan still includes trusted block/app hashes because those matter
operationally, but the restore helper cannot fully prove historical consensus
for you from the archive alone.

Treat these as required manual checkpoints:

- `trusted_block_hash`
- `trusted_app_hash`
- the agreed recovery height
- the agreed runtime version set

The helper makes the procedure safer and more consistent. It does not remove
the need for operator review.

## When To Use This Versus Forward Patching

Use governed forward state patches when:

- the chain is still finalizing blocks
- you can correct state or contract logic going forward
- governance can still approve the remedy on-chain

Use a recovery plan when:

- the bug already broke consensus progression
- you need to restore a known-good node-home/snapshot state
- governance approval already happened off-chain or cannot happen on-chain yet

In practice:

- live chain issue: governed forward patch
- stalled or divergent chain: coordinated recovery plan first, forward patch second if still needed
