# Glossary

Key terms used throughout the Xian documentation.

## A

### ABCI
Application BlockChain Interface. The protocol that connects CometBFT (consensus) to the Xian application layer. Defines methods like `CHECK_TX`, `FINALIZE_BLOCK`, `COMMIT`, and `QUERY`.

## B

### Block
A batch of transactions ordered and agreed upon by validators through consensus. Each block has a height (sequential number), a hash, a timestamp, and a list of transactions.

## C

### Caller
The immediate caller of a contract function, available as `ctx.caller`. When a user calls a contract directly, `ctx.caller` is the user's address. When contract A calls contract B, `ctx.caller` inside B is the name of contract A.

### CometBFT
The Byzantine Fault Tolerant consensus engine used by Xian (formerly known as Tendermint). Handles peer-to-peer networking, block proposal, and validator voting.

### Construct
The `@construct` decorator marks a function that runs once when a contract is deployed. It initializes state and is never callable again after deployment.

### Contract
A Python source file deployed to the Xian blockchain. Contains state declarations, an optional constructor, and one or more exported functions. User-submitted contracts must have names starting with `con_`, and all deployed contract names must use lowercase ASCII letters, digits, and underscores only.

## E

### Export
The `@export` decorator marks a function as publicly callable -- by user transactions or by other contracts. All arguments must have type annotations.

## H

### Hash
A key-value mapping that persists on-chain. Supports up to 16 key dimensions. Declared with `Hash()` or `Hash(default_value=0)`.

## M

### Metering
The system that charges contract execution work. Xian supports tracer-backed
Python execution and a native VM gas schedule. Both prevent infinite loops and
ensure deterministic chi accounting.

## N

### Nonce
A sequential counter for each address. Each transaction from an address must have the next expected nonce. Prevents replay attacks (submitting the same transaction twice).

## O

### ORM
Object-Relational Mapping. In Xian, refers to the `Variable`, `Hash`, `ForeignVariable`, and `ForeignHash` classes that provide a Pythonic interface to on-chain storage.

## S

### Signer
The original signer of a transaction, available as `ctx.signer`. This value never changes in a call chain -- even when contract A calls contract B, `ctx.signer` remains the address of the user who submitted the transaction.

### Chi
Xian's name for transaction execution energy and the unit of computation cost on the network, analogous to gas on Ethereum. Chi is not a separate token or an acronym. Every operation (instruction execution, storage read, storage write) costs chi. Chi are purchased with XIAN at a rate of 20 chi per XIAN.

## T

### XIAN
The native currency of the Xian network. Used to pay for chi (transaction fees), for transfers between addresses, and for staking.

### Transaction
A signed message that instructs the network to execute a contract function with specific arguments. Contains the contract name, function name, keyword arguments, chi limit, chain ID, nonce, and signature.

## V

### Validator
A node that participates in consensus. Validators propose blocks, vote on block validity, and execute transactions. Validators must stake XIAN and run the same software version.

### Variable
A single-value storage primitive that persists on-chain. Declared with `Variable()` or `Variable(default_value=0)`. Use `.set(value)` and `.get()` to write and read.
