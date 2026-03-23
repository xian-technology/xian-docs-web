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

## Next Docs Slice

When the next SDK slice lands, update:

- `tools/xian-py.md`
- any affected node/operator pages if monitoring or control flows change
- this file with the new completed slice
