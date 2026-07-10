# Xian Browser Wallet

`xian-wallet-browser` is the self-custody Manifest V3 wallet for Chromium-based
browsers. It stores keys locally and exposes the Xian provider contract to
dapps.

## Install a Release

1. Download `xian-wallet-extension-X.Y.Z.zip` from the
   [GitHub releases page](https://github.com/xian-technology/xian-wallet-browser/releases).
2. Extract it.
3. Open `chrome://extensions`, enable **Developer mode**, and choose
   **Load unpacked**.
4. Select the extracted directory that contains `manifest.json`.

Verify release provenance before importing a funded account.

## Initial Setup

The wallet can:

- create a mnemonic-backed wallet
- restore a 12- or 24-word mnemonic
- import a single 32-byte private-key seed

Set a wallet password, record the recovery phrase offline, and verify the
active network before receiving or sending funds. The built-in local preset
targets loopback endpoints; add an explicit preset for any other network.

Remote plaintext HTTP endpoints require a per-preset opt-in. Prefer HTTPS for
anything outside a trusted local or private environment.

## Main Workflows

- create, restore, lock, and unlock wallets
- derive multiple accounts from a mnemonic
- send tokens and review indexed activity
- manage assets, contacts, and network presets
- connect dapps and approve connection, signing, and transaction requests
- switch configured networks after explicit approval
- export and restore encrypted backups
- keep shielded wallet snapshots with wallet backups

Approval requests are bound to the displayed account, chain ID, network
preset, and RPC endpoint. If that context changes before approval, the wallet
rejects the request.

Temporary auto-approval rules can be scoped to a site, account, network,
method, contract, function, and exact arguments. Broad function rules allow
arguments to change and therefore require separate confirmation. Review and
revoke saved rules from the connected-apps view.

## Dapp Integration

Dapps should use `@xian-tech/provider` rather than depending on extension
internals:

```ts
import { InjectedXianWallet } from "@xian-tech/provider";

const wallet = await InjectedXianWallet.waitForInjected({ timeoutMs: 1_000 });
const accounts = wallet ? await wallet.connect() : [];
```

The provider supports account discovery, prepared and intent-based
transactions, chain switching, watched assets, message signing, and provider
events.

## Build From Source

The wallet consumes a sibling `xian-js` checkout:

```bash
cd ../xian-js
npm install
npm run build

cd ../xian-wallet-browser
npm install
npm run validate
npm run build --workspace xian-wallet-extension
```

Load `apps/wallet-extension/dist/` as an unpacked extension.

## Security Boundaries

- seed phrases and private keys should never leave the wallet approval flow
- dapps receive accounts and approved signatures, not raw secrets
- network and account changes invalidate mismatched pending approvals
- use a separate low-value account when testing untrusted dapps

## Related Pages

- [xian-js](/tools/xian-js)
- [Mobile Wallet](/tools/xian-wallet-mobile)
- [Source repository](https://github.com/xian-technology/xian-wallet-browser)
