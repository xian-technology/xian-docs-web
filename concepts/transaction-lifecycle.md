# Transaction Lifecycle

Every transaction on Xian follows a defined path from creation to finalization. Understanding this lifecycle helps you debug failed transactions, optimize stamp usage, and build reliable applications.

## Overview

```
  SDK (xian-py)
      |
      |  1. Create transaction payload
      |  2. Sign with Ed25519 private key
      v
  CometBFT Node
      |
      |  3. Broadcast via RPC (broadcast_tx_sync / broadcast_tx_async)
      v
  CHECK_TX (mempool validation)
      |
      |  4. Validate signature
      |  5. Verify chain_id matches
      |  6. Check nonce ordering
      |  7. Verify sender has enough TAU for stamps
      v
  Mempool
      |
      |  8. Transaction waits for inclusion in next block
      v
  Consensus (CometBFT BFT)
      |
      |  9. Validators agree on block contents and ordering
      v
  FINALIZE_BLOCK
      |
      |  10. Execute contract function in sandbox
      |  11. Meter every instruction (stamps)
      |  12. Apply state changes (or rollback on failure)
      |  13. Deduct stamps from sender's TAU balance
      |  14. Collect events emitted by the contract
      v
  Commit
      |
      |  15. Batch-write all state changes to LMDB
      |  16. Compute app_hash over the full state
      |  17. Return app_hash to CometBFT for next block header
      v
  Block Finalized
      |
      |  18. Events indexed by CometBFT
      |  19. WebSocket subscribers notified
      |  20. Block available via RPC queries
```

## Step-by-Step

### 1. Transaction Creation

Using the Python SDK (`xian-py`), construct a transaction payload:

```python
from xian_py import Wallet, Xian

wallet = Wallet()
xian = Xian("http://localhost:26657", "xian-testnet-1", wallet=wallet)

result = xian.send_tx(
    contract="currency",
    function="transfer",
    kwargs={"amount": 100, "to": "recipient_address"},
    stamps=50000,
)
```

The payload contains:
- `contract` -- the target contract name
- `function` -- the exported function to call
- `kwargs` -- keyword arguments for the function
- `stamps` -- maximum stamps to spend
- `chain_id` -- network identifier (prevents cross-chain replay)
- `nonce` -- sequential counter (prevents replay on the same chain)

### 2. Signing

The SDK signs the transaction payload with the sender's Ed25519 private key. The signature is attached to the transaction and verified by validators.

### 3. Broadcasting

The signed transaction is sent to a CometBFT node via its RPC interface. Two modes:

| Mode | Behavior |
|------|----------|
| `broadcast_tx_sync` | Waits for CHECK_TX result, then returns |
| `broadcast_tx_async` | Returns immediately, no validation feedback |

### 4-7. CHECK_TX (Mempool Validation)

Before entering the mempool, the transaction passes through validation:

1. **Signature verification** -- the Ed25519 signature must be valid for the payload and sender's public key
2. **Chain ID check** -- the transaction's chain_id must match the network
3. **Nonce check** -- the nonce must be the next expected value for this sender
4. **Balance check** -- the sender must have enough TAU to cover the requested stamp limit

If any check fails, the transaction is rejected and never enters the mempool.

### 8. Mempool

Valid transactions sit in the mempool until a block proposer includes them in a block proposal.

### 9. Consensus

CometBFT runs Byzantine Fault Tolerant consensus. Once 2/3+ of validators agree on the block contents and order, the block is finalized.

### 10-14. FINALIZE_BLOCK (Execution)

Each transaction in the block is executed sequentially:

1. **Sandbox setup** -- the contract runtime initializes with the sender's context (`ctx.caller`, `ctx.signer`)
2. **Function dispatch** -- the specified `@export` function is called with the provided kwargs
3. **Metering** -- `sys.monitoring` tracks every Python instruction and charges compute units
4. **Storage operations** -- reads and writes are charged per byte (1 stamp/byte read, 25 stamps/byte write)
5. **Completion or failure**:
   - **Success** -- state changes are buffered for commit, stamps consumed are recorded
   - **Failure** (assertion, out of stamps, runtime error) -- state changes are rolled back, stamps are still charged

### 15-17. Commit

After all transactions in the block are executed:

1. All successful state changes are written to LMDB in a single atomic batch
2. The `app_hash` is computed as a hash over the entire state database
3. The app_hash is returned to CometBFT for inclusion in the next block header

### 18-20. Post-Finalization

- **Event indexing** -- CometBFT indexes events emitted during execution, making them searchable via `/tx_search`
- **WebSocket notifications** -- subscribers receive real-time event data
- **RPC availability** -- the block, transactions, and results are queryable via the CometBFT RPC

## Transaction Result

After finalization, querying a transaction returns:

| Field | Description |
|-------|-------------|
| `hash` | Transaction hash |
| `height` | Block height |
| `status` | `0` (success) or `1` (failure) |
| `stamps_used` | Actual stamps consumed |
| `result` | Return value from the contract function |
| `state` | State changes made (key-value pairs) |
| `events` | Events emitted by the contract |

## Failure Modes

| Failure | When | State Changes | Stamps Charged |
|---------|------|---------------|----------------|
| CHECK_TX rejection | Before mempool | None | None |
| Assertion error | During execution | Rolled back | Yes (stamps consumed up to failure) |
| Out of stamps | During execution | Rolled back | Yes (full stamp limit) |
| Runtime error | During execution | Rolled back | Yes (stamps consumed up to failure) |
