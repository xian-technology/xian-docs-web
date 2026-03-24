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

## Next Docs Slice

When the next operator slice lands, update:

- the affected node/operator pages
- any CLI or stack docs that changed materially
- this file with the new completed slice
