# SDKs & Tools

Xian ships tooling for three distinct jobs:

- building and testing contracts
- integrating applications and wallets
- operating higher-level services around a Xian network

## Core SDKs And Apps

| Tool | Main use |
|------|----------|
| [xian-cli](/tools/xian-cli) | operator CLI plus JSON-first wallet, query, and transaction automation |
| [xian-js](/tools/xian-js) | TypeScript client, provider contract, relayer clients, and browser integration |
| [xian-wallet-browser](/tools/xian-wallet-browser) | browser wallet extension and injected provider |
| [xian-wallet-mobile](/tools/xian-wallet-mobile) | mobile wallet application |
| [xian-py](/tools/xian-py) | Python client, watchers, indexed reads, and relayer clients |
| [xian-zk](/tools/xian-zk) | proving toolkit, shielded wallet model, bundle generation, local prover service |
| [xian-intentkit](/tools/xian-intentkit) | agent-facing automation stack for Xian-native workflows |
| [xian-dex-automation](/tools/xian-dex-automation) | deterministic DEX event automation service for rule-based trades |

## Solana bridge

The bridge moves supported tokens between Solana and Xian. Its operator holds the
origin asset and controls minting and burning on the wrapped side. Each transfer
locks in a fee and exchange ratio. The service calculates
`(amount received - fee) * ratio` exactly, then rounds down to the destination
token’s smallest unit. A request must pay out at least one unit. Send the
amount as a plain decimal string when constructing JSON with JavaScript.
[Bridge setup, supported tokens and refund workflow](https://github.com/xian-technology/xian-bridge#readme)

## Developer Productivity Tools

| Tool | Main use |
|------|----------|
| [Playgrounds](/tools/playground) | browser dapp example plus the dedicated contract playground |
| [Contracting Hub](/tools/hub) | curated contract catalog, inspection, ratings, and deployment UI |
| [Linter](/tools/linter) | static validation for contract source before deployment |
| [MCP Server](/tools/mcp-server) | local AI-assistant bridge for wallets, reads, submissions, and DEX flows |

## Common Install Paths

TypeScript / browser tooling:

See the [TypeScript SDK source installation](/tools/xian-js).

Python application SDK:

See the [Python SDK source installation](/tools/xian-py#install).

For CLI automation and operator tools, use the [CLI source installation](/tools/xian-cli#install).

Local contract runtime and testing:

Use the V2 source checkout and environment described in [Contract-only setup](/getting-started/dev-environment#contract-only-setup). Run the examples with its `uv run` command.

Shielded proving toolkit:

```bash
uv add xian-tech-zk
```

## How To Choose

- use `xian-tech-contracting` when you are writing or testing contracts
- use `xian-cli` when you want shell-first automation or operator workflows
- use `xian-py` or `xian-js` when you are building apps, services, wallets, or
  library-level integrations
- use `xian-zk` when you are working with shielded-note or shielded-command
  flows
- use `xian-dex-automation` when a DEX rule should execute predictably without
  an AI model deciding the action
- use the hub, playground, or MCP server when you want a higher-level developer
  surface instead of starting from raw SDK calls

## Browser IDE

The [Browser IDE](/tools/ide) provides contract editing, compiler checks,
simulation, and wallet-based deployment.
