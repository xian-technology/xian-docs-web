# Stable Protocol

`xian-stable-protocol` owns the overcollateralized stable-vault product:
stable token, oracle, savings, vault, and peg-stability contracts plus the
bootstrap script that wires them together.

- Contract bundle: `xian-stable-protocol/contract-bundle.json`
- Bootstrap script: `xian-stable-protocol/scripts/bootstrap_protocol.py`

Lifecycle:

- Install phase: post-genesis
- Included in genesis: no
- Shipped with node image: no

Validate the bundle, then run the repo bootstrap against a healthy network:

```bash
uv run --project ../xian-cli xian contract bundle validate contract-bundle.json
uv run python scripts/bootstrap_protocol.py --skip-sample-tokens
```
