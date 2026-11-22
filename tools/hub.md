# Contracting Hub

The maintained contract hub is `xian-contracting-hub-web`.

It is a curated contract catalog with browser Playground links for the Xian
ecosystem.

Catalog source is checked using the V2 compiler and native IR validator. Contracts can use exact decimal parameters and the V2 arithmetic helpers. See [Numbers, division and rounding](/smart-contracts/numbers).

## What It Does

The hub supports contract discovery, inspection, and local experimentation.

Maintained features include:

- browsing and full-text searching curated Xian contracts, including by current author name
- filtering by category, tag, and sort order
- viewing syntax-highlighted source and version diffs
- showing lint reports and related-contract navigation
- developer interactions such as stars and ratings
- opening a catalog version in the browser Playground through a workspace share link
- admin workflows for creating, editing, publishing, and curating catalog items

Apply your catalog or developer leaderboard filters to save the selection in
the page URL. Share that URL to open the same filtered view.

## Open in Playground

Choose **Open in Playground** on a contract version to open its source in the
Playground editor. The link carries the source in the URL fragment (`#w=...`);
the Playground asks before replacing an existing workspace. Review the source,
choose a contract name and constructor arguments, then deploy it locally in
the browser.

Check the selected version's release notes for declared platform dependencies.
The source-only share link does not install services or run a node keeper.
Contracts that depend on automatic node work need a matching node, or an
explicit service/checkpoint fixture for an offline test. See
[Curated Multi-Token Staking](/smart-contracts/staking).

Hub operators can use the supported single-port production server behind an
HTTPS reverse proxy with WebSocket forwarding:

```bash
uv run reflex run --env prod --single-port --frontend-port 8001 --backend-port 8001
```

Its app adapter preserves successful document status for declared dynamic page
links and error status for unknown routes or missing assets.
The successful shell status does not attest that a contract or developer exists;
an unknown identifier on a declared page route renders the client not-found view.
A raw static export needs equivalent route-aware HTML fallback and
backend/WebSocket configuration; Reflex's plain static-file server can render a
dynamic page in the browser while returning HTTP 404 for its initial document.
Avoid a blanket HTTP-200 fallback.

Opening a contract needs no saved deployment target or Playground account.
Hub operators configure the Playground address with
`CONTRACTING_HUB_PLAYGROUND_URL`; the local default is
`http://127.0.0.1:3210`.

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

- on-chain state is authoritative for deployed contract metadata
- the contract source repos are authoritative for package maintenance and
  code review

## Related Tools

- [Playgrounds](/tools/playground)
- [Linter](/tools/linter)
- [xian-py](/tools/xian-py)
