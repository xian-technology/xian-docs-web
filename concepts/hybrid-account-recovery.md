# Hybrid Account Backups and Recovery

Hybrid accounts require Ed25519 and ML-DSA-65 signatures. The JavaScript SDK,
Python SDK, browser wallet and mobile wallet support enrollment, signing,
rotation and recovery through the node account registry. Enrollment is disabled
in the default network bundles and requires an explicit open registry policy.

Use a node that supports the account-registry query format. A missing or malformed
response blocks signing; it is not permission to use an original Ed25519 key.

## Account identity

Enrollment, key replacement and recovery keep the original address exactly,
including letter case. Existing native and token balances, allowances, contract
ownership and nonce history stay under that address. There is no funds transfer
as part of the migration. A network can charge its configured transition fee.

An unenrolled account still works with its existing seed or private key. Once
enrollment commits, that old seed alone **cannot spend or recover the upgraded
account**. The signing and recovery keys are derived from a fresh master secret and
cannot be derived from the old seed. One saved master backup restores both roles.

## Address format and identifying account protection

An ordinary account address remains a 32-byte Ed25519 public key represented by
64 hexadecimal characters, usually lowercase `0-9` and `a-f`. Existing account
identifiers retain their exact letter case. Contract-held balance keys can use
contract names instead of this account-address format.

Importing an Ed25519 seed derives its public key. Neither the seed nor the
address includes an authorization-version prefix. Creating a wallet does not
automatically enroll its accounts.

Hybrid enrollment creates an active pair and a separate recovery pair, each
containing Ed25519 and ML-DSA-65 keys. The chain registers these pairs against the
original address. Deriving the active pair's Ed25519 public key does **not**
reconstruct that original address. The master backup includes the
original sender, chain, epoch and public account record, plus one private master
seed. The software derives both key components and both roles from that seed.

To determine the authorization in force, query `_accounts.records:<address>` on
the intended chain through a trusted, current RPC:

| Committed result | Meaning |
| --- | --- |
| Explicitly absent record | The account uses its original Ed25519 authorization. |
| Valid version-1 record | The account requires its current hybrid active keys; the record identifies the active/recovery public keys and epoch. |
| Error, missing wire response or malformed record | Status is unknown; do not treat this as permission to use an old key. |

Neither the address nor a bare 64-character private seed tells you which wallet
version generated it, whether its randomness was sound, or whether the account
is enrolled. The Ed25519 component of a hybrid backup also has that same seed
format, but cannot authorize hybrid spending by itself. Backup metadata is not
proof of activation: validate the key pairs and compare the backup against the
committed registry on its bound chain. Never paste private keys into an explorer
or RPC to check account status; only the public address is needed.

## Moving to a new chain

A fresh chain needs its own reviewed genesis allocation; account enrollment does
not copy funds or contract state from another chain. If a balance is allocated
to the same original account address, its existing key can control that account
while it remains unenrolled. Enrollment then requires one verified new master
backup on the new chain. Backups and signed transitions are bound to
their chain and must not be reused as credentials for a different network.

Contract-held balances require explicit ownership and custody mappings in the
allocation. Copying a contract name alone does not establish who can withdraw
its funds. See [Balance Import](/node/balance-migration).

## HD accounts and backup scope

Browser and mobile wallets derive indexed accounts from a BIP39 English mnemonic.
The Python SDK's `Wallet.from_mnemonic(phrase, account_index=...)` uses the same
`xian-wallet-seed-v2` derivation. This derives the original Ed25519 accounts; each
account has its own address and registry status.

An enrolled account's master is generated independently of that mnemonic. The
mnemonic can reconstruct the original address, but it cannot reconstruct the
hybrid signing or recovery keys. Keep one current master backup for each enrolled
account and chain. A master for one account does not restore other HD accounts.

Python's `HDWallet.get_wallet(path)` is a separate SLIP-0010 derivation API.
Its paths are not interchangeable with the indexed browser/mobile derivation.

## Enroll or replace keys

In either wallet, open **Settings → Hybrid account security** on the intended
network. Use a trusted RPC for that chain; these wallets query the registry and
do not independently verify a light-client proof of its state.

1. Prepare enrollment, key replacement or recovery on the intended chain.
2. Choose **Save master backup**. This one file contains the secret needed for
   spending and recovery, together with the public address and chain information.
   No backup password is required. Optional password encryption requires at least
   12 characters; if used, you must also preserve that password.
3. Save the file offline. An unencrypted master backup gives anyone who obtains
   it control of the account. Reopen the saved file using the wallet's file picker
   and choose **Verify master backup**. The wallet derives the keys and checks the
   complete draft binding. A checkbox does not satisfy this step.
4. Submit the verified transition. Check the committed account afterwards.
   Mempool acceptance is not activation. Avoid sending more transactions from
   this account until the transition has committed.

The everyday wallet retains only derived active credentials. It does not persist
master or recovery secrets in the account vault, session or full wallet export.
For everyday payments, unlock the wallet with its password and approve the
transaction. The wallet uses the stored signing credentials; importing a private
key or reopening the master for every payment is unnecessary. The local unlock
password is not needed to restore an unencrypted master backup on another device.
Keep the master backup offline.

There is one current master backup per enrolled account and chain. This does not
back up unrelated accounts, shielded notes or the wallet's settings. The regular
full wallet export preserves active credentials and pending transitions but is
not a replacement for the offline master backup. Older independent active and
recovery backups remain importable for their respective roles.

## Restore on a new device

Create a local wallet container, configure the original network, and open the
same security section. The temporary local account does not need the original
private key. Do not send funds to its temporary address.

Choose **Restore master backup**, reopen the current master file and supply its
password only if encrypted. The wallet derives the active credentials, checks
them against the committed registry, adds the original account and selects it.
A backup from a replaced epoch cannot sign current transactions. The browser uses
the **Reopen master backup** file picker for both verification and restoration.

For recovery, choose **recover** and reopen the current master backup. The wallet
derives recovery authority and prepares a fresh master for the replacement epoch.
Save and reopen that one replacement backup before submitting. After commitment,
choose **Use confirmed account**. Recovery preserves the original address,
balances and permissions. It does not require the old private key or device.

Every rotation or recovery creates a fresh master. Keep the previous and candidate
backups until commitment is known; afterwards the replacement master is the one
current backup. This permits retiring a compromised master instead of continuing
to derive keys from a secret an attacker knows. Losing the master and all active
credentials can permanently remove access.

Recovery has no delay or veto: someone who controls current active credentials
may race the legitimate owner. A master also derives those credentials. Recovery
cannot reverse a completed theft or rescue a master that the attacker controls.

## Interrupted or failed submissions

Before broadcasting, the wallet durably encrypts the new active credentials and
the exact signed transaction, then reads the saved vault back before submitting.
A failed save or failed read-back stops submission. A timeout or restart retains
the pending keys. Reopen the
wallet and check the original address. **Retry saved transaction** submits the
same signed transaction; it does not create another key pair or assume success.

If a rejected or failed transaction cannot be retried, **Archive failed attempt**
removes it from the retry workflow while retaining its candidate keys. This does
not cancel a broadcast already sent to a node. If it commits later, a registry
check can still find the matching saved keys. Start a fresh transition using the
current authority and new verified backups. Keep the files from unresolved
attempts until their outcome is known.

Archiving an uncertain enrollment does not authorize falling back to the old key.
If the RPC reports no record while candidate keys remain saved, spending stops
until the account's committed state can be reconciled. A late commit can still
activate the retained candidate.

A failed recovery caused by insufficient funds leaves the current keys in place,
but an executed failed transaction consumes its nonce. Fund the original address
for the configured fee, check the committed account, archive the failed attempt,
and prepare a fresh recovery with a new verified master backup. Retrying the exact old
transaction cannot repair a consumed nonce.

Locking the wallet or changing its selected account/network during preparation
can cancel the operation; unlock and check its status before starting again.
This cannot recall a transaction already broadcast. Full wallet exports retain
older local identity credentials needed to unlock accounts recovered on a fresh
device after subsequent rotations. Those credentials cannot authorize payments
against a newer committed registry record.

Wallet session saves and clears are ordered so a delayed save cannot reopen a
locked wallet. Stale reads and decryption that finish after locking are rejected.
The encrypted wallet and saved candidate backups remain available for a normal
password unlock and status check.

A registry lookup failure or corrupt record blocks signing. The wallet never
silently downgrades an enrolled account to legacy signing. Legacy message signing
is unavailable for hybrid accounts; transaction approvals support the new format.

## Cryptographic scope

Account signatures use Ed25519 and ML-DSA-65 together. Validator consensus uses
Ed25519; shielded proofs use Groth16/BN254 and note encryption uses Curve25519.
These are separate security boundaries. Hybrid account authorization is not a
claim of whole-chain quantum resistance. Unenrolled accounts use Ed25519, and
bridged assets also depend on the connected chain's security.

## Service custody and contract permissions

The Python SDK's `load_signing_wallet` accepts an encrypted active backup,
password, expected original address and chain. CLI transaction commands expose
`--active-backup-file` and `--backup-password-env`. Bridge, DEX automation,
MCP, bot, bootstrap and relayer entry points have explicit encrypted active-file
configuration. These loaders do not enroll accounts or store cold recovery keys.
Pause service spending during a transition, reconcile committed state and any
pending transactions, atomically install the confirmed active file, then restart
or reload the service. Keep the verified master backup offline. For services, derive and export an
encrypted active-only credential with the SDK; do not install the master backup
on an automated signing server. This is a service credential, not a second
user recovery backup.

Currency approvals, transfers and stream creation use transaction caller
authorization. The node authenticates an enrolled sender with its current hybrid
keys. Account recovery preserves the address and therefore existing allowances,
stream ownership and contract roles. Review and revoke unwanted permissions
separately: rotating keys does not remove permissions already granted to others.

Balance import copies native currency balances under exact account identifiers.
It does not import allowances, streams or account records. Imported ordinary
addresses use their original Ed25519 keys until enrollment. See
[Balance Import](/node/balance-migration) for contract-balance dispositions and
reconciliation rules.
