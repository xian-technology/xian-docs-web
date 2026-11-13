# Error Reference

Xian surfaces errors from a few distinct layers. Knowing which layer produced
the error makes debugging much faster.

## Linter Errors

The contract linter reports structured Rust compiler diagnostics. Semantic
rules use `xian.lint.E###`; parser, IR, and admission-limit failures use
`xian.syntax.*`, `xian.ir.*`, and `xian.limit.*` respectively. These include:

- forbidden syntax
- illegal imports
- invalid decorators
- invalid type annotations
- nested function definitions

See:

- [Valid Code & Restrictions](/smart-contracts/valid-code)
- [Linter](/tools/linter)

## Transaction Validation Errors

These happen before execution, during mempool admission:

- invalid signature
- wrong `chain_id`
- nonce mismatch
- `chi_supplied` above the chain's per-transaction cap (`max_tx_chi`, in every
  fee mode): "Transaction chi_supplied ... exceeds the chain's per-transaction
  limit of ... chi"
- on paid-fee networks, a balance that cannot cover the supplied chi limit:
  "Transaction sender's balance cannot cover the chi_supplied fee reservation"
  (log reason `insufficient_chi`)
- on paid-fee networks, a `currency.transfer` whose amount plus the fee
  reservation exceeds the balance: "currency.transfer amount plus the
  chi_supplied fee reservation exceeds the sender's balance" (log reason
  `transfer_exceeds_balance`)

These transactions do not enter the block execution path.

Block proposals pack transactions only while their total `chi_supplied` fits
the chain's `max_block_chi`; a transaction that would overflow it is left out
of that proposal, and validators reject a proposed block that exceeds either
cap.

## Runtime Execution Errors

These happen during contract execution:

- failed `assert`
- out-of-chi
- runtime exceptions

Execution outputs also classify these failures under `error_class`:

- `contract_assertion`: a contract `assert` failed
- `contract_error`: another contract-level exception escaped
- `chi_exceeded`: execution ran out of chi budget
- `call_limit_exceeded`: the deterministic instruction/call cap was hit

Effects:

- state changes for that transaction are rolled back
- consumed chi are recorded; paid-fee networks charge the matching execution fee
- emitted events from that transaction are discarded

## Query/Service Errors

Optional services can also fail independently:

- dashboard unavailable
- BDS disabled, catching up, or unavailable for indexed/history reads
- GraphQL unavailable because BDS is not running
- RPC or WebSocket connection failures

Those are operational errors, not consensus errors. Raw current-state ABCI
queries can be healthy even when BDS-backed indexed reads are degraded or
catching up.
