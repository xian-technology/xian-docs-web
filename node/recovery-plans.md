# Recovery Plans

Recovery plans are the operator-side answer to the question: "What if we
actually need to roll back or restore to a known-good state?"

They are intentionally **not** a normal on-chain feature.

Use a recovery plan only when:

- forward state patching is not enough
- the chain has already stalled or split
- operators need a single canonical restore procedure

If the chain is progressing, prefer governed forward state patches.

## What A Recovery Plan Is

A recovery plan is a JSON document consumed by `xian-cli`.

Required fields:

```json
{
  "schema_version": 1,
  "name": "metering-incident-001",
  "chain_id": "xian-local-1",
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

Supported artifact kinds:

- `snapshot_url`

That artifact is restored through the existing snapshot/node-home restore path.

## What The CLI Does

`xian-cli` provides two commands:

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

The recovery plan keeps its own artifact object. Its URI can name a raw
full-store archive pinned by the plan's independently trusted SHA-256, including
when the profile has publisher keys configured. A signed version-2 manifest URI
uses those configured publisher keys; a plan SHA-256 then adds an archive pin.
Both paths receive the same full-store verification. `--skip-stop` skips the
automatic stop command, but does not bypass the stopped-node check.

The plan's `target_height`, `trusted_block_hash` and `trusted_app_hash` require
manual confirmation. The CLI does not compare those fields with the restored
checkpoint. Its full-store verifier checks the archive's own checkpoint,
configured trust and genesis; `--yes` confirms the operator has reviewed the
incident plan. Confirm the planned height and hashes before starting the node.

## Full Node-Store Bootstrap

Use a coherent full node-store snapshot for node bootstrap. It includes Xian
application state and the matching CometBFT state, block and evidence stores
from one stopped or consistently captured checkpoint. An application-state
export alone does not provide the consensus history needed to verify older
evidence. Peer-to-peer application state sync is disabled.

The accepted snapshot must bind the recipient's chain and genesis to its
checkpoint height, block hash and application hash. Publish network snapshots
through a signed full node-store manifest from a configured trusted publisher.
The signature authenticates its checkpoint commitments and archive checksum.
A checksum copied only from the same untrusted download does not establish
publisher trust. The publisher is a trust anchor: consistency checks of its
snapshot do not independently verify the entire chain from genesis.

Capture the stores coherently and verify the archive before publishing it.
Preserve the complete live evidence window at the checkpoint; a directory
named `data/` is not by itself evidence that the required stores are present
and consistent. Verify the supported runtime and genesis on the receiving node
before restoring. Replay from genesis remains the alternative when no trusted
full-store snapshot is available, provided the complete historical blocks can
be obtained.

Full replay also requires the public state-patch bundles used by that history.
Provision and verify the bundles needed for replay or scheduled activations
before starting the receiving node. Full-store export does not include the
node's configuration files, so distribute these public operator assets
separately from private node-home backups and identity keys.

The normal entrypoints are `xian snapshot restore <node>` and
`xian node init <node> --restore-snapshot`; remote operators use
`playbooks/restore-network-snapshot.yml`. They use the selected profile's
`snapshot_url` and publisher trust settings. Stop the receiving node and retain
its own keys and validator signing state, as described below. Do not publish
private recovery-plan backups as network snapshot artifacts.

### Publish and Restore a Signed Snapshot

Stop the source node before export. Keep the publisher signing key in an
owner-only file containing one 32-byte private key as 64 hexadecimal characters,
and keep that key and both output paths outside the node home:

```bash
xian node stop archive-1
mkdir -p ./published-snapshots
xian snapshot export archive-1 \
  --archive-output ./published-snapshots/node-store.tar.gz \
  --manifest-output ./published-snapshots/node-store.json \
  --snapshot-url https://example.invalid/node-store.tar.gz \
  --signing-key-file /secure/snapshot-publisher.key
```

Export verifies the stores with the selected runtime before producing the
archive and manifest. It does not upload them. Publish both files at the
accepted locations and distribute the publisher's public key through the
network's trusted channel. Configure that key in each recipient profile's
`snapshot_signing_keys` before using the manifest URL:

```bash
xian node stop observer-1
xian snapshot restore observer-1 \
  --snapshot-url https://example.invalid/node-store.json
xian node start observer-1
xian node health observer-1
```

The version-2 signed manifest uses `manifest_version: 2` and
`snapshot_kind: "full_node_store"`. Along with that version and kind, its
signed fields bind `chain_id`, integer
`height`, `genesis_sha256`, `app_hash`, `block_hash`, `snapshot_url`,
`snapshot_sha256`, `snapshot_bytes`, `uncompressed_bytes` and
`signing_public_key`; `signature` authenticates that canonical payload.
`uncompressed_bytes` counts the complete uncompressed tar stream, including
headers and padding. Resource limits are checked before publishing restored
stores. This bootstrap flow requires a complete full-node-store archive.

The explicit backend `expected_sha256` API and a recovery plan's trusted
archive SHA-256 can authorize a raw full-store archive. That hash must come
from an independently trusted source, and the same full-store consistency and
resource checks apply. An independently trusted hash and a trusted publisher's
signature both authenticate selected bytes; neither replaces replay from
genesis. A self-declared checksum from an untrusted archive is insufficient.

### Verification and Resource Limits

Verified full-store snapshots support the `goleveldb` backend. Export requires
`db_dir = "data"`; restored database paths must remain inside the `data/` root.
Before replacing the local stores, verification recomputes the application root, matches its
committed height and exact time to the native checkpoint, checks the recipient's
genesis and manifest commitments, and scans the complete live evidence window
through the offline native inspector. It also verifies every retained block
body. Required historical metadata must be present even where older block
bodies were pruned. Missing or inconsistent
stores refuse restoration.

Default transfer limits are 8 GiB of archive bytes, 32 GiB of uncompressed tar,
100,000 archive members and a 256 MiB free-disk reserve. Staging also needs room
for the downloaded archive, uncompressed tar and extracted stores at the same
time. Signed manifest JSON is limited to 64 KiB. The backend
`FullNodeStoreLimits` API permits explicit resource overrides;
these are operator limits, not chain consensus settings.

Offline native inspection defaults to 1,000,000 historical heights and 120
seconds. `XIAN_NODE_STORE_INSPECT_MAX_HISTORY_HEIGHTS` and
`XIAN_NODE_STORE_INSPECT_TIMEOUT_SECONDS` allow larger explicit budgets.
Exhaustion fails verification; it does not accept a shorter evidence window.

## Snapshot Restore Boundaries

Recovery-plan backups contain validator and node private keys. The CLI creates
each backup with a unique filename, owner-only file permissions (`0600`) and an
owner-only backup directory (`0700`). Preserve these permissions when copying
backups and store them as private custody material.

Stop the node before restoring a snapshot. `xian snapshot restore` and
`xian node init --restore-snapshot` check the node's runtime state first and
refuse while its runtime containers are up, even if the node processes are
crash-looping; stop it with `xian node stop <name>`. An active container with a
writable mount overlapping the node home also blocks
restoration, including containers under another Compose project. On remote hosts,
`xian-deploy`'s `playbooks/restore-network-snapshot.yml` performs the stop,
restore and start for you. Restore replaces only the `data/` and `xian/`
roots. A full node-home archive may contain `config/` or other
entries, but those entries are not restored.

The restore helper preserves local validator signing state, validator keys, and
node keys at both their default and configured paths. Protected files inside a
replaced root retain their bytes and file modes; files outside those roots are
left in place. A missing local protected file is not imported from the archive.
Restoring older chain data therefore does not rewind the local signing record
or import another node's identity. Provision any missing keys through the normal
node setup workflow.

The archive is inspected before extraction into private staging. Only regular
files and directories are accepted. Absolute or traversing paths, backslash
paths, links, and special files are rejected even when the entry would otherwise
be ignored. Duplicate application-file entries and conflicting application paths
fail before replacing local data. Restore also refuses symlinked application
roots or protected paths within those roots.

Publication rolls back filesystem failures where possible, but replacement of
the two roots is not one filesystem transaction. Before replacing either root,
the helper durably writes `.snapshot-restore-*/publication-started` in the node
home. An interrupted publication marker or retained backup blocks node startup,
snapshot export and another restore, including a first restore with no previous
roots.

Keep the node stopped and preserve the interrupted workspace. Recover the
original directories from `.snapshot-restore-*/backup/` where available, then
verify a coherent pair of stores and the local signing state. Only after that
recovery should the interrupted workspace be removed. Deleting its marker or
backup to bypass the guard is not a recovery procedure. These protections
supplement the accepted publisher trust and recovery plan; they do not
independently verify chain history from genesis.

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
- validators need coordinated agreement on the plan before applying it

## What The CLI Does Not Prove Automatically

The recovery plan includes trusted block/app hashes because those matter
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

- the chain is finalizing blocks
- you can correct state or contract logic going forward
- governance can approve the remedy on-chain

Use a recovery plan when:

- the bug already broke consensus progression
- you need to restore a known-good node-home/snapshot state
- governance approval already happened off-chain or cannot happen on-chain yet

In practice:

- live chain issue: governed forward patch
- stalled or divergent chain: coordinated recovery plan first, forward patch second if needed
