# xian-js

`xian-js` is the TypeScript SDK workspace for browsers, wallets, dapps, and
Node.js applications.

## Packages

| Package | Purpose |
| --- | --- |
| `@xian-tech/client` | typed RPC client, transaction builder, signer, watchers, indexed reads |
| `@xian-tech/dex` | protocol-neutral routing, constant-product math, and named DEX execution adapters |
| `@xian-tech/provider` | wallet provider contract, injected-wallet discovery, WalletConnect adapter |
| `@xian-tech/types` | shared public types |
| `@xian-tech/web-kit` | wallet, RPC, formatting, toast, and React helpers |

The source revision below defaults to V2 and includes the DEX adapter. From the directory containing the [V2 compiler checkout](/getting-started/dev-environment#contract-only-setup), build the matching SDK. Building the optional WASM compiler also requires `wasm-pack` and the `wasm32-unknown-unknown` Rust target.

```bash
git clone https://github.com/xian-technology/xian-js.git
cd xian-js
git checkout --detach 088d786c3f98dbd52ed50db29f279ef935614e95
npm ci
npm run build:compiler
npm run build
```

The examples use the pinned workspace build. Check the release notes of any registry version you install for its default profile.

## DEX Planning

Use `@xian-tech/dex` when an app or agent needs the same exact-input route and
transaction planning as SnakX without coupling that logic to a wallet or RPC
transport:

```ts
import {
  deadlineFromNow,
  planXianDexV2ExactInExecution,
  selectBestXianDexV2ExactInRoute,
} from "@xian-tech/dex";

const quote = selectBestXianDexV2ExactInRoute({
  pairs,
  fromToken: "currency",
  toToken: "con_usdc",
  amountIn: "10",
  feeBps: 30,
});
if (!quote) throw new Error("No route");

const plan = planXianDexV2ExactInExecution({
  quote,
  recipient: agentAddress,
  allowance,
  slippageBps: 50,
  deadline: deadlineFromNow(15),
  feeOnTransferTokens,
});
```

Supply current typed pair reserves from your own reader, then submit
`plan.calls` in order through your own signer or injected-wallet adapter. The
planner deterministically enumerates routes, calculates price impact and the
minimum output, adds an approval only when allowance is insufficient, selects
the supporting fee-on-transfer entrypoint for flagged source/destination
tokens, and rejects flagged intermediate tokens.

Supply reserve balances, allowance and input amounts as exact strings. Fill each pair's `precision0` and `precision1` from token metadata where declared. The V2 adapter applies the router's settlement precision. The V1 adapter remains available for earlier integration fixtures. Other DEXes
can use `selectBestExactInRoute` with their own pool/quote adapter and the
generic execution planner with their own approval and swap-call builders.

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

`requestTimeoutMs` bounds the full HTTP request, including reading the JSON
response body, for RPC and shielded-relayer clients. A caller's abort signal
cancels the same operation. The web-kit RPC store also supports session-only
endpoint selection when persistent storage is not configured.

`verifyMessage` and `verifyXianMessage` reject small-order keys and signature
points, invalid point encodings, and noncanonical signature scalars. Verification
uses the exact message bytes; do not trim or otherwise rewrite signed text.
Key and signature length checks alone do not establish a valid signature.

## Exact numeric arguments

The default client uses `xian_vm_v2`. To reproduce a V1 fixture, pass `vmProfile: "xian_vm_v1"` when constructing `XianClient`. Pass a safe integer or `bigint` for an integer, and `fixed("1.000000000000000000000000000001")` from `@xian-tech/client` for a decimal. Token helpers also accept decimal strings. For a generic contract call a plain string stays a string. The client decodes decimal results to canonical strings and wide integers to `bigint`.

```ts
import { fixed, parseContractJson } from "@xian-tech/client";

const amount = fixed("1.000000000000000000000000000001");
const kwargs = parseContractJson('{"shares":9007199254740993,"price":1.25}');
```

`parseContractJson` preserves the original JSON digits while creating typed argument values suitable for simulation and wallet signing.

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

Indexed event `dataIndexed` and `data` are separate records: identifiers such as
NFT token IDs can be in `dataIndexed`, while values such as prices can be in
`data`. Both fields, and indexed transaction `payload`, accept the node's JSON
text or object representation and preserve large integers. Malformed or
non-object columns become `null`; `raw` retains the original row.
`getRecentEvents()` distinguishes an unavailable index (`available: false`)
from an available index with no events (`available: true`, empty `items`).

For chain dates, `maybeDate` from `@xian-tech/web-kit` treats offset-free
contract timestamps as UTC, honors explicit offsets, and truncates microsecond
fractions to milliseconds.

Automatic send helpers reserve nonces per client, chain, and sender. An
ambiguous broadcast can quarantine that sender until the caller reconciles the
network state; handle `NonceReservationError` rather than forcing nonce reuse.
An `async` acknowledgment without CheckTx or finalization evidence also leaves
the nonce unresolved. Automatic sends resume when the network nonce advances;
an acknowledgment alone does not confirm admission.

## Broadcast Modes

- `async`: return after broadcast
- `checktx`: wait for mempool validation
- `commit`: wait through the RPC commit response

Use `waitForTx: true` when the application needs a finalized receipt.

## Transaction encoding

Use the SDK's transaction builder and signer together so signing and broadcast
use identical canonical bytes. Nested object keys are serialized in Unicode
code-point order, including numeric-looking keys. Own keys are preserved as data.
Use `bigint` for integers outside JavaScript's safe integer range; the SDK encodes
runtime wrappers recursively through nested arrays and objects.

## Related Pages

- [Browser Wallet](/tools/xian-wallet-browser)
- [WebSocket Subscriptions](/api/websockets)
- [BDS Indexed Queries](/api/bds)
- [Source repository](https://github.com/xian-technology/xian-js)

## Persisting transaction identity before submission

`prepareTransaction(signedTransaction)` returns immutable `json`, `rpcHex`, and
`txHash` strings. The hash identifies the exact ASCII hex bytes submitted to
CometBFT, which are also the base64-decoded bytes returned in a block.

Pass an asynchronous `onPreparedTransaction` callback to `client.sendTx()` to
persist these values before broadcast. The client awaits the callback. If
persistence fails, it does not broadcast and releases an automatic nonce
reservation. Store signed bytes in application-controlled storage and reconcile
by hash after a restart before creating another transaction.
