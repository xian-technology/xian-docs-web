# Installation and Setup

The maintained operator path uses `xian-cli`, `xian-stack`, and
`xian-configs` in a sibling workspace.

## Requirements

- macOS or Linux
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

For an isolated operator installation:

```bash
uv tool install xian-tech-cli
xian --help
```

Node lifecycle still requires access to compatible `xian-stack` and
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

Use `--plan` or `--dry-run` where supported to inspect paths and actions before
writing files.

## Join an Operator-Managed Network

Generate validator material, then join from an accepted manifest:

```bash
xian keys validator generate --out-dir ./keys/validator-1

xian network join validator-1 \
  --network private-net \
  --network-manifest /path/to/network/manifest.json \
  --template single-node-indexed \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack

xian node init validator-1
```

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

## Remote Hosts

Use `xian-deploy` for supported Ansible-based Linux deployment:

```bash
ansible-playbook playbooks/bootstrap.yml
ansible-playbook playbooks/push-home.yml
ansible-playbook playbooks/deploy.yml
ansible-playbook playbooks/health.yml
```

Store inventory secrets in Ansible Vault, SOPS, CI secrets, or another secret
manager. Do not commit validator keys, database passwords, or rendered secret
files.

## Next Steps

- [Configuration](/node/configuration)
- [Starting, Stopping, and Monitoring](/node/managing)
- [Validator Operations Runbook](/node/validator-operations-runbook)
- [Recovery Plans](/node/recovery-plans)
