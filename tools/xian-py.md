# xian-py

`xian-py` is the Python SDK for Xian applications, workers, automation, and
operator scripts. The PyPI package is `xian-tech-py`; imports use `xian_py`.

## Install

```bash
uv add xian-tech-py
```

Optional extras include `hd` for mnemonic/HD wallets, `eth` for
Ethereum-style key helpers, `app` for application examples, and `compile` for
offline compiler inspection. Contract deployment itself does not need the
`compile` extra because validators compile submitted source.

## Read and Submit

```python
import os

from xian_py import Wallet, Xian

wallet = Wallet(private_key=os.environ["XIAN_PRIVATE_KEY"])

with Xian("http://127.0.0.1:26657", wallet=wallet) as client:
    balance = client.token().balance_of(wallet.public_key)
    submission = client.token().transfer(
        "bob",
        5,
        mode="checktx",
        wait_for_tx=True,
    )
    print(balance, submission.tx_hash, submission.finalized)
```

Use `XianAsync` in asynchronous applications. The sync and async clients expose
the same core concepts.

The Ed25519 key examples apply to unenrolled accounts. For an enrolled
account, use the SDK's hybrid signer with current active credentials or an
injected wallet. The account address and contract call stay the same. See
[Account Backups and Recovery](/concepts/hybrid-account-recovery).

## Deploy Source

```python
source = """
counter = Variable()

@construct
def seed():
    counter.set(0)

@export
def increment() -> int:
    counter.set(counter.get() + 1)
    return counter.get()
"""

with Xian("http://127.0.0.1:26657", wallet=wallet) as client:
    result = client.deploy_contract(
        "con_counter",
        source,
        mode="checktx",
        wait_for_tx=True,
    )
```

`deploy_contract` and `submit_contract` send source to
`submission.submit_contract`. Validators lint and compile it into canonical
`xian_vm_v1` IR. Client-supplied deployment artifacts are not accepted.

## Main Client Surfaces

| Surface | Use |
| --- | --- |
| `Xian`, `XianAsync` | primary sync and async clients |
| `Wallet` | Ed25519 account and signing helper |
| `client.contract(name)` | contract calls, simulation, sends, source, and IR |
| `client.token(name)` | common token reads, transfers, approvals, and events |
| `client.events(...)` | indexed and live event access |
| `client.state_key(...)` | current-state reads for one storage key |
| `EventProjector` | resumable application-owned read models |
| shielded relayer clients | quotes and proof-bound relayer submission |

Low-level methods remain available for state queries, simulation, transaction
construction, broadcast, receipts, node status, and BDS-backed history.

## Indexed Reads and Events

BDS-backed methods cover blocks, transactions, events, state history, token
portfolios, DEX candles, shielded wallet feeds, and developer rewards. These
reads are eventually consistent with finalized chain state.

```python
with Xian("http://127.0.0.1:26657") as client:
    status = client.get_bds_status()
    events = client.list_events("currency", "Transfer", after_id=0)
    history = client.get_state_history("currency.balances:bob")
```

For resumable consumers, use indexed event IDs and BDS cursors. Use
`watch_live_events()` or `.watch_live()` only when low latency matters more
than replayable delivery.

## Submission Modes and Errors

Submission modes are `async`, `checktx`, and `commit`. Prefer `checktx` plus
`wait_for_tx=True` for most application flows. Transport retries apply to safe
reads; ambiguous writes are not silently resubmitted.

Catch the SDK's structured exceptions when behavior depends on failure type:

- `TransportError` and `RpcError`
- `AbciError` and `SimulationError`
- `TransactionError` and `TxTimeoutError`

## Runtime values in transactions

Transaction preparation recursively normalizes runtime values through nested
lists and dictionaries. Large Python integers use the `__big_int__` wire wrapper;
booleans remain JSON booleans. Pass native Python values to SDK helpers rather
than converting large integers to floating point.

Source deployment targets `xian-tech-py>=0.5.0,<0.6`. Keep application dependency
constraints aligned with this API even when local development uses sibling
source overrides.

## Related Pages

- [BDS Indexed Queries](/api/bds)
- [Estimating Chi](/api/dry-runs)
- [xian-zk](/tools/xian-zk)
- [Source repository](https://github.com/xian-technology/xian-py)

## Recovering uncertain submissions

Automatic sends are coordinated per client, chain, and sender. Local validation
or signing failures release their nonce reservation. Concurrent sends wait for
the preceding submission to finish its admission/finality path.

A lost broadcast response or finality timeout leaves the nonce unresolved.
Structured errors include `details["tx_hash"]` and `details["nonce"]` when the
transaction was prepared. Query that hash before creating another transfer.
The SDK raises `NonceReservationError` if a subsequent automatic send sees the
same network nonce. It resumes once the network nonce advances;
`refresh_nonce()` does not clear unresolved reservations by itself.

An explicit `nonce=` bypasses automatic coordination and is the caller's
responsibility. Client instances do not share reservations. Persist signed
transactions and their hashes if recovery must survive application restarts.

Receipt recovery can scan recent blocks when transaction indexing is
unavailable. It hashes the exact submitted bytes and requires an actual
execution result; missing or pruned block results are reported as unknown/error,
never as successful execution.

## Hybrid accounts

The optional `hybrid` extra supplies ML-DSA-65 and portable master backups.
Import `HybridWallet` from `xian_py.hybrid`, and `MasterAccountTransitionDraft`,
`import_account_master`, `account_backup_from_master` from `xian_py.account_master`.
A `HybridWallet` can be passed to `Xian` or `XianAsync`; transactions retain the
original `public_key` identity. Recovery credentials cannot spend.

`MasterAccountTransitionDraft.export_master_backup()` exports one master file
(optional password argument). Reopen it with `verify_master_backup()` before
`sign()` can produce an enrollment, rotation or recovery transaction. The master
recreates either role through `account_backup_from_master(master, role)`.
`AccountTransitionDraft` and version-1 role backup imports remain compatibility
APIs for older independently generated keys. Python
helpers are offline primitives: the application must query current registry and
policy, obtain the nonce, durably encrypt the candidate active backup and exact
signed transaction **before** broadcasting, and wait for committed state before
changing its active wallet. Never replace custody state on CheckTx acceptance.
The official browser/mobile wallets implement this lifecycle through the JS vault.

See [hybrid account backups and recovery](../concepts/hybrid-account-recovery.md).
Install with `uv add "xian-tech-py[hybrid]"`. Local development resolves the
sibling account package. Enrollment is disabled in checked-in network policies.

## HD and mnemonic accounts

Install `xian-tech-py[hd]` for mnemonic support:

```python
import os
from xian_py import Wallet

phrase = os.environ["XIAN_RECOVERY_PHRASE"]
first = Wallet.from_mnemonic(phrase, account_index=0)
second = Wallet.from_mnemonic(phrase, account_index=1)
```

This uses the same indexed derivation as the browser and mobile wallets.
`xian_py.wallet.HDWallet.get_wallet(path)` instead uses hardened SLIP-0010
Ed25519 derivation; it produces different accounts from the same phrase.
Always restore with the original scheme and index/path.

Hybrid enrollment preserves the original address but uses a fresh master per
account and chain. The original mnemonic does not replace that verified master
backup. See [Account Backups and Recovery](/concepts/hybrid-account-recovery).
