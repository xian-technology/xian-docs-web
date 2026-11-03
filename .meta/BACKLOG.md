# Backlog

This is the stable backlog entrypoint for `xian-docs-web`.

Current themes:

- keeping docs tightly aligned with the current stack
- improving cross-repo consistency when architecture changes land
- maintaining strong section-level entrypoints so the docs site itself remains navigable

## Mermaid / KaTeX upgrade

The 2026-11-03 audit retains two low-severity package findings from one KaTeX
advisory, [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
It requires pre-existing prototype pollution; it does not introduce that
pollution itself. npm proposes Mermaid 12.2.0 to bring in patched KaTeX, which
crosses our current Mermaid major-version range. Review that upgrade separately
with browser diagram and mathematical-label checks. Do not force an incompatible
transitive override or weaken the high-severity CI audit gate.

