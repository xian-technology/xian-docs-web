# Golden Path Implementation Log

## Purpose

Track the docs work that lands alongside the cross-repo golden-path roadmap so
the docs do not drift behind implementation.

## Completed

### 2026-03-23: SDK Watcher Slice

Repos changed:

- `xian-py`
- `xian-abci`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`
- `api/rest.md`

What was documented:

- `xian-py` now exposes typed node status reads
- block watching uses raw node RPC and can resume by height
- event watching uses indexed BDS reads and a stable `after_id` cursor
- the BDS REST/ABCI event surface now documents the `after_id` path for
  resumable consumers

### 2026-03-23: SDK Config And Retry Slice

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`

What was documented:

- explicit SDK config types for transport, retry, submission, and watcher
  defaults
- read-side retry policy and its boundaries
- watcher defaults coming from `XianClientConfig.watcher`

### 2026-03-24: SDK Application Helper Slice

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`

What was documented:

- higher-level helper clients for contract, token, event, and exact state-key
  access
- the intended “thin wrapper” role of those helpers
- practical examples for application-style usage

### 2026-03-24: SDK Service Integration Example Slice

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`

What was documented:

- the repo-level integration examples for:
  - an async FastAPI service
  - a resumable event worker
  - a synchronous admin / automation job
- how those examples fit the golden path as ordinary backend integration
  patterns
- the expectation that framework dependencies for the FastAPI example stay out
  of the base SDK install

### 2026-03-24: Template-Driven Network Slice

Repos changed:

- `xian-configs`
- `xian-cli`
- `xian-stack`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/index.md`
- `node/installation.md`
- `node/configuration.md`
- `node/profiles.md`
- `node/managing.md`

What was documented:

- canonical starter templates for creating or joining a network
- the new `xian network template list/show` and `--template` flow
- `monitoring_enabled` as a node-profile setting
- the fact that template-driven node start can now request Prometheus and
  Grafana alongside the node runtime

### 2026-03-24: Operator Status And Endpoint Discovery Slice

Repos changed:

- `xian-cli`
- `xian-stack`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/index.md`
- `node/installation.md`
- `node/managing.md`

What was documented:

- `xian node status` now includes a compact operator summary
- `xian node endpoints` exposes the effective local URLs for RPC, metrics,
  dashboard, and monitoring services
- `xian-stack/scripts/backend.py endpoints` is now part of the stable backend
  machine interface

### 2026-03-24: Doctor Health Slice

Repos changed:

- `xian-cli`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/managing.md`

What was documented:

- `xian doctor <name>` now performs live health checks by default
- live checks cover backend state, RPC reachability, and optional dashboard /
  monitoring services
- `--skip-live-checks` keeps the offline artifact-only preflight available

### 2026-03-24: Runtime Health Slice

Repos changed:

- `xian-cli`
- `xian-stack`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/index.md`
- `node/installation.md`
- `node/managing.md`

What was documented:

- `xian node health <name>` as the concise live-runtime health command
- `xian-stack/scripts/backend.py health` as the backend machine-readable health
  surface
- health now includes runtime probes, disk pressure, state-sync readiness, and
  effective snapshot bootstrap visibility

### 2026-03-24: Template Monitoring Posture And BDS Health Slice

Repos changed:

- `xian-configs`
- `xian-cli`
- `xian-stack`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/configuration.md`
- `node/profiles.md`
- `node/managing.md`

What was documented:

- canonical templates now declare explicit `operator_profile` and
  `monitoring_profile` intent
- node profiles now retain that template intent for later operator commands
- service-node health now includes BDS queue, spool, lag, and database status
- service-node endpoint discovery now includes BDS query URLs and GraphQL

### 2026-03-24: Remote Health And Recovery Runbook Slice

Repos changed:

- `xian-deploy`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/index.md`
- `node/installation.md`
- `node/managing.md`

What was documented:

- `xian-deploy` now mirrors the local health/recovery model with remote
  `status.yml`, `health.yml`, and `smoke.yml`
- the operator docs now define the three concrete recovery/bootstrap paths:
  prepared node-home archive, application-state snapshot import, and protocol
  state sync
- the remote path for protocol state sync is now documented explicitly via
  `playbooks/bootstrap-state-sync.yml`

### 2026-03-24: Credits Ledger Pack Slice

Repos changed:

- `xian-meta`
- `xian-configs`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `solution-packs/index.md`
- `solution-packs/credits-ledger.md`
- `tools/xian-py.md`

What was documented:

- the public solution-pack concept and why packs are product patterns instead
  of generic tutorials
- the first Credits Ledger Pack, tied to the existing `single-node-indexed`
  and `embedded-backend` operator paths
- the reusable contract asset in `xian-configs` and the pack-specific SDK
  examples in `xian-py`

### 2026-03-24: Registry / Approval Pack Slice

Repos changed:

- `xian-meta`
- `xian-configs`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `solution-packs/index.md`
- `solution-packs/registry-approval.md`
- `tools/xian-py.md`

What was documented:

- the second reference solution pack built around shared registry state and
  approval flow
- the reusable registry and approval contracts in `xian-configs`
- the pack-specific SDK examples in `xian-py`
- the recommended local `single-node-indexed` and remote `consortium-3`
  operator paths for this pack

### 2026-03-24: Workflow Backend Pack Slice

Repos changed:

- `xian-meta`
- `xian-configs`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `solution-packs/index.md`
- `solution-packs/workflow-backend.md`
- `tools/xian-py.md`

What was documented:

- the third reference solution pack built around a job-style workflow backend
- the reusable workflow contract in `xian-configs`
- the pack-specific SDK examples in `xian-py`
- the recommended local `single-node-indexed` and remote `embedded-backend`
  operator paths for this pack

### 2026-03-24: Credits Ledger Reference-App Slice

Repos changed:

- `xian-meta`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/index.md`
- `solution-packs/credits-ledger.md`

What was documented:

- the Credits Ledger Pack is now also the first deeper reference-app slice
- the reference-app pattern combines:
  - an authoritative on-chain ledger
  - indexed BDS events
  - a local SQLite projection
  - an API service that serves both authoritative and projected reads
- the projector worker, projection database path, and the richer API routes
  for account activity and summary views

## Next Docs Slice

When the next operator slice lands, update:

- the affected node/operator pages
- any CLI or stack docs that changed materially
- this file with the new completed slice
