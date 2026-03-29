# Upgrading

Upgrades should keep all validator runtimes version-aligned. Xian relies on a
shared CPython minor version for deterministic bytecode metering, so validators
must upgrade in a coordinated way.

## Safe Upgrade Sequence

1. Stop the node
2. Update the repos or release artifact
3. Pull the pinned immutable node image, or rebuild locally if the node profile
   intentionally uses `node_image_mode=local_build`
4. Run validation and smoke coverage
5. Start the node again and verify status

Example from a sibling workspace:

```bash
cd ~/xian/xian-stack
make validate
make smoke-cli

cd ../xian-cli
uv run xian node stop validator-1
uv run xian node start validator-1
uv run xian node status validator-1
```

## What to Keep Stable

- CPython minor version across validators
- `xian-contracting` and `xian-abci` versions
- canonical network bundle selection from `xian-configs`
- the pinned node image digests in the manifest/profile for registry-backed
  runtimes
- the embedded release-manifest provenance block in canonical manifests and
  profiles, so the node image and the component refs stay aligned

## State and Config Safety

- keep backups of the CometBFT home before high-risk upgrades
- do not mutate canonical manifests ad hoc on validators
- prefer schema-validated manifest/profile rewrites through `xian-cli`
