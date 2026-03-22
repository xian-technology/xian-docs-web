# xian-docs-web

`xian-docs-web` is the public Xian Technology documentation site, built with
VitePress. It owns published docs content and keeps its repo-internal notes
hidden under `.meta/` so they are not shipped as public pages.

## Scope

This repo owns:

- the published documentation site and its content structure
- docs updates that track public API, SDK, CLI, node, and operator behavior
- internal repo notes stored under `.meta/`

This repo does not own:

- canonical runtime behavior
- SDK or node implementation logic
- stack-wide convention definitions

## Key Directories

- `api/`, `concepts/`, `node/`, `tools/`, `smart-contracts/`: published docs sections
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

## Development

```bash
npm run dev
npm run preview
```

The site is deployed automatically to GitHub Pages on every push to `main`.
