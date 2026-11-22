# Streaming Payments

The maintained streaming-payment implementation is the standalone
`con_stream_payments` package in `xian-contracts`, not the canonical
`currency` contract.

## What The Package Does

`con_stream_payments` creates time-based escrowed streams against an external
token contract.

Each stream:

- escrows the full budget up front
- lets value accrue over time
- lets the sender or receiver claim the accrued portion
- lets the sender shorten the stream and recover the unvested refund
- lets the receiver forfeit the unvested part of the stream
- supports permit-style creation flows
- exposes `claimable_amount(...)` and `stream_info(...)` read helpers for
  clients

## Token Dependency

The streamed token contract must expose:

- `transfer(amount, to)`
- `transfer_from(amount, to, main_account)`
- `balance_of(address)`

`con_stream_payments` validates that interface before using the token.
Escrow funding must increase custody by the exact required amount before a
deposit is credited. Fee-on-transfer and no-op funding revert, including when
other streams already have escrow in the contract.
Claims and refunds also require exact transfers. The escrow must lose the
settlement amount and the recipient must receive the same amount. If either
balance does not match, the call rolls back and the amount remains unsettled.
Choose a token that makes exact transfers on both legs.

Receivers that are public keys use 64 lowercase hexadecimal characters.
Mixed- or uppercase keys are rejected; named contract receivers remain valid.
The stream escrow contract cannot be its own receiver.
Permit signatures are checked against the exact supplied receiver value.

## Core Flow

1. deploy `con_stream_payments`
2. approve the stream-payments contract on the token contract when escrow
   funding requires `transfer_from`
3. create the stream with start time, close time, receiver, and rate
4. call `balance_stream(...)` as time passes
5. finalize, shorten, or forfeit the stream as needed

Encode `begins`, `closes`, permit deadlines, and close-time updates as
`YYYY-MM-DD HH:MM:SS`.

## Important Behavior

- accrual is lazy; nothing runs between blocks
- the contract uses block time (`now`) when computing accrued value
- event names are:
  - `StreamCreated`
  - `StreamBalanced`
  - `StreamCloseChanged`
  - `StreamForfeited`
  - `StreamFinalized`
- duplicate schedules from the same sender are separated by a sender nonce in
  the stream id

## Caveats

- `change_close_time(...)` supports shortening or immediate close, not arbitrary
  extension in place
- `close_balance_finalize(...)` settles an already-ended stream through its
  existing close time
- `create_stream_from_permit(...)` authorizes the stream parameters, but the
  token-side approval needed for escrow funding has to exist

## Related Pages

- [XSC-0003: Streaming Token](/smart-contracts/standards/xsc-0003)
- [Permit Standard](/smart-contracts/standards/xsc-0002)
