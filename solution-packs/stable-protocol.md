# Stable Protocol Pack

The Stable Protocol Pack is a Xian-native reference protocol for an
overcollateralized stable asset.

It is published as:

- [`xian-technology/xian-stable-protocol`](https://github.com/xian-technology/xian-stable-protocol)

It is not a toy token example. It is a multi-contract protocol slice with:

- a controller-minted stable asset
- a multi-reporter oracle
- collateralized debt positions
- savings-vault fee routing
- liquidation and auction flows
- explicit bad-debt and recapitalization handling
- a peg stability module
- governance integration with Xian's `members` and `governance` contracts

## Current Status

This pack is usable **today** as a manually deployed, locally tested reference
protocol.

What that means in practice:

- the contracts are implemented
- the repository packages cleanly
- the standalone contract suite passes
- the governance model matches Xian's current contract-call governance surface
- the protocol can be deployed manually by an operator who is comfortable
  deploying and wiring multiple contracts

What it does **not** mean:

- there is no `xian-cli` starter flow yet
- there is no `xian-deploy` preset yet
- there are no live-network integration tests yet
- there is no invariant or fuzz-testing harness yet
- the oracle is still governed-reporter based, not a stronger attested feed

So the right classification is:

- usable as a reference implementation and advanced starting point: yes
- turnkey production protocol: no

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
- contract-call governance through chain-native `members` and `governance`
- straightforward Python-first testing and deployment workflows
- indexable protocol events for explorers, read models, and risk dashboards
- a clean line between authoritative on-chain state and off-chain projections

## Contract Set

### `stable_token`

The protocol stable asset.

Main roles:

- controller-minted token
- controllers are expected to include `vaults` and `psm`
- users can transfer, approve, and burn their own balances

Relevant exports:

- `set_controller(...)`
- `mint(...)`
- `burn(...)`
- `start_governance_transfer(...)`
- `accept_governance()`

### `oracle`

A governance-owned multi-reporter price oracle.

Main roles:

- reporter allowlist
- per-asset freshness and quorum settings
- medianized price selection

Relevant exports:

- `set_reporter(...)`
- `set_asset_config(...)`
- `submit_price(...)`
- `get_price(...)`
- `get_reports(...)`
- `price_info(...)`

### `vaults`

The CDP engine.

Main roles:

- vault-type registry
- collateral deposit and withdrawal
- borrowing and repayment
- debt-share accounting and rate accrual
- partial liquidation
- liquidation auctions
- bad-debt tracking and recapitalization

Relevant exports:

- `add_vault_type(...)`
- `create_vault(...)`
- `deposit_collateral(...)`
- `withdraw_collateral(...)`
- `borrow(...)`
- `repay(...)`
- `close_vault(...)`
- `get_liquidation_quote(...)`
- `liquidate(...)`
- `open_liquidation_auction(...)`
- `bid(...)`
- `settle_auction(...)`
- `cover_bad_debt(...)`
- `recapitalize(...)`
- `sweep_surplus(...)`

### `savings`

A share-based savings vault for the stable asset.

Main roles:

- stable-asset deposits mint savings shares
- fee inflows raise assets per share
- savings shares are transferable

Relevant exports:

- `deposit(...)`
- `withdraw(...)`
- `share_price()`
- `preview_deposit(...)`
- `preview_redeem(...)`

### `psm`

A peg stability module for reserve-backed mint and redeem flows.

Main roles:

- mint protocol stable against reserve assets
- redeem protocol stable back into reserve assets
- route peg-module fees to treasury

Relevant exports:

- `set_fees(...)`
- `quote_mint(...)`
- `quote_redeem(...)`
- `mint_stable(...)`
- `redeem_stable(...)`
- `set_paused(...)`

## Governance Model

This pack is designed for Xian's current governance surface, not for a
protocol-local DAO.

In production:

- `members` supplies the weighted membership interface
- `governance` executes contract-call proposals once threshold is reached
- protocol contracts transfer ownership to `governance`

That means protocol risk changes are meant to happen through governance
proposals such as:

- `oracle.set_reporter(...)`
- `oracle.set_asset_config(...)`
- `vaults.set_vault_type_fee(...)`
- `vaults.set_vault_type_ratios(...)`
- `vaults.set_vault_type_limits(...)`
- `psm.set_fees(...)`
- `psm.set_paused(...)`

The standalone repository includes `members_compat.s.py` and
`governance_compat.s.py` only so the repo remains self-contained in local unit
tests. The target runtime is still the real chain `members` / `governance`
pair.

## Manual Deployment Flow

This pack is not yet wrapped in a CLI starter. Today the intended use is manual
deployment.

Recommended order:

1. Use the chain's existing `members` and `governance` contracts.
2. Deploy `stable_token`.
3. Deploy the reserve-asset token used by the PSM.
4. Deploy `oracle`.
5. Deploy `savings`.
6. Deploy `vaults`.
7. Deploy `psm`.
8. Grant stable-token controller rights to `vaults` and `psm`.
9. Configure oracle reporters and publish initial prices.
10. Add at least one vault type.
11. Transfer protocol governance to `governance`.

### Required Wiring

After deployment, the minimum wiring is:

```python
stable_token.set_controller(account='vaults', enabled=True)
stable_token.set_controller(account='psm', enabled=True)

oracle.set_asset_config(
    asset='COL',
    min_reporters_required=2,
    max_price_age_seconds=3600,
)
oracle.set_reporter(account='oracle_reporter_1', enabled=True)
oracle.set_reporter(account='oracle_reporter_2', enabled=True)

vaults.add_vault_type(
    collateral_contract_name='collateral_token',
    oracle_key='COL',
    min_collateral_ratio_bps=15000,
    liquidation_ratio_bps=13000,
    liquidation_bonus_bps=500,
    debt_ceiling=1_000_000,
    min_debt=10,
    stability_fee_bps=500,
    auction_duration_seconds=86400,
)
```

After bootstrap, hand off governance:

```python
oracle.start_governance_transfer(new_governor='governance')
vaults.start_governance_transfer(new_governor='governance')
psm.start_governance_transfer(new_governor='governance')
savings.start_governance_transfer(new_governor='governance')
stable_token.start_governance_transfer(new_governor='governance')
```

Then the chain `governance` contract can call `accept_governance()` on each
protocol contract through normal governance proposals.

## How To Use It

### Open A Vault And Mint Stable

1. Approve collateral to `vaults`.
2. Call `create_vault(...)`.
3. The stable asset is minted directly to the vault owner.

Typical flow:

```python
collateral_token.approve(amount=1000, to='vaults')
vault_id = vaults.create_vault(
    vault_type_id=1,
    collateral_amount=100,
    debt_amount=50,
)
```

### Increase Or Decrease A Position

Use:

- `deposit_collateral(...)`
- `withdraw_collateral(...)`
- `borrow(...)`
- `repay(...)`
- `close_vault(...)`

Repayment and close flows require the user to approve stable-token spend to
`vaults`.

### Use The Savings Vault

Users deposit the stable asset and receive shares:

```python
stable_token.approve(amount=500, to='savings')
shares = savings.deposit(assets=500)
```

Withdraw later with:

```python
savings.withdraw(shares=shares)
```

### Use The Peg Stability Module

Mint stable from reserves:

```python
reserve_token.approve(amount=1000, to='psm')
psm.mint_stable(reserve_amount=1000)
```

Redeem stable back into reserves:

```python
stable_token.approve(amount=500, to='psm')
psm.redeem_stable(stable_amount=500)
```

### Liquidation And Auctions

For a vault that drops below threshold:

- call `get_liquidation_quote(...)`
- if partial cure is possible, call `liquidate(...)`
- otherwise open an auction with `open_liquidation_auction(...)`
- place bids with `bid(...)`
- finalize with `settle_auction(...)`

Owner-side recovery paths also exist:

- `cure_auction(...)`
- `cancel_auction_if_safe(...)`

## What Is Still Missing

These are the meaningful gaps before calling the protocol production-ready:

- deployment automation through `xian-cli` or `xian-deploy`
- live integration tests against a real Xian node and network shape
- invariant and fuzz testing for debt, liquidation, and auction accounting
- a stronger oracle sourcing and attestation model
- keeper automation and operational runbooks
- final stable-asset branding and metadata decisions

## What Has Been Verified

At the time of writing:

- the repository packages and tests cleanly
- the standalone contract suite passes
- governance ownership transfer and risk-parameter changes are tested against
  Xian-governance-compatible semantics
- the protocol surface covers issuance, repayment, savings, peg operations,
  liquidation, auctions, bad debt, and recapitalization

## Related Docs

- [Protocol Governance & State Patches](/node/protocol-governance)
- [GraphQL (BDS)](/api/graphql)
- [Estimating Stamps](/api/dry-runs)
- [xian-py](/tools/xian-py)
- [xian-js](/tools/xian-js)
