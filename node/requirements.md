# System Requirements

## Supported Operator Hosts

- Linux on x86-64 or ARM64, the primary server platform
- macOS on Apple Silicon (M-series)

The supported runtime path is Docker-based on both platforms.
Windows node operation is not supported. Availability of a compiler or SDK
package for another platform does not establish node support.

## Tooling

- Docker with Compose v2
- `uv`
- Git

## Python Versions

Package version support:

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

On Apple Silicon macOS, use the ARM64 node image through Docker Desktop.
Hard memory limits are enforced inside Docker's Linux VM rather than through
host-native process limits. This is the documented path for operator testing
on macOS.

## Recommended Validation

Before running a node:

```bash
cd ~/xian/xian-stack
make validate
make smoke-cli
```
