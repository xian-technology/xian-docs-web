# Node Operations

The operator path spans several focused repositories:

- `xian-cli`: network, profile, node lifecycle, recovery, and diagnostics
- `xian-stack`: images, Compose topology, localnet, monitoring, and backend
  commands
- `xian-abci`: deterministic node application, snapshots, BDS, metrics, and
  optional dashboard
- `xian-configs`: manifests, templates, genesis bundles, and launch assets
- `xian-deploy`: remote Linux deployment playbooks

The current codebase has no active public testnet or mainnet. Use a local
network or an explicitly accepted operator manifest.

## Local Workflow

```bash
xian setup node --mode local --network local-dev --name validator-1 \
  --key-mode generate --start --yes

xian node status validator-1
xian node endpoints validator-1
xian node health validator-1
xian node stop validator-1
```

The default local template starts BDS/Postgres, GraphQL and its GraphiQL browser
UI, the dashboard, Prometheus, and Grafana. These host-facing services bind to
loopback by default, and five-second periodic blocks keep contract time moving
while idle. Credential- and product-dependent sidecars remain opt-in.

For a shared operator-managed network, pass its reviewed manifest explicitly:

```bash
xian setup node --mode join --name validator-1 \
  --network private-net \
  --network-manifest /path/to/accepted/manifest.json \
  --preset indexed --key-mode existing \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack --no-start --yes
```

Verify genesis, chain ID, peers, snapshot trust, image digests, and release
provenance before starting.

## Runtime Topologies

- `integrated`: CometBFT and `xian-abci` supervised in one node container
- `fidelity`: separate CometBFT and application containers

Dashboard, BDS, GraphQL, monitoring, and other sidecars do not participate in
consensus. The local development template enables the self-contained core set;
operator and public-network profiles may choose a narrower service posture.

## Documentation Map

- [Architecture](/node/architecture)
- [Requirements](/node/requirements)
- [Installation and Setup](/node/installation)
- [Config Taxonomy](/node/config-taxonomy)
- [Configuration](/node/configuration)
- [Node Profiles](/node/profiles)
- [Runtime Features](/node/runtime-features)
- [Starting, Stopping and Monitoring](/node/managing)
- [Pruning and Retention](/node/pruning)
- [Recovery Plans](/node/recovery-plans)
- [Upgrading](/node/upgrading)
- [Becoming a Validator](/node/validators)
- [Validator Operations Runbook](/node/validator-operations-runbook)
- [Validator Responsibilities](/node/validator-responsibilities)
- [Staking Mechanics](/node/staking)
- [Protocol Governance and State Patches](/node/protocol-governance)
- [Governance Web Console](/node/governance-web)
- [5-Validator Localnet E2E](/node/localnet-e2e)
- [Local DEX Bootstrap](/node/local-dex-bootstrap)
