# Installation and Setup

The maintained operator path uses `xian-cli`, `xian-stack`, and
`xian-configs` in a sibling workspace.

## Requirements

- Linux (x86-64 or ARM64), or macOS on Apple Silicon
- Python 3.14
- `uv`
- Docker with Compose
- Git

Typical layout:

```text
~/xian/
  xian-cli/
  xian-stack/
  xian-abci/
  xian-configs/
  xian-contracting/
  xian-py/
```

## Prepare the Workspace

```bash
cd ~/xian/xian-cli
uv sync --group dev

cd ../xian-stack
make validate
```

Use the CLI from the same workspace for node management. Run
`uv run --project ~/xian/xian-cli xian --help` to check the installation.

Node lifecycle requires access to compatible `xian-stack` and
`xian-configs` assets.

## Create a Local Node

Interactive setup:

```bash
xian setup node
```

Explicit local setup:

```bash
xian network create local-dev \
  --chain-id xian-local-1 \
  --template single-node-dev \
  --generate-validator-key \
  --init-node

xian node start local-dev
xian node status local-dev
xian node endpoints local-dev
xian node health local-dev
```

`single-node-dev` enables the self-contained development surface by default:
BDS/Postgres indexing, the read-only GraphQL endpoint and GraphiQL browser UI,
the dashboard, Prometheus, and Grafana. Run `xian node endpoints local-dev` for
the effective loopback URLs and `xian node health local-dev` to verify every
enabled service. Five-second periodic blocks keep contract time moving while an
interactive development node is idle.

IntentKit, DEX automation, the shielded relayer and product contract deployment
remain explicit choices because they require extra repositories, credentials
or product bootstrap. Peer-to-peer application state sync is disabled; join
through replay or a verified full node-store snapshot. See
[Bootstrap and Snapshots](/node/configuration#bootstrap-and-snapshots).

Use `--plan` or `--dry-run` where supported to inspect paths and actions before
writing files.

## Join an Operator-Managed Network

Generate validator material, then join from an accepted manifest:

```bash
xian keys validator generate --out-dir ./keys/validator-1

xian network join validator-1 \
  --network private-net \
  --network-manifest /path/to/network/manifest.json \
  --template validator \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack

xian node init validator-1
```

Before `xian node init`, set `advanced.cometbft.external_address` in the new
profile (`nodes/validator-1.json`) to the public `host:26656` other nodes can
dial, so peer exchange can spread this node's address; see
[Node Profiles](/node/profiles). The bootstrap node needs it as well.

Verify the manifest, genesis hash, image digests, peers, snapshot trust, chain
ID, and operator contact process before starting. The current codebase has no
active public testnet or mainnet; the checked-in mainnet manifest is a rehearsal
asset.

## Image Mode

- `registry` uses immutable image references supplied by a manifest/profile.
- `local_build` builds from sibling source checkouts and is intended for local
  development or unreleased testing.

Release deployments should use digest-pinned images and retain the embedded
release provenance.

Pin the controller's CLI commit and resolved dependencies alongside the node
release. A CLI package version can remain unchanged while its dependency lock
is refreshed; an older tag's frozen lock may not match the selected runtime.
Verify native VM/compiler builds and the controller's SDK separately from the
server image. ABCI requires the native VM's transaction receipt methods at
startup. For source builds, use the Contracting revision pinned by the ABCI
release so those methods are available. Execution-changing runtime fixes require
coordinated upgrade and replay validation for an existing network, without
regenerating genesis.

## Remote Hosts

Use `xian-deploy` for supported Ansible-based Linux deployment:

```bash
ansible-playbook playbooks/bootstrap.yml
ansible-playbook playbooks/push-home.yml
ansible-playbook playbooks/deploy.yml
ansible-playbook playbooks/health.yml
```

If the node profile enables monitoring, pin `xian-monitoring.tar` from a
versioned `xian-stack` release in `xian_monitoring_bundle_source` and put
its verified SHA-256 in `xian_monitoring_bundle_sha256`. The source can be an
HTTPS asset URL or an absolute path on the Ansible controller. The monitoring
bundle and the node image have independent pins. See the
[monitoring setup](https://github.com/xian-technology/xian-deploy/blob/main/docs/OPERATIONS.md#monitoring-and-alerts).

Run `xian node init` on the control machine and set `xian_node_home_archive`
to an archive of the resulting home contents. The archive must contain
`config/genesis.json`. Set `xian_network_manifest` to the manifest used for
initialization to check the chain ID and any `genesis_sha256` pin against the
genesis file bytes. The upload playbook checks the staged archive before changing
the current home. Deploy checks the installed file before configuration.

Remote configuration runs with a Python entrypoint override so the integrated
image's supervisor and validator services start only with the Compose runtime.

`deploy.yml` rewrites node configuration but never restores a snapshot, even
when the node profile carries `snapshot_url`; a profile-only change reaches a
running node after `playbooks/restart.yml`. To restore the profile's signed
snapshot, run `playbooks/restore-network-snapshot.yml`, which stops the
runtime, restores, and starts it again one host at a time.

CometBFT RPC binds to `127.0.0.1` by default. Publishing it on another address
requires `xian_public_rpc_enabled: true`. Docker inserts its own iptables rules
ahead of UFW, so a port published on `0.0.0.0` is reachable even when UFW does
not allow it: the bind address, not the firewall, controls exposure. Verify
exposure from outside the host.

Store inventory secrets in Ansible Vault, SOPS, CI secrets, or another secret
manager. Do not commit validator keys, database passwords, or rendered secret
files.

## Next Steps

- [Configuration](/node/configuration)
- [Starting, Stopping, and Monitoring](/node/managing)
- [Validator Operations Runbook](/node/validator-operations-runbook)
- [Recovery Plans](/node/recovery-plans)
