# System Requirements

## Supported Operator Hosts

- Linux
- macOS

The supported runtime path is Docker-based on both platforms.

## Tooling

- Docker with Compose v2
- `uv`
- Git

## Python Versions

Current package floors:

| Repo | Python |
|------|--------|
| `xian-cli` | `>=3.14,<3.15` |
| `xian-abci` | `>=3.14,<3.15` |
| `xian-contracting` | `>=3.14,<3.15` |
| `xian-linter` | `>=3.14,<3.15` |
| `xian-py` | `>=3.14,<3.15` |

The runtime repos pin a single Python minor version (3.14) rather than an
open-ended floor, so deterministic execution does not drift across Python
releases.

## Runtime Notes by Platform

### Linux

Linux gives the cleanest runtime controls for memory and process limits,
especially with Docker or Podman plus system-level supervision.

### macOS

macOS is supported, but hard memory limits are most practical through Docker
Desktop rather than host-native process limits. This is the current documented
path for operator testing on macOS.

## Recommended Validation

Before running a node:

```bash
cd ~/xian/xian-stack
make validate
make smoke-cli
```
