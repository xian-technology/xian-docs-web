# Building a Dice Game

This tutorial is intentionally lightweight for now. The important current
runtime fact is that Xian's `random` module is deterministic, not secret.

## When a Dice Game Makes Sense

Use a simple dice game when:

- you want a teaching example for state + events + payouts
- you accept deterministic pseudo-randomness seeded from block context

Do not use it as if it were cryptographically unpredictable randomness.

## Core Pattern

1. store balances or escrow state in `Hash` / `Variable`
2. call `random.seed()` before using `random.randint(...)`
   optional: pass a literal extra salt such as `random.seed("round-2")`
3. emit an event describing the roll and payout
4. keep the payout logic simple and auditable

For the exact random caveats, see the standard-library documentation under
`contracting.stdlib.bridge.random`.
