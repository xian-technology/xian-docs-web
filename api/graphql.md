# GraphQL (BDS)

GraphQL is optional in the current stack.

It is available only when the Block Data Service (BDS) profile is running, in
which case `xian-stack` starts:

- `postgres`
- `postgraphile`

The GraphQL server is exposed on port `5000` by default.

## What It Is

The current implementation uses PostGraphile over the BDS Postgres database. It
is useful for indexed, exploratory queries that are awkward through raw ABCI
queries.

GraphQL is therefore a convenience layer over BDS, not the authoritative read
contract. The authoritative indexed node-facing surface is still the ABCI query
paths exposed by the validator when BDS is enabled.

Like BDS itself, GraphQL is eventually consistent with the latest finalized
block rather than part of the consensus hot path.
Finalized BDS payloads are also written to a local spool before they are
indexed, so a node can replay and recover its indexed data after restarts or
temporary database outages.

## What It Is Not

- it is not part of the deterministic consensus path
- it is not required to run a validator
- it is not the primary read path for core node health or contract state

## When to Use It

Use GraphQL when:

- you are running the indexed BDS stack
- you want richer filtering over indexed chain data
- you want a developer-friendly read layer for explorers or analytics

Use the CometBFT RPC and dashboard APIs when:

- you need the canonical node RPC surface
- you are not running BDS
- you are reading raw contract state or core node status
