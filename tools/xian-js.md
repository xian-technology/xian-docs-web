# xian-js

`xian-js` is the JavaScript / TypeScript SDK workspace for integrating Xian
from browser apps, wallets, dapps, and Node.js code that prefers TS.

It publishes four public packages:

- `@xian-tech/client`: typed RPC client, tx helpers, Ed25519 signing helpers, and
  websocket subscriptions
- `@xian-tech/provider`: browser wallet-provider contract and a simple in-memory
  provider implementation for demos, tests, injected-wallet discovery, and
  early integrations
- `@xian-tech/types`: the shared transaction, signer, number, and broadcast-mode
  types used by the SDK packages
- `@xian-tech/web-kit`: shared browser-app helpers for wallet connection, RPC
  client storage, formatting, toasts, and React integration

The browser wallet product line lives in the sibling
`xian-wallet-browser` repo, which consumes these SDK packages. The wallet
product surface is documented here under
[xian-wallet-browser](/tools/xian-wallet-browser).

## Published Packages

`xian-js` is available both as a maintained repo and as published npm packages:

- `@xian-tech/client`
- `@xian-tech/provider`
- `@xian-tech/types`
- `@xian-tech/web-kit`

The browser wallet product line is documented separately under
[xian-wallet-browser](/tools/xian-wallet-browser). The source repo publishes
`@xian-tech/wallet-core`.

## Workspace Setup

```bash
cd ~/xian/xian-js
npm install
npm run validate
```

This runs:

- package type-checks
- package builds
- test suites

## Package Overview

### `@xian-tech/client`

The client package owns:

- Xian RPC and ABCI query reads
- tx payload building
- canonical payload signing
- tx broadcast helpers
- tx wait / polling helpers
- token and contract convenience helpers
- dashboard websocket subscriptions

### `@xian-tech/provider`

The provider package owns:

- the browser-facing provider request contract
- provider events such as account and chain changes
- a simple in-memory provider that delegates signing and broadcast to
  `@xian-tech/client`
- injected-wallet registration on `window.xian` and `window.xianProviders`
- discovery helpers for late-loaded browser wallets
- a dapp-facing wrapper around an injected provider

### `@xian-tech/types`

The types package owns the shared TypeScript contracts used across the JS
workspace:

- transaction payload and envelope types
- signer interfaces
- broadcast-mode and numeric helper types

### `@xian-tech/web-kit`

The web-kit package owns reusable browser-app helpers:

- injected-wallet connection helpers
- React wallet context and hooks
- RPC client persistence helpers
- toast helpers
- address, number, date, and clipboard utilities

That gives Xian a clean split between:

- low-level network and tx logic in `@xian-tech/client`
- wallet-provider integration in `@xian-tech/provider`
- shared transaction and signer types in `@xian-tech/types`
- reusable browser app glue in `@xian-tech/web-kit`
- browser wallet product code in `xian-wallet-browser`

## Installing In Another JS Project

Install the packages directly from npm:

```bash
npm install @xian-tech/client @xian-tech/provider @xian-tech/types @xian-tech/web-kit
```

For local development against the SDK workspace, you can work from the
workspace checkout.

Inside the `xian-js` repo itself, the packages are already linked through the
workspace. `examples/browser-dapp/` demonstrates the dapp side of the contract.
The browser wallet implementation lives in the sibling
`xian-wallet-browser` repo.

## Public Imports

Public top-level imports from `@xian-tech/client` include:

```ts
import {
  AbciError,
  BroadcastMode,
  ContractClient,
  Ed25519Signer,
  RpcError,
  SimulationError,
  TokenClient,
  TransactionError,
  TransportError,
  TxTimeoutError,
  WatchApi,
  XianClient,
  XianClientError,
  XianShieldedRelayerClient,
  XianShieldedRelayerPoolClient,
  canonicalizeRuntime,
  decodeRuntime,
  encodeRuntime,
  generatePrivateKey,
  isValidEd25519Key,
  isValidEd25519Signature,
  normalizeShieldedRelayerCatalogEntry,
  parseXianNumber,
  publicKeyFromPrivateKey,
  shieldedSyncHintFromViewingPrivateKey,
  shieldedSyncHintFromViewingPublicKey,
  signMessage,
  sortShieldedRelayerCatalog,
  sortKeysDeep,
  verifyMessage,
} from "@xian-tech/client";
```

Public top-level imports from `@xian-tech/provider` include:

```ts
import {
  InjectedXianWallet,
  InMemoryXianProvider,
  ProviderBackedXianSigner,
  WalletConnectXianProvider,
  ProviderChainMismatchError,
  ProviderDisconnectedError,
  ProviderUnauthorizedError,
  ProviderUnsupportedMethodError,
  XianProviderError,
  XIAN_WALLETCONNECT_EVENTS,
  XIAN_WALLETCONNECT_METHODS,
  XIAN_WALLETCONNECT_NAMESPACE,
  createXianDappPolicyForRequest,
  evaluateXianDappPolicy,
  findMatchingXianDappPolicy,
  XIAN_INITIALIZED_EVENT,
  getInjectedXianProvider,
  listInjectedXianProviders,
  parseXianDappAction,
  registerInjectedXianProvider,
  waitForInjectedXianProvider,
  xianAccountFromCaip10,
  xianAccountToCaip10,
  xianChainIdFromCaip2,
  xianChainIdToCaip2,
} from "@xian-tech/provider";
```

When you want the shared core types directly, import them from
`@xian-tech/types`:

```ts
import type {
  BroadcastMode,
  XianNumber,
  XianSignedTransaction,
  XianSigner,
  XianTxPayload,
  XianUnsignedTransaction,
} from "@xian-tech/types";
```

For shared browser-app helpers, import from `@xian-tech/web-kit`:

```ts
import {
  WalletProvider,
  ToastProvider,
  connectWallet,
  createXianRpcStore,
  sendCall,
  shortAddress,
  useXianWallet,
} from "@xian-tech/web-kit";
```

## Ed25519 Signers

`xian-js` includes a built-in Ed25519 signer primarily for:

- local development
- tests
- Node.js service usage where local key custody is acceptable

Basic usage:

```ts
import { Ed25519Signer } from "@xian-tech/client";

const signer = new Ed25519Signer();
console.log(signer.privateKey);
console.log(signer.address);
```

Restore from an existing private key:

```ts
const signer = new Ed25519Signer("your_private_key_hex");
```

The signer exposes:

- `address`
- `privateKey`
- `getAddress()`
- `signMessage(message)`
- `verifyMessage(message, signature)`

For production browser wallet flows, prefer provider-backed signing rather than
raw private-key handling in the app itself.

## Constructing A Client

```ts
import { XianClient } from "@xian-tech/client";

const client = new XianClient({
  rpcUrl: "http://127.0.0.1:26657",
  dashboardUrl: "http://127.0.0.1:18080",
  chainId: "xian-local-1",
});
```

The stack-managed local templates publish the dashboard on host port `18080`.
If you run the dashboard process directly, its process default is `8080`.

Constructor fields:

- `rpcUrl`: required
- `dashboardUrl`: optional, but needed for websocket subscriptions
- `chainId`: optional; if omitted, the client fetches it from `/genesis`
- `fetchFn`: optional custom fetch implementation
- `webSocketFactory`: optional custom websocket factory
- `requestTimeoutMs`: optional default HTTP timeout; defaults to `30_000`

## Common Read Methods

### Chain And Node Reads

```ts
await client.getGenesis();
await client.getChainId();
await client.getStatus();
await client.getBlock(123);
await client.getTx("ABC123");
```

### Nonce And State Reads

```ts
await client.getNonce(address);
await client.getState("currency", "balances", [address]);
await client.getBalance(address);
await client.getTokenMetadata("currency");
await client.getTokenBalances(address, { limit: 100, includeZero: false });
await client.getChiRate();
await client.getContractSource("currency");
await client.getContractIr("currency");
await client.getContractMethods("currency");
await client.getShieldedWalletHistory(tagValue, { afterNoteIndex: 0 });
```

`getBalance(...)` first tries the readonly `balance_of` simulation path and
falls back to the direct state key if the simulation path fails.

`getTokenBalances(...)` and `getShieldedWalletHistory(...)` require the
BDS-backed ABCI query surface on the connected node.

### BDS Indexed Query Helpers

```ts
const status = await client.getBdsStatus();
const tx = await client.getIndexedTx("<tx_hash>");
const bySender = await client.listTxsBySender("<address>", { limit: 10 });
const byContract = await client.listTxsByContract("currency", { limit: 10 });
const events = await client.listEvents("currency", "Transfer", { limit: 10 });
const recent = await client.getRecentEvents({ limit: 10 });
const candles = await client.listDexCandles(7, { interval: "5m", limit: 100 });
const history = await client.getStateHistory("currency.balances:<address>", {
  limit: 10,
});
```

`XianIndexedTransaction.txHash` is the canonical transaction-hash property for
indexed transaction rows. `listDexCandles(...)` returns DEX OHLCV buckets from
the node's whitelisted candle sources. The default source is `xian_pairs_v1`,
derived from indexed `con_pairs.Swap` events, with price and volume values
preserved as strings. For the full BDS route map, see
[BDS Indexed Queries](/api/bds).

## Simulation And Estimation

Use readonly simulation before signing or sending:

```ts
const simulation = await client.simulate({
  sender: address,
  contract: "currency",
  function: "transfer",
  kwargs: { to: "bob", amount: "5" },
});
```

Estimate chi:

```ts
const estimate = await client.estimateChi({
  sender: address,
  contract: "currency",
  function: "transfer",
  kwargs: { to: "bob", amount: "5" },
});

console.log(estimate.estimated);
console.log(estimate.suggested);
```

The default policy adds proportional headroom plus a minimum floor,
matching the browser-first SDK design note for explicit but ergonomic tx
submission.

## Building, Signing, And Broadcasting Transactions

Build an unsigned tx:

```ts
const tx = await client.buildTx({
  sender: signer.address,
  contract: "currency",
  function: "transfer",
  kwargs: { to: "bob", amount: "5" },
  chi: 50_000,
});
```

Sign it:

```ts
const signedTx = await client.signTx(tx, signer);
```

Broadcast it:

```ts
const submission = await client.broadcastTx(signedTx, {
  mode: "checktx",
  waitForTx: true,
});
```

Supported broadcast modes:

- `"async"`
- `"checktx"`
- `"commit"`

Wait for a tx explicitly:

```ts
const receipt = await client.waitForTx("ABC123", {
  timeoutMs: 30_000,
  pollIntervalMs: 500,
});
```

## Contract Deployment

The current JS SDK has the same source/artifact split as `xian-py`:

- `deployContract` compiles source to deployment artifacts and submits them
- `submitContract` submits already-built deployment artifacts

Source compilation in JS is backed by the `@xian-tech/compiler` WASM package
or by an injected compiler implementation. If neither is available,
`deployContract` fails before broadcasting. This means JS can compile in the
current toolchain, but only through the Xian compiler artifact path.

Install the compiler package when you want source deployment from JS:

```bash
npm install @xian-tech/client @xian-tech/compiler
```

Deploy source:

```ts
const result = await client.deployContract({
  name: "con_counter",
  source,
  signer,
  args: {},
  chi: 500_000,
  mode: "checktx",
  waitForTx: true,
});
```

Submit prebuilt artifacts:

```ts
const result = await client.submitContract({
  name: "con_counter",
  deploymentArtifacts,
  signer,
  args: {},
  chi: 500_000,
  mode: "checktx",
  waitForTx: true,
});
```

`vmProfile` defaults to `xian_vm_v1` for `deployContract`. The node requires
`xian_contract_artifact_v1` deployment artifacts and rejects legacy
`runtime_code` or `runtime_code_sha256` payloads.

## Convenience Helpers

### Contract Helper

```ts
const currency = client.contract("currency");
await currency.call("balance_of", { address: signer.address }, signer.address);
```

Send through the contract helper:

```ts
await currency.send(
  "transfer",
  { to: "bob", amount: "5" },
  { signer, chi: 50_000, mode: "checktx" },
);
```

### Token Helper

```ts
const token = client.token("currency");
await token.metadata();
await token.balanceOf(signer.address);
await token.allowance(signer.address, "con_dex");
await token.transfer({
  signer,
  to: "bob",
  amount: "5",
  chi: 50_000,
});
await token.approve({
  signer,
  spender: "con_dex",
  amount: "100",
  chi: 50_000,
});
```

## Runtime Encoding Helpers

The client package also exposes deterministic runtime helpers that mirror the
Xian JSON encoding rules closely enough for JS-side tx construction:

```ts
import {
  canonicalizeRuntime,
  decodeRuntime,
  encodeRuntime,
  sortKeysDeep,
} from "@xian-tech/client";
```

These are useful when you need:

- canonical payload strings for signing
- stable sorted object encoding
- runtime wrapper handling for big integers and byte arrays

`decodeRuntime` preserves integer precision when reading runtime JSON. Safe
integer tokens decode to JavaScript `number`, while runtime big-integer wrappers
and plain integer tokens outside `Number.MAX_SAFE_INTEGER` decode to `bigint`.
Use `parseXianNumber` or `normalizeMaybeXianNumber` for values that may cross
the safe integer boundary; use `normalizeMaybeInteger` only when the caller
requires a safe JavaScript integer.

## Websocket Subscriptions

Dashboard websocket support lives under `client.watch`.

Watch blocks:

```ts
const sub = client.watch.blocks((message) => {
  console.log(message.height, message.hash);
});
```

Watch a state key:

```ts
const sub = client.watch.state(
  `currency.balances:${signer.address}`,
  (message) => {
    console.log(message.key, message.value);
  },
  {
    onError(error) {
      console.error("watch error", error);
    },
  },
);
```

Watch contract events:

```ts
const sub = client.watch.events(
  { contract: "currency", event: "Transfer" },
  (message) => {
    console.log(message.event, message.data);
  },
);
```

Unsubscribe explicitly:

```ts
await sub.unsubscribe();
```

`dashboardUrl` must be configured on the client for websocket usage. Pass the
dashboard base URL; `client.watch` appends `/ws` and derives the websocket
protocol from it (`http` -> `ws`, `https` -> `wss`, while `ws` and `wss` stay
websocket URLs).
Malformed websocket payloads and async listener failures are surfaced through
that optional `onError` callback instead of becoming unhandled promise
rejections.

## Shielded Relayer Clients

Use the relayer clients for proof-bound shielded submissions instead of
hand-rolling HTTP calls:

```ts
import { XianShieldedRelayerClient } from "@xian-tech/client";

const relayer = new XianShieldedRelayerClient({
  relayerUrl: "http://127.0.0.1:8090",
  authToken: "local-dev-token",
});

const info = await relayer.getInfo();
const quote = await relayer.getQuote({
  kind: "shielded_note_relay_transfer",
  contract: "con_private_usd",
});
```

`XianShieldedRelayerPoolClient` accepts an ordered relayer catalog and follows
the same route semantics as `xian-py`: info and quote calls can fail over, while
submissions and job lookup stay routed to the relayer selected by the proof.

## Provider Contract

`@xian-tech/provider` defines a simple request-driven provider shape:

```ts
interface XianProvider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  removeListener(event: string, listener: (...args: unknown[]) => void): void;
}
```

The in-memory provider is a reference implementation for:

- tests
- demos
- local browser examples

It is not a replacement for a production injected or hosted wallet.

`WalletConnectXianProvider` is the provider-side bridge for WalletConnect
sessions. It wraps a WalletConnect request client, session topic, active chain,
and approved accounts. Xian WalletConnect chains use the `xian:<chainId>` CAIP-2
shape, and accounts use `xian:<chainId>:<address>` CAIP-10 values.

Only the methods listed in `XIAN_WALLETCONNECT_METHODS` are sent to the remote
wallet. Local session reads such as `xian_getWalletInfo`, `xian_accounts`, and
`xian_chainId` are served from session state. `xian_switchChain` is rejected by
the bridge because a WalletConnect session cannot switch to an unapproved chain.

The provider package also exports dapp policy helpers:

- `parseXianDappAction`
- `createXianDappPolicyForRequest`
- `evaluateXianDappPolicy`
- `findMatchingXianDappPolicy`

They cover scoped auto-approval checks for `xian_signTransaction`,
`xian_sendTransaction`, and `xian_sendCall`, including origin, account, chain,
contract, function, chi limit, and optional kwargs matching.

## Injected Wallet Contract

`@xian-tech/provider` includes the initial injected-wallet convention for Xian.

Wallets register into:

- `window.xian`: namespace for the default injected provider
- `window.xianProviders`: array of all discovered injected providers

Wallet registration dispatches the `xian#initialized` browser event so dapps can
wait for late-loading providers.

### Wallet-Side Injection

```ts
import { registerInjectedXianProvider } from "@xian-tech/provider";

registerInjectedXianProvider({
  provider,
  metadata: {
    id: "xian-wallet",
    name: "Xian Wallet",
    rdns: "org.xian.wallet",
  },
  setAsDefault: true,
});
```

Each registered wallet carries metadata:

- `id`: stable wallet identifier
- `name`: display name for wallet pickers
- `icon`: optional icon URL
- `rdns`: optional reverse-DNS identifier

### Dapp-Side Discovery

Resolve the default injected wallet:

```ts
import { InjectedXianWallet } from "@xian-tech/provider";

const wallet = InjectedXianWallet.getInjected();
```

Wait for a late-loading wallet:

```ts
const wallet = await InjectedXianWallet.waitForInjected({
  timeoutMs: 1_000,
});
```

List all discovered wallets:

```ts
import { listInjectedXianProviders } from "@xian-tech/provider";

const wallets = listInjectedXianProviders();
```

Resolve a specific wallet by id:

```ts
import { getInjectedXianProvider } from "@xian-tech/provider";

const record = getInjectedXianProvider({ id: "xian-wallet" });
```

### Dapp-Side Wallet Wrapper

`InjectedXianWallet` exposes a higher-level surface around a raw provider:

```ts
const wallet = await InjectedXianWallet.waitForInjected({
  timeoutMs: 1_000,
});

const accounts = await wallet?.connect();
const info = await wallet?.getWalletInfo();
const chainId = await wallet?.getChainId();
const accepted = await wallet?.watchAsset({
  type: "token",
  options: { contract: "currency", symbol: "XIAN", name: "Xian" },
});
const signature = await wallet?.signMessage("hello from xian-js");
const tx = await wallet?.prepareTransaction({
  contract: "currency",
  function: "transfer",
  kwargs: { to: "bob", amount: "5" },
});
const signedTx = await wallet?.signTransaction(tx);
const submission = await wallet?.sendTransaction(tx, {
  mode: "checktx",
  waitForTx: true,
});
const quickSubmission = await wallet?.sendCall(
  {
    contract: "currency",
    function: "transfer",
    kwargs: { to: "bob", amount: "5" },
  },
  { mode: "checktx", waitForTx: true },
);
```

It also forwards provider events:

```ts
wallet?.on("accountsChanged", (accounts) => {
  console.log(accounts);
});
```

### Provider-Backed Signer Adapter

When another helper only needs `getAddress()` and `signMessage()`, wrap the
wallet as a signer:

```ts
const signer = wallet?.asSigner();
const address = await signer?.getAddress();
const signature = await signer?.signMessage("hello");
```

That lets dapp code keep provider-backed signing without storing raw private
keys in the app.

### Recommended Transaction Model

For real browser wallets, prefer the intent-based path over prebuilding every
payload in the dapp:

- `prepareTransaction(...)` lets the wallet fill sender, active chain, nonce,
  and default chi
- `sendCall(...)` lets the wallet do prepare + sign + broadcast in one request

That avoids stale nonces and wrong-account or wrong-chain mismatches better
than forcing every dapp to build the full unsigned tx upfront.

Chain checks also apply when a dapp passes a prebuilt transaction to
`xian_signTransaction` or `xian_sendTransaction`: the transaction payload must
include `chain_id`, and that chain id must match the wallet's active
`xian_chainId` before the wallet signs or broadcasts it.

Wallet implementations that use `@xian-tech/provider` trusted-dapp policies
should treat saved transaction permissions as exact-argument rules by default.
An exact rule binds the request method, account, chain, contract, function,
kwargs, and chi cap. Broad auto-approval is represented as an explicit
`argumentScope: "any"` policy and should be shown as a separate higher-risk
permission in wallet UI.

## In-Memory Provider Example

```ts
import { Ed25519Signer, XianClient } from "@xian-tech/client";
import { InMemoryXianProvider } from "@xian-tech/provider";

const signer = new Ed25519Signer();
const client = new XianClient({
  rpcUrl: "http://127.0.0.1:26657",
  dashboardUrl: "http://127.0.0.1:18080",
});
const provider = new InMemoryXianProvider({ signer, client });
```

Connect:

```ts
await provider.request({ method: "xian_requestAccounts" });
```

Read accounts and chain:

```ts
await provider.request({ method: "xian_getWalletInfo" });
await provider.request({ method: "xian_accounts" });
await provider.request({ method: "xian_chainId" });
```

Watch an asset:

```ts
await provider.request({
  method: "xian_watchAsset",
  params: [{ type: "token", options: { contract: "currency", symbol: "XIAN" } }],
});
```

Prepare a transaction inside the wallet:

```ts
const tx = await provider.request({
  method: "xian_prepareTransaction",
  params: [
    {
      intent: {
        contract: "currency",
        function: "transfer",
        kwargs: { to: "bob", amount: "5" },
      },
    },
  ],
});
```

Sign a message:

```ts
await provider.request({
  method: "xian_signMessage",
  params: [{ message: "hello from xian-js" }],
});
```

Sign a transaction:

```ts
await provider.request({
  method: "xian_signTransaction",
  params: [{ tx }],
});
```

Send a transaction:

```ts
await provider.request({
  method: "xian_sendTransaction",
  params: [{ tx, mode: "checktx" }],
});
```

Send a contract call without prebuilding the tx:

```ts
await provider.request({
  method: "xian_sendCall",
  params: [
    {
      intent: {
        contract: "currency",
        function: "transfer",
        kwargs: { to: "bob", amount: "5" },
      },
      mode: "checktx",
      waitForTx: true,
    },
  ],
});
```

## Provider Events

The provider emits:

- `connect`
- `disconnect`
- `accountsChanged`
- `chainChanged`

Example:

```ts
provider.on("accountsChanged", (accounts) => {
  console.log(accounts);
});
```

## Example App

The `xian-js` repo includes a runnable example app under:

- `examples/browser-dapp/`

That example demonstrates:

- client setup
- dev-signer generation or restore
- provider connection
- provider wallet-info reads
- chain id, nonce, and balance reads
- provider-managed tx preparation
- tx build / sign / send flows
- quick intent-based send flows
- block and balance subscriptions
- injecting the demo wallet into `window`
- rediscovering and using the injected-wallet path

Run it from the `xian-js` repo:

```bash
npm install
npm run build
npm run dev --workspace example-browser-dapp
```

For the walkthrough of the maintained browser playground itself, see
[xian-js Playground](/tools/playground).

## Browser Wallet Companion Repo

The concrete browser wallet implementation lives in the sibling
`xian-wallet-browser` repo.

That repo owns:

- `@xian-tech/wallet-core` for wallet-domain logic
- `apps/wallet-extension/` for the MV3 extension wallet

During local development, `xian-wallet-browser` consumes `@xian-tech/client` and
`@xian-tech/provider` from the `xian-js` checkout.

See [xian-wallet-browser](/tools/xian-wallet-browser) for the wallet
scope, build flow, and extension loading steps.

## Validation

From the `xian-js` repo root:

```bash
npm install
npm run validate
```

## Related Docs

- [REST API](/api/rest)
- [WebSocket Subscriptions](/api/websockets)
- [Estimating Chi](/api/dry-runs)
- [xian-py](/tools/xian-py)
- [xian-wallet-browser](/tools/xian-wallet-browser)
- [xian-js Playground](/tools/playground)
