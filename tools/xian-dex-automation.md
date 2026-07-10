# xian-dex-automation

`xian-dex-automation` watches indexed DEX events, evaluates explicit YAML
rules, and optionally submits transactions from a dedicated service wallet.

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

## Admin API

`GET /` and `GET /health` are public to the local process. Rule, run, wallet,
configuration, and manual-evaluation routes require
`Authorization: Bearer <XIAN_DEX_AUTOMATION_ADMIN_TOKEN>`.

The admin UI can manage the configured service key file, rules, configuration,
and manual pair evaluation. It does not return private key material through the
API.

## Related Pages

- [Xian DEX](/products/dex)
- [Local DEX Bootstrap](/node/local-dex-bootstrap)
- [xian-py](/tools/xian-py)
