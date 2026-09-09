# Chi and Metering

Chi is Xian's deterministic execution budget and fee unit. It is not a separate
token.

Every transaction supplies a chi limit. The runtime meters VM work, host calls,
storage, transaction bytes, return data, and native bridges against that limit.
If execution runs out of chi, its state and events roll back.

## Accounting

```text
chi_used = (raw_meter_cost // 1000) + 5
```

The result is capped by the submitted chi limit. In `paid_metered` mode, the
sender must be able to cover that limit during admission and is charged for
`chi_used`. In `free_metered` mode, the transaction remains metered but the
runtime creates no execution-fee debit or fee-derived rewards.

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

## Sizing Transactions

Keep writes and returned collections small, and supply an explicit positive
chi budget. The VM charges encoded storage and return bytes as well as
computation. The [Chi Cost Table](/reference/chi-costs) lists the VM's byte costs
and operation-specific limits.

Local Python harness limits and metering are separate from the network VM.
Use a node simulation to estimate the intended transaction.

## Paid and Free-Metered Modes

Paid mode converts execution to native-token cost:

```text
token_cost = chi_used / chi_rate
```

Read `chi_rate` from `chi_cost.S:value`. The canonical bundles initialize it
to `20`, but validator governance can change it. Applications should query the
target network instead of hard-coding that initial rate.

Free-metered networks should set explicit caps:

```toml
tx_fee_mode = "free_metered"
free_tx_max_chi = 1000000
free_block_max_chi = 20000000
```

The transaction cap limits one submitted budget. The block cap limits the sum
of submitted budgets accepted into a proposal. Contract balances and
application-level payment rules remain unchanged.

## Estimate Before Submission

Readonly simulation returns the measured `chi_used` without committing state.
SDK estimate helpers add configurable headroom. Estimates can fail when a node
disables simulation, caps it below the target transaction, or has different
state from the eventual execution block.

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
