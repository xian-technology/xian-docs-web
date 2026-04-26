# Stable Protocol Module

The Stable Protocol module contains the pinned stable-asset protocol contract
set from `xian-stable-protocol`.

The module exists so tooling can discover and validate the protocol contracts
separately from complete starter flows.

Validate the module:

```bash
cd ~/xian/xian-cli
uv run xian module validate stable-protocol
```

The install recipe delegates to the owning repository bootstrap script:

```bash
uv run xian module install stable-protocol --dry-run
```

For a real install, prepare the required `xian-stable-protocol` bootstrap
environment variables and run the same command without `--dry-run`.
