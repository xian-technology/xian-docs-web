# Playgrounds

Xian currently has two maintained playground-style surfaces.

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

`xian-playground-web` is the dedicated contract playground for Xian.

It lets users:

- author contracts in the browser
- lint them
- deploy them into a per-session `xian-contracting` runtime
- call exported functions
- inspect and import/export session state

This is the maintained browser-first contract experimentation surface.

## Which One To Use

- use the `xian-js` browser dapp example when you are testing app and wallet
  integration
- use `xian-playground-web` when you want a contract-authoring and local-runtime
  playground

## Related Tools

- [xian-js](/tools/xian-js)
- [Contracting Hub](/tools/hub)
- [Linter](/tools/linter)
