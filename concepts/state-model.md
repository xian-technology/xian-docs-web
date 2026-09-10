# State Model

Xian stores durable contract data in a key-value database. Contract state must
use `Variable` or `Hash`; ordinary module globals are recreated for each
execution and are not persistent.

## Keys

Storage keys use this shape:

```text
contract.variable:key1:key2
```

Examples:

| Contract access | Storage key |
| --- | --- |
| `currency.balances["alice"]` | `currency.balances:alice` |
| `currency.approvals["alice", "con_dex"]` | `currency.approvals:alice:con_dex` |
| `con_app.owner` | `con_app.owner` |

The ORM constructs these keys. Applications use the same shape for direct
state queries. Contract names and hash key parts cannot contain the reserved
`.` or `:` separators.

## Transaction Isolation

Writes and events remain buffered while a transaction executes.

- Successful execution contributes its effects to the block transition.
- A failed assertion, runtime error, or out-of-chi condition discards the
  transaction's application writes and events.
- A failing nested contract call rolls back the entire transaction, including
  earlier effects from its caller.

Reads see writes already made by the same transaction. An internal bounded
cache avoids repeated database reads without changing the committed state
model.

## Block Commit

At the end of a block, accepted state changes, nonce state, height, block time,
and the state-root marker are committed atomically in LMDB. The LMDB marker is
authoritative after restart; auxiliary metadata files are repairable copies.

The application computes a 32-byte Merkle root over canonical consensus state.
CometBFT records that `app_hash` in the next block header. Validators that
execute the same block differently produce a different root and cannot remain
aligned with the network.

## Queries

Direct state queries read committed state, not an in-flight transaction:

```text
/get/currency.balances:alice
```

Use direct ABCI state queries for authoritative current values. BDS history
and GraphQL are derived indexed views and may lag finalization briefly.

The direct query API serves current state. For CometBFT's `abci_query`:

- omit `height` or use `height=0` to select the latest committed state
- an explicit height must equal the node's latest committed height; earlier,
  future, and negative heights return a nonzero response code with an explanation
- keep `prove=false`; Merkle proof requests return an unsupported-query error

The ABCI response's `height` identifies Xian's committed application height
`H`, including when the query returns an error. It is `0` before the first
block is committed. The corresponding `app_hash` appears in CometBFT block
`H + 1`; response height does not refer to that later header.

An explicit latest height can become unavailable if another block commits
before the request is handled. Use `height=0` for current reads and inspect the
returned height. For historical changes, use BDS state-history routes; those
are indexed records, not historical VM execution. BDS rows carry their own
block heights, and the response envelope's height does not mean the indexer
has caught up to that height.

## Related Pages

- [Storage Overview](/smart-contracts/storage)
- [Transaction Lifecycle](/concepts/transaction-lifecycle)
- [REST API](/api/rest)
