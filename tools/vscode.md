# VS Code Extension

There is no maintained VS Code extension repo in the current core workspace.

For editor integration today:

- use the Python extension for syntax highlighting
- use `xian-linter` or the `contracting` linter programmatically in your test
  and CI loops
- keep a fast validation loop with `uv run pytest` and the focused linter tests

If a dedicated editor extension is published later, this page should be updated
to point to that repository and its exact capabilities.
