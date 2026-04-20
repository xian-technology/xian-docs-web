# Error Reference

Xian surfaces errors from a few distinct layers. Knowing which layer produced
the error makes debugging much faster.

## Linter Errors

The contract linter reports structured `E001`-style errors such as:

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
- insufficient balance for the supplied chi limit

These transactions do not enter the block execution path.

## Runtime Execution Errors

These happen during contract execution:

- failed `assert`
- out-of-chi
- runtime exceptions

Current execution outputs also classify these failures under `error_class`:

- `contract_assertion`: a contract `assert` failed
- `contract_error`: another contract-level exception escaped
- `chi_exceeded`: execution ran out of chi budget
- `call_limit_exceeded`: the deterministic instruction/call cap was hit

Effects:

- state changes for that transaction are rolled back
- consumed chi are still charged
- emitted events from that transaction are discarded

## Query/Service Errors

Optional services can also fail independently:

- dashboard unavailable
- BDS disabled, catching up, or unavailable for indexed/history reads
- GraphQL unavailable because BDS is not running
- RPC or WebSocket connection failures

Those are operational errors, not consensus errors. Raw current-state ABCI
queries can still be healthy even when BDS-backed indexed reads are degraded or
catching up.
