# Repository Guidelines

## Scope
- `xian-docs-web` owns the public documentation site for the Xian stack.
- Public docs content lives in the site folders such as `api/`, `node/`, and `smart-contracts/`.
- Internal repo notes live under `.meta/` so they do not become part of the published site.

## Shared Convention
- Follow the shared repo convention in `xian-meta/docs/REPO_CONVENTIONS.md`.
- This repo intentionally uses `.meta/` instead of `docs/` for internal notes; that exception is part of the convention and should be preserved.

## Project Layout
- `.vitepress/`: site configuration and build output
- `api/`, `concepts/`, `node/`, `smart-contracts/`, `tools/`: public docs sections
- `.meta/`: internal architecture and backlog notes for this repo itself

## Workflow
- Keep public docs aligned with the current code, not old architecture.
- Treat section `index.md` files as the public equivalent of folder READMEs for this repo.
- Keep internal maintenance notes in `.meta/`, not mixed into public docs content.
