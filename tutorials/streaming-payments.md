# Working with Streaming Payments

Streaming payments already exist in the current canonical `currency` contract.

## What Exists Today

The canonical contract supports:

- stream creation
- balancing accrued amounts
- changing close times
- finalization
- forfeiture
- permit-style stream creation

It also emits stream-related events such as:

- `StreamCreated`
- `StreamBalance`
- `StreamCloseChange`
- `StreamForfeit`
- `StreamFinalized`

## Why This Matters

This is not just a tutorial idea. It is part of the shipped contract surface in
`xian-configs/contracts/currency.s.py`, so explorer tooling and API consumers
should expect these flows and events on networks that ship that canonical
contract.
