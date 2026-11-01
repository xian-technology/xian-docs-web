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

## Mnemonic Accounts and Recovery

Install `xian-tech-py[hd]` for mnemonic support:

```python
import os
from xian_py import Wallet
from xian_py.wallet import HDWallet

phrase = os.environ["XIAN_RECOVERY_PHRASE"]
first = Wallet.from_mnemonic(phrase, account_index=0)
second = Wallet.from_mnemonic(phrase, account_index=1)

hd = HDWallet(phrase)
assert hd.get_wallet(account_index=0).public_key == first.public_key
assert hd.get_wallet(account_index=1).public_key == second.public_key
```

`Wallet.from_mnemonic` and `HDWallet.get_wallet` use the same indexed derivation
as the browser and mobile wallets: SHA-256 of the BIP39 seed,
`xian-wallet-seed-v2`, and the four-byte big-endian account index. Both default
to account index `0`; valid indices are integers from `0` through `4294967295`.

The same phrase and account index restore the same Xian address across these
APIs and the wallets. Record the index with your recovery material.
`HDWallet.get_wallet` accepts an account index, not a derivation path.

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

Transaction arguments accept both typed runtime values and existing tagged JSON,
including mixtures inside nested lists and dictionaries. Large Python integers
use the `__big_int__` wrapper; booleans remain JSON booleans. Do not convert large
integers to floating point.

```python
from decimal import Decimal

kwargs = {
    "deadline": {"__time__": [2026, 11, 1, 14, 47, 2, 123456]},
    "amount": Decimal("1.25"),
    "raw": b"abc",
    "precise_text": {"__fixed__": "1.2300"},
}
```

Simulation and transaction signing use the same bounded wire encoder. It
preserves raw tag contents, including decimal trailing zeros, without decoding
and re-encoding them or mutating the caller's input. It rejects cycles, excessive
nesting, non-finite Python numbers and non-string object keys. Successful wire
encoding does not establish that a raw tag has valid runtime semantics; the
receiving node validates and interprets those tags.

Wire arguments and persistent contract state have different boundaries. The
runtime's storage `encode` API remains strict: ordinary dictionaries cannot
impersonate typed values with reserved codec keys. Use actual runtime values
when writing contract state; accepting raw transaction tags does not weaken
those [storage rules](/smart-contracts/storage#persistent-sets).

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
