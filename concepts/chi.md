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

The 5-chi base counts against the submitted chi limit: execution runs out of
chi as soon as `chi_used` would exceed it, so `chi_used` never exceeds the
limit and a transaction must supply its full cost, base included. In `paid_metered` mode, the
sender must be able to cover that limit during admission and at execution.
Execution reserves the full supplied budget at the entry chi rate; contracts
can spend only the remaining native balance. Unused chi is refunded except
for the [unused-chi charge](#unused-chi-charge): half of the supplied chi
the transaction did not use. The receipt's `chi_used` is the chi the sender is
charged for, that charge included. For a native `currency.transfer`, CheckTx
also requires the transferred amount plus that reservation
(`chi_supplied / chi_rate`) to fit the sender's balance, so a transfer that
would fail for its fee after reservation is not admitted. In `free_metered` mode, the transaction remains metered but the
runtime creates no execution-fee debit or fee-derived rewards.

A failed execution in paid mode still debits its consumed chi. Every failed
metered transaction is charged at least the 5-chi base cost (never more than its
chi limit), plus the unused-chi charge on the rest of its limit, including one
that fails before execution starts, for example
because the target contract does not exist or cannot be prepared. Such a
transaction still gets a failed receipt and consumes its nonce.
Machine-dependent host faults (out of memory, operating system or storage
errors) halt the node instead of producing a receipt.

The [governed reward split](/node/staking#rewards-and-commission) applies to
the fee of every paid execution, successful or failed. A failed call earns no
developer reward: the developer share goes to the validators, as it does for a
contract without a developer. A sender whose balance cannot cover the failure
fee is charged the whole balance, and exactly that amount is paid out; a
negative balance is left as it is and pays nothing. A sender whose balance is
not a number cannot pay: the transaction fails with `Sender balance is not a
number.`, is charged nothing and leaves the balance untouched. The failed
receipt lists the payouts in `rewards` and `reward_records`.

Rewards are paid in full or not at all. If a reward input has a type it may
not hold (a split that is not four numbers, a foundation owner, validator,
reward key or developer that is not a string, a validator term that is not a
number), an amount cannot be represented, or a recipient's balance is not a
number, the transaction pays no rewards and its fee is burned. The
transaction itself is unaffected, so the governance transaction that repairs
the configuration still runs. The native-token supply only shrinks by the
governed burn share (with its rounding dust), by the unused-chi charge and by
fees burned this way.

Fee and reward arithmetic uses the contract decimal type (30 fractional
digits; products and quotients truncated toward zero). The fee is
`chi_used / chi_rate`. Each share of it is computed from the paid chi, which
stops at the chi the execution used: the unused-chi charge earns no reward and
is burned
(proportional shares as `amount × weight ÷ total weight` with one truncation,
the last participant of a split taking what is left, the foundation share
rounded down to 8 places) and divided by the chi rate. So the payouts never
exceed the fee, none is negative, and what is not paid out (the governed burn
share, the truncation dust and the unused-chi charge) is burned: paid out plus
burned equals the fee exactly. A split whose validator, foundation and developer ratios are negative
or sum to more than one pays no rewards (the fee is burned).

## VM Costs

| Constant | Value |
| --- | ---: |
| storage read | 2 raw units per encoded byte |
| storage write | 25 raw units per encoded byte |
| submitted transaction bytes | 1 raw unit per byte |
| returned value bytes | 25 raw units per encoded byte (less than 128 KiB) |
| base transaction cost | 5 chi |
| contract deployment, charged before compiling | 15,000,000 raw units plus 100 per submitted source byte |
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
how many transactions fit in a block: with the default 500,000 block cap,
transactions that each supply 100,000 chi fill a block after five. Supply the
simulated estimate (plus the SDKs' 2-chi margin) rather than a large fixed
budget.

### Unused-chi charge

Because capacity is counted by supplied chi, supplied chi that goes unused
still kept other transactions out of the block. In paid mode a transaction is
therefore charged half of the chi it supplied but did not use, rounded
down, on top of the chi it used:

```text
chi_used (receipt) = used + (chi_supplied - used) // 2
```

`used` is the execution's chi (for a failure at least the 5-chi base; a
transaction that runs out of chi used its whole limit and leaves nothing
unused). The charge is burned: fee rewards are computed on `used` alone, so
no validator, delegator or contract developer earns from wasted capacity.
A 1-chi margin costs nothing, and a transaction that supplies the simulated
estimate plus the SDKs' 2-chi margin pays one chi more than its estimate.
Without the charge, three transactions of 166,666 supplied chi each filled a
block for about 255 chi apiece and kept every other transaction out; now that
costs about 250,000 chi per block, half of filling the block with real work.
`free_metered` chains charge no fees, so they charge no unused chi either. A
sender whose balance cannot cover its reservation when the transaction
executes pays the failure charge from what is left, as any failure does.

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
It runs the transaction as it will be submitted: the source/argument bytes,
the signed envelope with the payload's `nonce` when the request gives one
(else the sender's next committed nonce) and the estimate itself as
`chi_supplied`, and, when the sender can pay it, the fee reservation of the
estimate. So a call that writes the sender's native balance (a XIAN
transfer, for example) stores the same reserved balance in simulation as in
execution, and pays for the same stored digits. A sender who cannot pay the
estimate still gets one; nothing is reserved then.
For the same chain state, execution charges exactly the simulated `chi_used`,
and supplying one chi less runs out of chi. Rarely, the digits of the
reserved balance make no supply use exactly itself (supplying 254 chi uses
255, supplying 255 uses 254); the estimate is then the smallest supply that
pays for its own run, and execution charges the chi that run used, a chi or
two less. A transaction that lands between
the estimate and execution can change that state, though: a stored value can
grow by a byte, and the call then costs one chi more. So when a transaction
omits an explicit chi limit, xian-py and xian-js (and the wallets and apps
built on them) supply the simulated chi plus a fixed margin of 2 chi
(`CHI_ESTIMATE_MARGIN`), never more than the chain's default per-transaction
cap of 200,000 chi; an estimate above that cap is refused before signing.
`estimate_chi`/`estimateChi` return the simulated value as `estimated`, and
`chi_to_supply(estimated)`/`chiToSupply(estimated)` apply the rule. The
unused-chi charge takes half of the margin, rounded down, so the margin costs
one chi. An explicit chi limit is supplied unchanged; a generous one pays half
of what it leaves unused.

Estimates can fail when a node disables simulation, caps it below the target
transaction, or has different state from the eventual execution block. If the
state changes more than the margin covers between the estimate and execution
(a pool moved, a recipient was created), the transaction can run out of chi:
it fails with `Out of chi.`, pays for the chi it used and changes nothing else.
Wallets and apps report that as a state change; estimate again and resubmit.
The node never simulates with more than the chain's `max_tx_chi`, so a dry run
cannot report success for work that no admitted transaction could pay for.

Supply the simulated chi plus the margin (or let the SDK do it). Do not copy
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
