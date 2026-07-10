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

## Related Pages

- [BDS Indexed Queries](/api/bds)
- [Estimating Chi](/api/dry-runs)
- [xian-zk](/tools/xian-zk)
- [Source repository](https://github.com/xian-technology/xian-py)
