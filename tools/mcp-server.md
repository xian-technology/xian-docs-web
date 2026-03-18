# MCP Server

There is no maintained Xian-specific MCP server in the current core repo set.

The current maintained developer surfaces are:

- `xian-py` for application-side integrations
- `xian-linter` for linting as a package or HTTP service
- `xian-cli` for operator automation

If you need machine-readable control today, the stable backend boundary is
`xian-stack/scripts/backend.py`, which returns JSON for start, stop, status,
validation, and localnet flows.
