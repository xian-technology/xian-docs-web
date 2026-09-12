# Browser IDE

`xian-ide-web` provides a browser editor for Xian contracts, with compiler
checks, contract queries, simulation, and wallet-based deployment and calls.
Private keys stay in the injected wallet. Select the same network in the IDE
and wallet before signing.


## Hosting the IDE

Build with optional `VITE_XIAN_RPC_URL` and `VITE_XIAN_NETWORK_LABEL`
environment variables to select a deployment-specific default RPC and named
network preset. Without these values, the default remains
`http://127.0.0.1:26657`. A saved browser network selection takes precedence;
the configured preset remains available in Network settings.

Serve `dist/` over HTTPS, preserving the emitted WASM assets and falling back
to `index.html` for SPA routes. The RPC must be reachable from the browser over
HTTPS and allow the site's origin if hosted separately. Build-time settings
are public and must never contain credentials. Users must select the same
network in their wallet before signing transactions.

Build from the `xian-ide-web` checkout with compatible sibling `xian-js` and
`xian-contracting` checkouts installed. The build needs Rust, `wasm-pack`, and
the `wasm32-unknown-unknown` target:

```bash
npm ci
npm run test
npm run lint
VITE_XIAN_RPC_URL=https://rpc.example.org \
VITE_XIAN_NETWORK_LABEL="My network" npm run build
```

Publish only `dist/` to your static web server. The IDE has no backend or
separate compiler service; compiler diagnostics run in the browser.
