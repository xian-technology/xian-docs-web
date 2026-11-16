# Playgrounds

Xian has two maintained playground-style surfaces.

## 1. Browser dApp Example In `xian-js`

The `xian-js` repo ships a runnable browser dapp example that exercises:

- RPC and dashboard configuration
- provider discovery
- injected-wallet flows
- signing, sending, and simulation
- live subscriptions

Use it when you want to test the TypeScript client and provider contract from a
real browser app.

## 2. `xian-playground-web`

`xian-playground-web` is the dedicated contract playground for Xian. It runs
entirely in the browser: the contract compiler (`@xian-tech/compiler`) and the
node's own VM (`@xian-tech/vm`, `xian-vm-core` compiled to WebAssembly with an
in-memory store) execute locally, so the site is a set of static files and no
contract code or state leaves the user's machine.

It lets users:

- write contracts in a Monaco editor with live compiler diagnostics
- deploy them (name, typed constructor arguments) the way
  `submission.submit_contract` does on chain
- call exported functions through a typed form built from the contract's
  signature, or with raw JSON arguments
- see each result: return value, error, chi used, state writes and events
- set the signer and block environment (time, height, hash, chain id, random
  seed) and switch metering on or off
- browse and edit contract state, inspect source and VM IR
- share a workspace as a link or export and import it as a JSON file

Contract values stay exact end to end: decimals travel as `{"__fixed__": ...}`
and integers beyond 2^53 as `{"__big_int__": ...}`, never as JavaScript
numbers.

### Workspaces

Each browser keeps one workspace (editor, environment, deployed contracts and
their state) in IndexedDB and restores it on the next visit. If the browser
blocks site storage, the workspace lasts until the tab is closed.

A share link carries the workspace in the URL fragment (`#w=...`,
deflate-compressed), so it never reaches a server. Opening one asks before it
replaces the current workspace. Shared and imported workspaces contain contract
**source** and public state only: the playground compiles and deploys every
contract again and then restores its state, so a link cannot carry VM IR that
differs from the source it shows. Workspaces too large for a link go through
Export / Import.

The [Contracting Hub](/tools/hub) uses this format for **Open in Playground**.
Its link opens the selected catalog version's source in the editor. Review it
and deploy it locally with the contract name and constructor arguments you
choose.

### Metering and long-running code

Calls are metered like the chain by default; without a chi budget the VM
ceiling applies, so a runaway loop ends with an out-of-chi failure. With
metering off, the VM runs in a Web Worker that the page stops after 10
seconds, restoring the chain to its state before the call.

### Hosting

`npm run build` writes a static site to `out/`. Serve `.wasm` files as
`application/wasm` (streaming WebAssembly compilation needs it) and cache the
content-hashed `/_next/static/` assets as immutable. A Content-Security-Policy
must allow `'wasm-unsafe-eval'` in `script-src`.

## Which One To Use

- use the `xian-js` browser dapp example when you are testing app and wallet
  integration
- use `xian-playground-web` when you want a contract-authoring and local-runtime
  playground

## Related Tools

- [xian-js](/tools/xian-js)
- [Contracting Hub](/tools/hub)
- [Linter](/tools/linter)
