# Config Taxonomy

Xian separates shared network facts, node-local intent, host placement, and
deployable artifacts.

## Terms

| Term | Purpose | Owner |
| --- | --- | --- |
| network template | reusable defaults for creating a manifest/profile | `xian-configs/templates/` |
| network manifest | chain identity, genesis, peers, snapshots, releases, and network policy | `xian-configs/networks/` or operator network repo |
| node profile | one node's keys, paths, image mode, services, and runtime intent | local `nodes/<name>.json` |
| deploy binding | host paths, ports, credentials, resources, and topology | `xian-deploy` inventory/vault |
| bundle | hash-pinned set of exact artifacts | owning config, product, recovery, or privacy workflow |
| product repo | optional post-genesis protocol or application | repo such as `xian-dex` |

Packages are release/install units, not a configuration layer.

## Ownership Boundaries

- Templates contain reusable defaults and no secrets.
- Manifests contain shared per-chain facts and should be frozen once a chain
  exists.
- Profiles contain per-node intent and key references, not raw secrets.
- Deploy bindings place a profile on a host and may reference secrets from a
  vault or secret manager.
- Rendered CometBFT homes and containers are derived runtime output.

Do not merge profiles and deployment inventories: doing so pushes host
credentials into an artifact operators may need to share or version.

## Precedence

Precedence depends on the phase:

| Phase | Resolution order |
| --- | --- |
| create manifest | explicit command flags, template defaults, built-in defaults |
| generate genesis | explicit genesis flags, bundle constructor defaults |
| create profile | explicit flags, template profile defaults, network manifest defaults, built-in defaults |
| start local node | lifecycle flags, profile, applicable manifest values, runtime defaults |
| deploy remotely | profile for runtime intent; inventory/vault for host placement and secrets |

Templates do not retroactively update existing manifests or profiles. Regenerate
runtime files from their source artifacts instead of editing generated output.

## Networks and Products

A network manifest identifies a chain. A product bundle installs an optional
application after that chain exists.

`xian-configs` owns system genesis assets. Product repos own their contracts,
bundle manifest, application, tests, and bootstrap script. Products are not
copied into node images or silently included in every genesis.

## Rule of Thumb

- use a template to create
- use a manifest to identify a chain
- use a profile to run one node
- use a deploy binding to place it on a host
- use a bundle to pin bytes
- use the owning product repo to install an optional application

## Related Pages

- [Configuration](/node/configuration)
- [Node Profiles](/node/profiles)
- [Products](/products/)
