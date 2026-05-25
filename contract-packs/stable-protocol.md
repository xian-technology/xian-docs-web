# Stable Protocol Contract Pack

The Stable Protocol contract pack contains the pinned stable-asset protocol
contract set from `xian-stable-protocol`.

It exists so tooling can discover and validate the protocol contracts
separately from app examples.

Validate the contract pack:

```bash
cd ~/xian/xian-cli
uv run xian contract-pack validate stable-protocol
```

The install recipe delegates to the owning repository bootstrap script:

```bash
uv run xian contract-pack install stable-protocol --dry-run
```

For a real install, prepare the required `xian-stable-protocol` bootstrap
environment variables and run the same command without `--dry-run`.
