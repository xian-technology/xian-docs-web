# Repository Guidelines

## Scope
- `xian-docs-web` owns the public documentation site for the Xian stack.
- Public docs content lives in the site folders such as `api/`, `node/`, and `smart-contracts/`.
- Internal repo notes live under `.meta/` so they do not become part of the published site.

## Shared Convention
- Follow the shared repo convention in `xian-meta/docs/REPO_CONVENTIONS.md`.
- This repo intentionally uses `.meta/` instead of `docs/` for internal notes; that exception is part of the convention and should be preserved.
- Follow the shared change workflow in `xian-meta/docs/CHANGE_WORKFLOW.md`.
- Before push, build the docs site locally.

## Project Layout
- `.vitepress/`: site configuration and build output
- `api/`, `concepts/`, `node/`, `smart-contracts/`, `tools/`: public docs sections
- `.meta/`: internal architecture and backlog notes for this repo itself

## Workflow
- Keep public docs aligned with the current code, not old architecture.
- Treat section `index.md` files as the public equivalent of folder READMEs for this repo.
- Keep internal maintenance notes in `.meta/`, not mixed into public docs content.

## Validation
- Preferred validation path: `npm run build`

## Shared Agent Practices
- Keep changes clean, modular, and professional. Prefer small, cohesive modules, clear naming, explicit boundaries, and tests over quick patches.
- When code behavior, public APIs, user workflows, operator workflows, or configuration semantics change, check whether `../xian-docs-web` needs corresponding documentation updates. If this repo is `xian-docs-web`, update the relevant published docs in place. Write durable user/developer documentation, not a changelog entry.
- For any non-trivial code change, update the local graph before final verification when `graphify-out/graph.json` exists. Run `graphify update .` from the repo root, or `graphify update . --force` when deletions or refactors intentionally shrink the graph.
- After updating the graph, check cross-repo impact before finishing: query the local `graphify-out/graph.json`, inspect paths with `graphify path` or `graphify explain`, and note any affected sibling repos.
- If graphify or dependency analysis shows affected sibling repos, update those repos in the same change when the impact is real and the fix is in scope.
- Treat `graphify-out/` as a generated local artifact. Do not commit it.
