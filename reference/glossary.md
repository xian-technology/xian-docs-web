# Glossary

Key terms used throughout the Xian documentation.

## A

### ABCI
Application BlockChain Interface. The protocol that connects CometBFT (consensus) to the Xian application layer. Defines methods like `CHECK_TX`, `FINALIZE_BLOCK`, `COMMIT`, and `QUERY`.

## B

### Block
A batch of transactions ordered and agreed upon by validators through consensus. Each block has a height (sequential number), a hash, a timestamp, and a list of transactions.

### Bundle
A hash-pinned set of artifacts used for deterministic packaging or recovery.
Examples include genesis contract bundles, product contract bundles, generated
operator handoff bundles, governed state-patch bundles, and shielded proving
bundles. See [Config Taxonomy](/node/config-taxonomy).

## C

### Caller
The immediate caller of a contract function, available as `ctx.caller`. When a user calls a contract directly, `ctx.caller` is the user's address. When contract A calls contract B, `ctx.caller` inside B is the name of contract A.

### Chi
Xian's name for transaction execution energy and the unit of computation cost
on the network, analogous to gas on Ethereum. Chi is not a separate token or an
acronym. Every operation costs chi. In the default paid fee mode, chi are
purchased with XIAN at a rate of 20 chi per XIAN. In `free_metered` mode, chi
meter execution without charging a native-token execution fee.

### CometBFT
The Byzantine Fault Tolerant consensus engine used by Xian (formerly known as Tendermint). Handles peer-to-peer networking, block proposal, and validator voting.

### Construct
The `@construct` decorator marks a function that runs once when a contract is deployed. It initializes state and is never callable again after deployment.

### Contract
A Python source file deployed to the Xian blockchain. Contains state declarations, an optional constructor, and one or more exported functions. User-submitted contracts must have names starting with `con_`, and all deployed contract names must use lowercase ASCII letters, digits, and underscores only.

### Contract Bundle
A hash-pinned manifest for a deployable set of contract source files. Product
repos and contract repos can publish contract bundles; `xian-cli` can validate
them before deployment. See [Config Taxonomy](/node/config-taxonomy).

## D

### Deploy Binding
A host-specific deployment value used by `xian-deploy`, such as a remote path,
published port, database credential, memory limit, or `xian_deploy_topology`.
Deploy bindings do not define node runtime posture; the node profile does.
See [Config Taxonomy](/node/config-taxonomy).

## E

### Example Contract
A small reference contract used by SDK examples or e2e tests. Example contract
sources live beside the example code that consumes them, usually in an SDK or
product repo.

### Export
The `@export` decorator marks a function as publicly callable -- by user transactions or by other contracts. All arguments must have type annotations.

## H

### Hash
A key-value mapping that persists on-chain. Supports up to 16 key dimensions. Declared with `Hash()` or `Hash(default_value=0)`.

## M

### Metering
The system that charges contract execution work. Xian uses the native
`xian_vm_v1` gas schedule to prevent infinite loops and ensure deterministic
chi accounting.

## N

### Nonce
A sequential counter for each address. Each transaction from an address must have the next expected nonce. Prevents replay attacks (submitting the same transaction twice).

## O

### ORM
Object-Relational Mapping. In Xian, refers to the `Variable`, `Hash`, `ForeignVariable`, and `ForeignHash` classes that provide a Pythonic interface to on-chain storage.

## P

### Package
A code or build distribution unit, such as an SDK package, app package,
wallet package, or generated example artifact. Packages may use contract bundles,
bundles, profiles, and templates, but they are not the same thing as those
runtime and protocol artifacts. See [Config Taxonomy](/node/config-taxonomy).

### Product
An optional application or protocol surface with one owning repo. Products are
installed after a chain exists; they are not genesis contracts and are not
shipped in node images. See [Products](/products/).

### Profile
A node-local JSON contract that tells `xian-cli`, `xian-stack`, and
`xian-deploy` what one node should run. Profiles are usually generated from a
network manifest and a template. See [Node Profiles](/node/profiles).

## S

### Signer
The original signer of a transaction, available as `ctx.signer`. This value never changes in a call chain -- even when contract A calls contract B, `ctx.signer` remains the address of the user who submitted the transaction.

## T

### Template
A reusable starter shape for creating or joining networks and generating node
profiles. Templates live in `xian-configs/templates/`; they are defaults, not
live network state. See [Config Taxonomy](/node/config-taxonomy).

### Transaction
A signed message that instructs the network to execute a contract function with specific arguments. Contains the contract name, function name, keyword arguments, chi limit, chain ID, nonce, and signature.

## V

### Validator
A node that participates in consensus. Validators propose blocks, vote on
block validity, and execute transactions. They must run the network's supported
runtime and satisfy its configured membership and bonding policy.

### Variable
A single-value storage primitive that persists on-chain. Declared with `Variable()` or `Variable(default_value=0)`. Use `.set(value)` and `.get()` to write and read.

## X

### XIAN
The native currency of the Xian network. Used for transfers between addresses,
staking, and execution fees on paid-fee networks.
