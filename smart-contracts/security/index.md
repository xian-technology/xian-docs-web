# Security

Writing secure smart contracts requires understanding the execution model, the context system, and common attack patterns. This section covers the patterns you need and the mistakes to avoid.

## Key Principles

1. **Always validate the caller** -- use `ctx.caller` and `ctx.signer` to control who can execute sensitive operations
2. **Validate all inputs** -- never trust that arguments are positive, non-zero, or within expected ranges
3. **Understand ctx.caller vs ctx.signer** -- they differ when contracts call other contracts
4. **Minimize state writes** -- keep your contract's surface area small
5. **Test thoroughly** -- use `ContractingClient` to simulate every edge case

## Quick Links

- [Access Control Patterns](/smart-contracts/security/access-control) -- owner-only, caller restrictions, allowances, multi-sig
- [Common Pitfalls](/smart-contracts/security/pitfalls) -- mistakes that lead to vulnerabilities
