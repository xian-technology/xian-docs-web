# Contract Standards

Xian currently uses a small set of contract interface standards for the token
and payment primitives that other tools expect.

## Current Standards

- [XSC-0001](/smart-contracts/standards/xsc-0001): fungible token core
- [XSC-0002](/smart-contracts/standards/xsc-0002): permit-style approvals
- [XSC-0003](/smart-contracts/standards/xsc-0003): streaming payments

These standards are reflected in the canonical contracts shipped in
`xian-configs/contracts`, especially the current `currency` contract.

## How To Use Them

- implement the core function signatures exactly
- keep event names and indexed fields stable
- prefer additive extensions over incompatible signature changes
- test compatibility with wallets, dashboards, and SDK code against the
  standard surface
