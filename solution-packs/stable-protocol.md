# Stable Protocol Pack

The Stable Protocol Pack is a Xian-native reference protocol for an
overcollateralized stable asset.

It is published as:

- [`xian-technology/xian-stable-protocol`](https://github.com/xian-technology/xian-stable-protocol)

It is a full multi-contract protocol slice, not a toy token example. The pack
includes:

- a controller-minted stable asset
- a multi-reporter oracle
- collateralized debt positions
- savings-vault fee routing
- liquidation and auction flows
- explicit bad-debt and recapitalization handling
- a peg stability module
- governance integration with Xian's `masternodes` and `governance`
  contracts

## Current Status

This pack is now integrated into the Xian stack as a first-class solution pack.

What is in place:

- `xian-cli` starter flows for local and remote posture selection
- canonical contract assets mirrored in `xian-configs`
- a real bootstrap script in `xian-stable-protocol`
- a documented remote operator posture in `xian-deploy`
- a passing standalone contract suite
- a successful live bootstrap on a local indexed Xian network, including
  governance handoff start

What is still missing before calling it production-hardened:

- an automated end-to-end integration harness in CI
- invariant and fuzz testing
- stronger oracle sourcing and attestation
- keeper automation and fuller operational runbooks

So the right classification is:

- packaged reference product in the Xian stack: yes
- turnkey autonomous production protocol: no

## When To Use It

This pattern fits when you want:

- a protocol-issued stable asset
- vault-based issuance against volatile collateral
- explicit liquidation and auction mechanics
- a savings layer for protocol fee income
- direct reserve-backed mint and redeem flows through a peg module
- governance-managed monetary and risk parameters

## Why Xian Fits

This pack is a strong example of what Xian is good at:

- explicit contract composition instead of a single oversized protocol contract
- contract-call governance through chain-native `masternodes` and
  `governance`
- Python-first deployment and testing workflows
- indexable protocol events for explorers, read models, and risk dashboards
- a clean line between authoritative on-chain state and off-chain projections

## Stack Integration

The canonical starter flows are now packaged in `xian-cli`:

```bash
cd ~/xian/xian-cli
uv run xian solution-pack show stable-protocol
uv run xian solution-pack starter stable-protocol
uv run xian solution-pack starter stable-protocol --flow remote
```

The pack metadata points to:

- `xian-configs/solution-packs/stable-protocol/` for the mirrored contract
  assets and machine-readable starter manifest
- `xian-stable-protocol/` for the bootstrap script and operator docs
- `xian-deploy/docs/SOLUTION_PACKS.md` for the recommended `consortium-3`
  remote posture

The intended local template is `single-node-indexed`. The intended remote
template is `consortium-3`.

## Contract Set

### `stable_token`

The protocol stable asset.

Relevant exports:

- `set_controller(...)`
- `total_supply_of()`
- `balance_of(...)`
- `allowance(...)`
- `approve(...)`
- `transfer(...)`
- `transfer_from(...)`
- `mint(...)`
- `burn(...)`
- `start_governance_transfer(...)`
- `accept_governance()`

### `oracle`

A governance-owned multi-reporter price oracle.

Relevant exports:

- `set_reporter(...)`
- `set_asset_config(...)`
- `submit_price(...)`
- `get_price(...)`
- `get_reports(...)`
- `price_info(...)`

### `vaults`

The CDP engine.

Relevant exports:

- `add_vault_type(...)`
- `set_vault_type_fee(...)`
- `set_vault_type_limits(...)`
- `set_vault_type_ratios(...)`
- `set_vault_type_auction_config(...)`
- `set_vault_type_surplus_buffer_bps(...)`
- `set_vault_type_active(...)`
- `set_paused(...)`
- `set_savings_contract(...)`
- `set_treasury_address(...)`
- `create_vault(...)`
- `deposit_collateral(...)`
- `withdraw_collateral(...)`
- `borrow(...)`
- `repay(...)`
- `close_vault(...)`
- `get_liquidation_quote(...)`
- `liquidate(...)`
- `liquidate_fast(...)`
- `open_liquidation_auction(...)`
- `bid(...)`
- `cure_auction(...)`
- `cancel_auction_if_safe(...)`
- `claim_refund(...)`
- `settle_auction(...)`
- `cover_bad_debt(...)`
- `recapitalize(...)`
- `sweep_surplus(...)`
- `get_vault(...)`
- `get_auction(...)`
- `get_vault_type(...)`
- `get_collateralization_bps(...)`

### `savings`

A share-based savings vault for the stable asset.

Relevant exports:

- `deposit(...)`
- `withdraw(...)`
- `total_supply()`
- `total_assets()`
- `balance_of(...)`
- `allowance(...)`
- `share_price()`
- `preview_deposit(...)`
- `preview_redeem(...)`
- `transfer(...)`
- `approve(...)`
- `transfer_from(...)`

### `psm`

A peg stability module for reserve-backed mint and redeem flows.

Relevant exports:

- `set_fees(...)`
- `set_treasury_address(...)`
- `quote_mint(...)`
- `quote_redeem(...)`
- `mint_stable(...)`
- `redeem_stable(...)`
- `set_paused(...)`
- `get_state()`

## Governance Model

This pack is designed for Xian's current governance surface, not for a
protocol-local DAO.

In production:

- `masternodes` supplies the weighted membership interface
- `governance` executes contract-call proposals once threshold is reached
- protocol contracts transfer ownership to `governance`

The standalone repository includes `members_compat.s.py` and
`governance_compat.s.py` only so the repo remains self-contained in local unit
tests. The target runtime is still the real chain `masternodes` /
`governance` pair.

## Bootstrap

The canonical operator path now lives in the protocol repository:

```bash
cd ~/xian/xian-stable-protocol
uv sync --group dev --group deploy
uv run pytest -q
uv run python scripts/bootstrap_protocol.py
```

By default the bootstrap script:

- deploys `con_stable_token`, `con_oracle`, `con_savings`, `con_vaults`, and
  `con_psm` if they are missing
- deploys sample `con_collateral_token` and `con_reserve_token` contracts for
  local use
- enables `con_vaults` and `con_psm` as stable-token controllers
- configures oracle reporters and an initial price
- sets treasury and savings fee-routing targets
- creates the default vault type only when vault type `1` is absent
- validates that user-deployed contract names use the current chain-required
  `con_` prefix before submitting anything

For remote bootstrap against already deployed collateral and reserve tokens:

```bash
uv run python scripts/bootstrap_protocol.py --skip-sample-tokens
```

To start governance handoff after verification:

```bash
uv run python scripts/bootstrap_protocol.py --start-governance-handoff
```

The bootstrap wallet should match the configured initial governor. After
handoff starts, governance-managed changes should move to chain governance
proposals instead of staying on the bootstrap key.

Current Xian submission rules require user-deployed contracts to start with
`con_`. The bootstrap defaults already use those names.

## Required Wiring

The minimum intended wiring is:

```python
con_stable_token.set_controller(account='con_vaults', enabled=True)
con_stable_token.set_controller(account='con_psm', enabled=True)

con_vaults.set_savings_contract(target_contract='con_savings')
con_vaults.set_treasury_address(address='treasury')
con_psm.set_treasury_address(address='treasury')
```

If `con_vaults` has no `savings_contract` and no `treasury_address`, or
`con_psm` has no `treasury_address`, fees fall back to the current governor.
That is valid contract behavior, but it is not the intended deployed setup.

## How To Use It

### Open A Vault And Mint Stable

1. Approve collateral to `con_vaults`.
2. Call `create_vault(...)`.
3. The stable asset is minted directly to the vault owner.

Typical flow:

```python
con_collateral_token.approve(amount=1000, to='con_vaults')
vault_id = con_vaults.create_vault(
    vault_type_id=1,
    collateral_amount=100,
    debt_amount=50,
)
```

### Use The Savings Vault

Users deposit the stable asset and receive shares:

```python
con_stable_token.approve(amount=500, to='con_savings')
shares = con_savings.deposit(assets=500)
```

### Use The Peg Stability Module

Mint stable from reserves:

```python
con_reserve_token.approve(amount=1000, to='con_psm')
con_psm.mint_stable(reserve_amount=1000)
```

Redeem stable back into reserves:

```python
con_stable_token.approve(amount=500, to='con_psm')
con_psm.redeem_stable(stable_amount=500)
```

## Remaining Gaps

These are the meaningful remaining gaps before calling the protocol
production-hardened:

- an automated integration harness that boots a network and runs the protocol
  flow in CI
- invariant and fuzz testing for debt, liquidation, and auction accounting
- a stronger oracle sourcing and attestation model
- keeper automation and fuller operational runbooks
- final stable-asset branding and metadata decisions

## Related Docs

- [Protocol Governance & State Patches](/node/protocol-governance)
- [GraphQL (BDS)](/api/graphql)
- [Estimating Chi](/api/dry-runs)
- [xian-py](/tools/xian-py)
- [xian-js](/tools/xian-js)
