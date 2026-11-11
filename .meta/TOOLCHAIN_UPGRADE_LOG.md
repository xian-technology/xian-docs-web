# Toolchain Upgrade Log

## 2026-11-11: VitePress and default theme

### Decision

Keep VitePress and update the existing 2.x prerelease track from
`2.0.0-alpha.18` to `2.0.0-alpha.21`. The default theme is bundled with
VitePress; there is no separate theme dependency to upgrade. Pin the tested
prerelease exactly. npm's stable tag remains `1.6.4`.

[Upstream changes](https://github.com/vuejs/vitepress/blob/v2.0.0-alpha.21/CHANGELOG.md)
include theme, navigation, search, and routing fixes. The newer VueUse
dependency requires Node.js 22 or later; Vite requires at least 22.12.0 on
that line. Use Node.js 24 LTS in both validation and deployment CI, and
declare the local minimum in package metadata and the root README.

### Actions and reasons

1. Read workspace/repo guidance, queried and refreshed the local code graph,
   inspected the theme/build workflows, and checked upstream release metadata.
2. Ran the existing clean-install, dependency-audit, and build gates before
   editing. Recorded existing dirty files so unrelated content stays out of
   the toolchain commit.
3. Updated VitePress and its lockfile, moved both workflows to Node.js 24,
   and declared ESM configuration to remove Vite's CommonJS-loader warning.
4. Reproduced a blocked mobile menu in the browser. Removed the local
   `.VPNav` transform: it makes fixed descendants use the header as their
   containing block and interferes with the theme's fullscreen navigation.
   Kept the existing solid navbar background.
5. Built isolated copies with identical Markdown content using the previous
   and updated toolchains, because content was also being edited during
   validation. Compared page content and exercised the generated site.
6. Ran `crapper --changed --no-coverage`, `dryer --changed --threshold 0.8`,
   and `mutator --changed --scan`. No supported executable source functions
   changed; the implementation change is one removed CSS declaration.

### Validation

- Node.js 24.22.2: `npm ci`,
  `npm audit --audit-level=high --omit=dev`, and `npm run build` pass.
- All 119 generated HTML paths remain present, including the 404 shell.
  Page text, heading anchors, distinct link destinations, and diagram counts
  match the previous toolchain with identical source content.
- Headless Chrome loads all 119 generated pages and renders all 24 Mermaid
  diagrams without JavaScript, console, or failed-asset errors.
- Browser interaction checks pass for local search and result navigation,
  desktop sidebar navigation, light/dark switching and persisted preference,
  code copying, diagram zoom/reset/fullscreen/Escape, mobile menu and sidebar
  navigation, viewport fit, and the themed missing-page screen.
- Inspected desktop light/dark, documentation, and mobile screenshots.
- Internal maintenance notes and graph artifacts remain excluded from output.
- The two existing low-severity Mermaid/KaTeX audit findings remain. The
  separate major-version review stays in `.meta/BACKLOG.md`; no forced
  dependency overrides or audit-gate changes were made.

### Zensical assessment

[Zensical is the successor to Material for MkDocs](https://squidfunk.github.io/mkdocs-material/),
and its [compatibility path targets MkDocs projects](https://zensical.org/docs/compatibility/mkdocs/).
This repository uses VitePress. Moving would require translating the homepage
front matter, section navigation, Markdown containers, custom CSS, and the Vue
diagram controls, then verifying existing URLs and heading anchors.

Zensical offers [built-in Mermaid support](https://zensical.org/docs/authoring/diagrams/)
and a useful Python documentation ecosystem. Those are reasonable reasons to
evaluate it for a project that needs them. This site already has working
search, navigation, diagrams, and static deployment, so retain VitePress
unless a concrete reader or authoring requirement justifies the migration.
