# Contracting Hub

The maintained contract hub is `xian-contracting-hub-web`.

It is a curated contract catalog and deployment UI for the Xian ecosystem.

## What It Does

The hub is meant for discovery and inspection, not only raw deployment.

Current maintained features include:

- browsing and full-text searching curated Xian contracts
- filtering by category, tag, and sort order
- viewing syntax-highlighted source and version diffs
- showing lint reports and related-contract navigation
- developer interactions such as stars, ratings, and saved playground targets
- deployment history and leaderboard-style activity views
- admin workflows for creating, editing, publishing, and curating catalog items

## Why It Exists

The hub fills the space between:

- raw source repositories
- on-chain contract inspection
- one-off playground experiments

It gives developers a stable place to find maintained contract packages and
understand how they fit together before deploying anything.

## What It Is Not

The hub is not part of consensus and it is not the source of truth for chain
state.

Treat it as a curated developer surface:

- on-chain state is still authoritative for deployed contract metadata
- the contract source repos are still authoritative for package maintenance and
  code review

## Related Tools

- [Playgrounds](/tools/playground)
- [Linter](/tools/linter)
- [xian-py](/tools/xian-py)
