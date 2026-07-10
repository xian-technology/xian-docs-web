# Contract Standards

Xian uses a small set of contract interface standards for token, NFT, and
payment primitives that other tools expect.

## Standards

- [XSC-0001](/smart-contracts/standards/xsc-0001): fungible token core
- [XSC-0002](/smart-contracts/standards/xsc-0002): permit-authorizer approvals
- [XSC-0003](/smart-contracts/standards/xsc-0003): streaming fungible token
- [XSC-0004](/smart-contracts/standards/xsc-0004): wrapped token
- [XSC-0005](/smart-contracts/standards/xsc-0005): non-fungible token core

Reference standards live in `xian-xips`. Canonical system contracts and
product repositories implement the relevant interfaces where needed.

## How To Use Them

- implement the core function signatures exactly
- keep event names and indexed fields stable
- prefer additive extensions over incompatible signature changes
- test compatibility with wallets, dashboards, and SDK code against the
  standard surface
