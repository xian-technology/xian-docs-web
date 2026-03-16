# Architecture Overview

Xian is built from four main components that work together to provide a Python-based smart contract blockchain.

## Components

| Component | Role | Language |
|-----------|------|----------|
| **xian-contracting** | Smart contract execution engine | Python |
| **xian-abci** | ABCI application (connects contracts to consensus) | Python |
| **CometBFT** | Byzantine Fault Tolerant consensus engine | Go |
| **xian-py** | Client SDK for building and signing transactions | Python |

## How They Connect

```
                        +-------------------+
                        |   Your App / SDK  |
                        |    (xian-py)      |
                        +--------+----------+
                                 |
                           JSON-RPC / REST
                                 |
                        +--------v----------+
                        |    CometBFT       |
                        |   (Consensus)     |
                        |                   |
                        |  - P2P networking |
                        |  - Block ordering |
                        |  - BFT voting     |
                        +--------+----------+
                                 |
                            ABCI Socket
                       (protobuf over TCP)
                                 |
                        +--------v----------+
                        |    xian-abci      |
                        | (ABCI Application)|
                        |                   |
                        |  - CHECK_TX       |
                        |  - FINALIZE_BLOCK |
                        |  - COMMIT         |
                        |  - QUERY          |
                        +--------+----------+
                                 |
                          Python function calls
                                 |
                        +--------v----------+
                        | xian-contracting  |
                        | (Contract Engine) |
                        |                   |
                        |  - Sandbox        |
                        |  - Metering       |
                        |  - ORM (Hash/Var) |
                        |  - Linter         |
                        +--------+----------+
                                 |
                              LMDB
                         (State Storage)
```

## xian-contracting

The contract execution engine. It provides:

- **Sandbox** -- a restricted Python environment that forbids I/O, classes, closures, and unsafe builtins
- **Metering** -- per-instruction cost tracking via `sys.monitoring`, ensuring deterministic stamp accounting
- **ORM** -- `Variable`, `Hash`, `ForeignVariable`, `ForeignHash` for persistent state
- **Linter** -- static analysis that rejects invalid code before deployment
- **Module loader** -- resolves `import` statements to deployed contracts, not the Python standard library

Contracts are plain Python source code submitted as strings. The engine compiles, validates, meters, and executes them.

## xian-abci

The bridge between CometBFT and the contract engine. It implements the ABCI (Application BlockChain Interface) protocol:

| ABCI Method | Purpose |
|-------------|---------|
| `CHECK_TX` | Validates transactions before they enter the mempool (signature, nonce, balance) |
| `FINALIZE_BLOCK` | Executes all transactions in a finalized block sequentially |
| `COMMIT` | Writes state changes to LMDB and returns the app_hash |
| `QUERY` | Handles read-only state queries (balance lookups, contract inspection) |

The ABCI app also manages:
- Stamp deduction (converting stamps to TAU charges)
- Event collection and formatting for CometBFT indexing
- Nonce tracking to prevent replay attacks
- The dashboard HTTP/WebSocket server for API access

## CometBFT

CometBFT (formerly Tendermint) is the consensus engine. It handles:

- **P2P networking** -- gossip protocol for broadcasting transactions and blocks between validators
- **Block proposal** -- round-robin block proposers select transactions from the mempool
- **BFT consensus** -- 2/3+ validator agreement on block contents and ordering
- **Instant finality** -- once a block is committed, it is final (no reorganizations)

CometBFT communicates with the ABCI app over a local TCP socket using Protocol Buffers. It is agnostic to the application logic -- it only cares about block ordering and validator agreement.

## xian-py

The Python SDK for interacting with Xian from client applications:

- **Wallet management** -- create wallets, derive from mnemonics (HD wallets), sign transactions
- **Transaction building** -- construct, sign, and broadcast transactions
- **State queries** -- read contract state, check balances, inspect contracts
- **Contract submission** -- deploy new contracts to the network
- **Dry runs** -- simulate transactions without state changes

See [xian-py](/tools/xian-py) for the full SDK reference.

## Data Flow: A Transaction

1. **xian-py** builds a transaction payload and signs it with Ed25519
2. The signed transaction is sent to **CometBFT** via JSON-RPC
3. CometBFT passes it to the **ABCI app** for `CHECK_TX` validation
4. If valid, the transaction enters the mempool and waits for consensus
5. CometBFT proposes a block containing the transaction; validators vote
6. On 2/3+ agreement, the block is finalized
7. `FINALIZE_BLOCK` calls the **ABCI app**, which calls **xian-contracting** to execute each transaction
8. State changes are written to **LMDB** during `COMMIT`
9. The `app_hash` is returned to CometBFT for the next block header
10. Events are indexed and pushed to WebSocket subscribers
