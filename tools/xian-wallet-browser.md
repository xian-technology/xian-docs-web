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

## Password Protection and Recovery

Local vaults and encrypted backup exports use AES-256-GCM with salted
PBKDF2-HMAC-SHA256 at 600,000 iterations. Imports accept work factors from
250,000 through 2,000,000 and reject invalid salt or nonce sizes before deriving
a key. Use a strong, unique wallet password.

Password unlock can read 250,000-iteration vaults and re-encrypts them at the
current work factor. Exported files retain their original parameters until a
new backup is exported. Use a strong, unique password and a compatible wallet
build to import encrypted backups.

## Related Pages

- [xian-js](/tools/xian-js)
- [Mobile Wallet](/tools/xian-wallet-mobile)
- [Source repository](https://github.com/xian-technology/xian-wallet-browser)

## Interrupted approvals

An approval can execute once. Overlapping approve, reject, and dismiss requests
share an execution claim. The extension stores that claim before execution and
stores the signed transaction identity before broadcast.

After an interrupted execution, the same request is not signed again. A
`SubmissionInterruptedError` reports the known `txHash`, when available, and
`submissionMayHaveOccurred` in its error data. Check that transaction before
starting a replacement request. An interruption is not evidence that a transfer
failed. Wallet integrations using a custom persistent store should implement
`claimApprovalExecution` atomically and use one controller authority for that
store.

## Hybrid Accounts

**Settings → Hybrid account security** supports enrollment, key replacement,
restore and recovery. Each transition requires saving and reopening one master
backup. Password encryption of that backup is optional; a plaintext backup is
itself the secret. Ordinary signing uses the wallet's locally encrypted active
credentials after unlock, without asking for the master on each transaction.

The account address stays the same. Enrollment is disabled in the checked-in
node policies. Existing enrolled accounts use their current registry keys.
See [Account Backups and Recovery](/concepts/hybrid-account-recovery).

External Ed25519 message signing is unavailable for enrolled accounts. Dapps
must not use the original public key as a substitute for current account authority.

## HD accounts and backup scope

Mnemonic wallets derive multiple indexed accounts. Browser and mobile wallets
use the same derivation as Python's `Wallet.from_mnemonic(phrase, account_index=n)`.
The phrase and account index restore the original address.

Hybrid authorization uses an independently generated master for each account
and chain. Keep that account's verified master backup after enrollment; the
original mnemonic does not recreate its active or recovery keys. Key replacement
creates a new master backup while preserving the address and balances. An
encrypted full-wallet export holds everyday credentials and settings, but does
not replace the offline master backup.
