# Chi and Metering

Chi is Xian's deterministic execution budget and fee unit. It is not a separate
token.

Every metered transaction must supply a strictly positive chi limit, in both
`paid_metered` and `free_metered` mode. A zero limit is rejected rather than
selecting unmetered execution. The runtime meters VM work, host calls,
storage, transaction bytes, return data, and native bridges against that limit.
If execution runs out of chi, its state and events roll back.

## Accounting

```text
chi_used = (raw_meter_cost // 1000) + 5
```

The result is capped by the submitted chi limit. In `paid_metered` mode, the
sender must be able to cover that limit during admission and at execution.
Execution reserves the full supplied budget at the entry chi rate; contracts
can spend only the remaining native balance. Unused chi is refunded, leaving
the sender charged for `chi_used`. For a native `currency.transfer`, CheckTx
also requires the transferred amount plus that reservation
(`chi_supplied / chi_rate`) to fit the sender's balance, so a transfer that
would fail for its fee after reservation is not admitted. In `free_metered` mode, the transaction remains metered but the
runtime creates no execution-fee debit or fee-derived rewards.

A failed execution in paid mode still debits its consumed chi. Every failed
metered transaction is charged at least the 5-chi base cost (never more than its
chi limit), including one that fails before execution starts, for example
because the target contract does not exist or cannot be prepared. Such a
transaction still gets a failed receipt and consumes its nonce.
Machine-dependent host faults (out of memory, operating system or storage
errors) halt the node instead of producing a receipt.

The [governed reward split](/node/staking#rewards-and-commission) applies to
the fee of every paid execution, successful or failed. A failed call earns no
developer reward: the developer share goes to the validators, as it does for a
contract without a developer. A sender whose balance cannot cover the failure
fee is charged the whole balance, and exactly that amount is paid out. The
failed receipt lists these payouts in `rewards` and `reward_records`. The
native-token supply only shrinks by the governed burn share.

## VM Costs

| Constant | Value |
| --- | ---: |
| storage read | 2 raw units per encoded byte |
| storage write | 25 raw units per encoded byte |
| submitted transaction bytes | 1 raw unit per byte |
| returned value bytes | 1 raw unit per byte |
| base transaction cost | 5 chi |
| initial paid-mode conversion in the canonical bundles | 20 chi per native-token unit |

The VM has a fixed compute and host-operation gas schedule. Cross-contract calls
pay a fixed dispatch cost plus the complete work of the called contract.
Hashing, signature verification, ZK verification, and other native bridges have
explicit costs.

One budget covers the entire execution: the entry function, nested calls, host
operations, and every deployed contract's module and constructor work. A factory
that deploys several children cannot obtain a fresh budget for each child.
Failed calls retain their measured cost even though their writes and events
roll back. Execution also has hard ceilings: the chain's per-transaction cap
(`max_tx_chi`, see below) and the VM's own limit of 1,000,000 chi for one V2
transaction. Increasing the submitted limit cannot remove either.

## Sizing Transactions

Keep writes and returned collections small, and supply an explicit positive
chi budget. The VM charges encoded storage and return bytes as well as
computation. The [Chi Cost Table](/reference/chi-costs) lists the VM's byte costs
and operation-specific limits.

Local `ContractingClient` tests use native V2 metering, but their state, call
context and supplied transaction bytes can differ from a submitted transaction.
Use a node simulation to estimate the intended transaction.

## Paid and Free-Metered Modes

Paid mode converts execution to native-token cost:

```text
token_cost = chi_used / chi_rate
```

Read `chi_rate` from `chi_cost.S:value`. The canonical bundles initialize it
to `20`, but validator governance can change it. Applications should query the
target network instead of hard-coding that initial rate.

The fee mode is a chain setting chosen at genesis, not node configuration.
Genesis stores it as the consensus state value `__fee_policy`, which is part
of the state hash, so every validator applies the same policy.

## Chain Chi Caps

`__fee_policy` has the same three fields in every fee mode:

| Field | Meaning | Default |
| --- | --- | ---: |
| `tx_fee_mode` | `paid_metered` or `free_metered` | `paid_metered` |
| `max_tx_chi` | largest `chi_supplied` one transaction may submit | 200,000 |
| `max_block_chi` | largest sum of `chi_supplied` over one block's transactions | 500,000 |

Chi is the only deterministic bound on execution time, and blocks execute
serially, so these caps bound how long one transaction and one block can delay
everything after them. A valid policy keeps
`0 < max_tx_chi <= max_block_chi <= 10,000,000`, and `max_tx_chi` must not
exceed the VM's per-transaction ceiling (`runtime_info()["max_tx_chi"]`,
1,000,000 chi). Genesis building and node startup both refuse a policy that
breaks these rules. A running chain changes the policy only through a
[governed state patch](/node/protocol-governance#local-bundle), and nodes
refuse a patch bundle whose policy breaks them.

The caps are enforced at every stage. CheckTx rejects a transaction whose
`chi_supplied` exceeds `max_tx_chi`. PrepareProposal packs transactions only
while the block's `chi_supplied` sum fits `max_block_chi`, and
ProcessProposal and FinalizeBlock reject a block or transaction that breaks
either cap. The rejection message names the cap.

The block cap counts the chi each transaction **supplies**, the only amount
known before execution, not the chi it uses. Oversupplying therefore shrinks
how many transactions fit in a block even though unused chi is refunded:
with the default 500,000 block cap, transactions that each supply 100,000 chi
fill a block after five. Supply a simulated estimate plus a small margin
rather than a large fixed budget.

A node whose `xian.toml` sets `tx_fee_mode`, `max_tx_chi` or `max_block_chi`
refuses to start, and node profiles that set them are rejected. Choose the
policy when the network is created:

```bash
xian network create <name> --tx-fee-mode free_metered \
  --max-tx-chi 200000 --max-block-chi 500000
```

`xian setup node --mode local` accepts the same options, and each cap flag
works in both fee modes; an omitted field takes the default above. A bundle
network records the canonical policy as `fee_policy` in its manifest and every
`xian node init` builds it into genesis; joining nodes cannot choose it.
`xian-stack` takes the same genesis inputs as `XIAN_TX_FEE_MODE`,
`XIAN_MAX_TX_CHI` and `XIAN_MAX_BLOCK_CHI`.

Contract balances and application-level payment rules remain unchanged.

## Estimate Before Submission

Readonly simulation returns the measured `chi_used` without committing state.
It includes source/argument bytes and a standard signed transaction envelope.
Because simulation happens before signing and nonce reservation, the final
envelope size can differ slightly.
SDK estimate helpers add configurable headroom. By default both xian-py and
xian-js supply `estimate + max(ceil(estimate * 5%), 10)` chi when a transaction
omits an explicit chi limit; unused chi is refunded. Estimates can fail when a node
disables simulation, caps it below the target transaction, or has different
state from the eventual execution block. The node never simulates with more
than the chain's `max_tx_chi`, so a dry run cannot report success for work
that no admitted transaction could pay for.

Use simulation as an estimate, then provide a bounded margin. Do not copy
historical benchmark values into a transaction policy.

## Contract Design

- minimize durable writes
- cache repeated reads in local variables
- keep stored keys and values compact
- avoid unnecessary cross-contract hops
- paginate broad storage scans
- expect proof-backed flows to cost more than simple public transfers

## Related Pages

- [Estimating Chi](/api/dry-runs)
- [Chi Cost Table](/reference/chi-costs)
- [Measuring Chi Costs](/smart-contracts/testing/chi-costs)
