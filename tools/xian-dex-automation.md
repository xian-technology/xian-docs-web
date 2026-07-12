# xian-dex-automation

`xian-dex-automation` watches indexed DEX events, evaluates explicit YAML
rules, and optionally submits transactions from either a dedicated service
wallet or a constrained on-chain strategy vault.

Use it for deterministic rules. Use
[xian-intentkit](/tools/xian-intentkit) when a model should interpret a goal or
choose an action.

## Safety Model

- use a dedicated wallet funded only with the allowed trading budget
- keep `wallet.execute: false` while testing rules
- require an admin token for every non-health API route
- keep the service on loopback unless it is behind authenticated, protected
  infrastructure
- treat rule changes and wallet rotation as privileged operations
- prefer a strategy vault when the keeper should not have direct custody: the
  contract fixes the pair, direction, action, trade and cumulative spend caps,
  slippage, cooldown, deadline horizon, keeper, and withdrawal authority

Browser wallets are interactive and are not suitable as unattended service
signers.

## Minimal Configuration

```yaml
network:
  rpc_url: "http://127.0.0.1:26657"

dex:
  router_contract: "con_dex"
  pairs_contract: "con_pairs"

wallet:
  private_key_env: "XIAN_DEX_AUTOMATION_PRIVATE_KEY"
  execute: false

rules:
  - id: "demo-price-move"
    trigger:
      type: "price_move"
      pair_id: 1
      direction: "either"
      threshold_bps: 100
      cooldown_seconds: 300
    action:
      type: "swap_exact_in"
      src: "currency"
      amount_in: "1"
      max_slippage_bps: 100
```

The service persists event cursors and run records. Dry-run evaluations record
the planned action without broadcasting it.

## Strategy-Vault Custody

Each `con_dex_strategy_vault.py` deployment represents one owner-funded pair
and trade direction. The keeper can only call `swap_exact_in`; output remains
in the vault, only the owner can withdraw or unpause, and either owner or keeper
can emergency-pause. Limit changes can only tighten and automatically pause the
vault.

The service mirrors the intended on-chain envelope in its config and rejects
rules outside it:

```yaml
wallet:
  private_key_file: "state/strategy-vault-keeper.key"
  execute: false

custody:
  mode: "strategy_vault"
  strategy_vault:
    contract: "con_dex_strategy_vault_demo"
    keeper_address: "<64-character keeper public key>"
    pair_id: 1
    src: "currency"
    token_out: "con_dex_demo_token"
    max_trade_size: "1"
    total_spend_cap: "10"
    max_slippage_bps: 100
    cooldown_seconds: 300
    max_deadline_seconds: 300
```

Recipient overrides are forbidden in this mode. The local config is an
operator guardrail; the deployed contract is the final custody boundary.

Keeper deadlines use the node's latest block timestamp and reserve five
seconds of headroom below the configured on-chain maximum. Short deadline
settings clamp that margin to retain at least one second after observed chain
time. This avoids treating a lagging block clock as if it were synchronized to
the service host while preserving the vault's strict on-chain cap.

The first contract version supports one pair, one direction, and plain
single-pair exact-input swaps. It does not support multi-hop or fee-on-transfer
routes, owner rotation, or cumulative-budget increases.

## Stack-Managed Setup

The target network must already contain the DEX contracts and a usable pair.
For local testing:

```bash
cd ../xian-dex
uv run python scripts/bootstrap_dex.py --recipe local-demo

cd ../xian-stack
export XIAN_DEX_AUTOMATION_ADMIN_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
python3 ./scripts/backend.py start --no-bds-enabled --dex-automation
python3 ./scripts/backend.py endpoints --no-bds-enabled --dex-automation
```

The stack-managed admin UI/API defaults to `http://127.0.0.1:38280`. The stack
creates service configuration and a local key file under
`.artifacts/dex-automation/`; execution remains disabled until the operator
enables it.

### Local Strategy-Vault Exercise

After starting the localnet and installing the demo DEX pool, preview the
strategy-vault setup without writes:

```bash
cd ../xian-dex-automation
uv run --extra dev python scripts/bootstrap_strategy_vault.py
```

Deploy and fund the vault, create a local keeper key, unpause, write a service
config that remains in dry-run mode, and obtain a live quote:

```bash
uv run --extra dev python scripts/bootstrap_strategy_vault.py --execute
```

The standard localnet helper uses 100 currency only as a minimum keeper floor.
It estimates the exact prepared vault call with explicit chi headroom, reads
`chi_cost.current_value()`, computes `ceil(supplied_chi / chi_cost)`, and raises
the funding target when required. `--keeper-gas-funding` is a minimum override.
The estimate and submission reuse one call plan so quote/deadline kwargs cannot
drift between preflight and execution.

Add one actual keeper-triggered vault swap for an end-to-end local test:

```bash
uv run --extra dev python scripts/bootstrap_strategy_vault.py \
  --execute \
  --execute-swap
```

The helper reads only disposable localnet founder material from
`../xian-stack/.localnet/network.json`. Do not reuse those keys outside the
local network. A swap is reported as successful only after acceptance,
finalization, and a successful transaction receipt; a hash alone is not
treated as execution success.

## Admin API

`GET /` and `GET /health` are public to the local process. Rule, run, wallet,
configuration, custody, and manual-evaluation routes require
`Authorization: Bearer <XIAN_DEX_AUTOMATION_ADMIN_TOKEN>`.

The admin UI can manage the configured service key file, rules, configuration,
custody envelope, and manual pair evaluation. `GET /custody` returns the local
custody mode and strategy limits. The API does not return private key material.

## Related Pages

- [Xian DEX](/products/dex)
- [Local DEX Bootstrap](/node/local-dex-bootstrap)
- [xian-py](/tools/xian-py)
