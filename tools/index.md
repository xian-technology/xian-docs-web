# SDKs & Tools

Xian provides a set of developer tools for building, testing, deploying, and
integrating programmable decentralized networks and applications.

## Core Tools

| Tool | Purpose |
|------|---------|
| [xian-js](/tools/xian-js) | JavaScript / TypeScript SDK for browser apps, wallets, providers, transaction building, and websocket subscriptions |
| [xian-wallet-browser](/tools/xian-wallet-browser) | Browser wallet extension (Chrome/Brave/Edge) - multi-account HD wallet, dApp provider, local build/test flow, release zip |
| [xian-wallet-mobile](/tools/xian-wallet-mobile) | Mobile wallet (React Native/Expo) - Android release flow plus iOS build/test path from the same codebase |
| [xian-js Playground](/tools/playground) | Runnable browser dapp example for provider flows, injected-wallet discovery, tx preparation, quick sends, and websocket subscriptions |
| [xian-py](/tools/xian-py) | Python SDK for services, workers, indexed reads, websocket watchers, and projector-backed integrations |
| [xian-intentkit](/tools/xian-intentkit) | AI-agent stack with a web UI, Xian-native wallet and contract skills, autonomous task support, optional stack-managed deployment, and deployer-configurable pricing |
| [xian-zk](/tools/xian-zk) | Shielded-note and shielded-command proving toolkit, wallet state helper, and deployment bundle generator |
| [xian-linter](/tools/linter) | Static analysis to catch invalid code before deployment |

## Quick Start

Install the JS / TS SDK workspace:

```bash
cd ~/xian/xian-js
npm install
npm run validate
```

Install the Python SDK:

```bash
pip install xian-tech-py
```

Install the contract engine (for local testing):

```bash
pip install xian-tech-contracting
```

Install the shielded proving toolkit:

```bash
pip install xian-tech-zk
```
