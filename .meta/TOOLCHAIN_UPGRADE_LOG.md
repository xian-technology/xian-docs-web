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
- At this checkpoint, the two low-severity Mermaid/KaTeX audit findings
  remained. The Mermaid upgrade below resolves them without a forced
  transitive override or audit-gate change.

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

## 2026-11-11: Mermaid and KaTeX

### Decision and actions

1. Reproduced the two low-severity findings with
   `npm audit --audit-level=low --omit=dev`, and checked the upstream release
   notes and [KaTeX advisory](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
2. Updated Mermaid from `11.16.1` to stable `12.3.0` and refreshed its lockfile.
   This resolves KaTeX to `0.18.10`, above the advisory's patched version.
   Removed the unused UUID override because Mermaid 12.3 drops that dependency.
3. Preserved `theme: 'base'`, custom colors, strict rendering, and SVG labels.
   Explicitly selected `layout: 'dagre'` and `look: 'classic'` because
   [Mermaid 12 changes those defaults](https://github.com/mermaid-js/mermaid/releases/tag/mermaid%4012.0.0).
   Zoom and fullscreen implementation code is unchanged.
4. Built isolated baseline and candidate sites from identical content. Added
   a temporary, unpublished fixture that enables HTML labels only for that
   diagram and renders two KaTeX expressions. Normal site diagrams retain
   SVG labels. Restarted preview servers after rebuilds to discard cached
   build metadata before browser checks.
5. Ran the ub-mode complexity, duplication, and mutation discovery tools.
   They do not support Vue SFCs; no supported source files were selected.
   Browser interaction checks exercise the actual component instead.

Mermaid 12 targets ES2024-capable browsers, including Safari 17.4 or later.
The existing Node.js minimum of 22.12.0 already meets its build requirement.
The bundled lazy ELK chunk exceeds the build's size-warning threshold; the
site explicitly uses Dagre, and a browser resource check confirms that the
architecture diagram does not download ELK. No warning threshold or audit
gate was weakened.

### Validation

- Node.js 24.22.2: clean install, full `npm audit`, and production build pass.
  npm reports **zero vulnerabilities**, including development dependencies.
- Compared all 119 published HTML paths plus the isolated math fixture:
  text, heading anchors, link destinations, and diagram counts are unchanged.
- All 24 published diagrams and the math fixture render in Chrome and
  Playwright WebKit 26.5 in desktop/mobile and light/dark combinations.
  The fixture produces MathML for both expressions with patched KaTeX.
- Each diagram's controls pass in every combination: zoom in/out, reset,
  lower bound, fullscreen zoom/reset, Close, Escape, and backdrop dismissal.
  The upper zoom bound is exercised once per combination.
- Rendered label text matches the Mermaid 11 baseline. Mermaid 12 wraps
  labels differently, changing diagram dimensions; Dagre layout selection,
  classic styling, and the custom palette are retained. Inspected flowchart,
  sequence, and mathematical-label screenshots.
- Removed the resolved KaTeX item from `.meta/BACKLOG.md`. The math fixture,
  browser scripts, screenshots, and duplicate build trees stay outside the
  repository and published site.
