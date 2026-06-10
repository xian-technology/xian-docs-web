# Storage Overview

Xian contract state is exposed through four ORM-style primitives:

- `Variable`
- `Hash`
- `ForeignVariable`
- `ForeignHash`

All of them ultimately map to deterministic key-value storage in LMDB.

```mermaid
flowchart LR
  V["owner = Variable()"] --> KV1["con_token.owner"]
  H1["balances['alice']"] --> KV2["con_token.balances:alice"]
  H2["approvals['alice', 'con_dex']"] --> KV3["con_token.approvals:alice:con_dex"]
  FV["ForeignVariable(currency, owner)"] -.read only.-> KV4["currency.owner"]
  KV1 --> LMDB["LMDB key-value state"]
  KV2 --> LMDB
  KV3 --> LMDB
  KV4 --> LMDB
```

Every declaration resolves to flat keys of the form
`contract.variable` or `contract.variable:key1:key2:...`, which is also the
shape you use when reading state through `/get/<state-key>`.

## What to Use

| Primitive | Use |
|-----------|-----|
| `Variable` | one stored value |
| `Hash` | keyed or multi-dimensional data |
| `ForeignVariable` | read another contract's variable |
| `ForeignHash` | read another contract's hash |

## Key Facts

- `Variable` uses `.set()` and `.get()`, and also supports top-level dict/list
  helpers for mutable values
- `Hash` uses index syntax like `balances["alice"]`
- hash keys can be multi-dimensional
- foreign storage is read-only by design
- values are encoded deterministically for consensus safety

Use the pages in this section for the exact behavior of each primitive.
