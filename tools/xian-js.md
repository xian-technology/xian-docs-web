# xian-js

`xian-js` is the TypeScript SDK workspace for browsers, wallets, dapps, and
Node.js applications.

## Packages

| Package | Purpose |
| --- | --- |
| `@xian-tech/client` | typed RPC client, transaction builder, signer, watchers, indexed reads |
| `@xian-tech/provider` | wallet provider contract, injected-wallet discovery, WalletConnect adapter |
| `@xian-tech/types` | shared public types |
| `@xian-tech/web-kit` | wallet, RPC, formatting, toast, and React helpers |

Install only the packages your application uses:

```bash
npm install @xian-tech/client @xian-tech/provider
```

## Direct Client Use

Use the client directly when your application owns the private key, such as a
server, test, or local automation process.

```ts
import { Ed25519Signer, XianClient } from "@xian-tech/client";

const signer = new Ed25519Signer(process.env.XIAN_PRIVATE_KEY!);
const client = new XianClient({
  rpcUrl: "http://127.0.0.1:26657",
  dashboardUrl: "http://127.0.0.1:8080",
});

const submission = await client.token("currency").transfer({
  signer,
  to: "bob",
  amount: 5,
  mode: "checktx",
  waitForTx: true,
});

console.log(submission.txHash, submission.finalized);
```

Do not put private keys in browser application code. Browser dapps should use
an injected wallet provider.

## Deploy Source

```ts
const result = await client.deployContract({
  name: "con_counter",
  source,
  signer,
  mode: "checktx",
  waitForTx: true,
});
```

`deployContract` and `submitContract` submit source. Validators compile and
persist canonical IR; the SDK does not submit executable deployment artifacts.

## Injected Wallets

Discover a browser wallet through the provider package:

```ts
import { InjectedXianWallet } from "@xian-tech/provider";

const wallet = await InjectedXianWallet.waitForInjected({ timeoutMs: 1_000 });
const accounts = wallet ? await wallet.connect() : [];

await wallet?.sendCall({
  contract: "currency",
  function: "transfer",
  kwargs: { to: "bob", amount: 5 },
});
```

Wallet implementations register with `registerInjectedXianProvider`. Discovery
uses the default `window.xian` namespace, a multi-provider registry, and the
`xian#initialized` event.

The provider supports account connection, prepared or intent-based
transactions, message signing, network switching, watched assets, and provider
events. The wallet remains responsible for approval policy and secret custody.

## Reads, Simulation, and Events

The client provides:

- node, nonce, state, source, IR, and contract metadata reads
- readonly calls and chi estimation
- explicit transaction building, signing, broadcast, and finality waiting
- contract and token convenience clients
- BDS-backed blocks, transactions, events, state history, and DEX candles
- CometBFT and dashboard WebSocket subscriptions
- shielded relayer clients

Automatic send helpers reserve nonces per client, chain, and sender. An
ambiguous broadcast can quarantine that sender until the caller reconciles the
network state; handle `NonceReservationError` rather than forcing nonce reuse.

## Broadcast Modes

- `async`: return after broadcast
- `checktx`: wait for mempool validation
- `commit`: wait through the RPC commit response

Use `waitForTx: true` when the application needs a finalized receipt.

## Related Pages

- [Browser Wallet](/tools/xian-wallet-browser)
- [WebSocket Subscriptions](/api/websockets)
- [BDS Indexed Queries](/api/bds)
- [Source repository](https://github.com/xian-technology/xian-js)
