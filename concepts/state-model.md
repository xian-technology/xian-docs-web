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

## Related Pages

- [Storage Overview](/smart-contracts/storage)
- [Transaction Lifecycle](/concepts/transaction-lifecycle)
- [REST API](/api/rest)
