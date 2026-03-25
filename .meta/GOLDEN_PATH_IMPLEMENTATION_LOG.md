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

### 2026-03-24: Whole-Stack Validation Follow-Up

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/credits-ledger.md`

What was documented:

- the documented FastAPI and uvicorn examples now install via the optional
  `xian-py[app]` extra instead of assuming framework dependencies are present
- the deeper Credits Ledger walkthrough now reflects the live validated shape:
  authoritative chain reads, BDS indexed events, a resumable projection, and a
  thin API service running on top of the SDK helper layer

### 2026-03-24: Registry / Approval Live Validation Follow-Up

Repos changed:

- `xian-abci`
- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/registry-approval.md`

What was documented:

- `xian-py` now exposes `call(...)` for decoded readonly contract hydration
  instead of forcing application code to unpack raw simulation envelopes
- the registry reference app now documents the live-validated pattern:
  indexed events as triggers, authoritative contract reads as hydration, and a
  local SQLite projection for operator-facing views
- the registry bootstrap flow now funds configured approvers by default so
  multi-signer approvals work in the documented local/reference path
- the stack now treats boolean ABCI state reads as first-class values instead
  of implicitly mislabeling them as integers

### 2026-03-24: Workflow Backend Live Validation Follow-Up

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/workflow-backend.md`

What was documented:

- workflow processors and projections now treat indexed event fields as
  first-class by merging `data_indexed` and `data`
- the workflow bootstrap flow now funds configured workers by default so the
  documented processor path can actually claim and complete items
- the deeper workflow walkthrough now reflects the live-validated shape:
  one completed item path plus a separate cancelled item path, both matching
  projected and authoritative reads

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

### 2026-03-24: Registry / Approval Reference-App Slice

Repos changed:

- `xian-meta`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/index.md`
- `solution-packs/registry-approval.md`

What was documented:

- the Registry / Approval Pack is now also the second deeper reference-app
  slice
- the reference-app pattern combines:
  - authoritative approval and registry contracts
  - indexed BDS events as workflow triggers
  - a local SQLite projection
  - projector hydration from authoritative contract reads
  - an API service that serves both on-chain reads and projected workflow
    views
- the projector worker, projection database path, and the richer API routes
  for records, pending proposals, approvals, and workflow activity

### 2026-03-24: Workflow Backend Reference-App Slice

Repos changed:

- `xian-meta`
- `xian-py`
- `xian-docs-web`

Docs updated:

- `tools/xian-py.md`
- `solution-packs/index.md`
- `solution-packs/workflow-backend.md`

What was documented:

- the Workflow Backend Pack is now also the third deeper reference-app slice
- the reference-app pattern combines:
  - an authoritative workflow contract
  - a processor worker
  - indexed BDS events as projection triggers
  - a local SQLite projection
  - projector hydration from authoritative `get_item` reads
  - an API service that serves both on-chain reads and projected queue views
- the processor worker, projector worker, projection database path, and the
  richer API routes for queue summaries, items, and workflow activity

### 2026-03-24: Validation Cleanup And Endpoint Introspection Slice

Repos changed:

- `xian-stack`
- `xian-abci`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `node/managing.md`

What was documented:

- stack-backed endpoint discovery now reflects the actual published Docker host
  ports of the running services when they differ from profile defaults
- this matters for localnet and validation workspaces that intentionally remap
  ports to avoid collisions while keeping the same node-profile shape

### 2026-03-25: Reusable Projector Primitive Slice

Repos changed:

- `xian-py`
- `xian-docs-web`
- `xian-meta`

Docs updated:

- `tools/xian-py.md`

What was documented:

- `xian-py` now exposes reusable projector / projection primitives:
  `merged_event_payload`, `SQLiteProjectionState`, `EventSource`,
  `EventProjector`, and `EventProjectorError`
- the three deeper reference apps now build on this shared layer instead of
  each carrying their own event-loop and cursor implementation
- the intended SDK boundary is now clearer:
  - the SDK owns repetitive event polling, ordering, and cursor plumbing
  - application code still owns domain-specific tables, hydration, and apply
    logic

## Next Docs Slice

When the next operator slice lands, update:

- the affected node/operator pages
- any CLI or stack docs that changed materially
- this file with the new completed slice
