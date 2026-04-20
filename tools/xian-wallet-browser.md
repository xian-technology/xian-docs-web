# Xian Wallet - Browser Extension

The Xian browser wallet is a Manifest V3 Chrome extension for self-custody of
Xian tokens. It runs in Chrome, Brave, Edge, and other Chromium-based browsers.

**Repository:** [xian-technology/xian-wallet-browser](https://github.com/xian-technology/xian-wallet-browser)

## Installation

### From GitHub Release

1. Download the latest `xian-wallet-browser-vX.Y.Z.zip` from
   [Releases](https://github.com/xian-technology/xian-wallet-browser/releases).
2. Unzip the archive.
3. Open `chrome://extensions` in your browser.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the `dist/` folder from the unzipped archive.

### Build From Source

#### Prerequisites

- Node.js 18+
- npm 9+
- A sibling checkout of `xian-js`
- Chrome, Brave, Edge, or another Chromium-based browser

Expected local layout:

```text
.../xian/
  xian-js/
  xian-wallet-browser/
```

Build the SDK workspace first so the local file dependencies are ready:

```bash
cd xian-js
npm install
npm run build
```

Then build the wallet:

```bash
cd xian-wallet-browser
npm install
npm run build --workspace xian-wallet-extension
```

The unpacked extension output is written to:

```text
apps/wallet-extension/dist/
```

Load it in Chrome or Chromium using the same steps as above, pointing to that
`dist/` folder.

## Validation And Testing

### Automated validation

From the repo root:

```bash
cd xian-wallet-browser
npm run validate
```

For browser-level checks:

```bash
npx playwright install chromium
npm run test:browser --workspace xian-wallet-extension
npm run test:visual --workspace xian-wallet-extension
```

### Manual smoke testing

After loading the unpacked extension:

- create a new wallet and record the seed phrase
- import a wallet from an existing seed phrase
- lock and unlock the wallet
- add or edit a network preset and verify the status indicator
- connect a sample dApp such as the [xian-js Playground](/tools/playground)
- approve and reject connect / sign / send flows
- export a backup and restore it into a clean browser profile

## Initial Wallet Setup

On first launch the extension shows three setup modes:

- **Create** - generates a new 12-word BIP39 recovery seed and derives the first account
- **Seed** - restores from an existing 12 or 24-word BIP39 recovery phrase
- **Key** - imports a single 32-byte hex private-key seed without HD-account support

The setup form always asks for a wallet password. In **Create** mode the seed is
shown only after the wallet is created, so the normal flow is:

1. choose **Create**
2. enter a wallet password
3. optionally expand **Network settings**
4. create the wallet
5. record the recovery seed before closing the screen

The **Network settings** disclosure on the setup screen lets you override:

- network label
- expected chain ID
- RPC URL
- dashboard URL

If you leave those fields on the local defaults, the built-in **Local node**
preset stays active. If you change them during setup, the wallet creates a
custom preset and makes it active immediately.

## Release Flow

The end-user artifact is a GitHub release zip that contains the unpacked
extension bundle.

For maintainers, release automation is tag-based:

1. update repo and package versions to `X.Y.Z`
2. run `npm install`
3. run `npm run validate`
4. run the Playwright browser and visual test suites
5. create and push the tag `vX.Y.Z`

On tag builds, CI validates the repo, builds the extension bundle, publishes
`@xian-tech/wallet-core`, and attaches the browser-wallet zip artifact to the
GitHub release.

## Architecture

The workspace is split into two packages:

| Package | Purpose |
|---------|---------|
| `packages/wallet-core/` | UI-agnostic wallet domain logic - key derivation, encryption, controller, approvals, network presets |
| `apps/wallet-extension/` | Manifest V3 browser extension - popup, side panel, background worker, content script, provider bridge |

### wallet-core

`@xian-tech/wallet-core` owns:

- **Key derivation** - BIP39 seed phrase generation and custom indexed derivation (`SHA256(seed + "xian-wallet-seed-v1" + uint32BE(index))`)
- **Encryption** - AES-256-GCM with PBKDF2 (250,000 iterations) for private key and mnemonic storage
- **Multi-account** - derive multiple addresses from a single seed, each with its own encrypted private key
- **Controller** - wallet state management, account switching, approval lifecycle, network presets, transaction flow
- **Approvals** - structured approval views for connect, sign, and send requests from dApps

It does not own browser-specific transport, popup rendering, or injected-page
bridges.

### wallet-extension

The extension provides:

- **Popup / Side panel** - full wallet UI rendered as raw DOM (no framework)
- **Background worker** - key custody, approval handling, provider request routing
- **Content script + inpage bridge** - injects `window.xian` provider for dApps
- **Storage** - `chrome.storage.local` for wallet state, `chrome.storage.session` for unlocked sessions

## Features

### Wallet Management

- **Create wallet** - generates a 12-word BIP39 seed phrase and derives the first account
- **Import from seed** - restore from an existing 12 or 24-word phrase
- **Import from private key** - single-account wallet without multi-account support
- **Lock / unlock** - password-based with 5-minute session timeout
- **Remove wallet** - inline confirmation, clears all data

### Multi-Account (HD Wallet)

Seed-backed wallets support multiple derived accounts:

- **Add account** - derives the next key from the seed (no password prompt needed while unlocked)
- **Switch account** - seamless switching, notifies connected dApps via `accountsChanged`
- **Rename account** - inline editing, duplicate names rejected (case-insensitive)
- **Remove account** - non-primary accounts only, with inline confirmation

Key derivation is deterministic:

- Index 0: `SHA256(bip39_seed + "xian-wallet-seed-v1")` (backward compatible)
- Index N > 0: `SHA256(bip39_seed + "xian-wallet-seed-v1" + uint32BE(N))`

### Sending Tokens

**Simple send:**

1. Select a token from the dropdown (defaults to XIAN)
2. Enter recipient address (or pick from contacts)
3. Enter amount (or tap MAX)
4. Review - chi are estimated automatically via `/simulate`
5. Send - shows result with TX hash linked to the explorer

The popup validates obviously malformed recipient and amount inputs before
submission and keeps node-side failures visible in the result flow instead of
failing silently.

**Advanced transaction:**

- Enter contract name - functions auto-load from the node
- Select function - arguments auto-populate with typed fields
- Set chi manually or auto-estimate
- Review and send

### Activity

Transaction history fetched from the node's `/txs_by_sender` ABCI endpoint:

- Classified rows for sends, approvals, token creation, DEX buys/sells/swaps,
  liquidity add/remove, and generic contract calls
- Success / fail badges plus distinct icons and color accents per activity type
- Tap for details - decoded arguments, hash, block, chi, time, and explorer link
- Clear fetch-error state with retry when the history query fails

### Asset Management

- **Token list** - shows tracked assets with balances
- **Manage assets** - drag to reorder, hide / show toggle per token
- **Token detail** - balance, contract info, decimal places adjustment
- **Auto-detection** - discovers on-chain tokens not yet tracked

### Contacts

- Save recipient addresses with names
- Pick from contacts when sending
- Address validation warns on non-hex or wrong-length addresses
- After a successful send, offer to save the recipient

### Networks

- **Built-in presets** - Local node configured by default
- **Custom presets** - add, edit, delete RPC endpoints with optional chain ID and dashboard URL
- **Switch** - change active network, all state updates accordingly
- **Status indicator** - green (ready), yellow (unreachable), red (chain mismatch), with refresh on click

### Backup

- **Export** - enter password, downloads a JSON file containing the seed/key, account names, network presets, and watched assets
- **Import** - upload a previously exported JSON, enter a new password to encrypt

### Security

- **Reveal seed** - password-protected, click to copy
- **Reveal private key** - password-protected, click to copy
- **Session** - while unlocked, the extension keeps the active private key, the
  mnemonic when the wallet is seed-backed, and a derived session key in
  `chrome.storage.session`; the raw password is not persisted

### dApp Integration

The extension injects a `window.xian` provider conforming to `@xian-tech/provider`:

- `xian_requestAccounts` - connect and get accounts
- `xian_accounts` - list connected accounts
- `xian_getWalletInfo` - wallet capabilities and state
- `xian_watchAsset` - add a token to the wallet's tracked asset list
- `xian_prepareTransaction` - let the wallet fill sender, chain, nonce, and default chi
- `xian_sendCall` - intent-first prepare + sign + broadcast in one request
- `xian_sendTransaction` / `xian_signTransaction` - transaction flows
- `xian_signMessage` - message signing

Approval requests are shown inline in the wallet (side panel mode) or in a
dedicated popup window.

Events: `accountsChanged`, `chainChanged`, `connect`, `disconnect`.

## Development

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

```text
xian-wallet-browser/
  packages/
    wallet-core/
      src/
        controller.ts    # Main wallet controller
        crypto.ts        # Key derivation, encryption
        types.ts         # All type definitions
        approvals.ts     # Approval view builders
        constants.ts     # Default presets, timeouts
  apps/
    wallet-extension/
      src/
        background/      # Service worker
        content/         # Content script
        inpage/          # Injected provider bridge
        popup/           # Main wallet UI
        shared/          # Storage, messages, preferences
      public/
        base.css         # All styles
        popup.html       # Popup entry
        approval.html    # Approval window entry
```

## Relationship To xian-js

The wallet consumes `@xian-tech/client` and `@xian-tech/provider` from the
sibling `xian-js` repo. Local development uses a sibling checkout model:

```text
xian/
  xian-js/
  xian-wallet-browser/
```

Both release independently.
