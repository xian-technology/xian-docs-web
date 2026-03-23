# xian-py

`xian-py` is the external Python SDK for talking to a Xian node from
applications, services, wallets, and automation workflows.

## Installation

Base install:

```bash
pip install xian-py
```

Optional extras:

```bash
pip install "xian-py[hd]"   # mnemonic / HD wallet support
pip install "xian-py[eth]"  # Ethereum wallet helpers
```

## Public API

The intended top-level imports are:

```python
from xian_py import (
    AsyncContractClient,
    AsyncEventClient,
    AsyncStateKeyClient,
    AsyncTokenClient,
    ContractClient,
    EventClient,
    RetryPolicy,
    StateKeyClient,
    SubmissionConfig,
    TokenClient,
    TransportConfig,
    Wallet,
    WatcherConfig,
    Xian,
    XianAsync,
    XianClientConfig,
    XianException,
    NodeStatus,
    TransactionReceipt,
    TransactionSubmission,
    PerformanceStatus,
    BdsStatus,
    run_sync,
    to_contract_time,
)
```

`HDWallet` and `EthereumWallet` live in `xian_py.wallet`; they are optional
helpers, not part of the small top-level API.

## Wallets

### Basic Wallet

```python
from xian_py import Wallet

wallet = Wallet()
print(wallet.public_key)
print(wallet.private_key)
```

Restore from an existing private key:

```python
wallet = Wallet(private_key="your_private_key_hex")
```

### HD Wallet

```python
from xian_py.wallet import HDWallet

wallet = HDWallet()
print(wallet.mnemonic_str)
child = wallet.get_wallet([0, 0])
print(child.public_key)
```

HD wallet support requires `xian-py[hd]`.

## Synchronous Client

```python
from xian_py import Wallet, Xian

wallet = Wallet()
with Xian("http://127.0.0.1:26657", wallet=wallet) as client:
    balance = client.get_balance(wallet.public_key)
```

Constructor parameters:

- `node_url`
- optional `chain_id`
- optional `wallet`

If `chain_id` is omitted, the client fetches it from the node.

`Xian` keeps a persistent background event loop and HTTP session for the life of
the client. Prefer using it as a context manager or calling `close()` when you
are done.

## Client Configuration

The SDK now exposes explicit config types for transport, retry, submission, and
watcher defaults:

```python
from xian_py import (
    RetryPolicy,
    SubmissionConfig,
    TransportConfig,
    WatcherConfig,
    Xian,
    XianClientConfig,
)

config = XianClientConfig(
    transport=TransportConfig(total_timeout_seconds=20.0),
    retry=RetryPolicy(max_attempts=3, initial_delay_seconds=0.25),
    submission=SubmissionConfig(wait_for_tx=True),
    watcher=WatcherConfig(poll_interval_seconds=0.5, batch_limit=200),
)

with Xian("http://127.0.0.1:26657", config=config) as client:
    status = client.get_node_status()
```

Retry policy applies only to read-side operations such as status queries,
ABCI reads, tx lookup, and watcher polling. Transaction broadcasts are not
retried automatically.

## Async Client

```python
import asyncio
from xian_py import Wallet, XianAsync

async def main():
    wallet = Wallet()
    async with XianAsync("http://127.0.0.1:26657", wallet=wallet) as client:
        return await client.get_balance(wallet.public_key)

asyncio.run(main())
```

Use `XianAsync` directly inside async code. The sync wrapper intentionally
raises if you call it from an already-running event loop.

## Common Methods

### get_balance

```python
balance = client.get_balance(address=wallet.public_key)
balance = client.get_balance(contract="currency")
```

### get_state

`get_state` takes the contract name, variable name, and zero or more key parts:

```python
value = client.get_state("currency", "balances", wallet.public_key)
allowance = client.get_state("currency", "balances", wallet.public_key, "con_dex")
```

### get_contract

```python
source = client.get_contract("currency")
clean_source = client.get_contract("currency", clean=True)
```

### send_tx

```python
result = client.send_tx(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_public_key"},
    stamps=50_000,
    mode="checktx",
    wait_for_tx=True,
)
```

Transaction broadcast modes are explicit:

- `"async"`: submit to the node and return immediately
- `"checktx"`: wait for mempool admission / `CheckTx`
- `"commit"`: use CometBFT `broadcast_tx_commit`

Returned fields now distinguish the lifecycle:

- `submitted`
- `accepted`
- `finalized`
- `tx_hash`
- `response`
- `receipt`

The return type is `TransactionSubmission`, so these values are available as
attributes:

```python
result = client.send_tx(...)
print(result.submitted)
print(result.accepted)
print(result.tx_hash)
print(result.receipt)
```

If `stamps` is omitted, the SDK simulates the transaction first and adds a
small configurable headroom to the estimated stamp usage before submission.

You can set default submission behavior once through
`XianClientConfig.submission` instead of repeating the same options on every
call.

### send

`send` is a convenience wrapper for token transfers:

```python
result = client.send(
    amount=100,
    to_address="recipient_public_key",
    token="currency",
    mode="checktx",
    wait_for_tx=True,
)
```

### approve

`approve` is a convenience wrapper that approves another contract to spend a
token on behalf of the wallet:

```python
result = client.approve(
    contract="con_dex",
    token="currency",
    amount=1_000,
    mode="checktx",
)
```

### get_approved_amount

```python
amount = client.get_approved_amount("con_dex", token="currency")
```

### simulate

```python
result = client.simulate(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_public_key"},
)

print(result["status"])
print(result["stamps_used"])
print(result["state"])
```

The dry-run result currently comes from the node simulator and uses:

- `status`
- `stamps_used`
- `state`
- `result`
- `payload`

### submit_contract

```python
code = """
counter = Variable()

@construct
def seed():
    counter.set(0)

@export
def increment() -> int:
    counter.set(counter.get() + 1)
    return counter.get()
"""

result = client.submit_contract(
    name="con_counter",
    code=code,
    args={},
    stamps=500_000,
)
```

## Other Helpers

Also available:

- `get_tx(tx_hash)`
- `wait_for_tx(tx_hash)`
- `refresh_nonce()`
- `estimate_stamps(contract, function, kwargs)`
- `get_nodes()`
- `get_genesis()`
- `get_chain_id()`
- `get_node_status()`
- `get_perf_status()`
- `get_bds_status()`
- `list_blocks(limit=..., offset=...)`
- `get_block(height)`
- `get_block_by_hash(block_hash)`
- `get_indexed_tx(tx_hash)`
- `list_txs_for_block(block_ref)`
- `list_txs_by_sender(sender, limit=..., offset=...)`
- `list_txs_by_contract(contract, limit=..., offset=...)`
- `get_events_for_tx(tx_hash)`
- `list_events(contract, event, limit=..., offset=..., after_id=...)`
- `get_state_history(key, limit=..., offset=...)`
- `get_state_for_tx(tx_hash)`
- `get_state_for_block(block_ref)`
- `watch_blocks(start_height=..., poll_interval_seconds=...)`
- `watch_events(contract, event, after_id=..., limit=..., poll_interval_seconds=...)`

`get_tx(tx_hash)` and `wait_for_tx(tx_hash)` now return a `TransactionReceipt`
that exposes the two important pieces separately:

- `result.tx` is the original submitted transaction
- `result.tx_result.data` is the decoded execution output
- for convenience, `xian-py` also surfaces these as typed attributes:
  `receipt.transaction` and `receipt.execution`

## Watching Blocks And Events

`xian-py` now includes polling-based watcher helpers for long-running
application processes.

### watch_blocks

`watch_blocks` uses raw node RPC and does not require BDS:

```python
async for block in client.watch_blocks(start_height=101):
    print(block.height, block.tx_count)
```

If `start_height` is omitted, the watcher begins at the next block after the
current node head. Persist the last seen height if you want resumable block
consumers.

The default poll interval comes from `XianClientConfig.watcher`.

### watch_events

`watch_events` uses the indexed BDS event surface and a stable event cursor:

```python
async for event in client.watch_events(
    "currency",
    "Transfer",
    after_id=500,
):
    print(event.id, event.tx_hash, event.data)
```

Resume by storing the last seen event `id` and passing it back as `after_id`.

Event watching requires BDS to be enabled on the node because the event stream
comes from indexed reads rather than direct raw state queries.

The default watcher batch size and poll interval come from
`XianClientConfig.watcher`.

## Application Helper Clients

`xian-py` now includes thin helper clients that reduce repetitive application
boilerplate without hiding the underlying network model.

Available factories:

- `client.contract("name")`
- `client.token("currency")`
- `client.events("contract", "EventName")`
- `client.state_key("contract", "variable", *keys)`

These work on both `Xian` and `XianAsync`.

### Contract Client

```python
ledger = client.contract("con_ledger")

await ledger.send("add_entry", account="alice", amount=5)
balance = await ledger.get_state("balances", "alice")
history = await ledger.state_key("balances", "alice").history(limit=20)
```

The contract client keeps the contract name fixed and lets you focus on the
function call or state path you actually care about.

### Token Client

```python
currency = client.token()

balance = await currency.balance_of()
await currency.transfer("bob", 10)
await currency.approve("con_dex", amount=100)
```

The token client is just a thin layer over the existing currency-style helper
methods, but it keeps the token contract fixed and provides a cleaner
application-facing shape.

### Event Client

```python
transfers = client.events("currency", "Transfer")
recent = transfers.list(after_id=500, limit=50)
```

You can also watch from the same fixed event source:

```python
async for transfer in transfers.watch(after_id=500):
    print(transfer.data)
```

### State Key Client

```python
balance_key = client.state_key("currency", "balances", "alice")

current = balance_key.get()
history = balance_key.history(limit=20)
```

This is useful when an application works with one exact state key repeatedly
and wants both the current value and the indexed history view.

## Service Integration Examples

The `xian-py` repo now includes application-facing examples under
`examples/` that show how the SDK fits into ordinary backend workflows.

### FastAPI Service

`examples/fastapi_service.py` shows an async API service shape with:

- shared `XianAsync` lifecycle management
- typed node health reads
- token balance reads
- indexed transfer reads
- token transfer submission

Typical run:

```bash
uv run uvicorn examples.fastapi_service:app --reload --app-dir .
```

This example expects normal app dependencies such as `fastapi` and `uvicorn`;
they are intentionally not part of the base `xian-py` package install.

### Event Worker

`examples/event_worker.py` shows a resumable background worker that:

- watches indexed BDS events
- stores the last seen `after_id` cursor locally
- resumes cleanly after restart

Typical run:

```bash
uv run python examples/event_worker.py
```

### Admin / Automation Job

`examples/admin_job.py` shows a synchronous operator-facing automation task
that reads:

- node health
- peer count
- performance status
- optional BDS lag

and exits nonzero when a configured threshold is violated.

Typical run:

```bash
uv run python examples/admin_job.py
```

## Structured Errors

The SDK now exposes more precise error classes:

- `TransportError`
- `RpcError`
- `AbciError`
- `SimulationError`
- `TransactionError`
- `TxTimeoutError`

All of them inherit from `XianException`.

See the repo README for package-level development and compatibility notes.
