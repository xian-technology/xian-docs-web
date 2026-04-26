# DEX Pack

The DEX pack pins the Xian AMM contracts as a reproducible solution-pack
bundle. It exists so local nodes, the SnakX web app, event automation, and
integration tests can all target the same contract names without reading live
source from `xian-dex`.

## Contract Bundle

The canonical pack assets live in `xian-configs`:

- `solution-packs/dex/contract-bundle.json`
- `solution-packs/dex/contracts/con_pairs.s.py`
- `solution-packs/dex/contracts/con_dex.s.py`
- `solution-packs/dex/contracts/con_dex_helper.s.py`
- `solution-packs/dex/contracts/con_lp_token.s.py`
- `solution-packs/dex/contracts/demo_token.s.py`

Active development still happens in `xian-dex`. The `xian-configs` copy is a
hash-pinned snapshot for repeatable setup.

Validate the bundle from `xian-cli`:

```bash
uv run xian contract bundle validate ../xian-configs/solution-packs/dex/contract-bundle.json
```

## Local Flow

From `xian-stack`:

```bash
make localnet-init
make localnet-up-with-dex
```

The bootstrap deploys `con_pairs`, `con_dex`, `con_dex_helper`, a local demo
token, an LP token, and a seeded `currency` / demo-token pool.

For an already-running local node:

```bash
XIAN_DEX_BOOTSTRAP_RPC_URL=http://127.0.0.1:26657 make localnet-dex-bootstrap
```

## Overrides

Use a different pinned bundle when testing a release candidate:

```bash
XIAN_DEX_BUNDLE=/path/to/contract-bundle.json make localnet-dex-bootstrap
```

Use raw source only for active development:

```bash
XIAN_DEX_CONTRACTS_DIR=../xian-dex/src make localnet-dex-bootstrap
```
