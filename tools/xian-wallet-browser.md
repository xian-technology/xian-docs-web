# xian-wallet-browser

`xian-wallet-browser` is the browser-wallet product workspace for Xian.

It owns the reusable wallet domain layer plus the concrete browser wallet apps.
The official JS / TS SDK still lives in the sibling `xian-js` repo.

## What Lives There

The current workspace is split into:

- `packages/wallet-core/`: reusable wallet-domain logic for custody, recovery,
  approvals, durable request state, provider enforcement, and network presets
- `apps/wallet-extension/`: the Manifest V3 browser-extension wallet built on
  top of `@xian-tech/wallet-core`

This repo is product code, not just an SDK example.

## Current Extension Scope

The current extension foundation includes:

- an injected `window.xian` provider for dapps
- a background worker so key custody stays out of the page context
- encrypted private-key and recovery-phrase storage in
  `chrome.storage.local`
- five-minute unlocked session persistence in `chrome.storage.session`
- wallet creation and import from a private key or BIP39 recovery phrase
- recovery-phrase reveal with password confirmation
- built-in and custom network presets with active-network switching
- configured-chain tracking with ready, unreachable, and mismatch states
- per-origin connect permissions
- watched-asset support
- tx preparation, signing, direct send, and intent-based `sendCall(...)`
  provider flows
- durable approval tracking so approval windows survive MV3 service-worker
  suspension
- popup and side-panel shell support from the same extension build

Current gaps called out by the repo:

- no hardware-wallet integration yet
- no transaction-history or portfolio view yet

## Relationship To xian-js

`xian-wallet-browser` consumes `@xian-tech/client` and `@xian-tech/provider`
from the sibling `xian-js` repo during local development.

Expected local layout:

```text
.../xian/
  xian-js/
  xian-wallet-browser/
```

The browser wallet and the JS SDK release independently, but local development
uses the sibling checkout model so provider and client changes can be tested
together.

## Build The Extension

Build the SDK workspace first:

```bash
cd ~/xian/xian-js
npm install
npm run build
```

Then install and build the wallet workspace:

```bash
cd ../xian-wallet-browser
npm install
npm run build --workspace xian-wallet-extension
```

The unpacked extension output is written to:

```text
apps/wallet-extension/dist
```

Browser-level validation:

```bash
npx playwright install chromium
npm run test:browser --workspace xian-wallet-extension
npm run test:visual --workspace xian-wallet-extension
```

## Load It In Chrome Or Chromium

1. open `chrome://extensions`
2. enable `Developer mode`
3. click `Load unpacked`
4. select `apps/wallet-extension/dist`

The extension currently exposes:

- a popup at `popup.html`
- a side-panel entry using the same shell
- a background service worker
- a content script plus `inpage.js` bridge for provider injection

## Dapp Integration

The extension is designed to be discovered from dapps through
`@xian-tech/provider`.

The companion `xian-js` playground is useful for exercising that path end to
end:

- [xian-js](/tools/xian-js) for the SDK and provider contract
- [xian-js Playground](/tools/playground) for the runnable dapp example

Typical local flow:

1. start a local Xian node
2. run the `xian-js` browser playground
3. load the unpacked extension
4. click `Use Injected Wallet` in the playground
5. test connect, sign, prepare, send, and watch-asset flows

## What wallet-core Owns

`@xian-tech/wallet-core` stays UI-agnostic. It owns:

- wallet state models
- key encryption and recovery helpers
- BIP39-based recovery support
- approval rendering helpers
- the wallet controller for permissions, approval lifecycle, network presets,
  and tx flow enforcement

It does not own:

- browser-extension transport
- popup rendering
- injected-page bridges

Those stay in app-level code such as `apps/wallet-extension/`.
