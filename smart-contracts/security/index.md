# Security

Secure Xian contracts come from simple control flow, explicit authorization,
careful cross-contract boundaries, and thorough local testing.

## Core Principles

1. authenticate the immediate caller, not just the original signer
2. validate every numeric and address input
3. update local state before external contract calls when possible
4. avoid hidden complexity and dynamic behavior
5. treat every exported function as public and adversarially callable

## Quick Links

- [Access Control Patterns](/smart-contracts/security/access-control)
- [Common Pitfalls](/smart-contracts/security/pitfalls)
- [Upgradeability Patterns](/smart-contracts/security/upgradeability)
- [Audit Checklist](/smart-contracts/security/audit-checklist)
