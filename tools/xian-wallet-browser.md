# Xian Wallet — Browser Extension

The Xian browser wallet is a Manifest V3 Chrome extension for self-custody of Xian tokens. It runs in Chrome, Brave, Edge, and any Chromium-based browser.

**Repository:** [xian-technology/xian-wallet-browser](https://github.com/xian-technology/xian-wallet-browser)

## Installation

### From GitHub Release

1. Download the latest `xian-wallet-browser-vX.Y.Z.zip` from [Releases](https://github.com/xian-technology/xian-wallet-browser/releases)
2. Unzip the archive
3. Open `chrome://extensions` in your browser
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked**
6. Select the `dist/` folder from the unzipped archive

### Build From Source

Build the SDK workspace first:

```bash
cd xian-js
npm install
npm run build
```

Then build the wallet:

```bash
cd xian-wallet-browser
npm install
npm run -w apps/wallet-extension build
```

The unpacked extension is written to `apps/wallet-extension/dist/`.

Load it in Chrome using the same steps as above, pointing to the `dist/` folder.

## Architecture

The workspace is split into two packages:

| Package | Purpose |
|---------|---------|
| `packages/wallet-core/` | UI-agnostic wallet domain logic — key derivation, encryption, controller, approvals, network presets |
| `apps/wallet-extension/` | Manifest V3 browser extension — popup, side panel, background worker, content script, provider bridge |

### wallet-core

`@xian-tech/wallet-core` owns:

- **Key derivation** — BIP39 seed phrase generation and custom indexed derivation (`SHA256(seed + "xian-wallet-seed-v1" + uint32BE(index))`)
- **Encryption** — AES-256-GCM with PBKDF2 (250,000 iterations) for private key and mnemonic storage
- **Multi-account** — derive multiple addresses from a single seed, each with its own encrypted private key
- **Controller** — wallet state management, account switching, approval lifecycle, network presets, transaction flow
- **Approvals** — structured approval views for connect, sign, and send requests from dApps

It does NOT own browser-specific transport, popup rendering, or injected-page bridges.

### wallet-extension

The extension provides:

- **Popup / Side panel** — full wallet UI rendered as raw DOM (no framework)
- **Background worker** — key custody, approval handling, provider request routing
- **Content script + inpage bridge** — injects `window.xian` provider for dApps
- **Storage** — `chrome.storage.local` for wallet state, `chrome.storage.session` for unlocked sessions

## Features

### Wallet Management

- **Create wallet** — generates a 12-word BIP39 seed phrase and derives the first account
- **Import from seed** — restore from an existing 12 or 24-word phrase
- **Import from private key** — single-account wallet without multi-account support
- **Lock / unlock** — password-based with 5-minute session timeout
- **Remove wallet** — inline confirmation, clears all data

### Multi-Account (HD Wallet)

Seed-backed wallets support multiple derived accounts:

- **Add account** — derives the next key from the seed (no password prompt needed while unlocked)
- **Switch account** — seamless switching, notifies connected dApps via `accountsChanged`
- **Rename account** — inline editing, duplicate names rejected (case-insensitive)
- **Remove account** — non-primary accounts only, with inline confirmation

Key derivation is deterministic:
- Index 0: `SHA256(bip39_seed + "xian-wallet-seed-v1")` (backward compatible)
- Index N > 0: `SHA256(bip39_seed + "xian-wallet-seed-v1" + uint32BE(N))`

### Sending Tokens

**Simple send:**
1. Select a token from the dropdown (defaults to XIAN)
2. Enter recipient address (or pick from contacts)
3. Enter amount (or tap MAX)
4. Review — stamps are estimated automatically via `/simulate`
5. Send — shows result with TX hash linked to the explorer

**Advanced transaction:**
- Enter contract name — functions auto-load from the node
- Select function — arguments auto-populate with typed fields
- Set stamps manually or auto-estimate
- Review and send

### Activity

Transaction history fetched from the node's `/txs_by_sender` ABCI endpoint:
- Incoming / outgoing indicators
- Success / fail badges
- Tap for details — hash, block, stamps, time, explorer link

### Asset Management

- **Token list** — shows tracked assets with balances
- **Manage assets** — drag to reorder, hide/show toggle per token
- **Token detail** — balance, contract info, decimal places adjustment
- **Auto-detection** — discovers on-chain tokens not yet tracked

### Contacts

- Save recipient addresses with names
- Pick from contacts when sending
- Address validation warns on non-hex or wrong-length addresses
- After a successful send, offer to save the recipient

### Networks

- **Built-in presets** — Local node configured by default
- **Custom presets** — add, edit, delete RPC endpoints with optional chain ID and dashboard URL
- **Switch** — change active network, all state updates accordingly
- **Status indicator** — green (ready), yellow (unreachable), red (chain mismatch), with refresh on click

### Backup

- **Export** — enter password, downloads a JSON file containing the seed/key, account names, network presets, and watched assets
- **Import** — upload a previously exported JSON, enter a new password to encrypt

### Security

- **Reveal seed** — password-protected, click to copy
- **Reveal private key** — password-protected, click to copy
- **Session** — mnemonic and password stored in `chrome.storage.session` (memory-only, cleared on browser close) for seamless account operations while unlocked

### dApp Integration

The extension injects a `window.xian` provider conforming to `@xian-tech/provider`:

- `xian_requestAccounts` — connect and get accounts
- `xian_accounts` — list connected accounts
- `xian_getWalletInfo` — wallet capabilities and state
- `xian_sendTransaction` / `xian_signTransaction` — transaction flows
- `xian_signMessage` — message signing
- `wallet_watchAsset` — add tokens

Approval requests are shown inline in the wallet (side panel mode) or in a dedicated popup window.

Events: `accountsChanged`, `chainChanged`, `connect`, `disconnect`.

## Development

### Prerequisites

- Node.js 18+
- npm 9+
- Local checkout of both `xian-js` and `xian-wallet-browser` as siblings

### Commands

```bash
# Type-check
npm run -w apps/wallet-extension typecheck

# Build
npm run -w apps/wallet-extension build

# Run tests
npx vitest run

# Browser tests (requires Playwright)
npx playwright install chromium
npm run test:browser --workspace xian-wallet-extension
```

### Project Structure

```
xian-wallet-browser/
  packages/
    wallet-core/
      src/
        controller.ts    # Main wallet controller
        crypto.ts         # Key derivation, encryption
        types.ts          # All type definitions
        approvals.ts      # Approval view builders
        constants.ts      # Default presets, timeouts
  apps/
    wallet-extension/
      src/
        background/       # Service worker
        content/          # Content script
        inpage/           # Injected provider bridge
        popup/            # Main wallet UI
        shared/           # Storage, messages, preferences
      public/
        base.css          # All styles
        popup.html        # Popup entry
        approval.html     # Approval window entry
```

## Relationship To xian-js

The wallet consumes `@xian-tech/client` and `@xian-tech/provider` from the sibling `xian-js` repo. Local development uses a sibling checkout model:

```
xian/
  xian-js/
  xian-wallet-browser/
```

Both release independently.
