# GraphQL (BDS)

GraphQL in Xian is an optional convenience layer over the BDS Postgres
database.

It is available only when the indexed service-node stack is running.

## What It Runs On

The maintained stack uses PostGraphile v5 over the BDS database.

That means GraphQL is:

- generated from the indexed database schema
- useful for exploratory and history-heavy queries
- outside the deterministic consensus path

The default published port in the maintained stack is `5000`.

## What It Is Good For

GraphQL is most useful when you want:

- flexible filtering over indexed blocks, transactions, events, or state
  history
- one endpoint for explorer or analytics-style read patterns
- a developer-friendly schema browser through GraphiQL / introspection

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

So it is normal for GraphQL to lag slightly behind the very latest finalized
block during catch-up or recovery.

## Practical Guidance

- use CometBFT RPC and direct ABCI query for canonical state and submission
  flows
- use GraphQL when indexed querying is more important than absolute immediacy
- inspect the generated schema directly instead of hard-coding assumptions about
  every table-derived field name

## Related Pages

- [REST API](/api/rest)
- [WebSocket Subscriptions](/api/websockets)
- [Runtime Features](/node/runtime-features)
