# xian-docs-web

`xian-docs-web` is the public Xian Technology documentation site, built with
VitePress. It owns published docs content and keeps its repo-internal notes
hidden under `.meta/` so they are not shipped as public pages.

## Quick Start

```bash
npm install
npm run dev
```

Use `npm run build` before pushing docs changes.

## Principles

- Write in current-state language. Explain what the stack does and how to use
  it, not how it changed.
- Keep public docs in the published content tree and repo-internal notes in
  `.meta/`.
- Update docs alongside implementation changes whenever public behavior,
  workflows, or operator guidance changes.
- Prefer concise guidance, examples, and workflows over internal terminology or
  changelog-style prose.

## Key Directories

- `api/`, `concepts/`, `node/`, `tools/`, `smart-contracts/`: published docs sections
- `solution-packs/`: published product-oriented reference pack walkthroughs
- `.meta/`: internal architecture and backlog notes for this repo
- `.vitepress/`: site theme and build configuration

## Validation

```bash
npm install
npm run build
```

## Related Docs

- [AGENTS.md](AGENTS.md)
- internal repo notes: `.meta/ARCHITECTURE.md`, `.meta/BACKLOG.md`, `.meta/README.md`
