# Xian Mobile Wallet

`xian-wallet-mobile` is an Expo/React Native self-custody wallet for Android
and iOS. It signs Ed25519 transactions on-device and uses the Xian TypeScript
client for node access.

## Install or Build

Android release APKs are published on the
[GitHub releases page](https://github.com/xian-technology/xian-wallet-mobile/releases).
Verify the release source before installing and importing a funded account.

For local development, build the sibling SDK first:

```bash
cd ../xian-js
npm install
npm run build

cd ../xian-wallet-mobile
npm install
npm run start
npm run android   # connected device or emulator
npm run ios       # macOS with Xcode
```

Use Java 17 and an Android SDK for Android builds. iOS builds require macOS,
Xcode, and an installed simulator runtime.

## Wallet Workflows

- create or restore a mnemonic-backed wallet
- import a single private-key account
- lock and unlock with a password and optional biometrics
- derive multiple mnemonic accounts
- receive and send tokens
- inspect balances and indexed activity
- trade through the configured DEX contracts
- manage network presets
- call contract methods through the advanced transaction screen
- connect WalletConnect dapps with explicit per-session scopes
- export and import encrypted wallet backups

The browser and mobile wallets use compatible mnemonic derivation. Backups are
encrypted and re-encrypted for local storage on import.

## Connect to a Local Node

`127.0.0.1` on a physical phone refers to the phone. Use an address reachable
from the device:

| Environment | Typical node host |
| --- | --- |
| iOS simulator | `127.0.0.1` |
| Android emulator | `10.0.2.2` |
| physical device | development machine's LAN address |

Start the node, inspect its endpoints, and configure matching RPC, dashboard,
and chain-ID values in the wallet:

```bash
cd ../xian-stack
python3 ./scripts/backend.py start --no-bds-enabled --dashboard
python3 ./scripts/backend.py endpoints --no-bds-enabled --dashboard
```

Plain HTTP to a non-loopback host requires an explicit preset opt-in. Use it
only on a trusted local/private network; prefer HTTPS elsewhere.

## Security Model

- mnemonics and private keys are encrypted before persistent storage
- unlocked secret material exists only in process memory
- the secure-store session record contains wrapped session data, not raw keys
- invalid session records fail closed to the locked state
- WalletConnect approves required Xian scopes only and rechecks chain, method,
  and account on every request
- external message signatures use a chain- and account-bound envelope

Record the recovery phrase offline. A device backup is not a substitute for
seed recovery material.

## Validate a Checkout

```bash
npm run typecheck
npm run test
```

Exercise security-sensitive flows on a device or emulator before shipping a
build.

## Related Pages

- [Browser Wallet](/tools/xian-wallet-browser)
- [xian-js](/tools/xian-js)
- [Source repository](https://github.com/xian-technology/xian-wallet-mobile)
