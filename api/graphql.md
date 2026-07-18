# GraphQL (BDS)

GraphQL in Xian is an optional convenience layer over the BDS Postgres
database.

It is available only when the stack runs BDS and the GraphQL sidecar.

## What It Runs On

The maintained stack uses PostGraphile v5 over the BDS database.

That means GraphQL is:

- generated from the indexed database schema
- useful for exploratory and history-heavy queries
- outside the deterministic consensus path

The maintained stack publishes it on port `5000` when enabled.

## Endpoint And Browser UI

With the local GraphQL sidecar running, use:

```text
GraphQL endpoint: http://127.0.0.1:5000/graphql
Browser UI:       http://127.0.0.1:5000/graphiql
```

The browser UI may be branded Ruru. It is the interactive GraphiQL-compatible
client for the same `/graphql` endpoint.

To run a parameterized example in the browser UI:

1. Paste the `graphql` block into the Operation Editor.
2. Open the **Variables** panel below the editor.
3. Paste the matching `json` block into that panel.
4. Replace example values with hashes or heights returned by the same node.
5. Execute the operation.

Do not paste the variables JSON into the Operation Editor. An error such as
`Variable "$hash" of required type "String!" was not provided` means the
Variables panel is empty or does not contain the declared variable.

A successful lookup can return `null` when that hash or height is not present
in this node's BDS database. That is different from a GraphQL validation error.
Use the collection queries below to discover values indexed by the node before
running the corresponding lookup query.

## Deployment Posture

In the maintained `xian-stack` runtime:

- GraphQL is available only on nodes with BDS enabled
- it binds to `127.0.0.1` by default
- public exposure is explicit through `--public-query` or
  `XIAN_PUBLIC_QUERY_ENABLED=1`
- it runs against a dedicated read-only Postgres role, not the primary BDS
  owner account
- generated default mutations are disabled in the stack PostGraphile preset
- simple collection fields are omitted so table browsing uses connection-style
  pagination
- the PostGraphile request body size is capped, and the dedicated database role
  has a statement timeout
- startup waits for the core BDS read-model tables before GraphQL begins
  serving the generated schema

## What It Is Good For

GraphQL is most useful when you want:

- flexible filtering over indexed blocks, transactions, events, or state
  history
- one endpoint for explorer or analytics-style read patterns
- generated schema introspection for query tooling

## What It Is Not

GraphQL is not:

- the authoritative source of current state
- required to run a validator
- a substitute for CometBFT RPC or direct ABCI query when you need the core
  node contract

## Consistency Model

GraphQL inherits the indexed-read consistency model of BDS.

That means:

- blocks finalize first
- BDS indexes them asynchronously
- GraphQL reflects the indexed database once that work is done

So it is normal for GraphQL to lag slightly behind the most recent finalized
block during catch-up or recovery.

## Practical Guidance

- use CometBFT RPC and direct ABCI query for canonical state and submission
  flows
- use GraphQL when indexed querying is more important than absolute immediacy
- inspect the generated schema directly instead of hard-coding assumptions about
  every table-derived field name
- prefer bounded connection queries, especially on public `--public-query`
  endpoints

## Common Queries

Transaction rows use the generated PostGraphile field name `hash`. The direct
ABCI BDS and SDK surfaces expose the same value as `tx_hash` or `txHash`.

Start by listing recent transactions. This query does not require variables:

```graphql
query RecentTransactions {
  allTransactions(first: 20, orderBy: BLOCK_HEIGHT_DESC) {
    nodes {
      hash
      blockHeight
      contract
      function
      success
    }
  }
}
```

Copy a returned `hash` into the Variables panel for the lookup query:

```graphql
query TransactionByHash($hash: String!) {
  transactionByHash(hash: $hash) {
    hash
    blockHeight
    sender
    contract
    function
    success
    chiUsed
  }
}
```

Variables:

```json
{
  "hash": "<hash-from-all-transactions>"
}
```

List recent blocks before looking up one height. This query does not require
variables:

```graphql
query RecentBlocks {
  allBlocks(first: 10, orderBy: HEIGHT_DESC) {
    nodes {
      height
      blockHash
      txCount
    }
  }
}
```

Block heights are generated as `BigInt`. Pass height variables as strings so
clients do not lose precision for heights above their safe integer range:

```graphql
query BlockByHeight($height: BigInt!) {
  blockByHeight(height: $height) {
    height
    blockHash
    txCount
  }
}
```

Variables:

```json
{
  "height": "<height-from-all-blocks>"
}
```

## Related Pages

- [BDS Indexed Queries](/api/bds)
- [REST API](/api/rest)
- [WebSocket Subscriptions](/api/websockets)
- [Runtime Features](/node/runtime-features)
