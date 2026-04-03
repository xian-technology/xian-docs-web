# Xian Wallet — Mobile (Android)

The Xian mobile wallet is a React Native (Expo) app for self-custody of Xian tokens on Android. It shares the same key derivation and encryption scheme as the browser wallet, so seeds and backups are compatible.

**Repository:** [xian-technology/xian-wallet-mobile](https://github.com/xian-technology/xian-wallet-mobile)

## Installation

### From GitHub Release

1. Download the latest `xian-wallet-mobile-vX.Y.Z.apk` from [Releases](https://github.com/xian-technology/xian-wallet-mobile/releases)
2. On your Android device, enable **Install from unknown sources** (Settings > Security)
3. Open the downloaded APK to install

### Build From Source

#### Prerequisites

- Node.js 18+
- npm 9+
- Java 17 (OpenJDK)
- Android SDK (API 34+, build-tools 34.0.0+, NDK 27+)
- A physical Android device or emulator

#### Environment

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS
export JAVA_HOME=$(/usr/libexec/java_home)      # macOS
# Linux: adjust paths accordingly
```

#### Development Build

```bash
cd xian-wallet-mobile
npm install

# Generate the native Android project
npx expo prebuild --platform android

# Build and install on connected device
npx expo run:android
```

The first build compiles all native modules (C++, Kotlin) and takes several minutes. Subsequent builds are incremental.

For development with hot reload:

```bash
# In one terminal — start Metro bundler
npx expo start --dev-client

# In another terminal — set up USB port forwarding
adb reverse tcp:8081 tcp:8081
```

#### Release APK

```bash
# Generate signing key (one-time)
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias xian-wallet \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <password> -keypass <password>

# Configure signing in android/app/build.gradle:
# signingConfigs { release { storeFile, storePassword, keyAlias, keyPassword } }

# Build release APK
cd android
./gradlew app:assembleRelease

# Output at:
# android/app/build/outputs/apk/release/app-release.apk
```

## Architecture

```
xian-wallet-mobile/
  src/
    lib/
      crypto-polyfill.ts   # Self-contained SHA-256, PBKDF2, AES-GCM
      wallet-controller.ts  # Portable business logic
      wallet-context.tsx    # React context for state management
      rpc-client.ts         # Xian node RPC communication
      storage.ts            # AsyncStorage + SecureStore adapter
      haptics.ts            # Haptic feedback utility
      preferences.ts        # User preferences (layout, labels)
    screens/
      SetupScreen.tsx       # Create / import wallet
      LockScreen.tsx        # Password unlock
      HomeScreen.tsx        # Balances, assets, quick actions
      SendScreen.tsx        # Simple token transfer
      AdvancedTxScreen.tsx  # Contract call builder
      ReceiveScreen.tsx     # QR code + address
      ActivityScreen.tsx    # Transaction history
      TokenDetailScreen.tsx # Asset details + decimals
      SettingsScreen.tsx    # Accounts, networks, security, backup
      NetworksScreen.tsx    # Network CRUD
      AppsScreen.tsx        # Connected apps (placeholder)
    components/
      Button.tsx            # Styled button variants
      Input.tsx             # Styled text input
      Card.tsx              # Card container
      Toast.tsx             # Notification overlay
      SwipeableRow.tsx      # Swipe-to-act on token rows
      DraggableList.tsx     # Drag-to-reorder in manage mode
      NetworkBadge.tsx      # Connection status indicator
    theme/
      colors.ts             # Color palette
      typography.ts         # Text styles
```

### Crypto Layer

The mobile wallet cannot use the Web Crypto API directly. Instead it uses a self-contained crypto polyfill:

| Primitive | Implementation |
|-----------|---------------|
| SHA-256 | Pure JS (FIPS 180-4), used for key derivation |
| HMAC-SHA256 | Built on native SHA-256 via `expo-crypto` for PBKDF2 loop performance |
| PBKDF2 | 10,000 iterations (lower than browser's 250k due to JS-native bridge overhead) |
| AES-256-GCM | Pure JS with lookup-table AES block cipher + GF(2^128) GHASH |
| Ed25519 | `tweetnacl` (pure JS) |
| BIP39 | `@scure/bip39` (pure JS) |
| Random | `react-native-get-random-values` (native RNG) |

**Key derivation is identical** to the browser wallet: `SHA256(bip39_seed + "xian-wallet-seed-v1" + index)`. Seeds are interchangeable between browser and mobile wallets.

**Note:** PBKDF2 uses 10,000 iterations on mobile vs 250,000 on browser. This means encrypted backups are NOT directly interchangeable — export/import uses the raw seed/key, not the encrypted form.

### Storage

| Data | Backend | Purpose |
|------|---------|---------|
| Wallet state | `AsyncStorage` | Encrypted keys, accounts, presets, assets |
| Unlocked session | `expo-secure-store` | Private key, mnemonic, password (memory-only on device) |
| Contacts | `AsyncStorage` | Saved recipient addresses |
| Preferences | `AsyncStorage` | Layout, label visibility |

### RPC Client

Direct communication with Xian nodes via HTTP:

- `getBalance` — `/get/{contract}.balances:{address}` ABCI query
- `getChainId` — `/status` endpoint
- `estimateStamps` — `/simulate` ABCI query
- `sendTransaction` — builds, signs (Ed25519), broadcasts via `broadcast_tx_sync`
- `getTransactionHistory` — `/txs_by_sender/{address}` ABCI query
- `waitForTx` — polls `/tx?hash=` until finalized

## Features

### Wallet Management

- **Create** — generates 12-word BIP39 seed, shows it for backup
- **Import from seed** — 12 or 24-word phrase
- **Import from private key** — single-account, no multi-account
- **Lock / unlock** — password-based, 5-minute session
- **Remove wallet** — with native alert confirmation

### Multi-Account

Same as browser wallet:
- Add (instant, no password prompt while unlocked)
- Switch, rename (inline with check/x icons), remove
- Duplicate names rejected (case-insensitive)

### Sending Tokens

**Simple send:**
- Token selector — bottom sheet picker with icon, symbol, name
- Recipient — inline contacts icon button, opens contact picker modal
- Amount — inline MAX badge
- Stamp estimation before review
- Result with TX hash + explorer link

**Advanced transaction:**
- Contract input — auto-loads available functions as scrollable chips
- Function selection — auto-populates typed arguments
- Manual or auto stamp estimation

### Gestures

- **Swipe left** on a token — opens Send with that token pre-selected
- **Swipe right** on a token — hides it from the list
- **Long-press** a token — enters manage mode
- **Pull down** — refresh balances
- **Drag** (in manage mode) — reorder tokens by grabbing the handle

### Activity

Transaction history with:
- Direction indicators (incoming green / outgoing red)
- Success/fail badges
- Tap for detail view with explorer link
- Pull-to-refresh

### Settings

- **Accounts** — add, switch, rename (inline), remove
- **Networks** — full CRUD, tap to switch, long-press to edit
- **Security** — reveal seed/key (tap to copy), hide
- **Contacts** — add, delete
- **Appearance** — quick actions position (top/bottom), hide labels
- **Backup** — export via Share sheet, import
- **Explorer** — open in browser
- **Lock / Remove** wallet

### UI

- **Dark theme** matching the browser wallet
- **Feather icons** throughout
- **Haptic feedback** on buttons, tab switches, gestures
- **Toast notifications** — opaque, auto-dismiss
- **Network badge** — top-right, auto-checks every 30s, tap to refresh
- **Xian logo** on setup, lock, loading screens, and app icon

## Navigation

Bottom tab bar with four tabs:

| Tab | Screen | Purpose |
|-----|--------|---------|
| Home | HomeScreen | Balances, quick actions, asset list |
| Activity | ActivityScreen | Transaction history |
| Apps | AppsScreen | Connected dApps (placeholder) |
| Settings | SettingsScreen | All wallet configuration |

Stack screens: Send, Receive, TokenDetail, Networks, AdvancedTx.

## Compatibility

- **Android** — API 24+ (Android 7.0+)
- **iOS** — technically possible with `npx expo run:ios` but not yet tested or released
- **Seed compatibility** — same derivation as browser wallet, seeds work in both
- **Backup compatibility** — JSON format is the same, but re-encrypted with device-specific PBKDF2 iteration count
