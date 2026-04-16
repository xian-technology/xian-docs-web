# Streaming Payments

The maintained streaming-payment implementation is the standalone
`con_stream_payments` package in `xian-contracts`, not the current canonical
`currency` contract.

## What The Package Does

`con_stream_payments` creates time-based escrowed streams against an external
token contract.

Each stream:

- escrows the full budget up front
- lets value accrue over time
- lets the sender or receiver claim the accrued portion
- lets the sender shorten the stream and recover the unvested refund
- lets the receiver forfeit the future part of the stream
- supports permit-style creation flows

## Token Dependency

The streamed token contract must expose:

- `transfer(amount, to)`
- `transfer_from(amount, to, main_account)`

`con_stream_payments` validates that interface before using the token.

## Core Flow

1. deploy `con_stream_payments`
2. approve the stream-payments contract on the token contract when escrow
   funding requires `transfer_from`
3. create the stream with start time, close time, receiver, and rate
4. call `balance_stream(...)` as time passes
5. finalize, shorten, or forfeit the stream as needed

## Important Behavior

- accrual is lazy; nothing runs between blocks
- the contract uses block time (`now`) when computing accrued value
- modern maintained event names are:
  - `StreamCreated`
  - `StreamBalanced`
  - `StreamCloseChanged`
  - `StreamForfeited`
  - `StreamFinalized`

## Caveats

- `change_close_time(...)` supports shortening or immediate close, not arbitrary
  extension in place
- `create_stream_from_permit(...)` authorizes the stream parameters, but the
  token-side approval needed for escrow funding still has to exist

## Related Pages

- [XSC-0003: Streaming Payments](/smart-contracts/standards/xsc-0003)
- [Permit Standard](/smart-contracts/standards/xsc-0002)
