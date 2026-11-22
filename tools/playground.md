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
- see call return values in Execute, and errors, chi, writes and events in
  the activity log
- set the signer and block environment (time, height, hash, chain id, random
  seed) and switch metering on or off
- browse and edit contract state, inspect source and VM IR; if any state edit
  entry fails validation, the whole edit is rejected
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
replaces the current workspace. Shared and exported workspaces carry contract
**source**, public state, and deployment history in workspace format v2. The playground recompiles
each contract and restores the public state that existed when its constructor
originally ran, using the saved constructor arguments, signer, block environment,
and metering settings. It applies the workspace's final public state after replay.
History can include source and earlier state for contracts later removed.

Version 1 files replay from the state and deployment settings they contain.
Future deployments begin collecting history once the file opens. Use Export /
Import when a workspace exceeds the share-link size limit.

The [Contracting Hub](/tools/hub) uses this format for **Open in Playground**.
Its link opens the selected catalog version's source in the editor. Review it
and deploy it locally with the contract name and constructor arguments you
choose.

### Metering and long-running code

Calls use the chain's VM metering by default; without a chi budget the VM
ceiling applies, so a runaway loop ends with an out-of-chi failure. With
metering off, deterministic VM allocation and preparation limits remain.
Every deployment or call also has a 10-second worker timeout; a timeout or VM
crash restarts the worker from its saved chain snapshot. The playground does
not run consensus, real transaction admission, fee settlement or node keepers.

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
