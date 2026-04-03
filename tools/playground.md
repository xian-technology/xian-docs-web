# xian-js Playground

The maintained browser-side playground today is the runnable
`examples/browser-dapp/` app inside the `xian-js` repo.

It is not a separate repo. It is the current dapp-side example for exercising
the public `@xian-tech/client` and `@xian-tech/provider` packages against a
live node.

## What It Covers

The playground currently includes:

- RPC URL, dashboard URL, chain ID, and private-key inputs
- demo in-memory signer and provider initialization
- wallet connect and wallet-info flows
- injected provider registration into `window.xian`
- rediscovery of an already injected wallet, including the browser extension
- native token asset-watch requests
- chain ID, nonce, and balance reads
- message signing
- wallet-managed tx preparation
- explicit build, sign, and send flows
- quick intent-based `sendCall(...)` flows
- live block and balance subscriptions through the dashboard websocket

## Run It

From the `xian-js` repo:

```bash
cd ~/xian/xian-js
npm install
npm run build
npm run dev --workspace example-browser-dapp
```

Vite prints the local URL when it starts. On a normal local run it is usually
`http://127.0.0.1:5173` or `http://localhost:5173`.

Point the form at a running Xian node, for example:

- RPC: `http://127.0.0.1:26657`
- dashboard: `http://127.0.0.1:8080`

## Use It With The Browser Wallet

To test the injected-wallet path with the current browser wallet:

```bash
cd ~/xian/xian-js
npm install
npm run build

cd ../xian-wallet-browser
npm install
npm run build --workspace xian-wallet-extension
```

Then:

1. open `chrome://extensions`
2. enable `Developer mode`
3. click `Load unpacked`
4. select `apps/wallet-extension/dist`
5. open the playground
6. click `Use Injected Wallet`

That exercises the real `window.xian` provider path rather than the in-memory
demo provider.

## Contracting-Only Interactive Work

There is still no maintained standalone contract-runtime playground repo in the
current core workspace.

For contract-only local development, use `xian-contracting` directly with
`ContractingClient`:

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()
```

That gives you the real runtime, storage behavior, linting rules, and contract
loading model used by the node stack.
