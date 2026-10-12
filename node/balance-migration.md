# Import native balances into a fresh chain

The importer preserves each existing account address exactly, including case.
Users can spend with their current private keys before optional hybrid enrollment.
Enrollment starts disabled. Historical approvals, permits, streams, nonces and
account-registry entries are not imported.

Obtain a complete export at a finalized source-chain height and independently
verify its block hash and balances. The legacy BDS `state/currency.balances`
response includes both balances and allowances: the converter recognizes
`currency.balances:<account>` as funds and excludes
`currency.balances:<owner>:<spender>` as an allowance. Signed zero and scientific
notation are converted exactly; negative or unrepresentable balances stop the
conversion. Live paginated RPC queries are only suitable for rehearsal because
the legacy query does not bind the response to a block height.

Convert a JSON array of legacy `{key, value}` rows:

```bash
xian network convert-legacy-balances \
  --state legacy-state.json --contract-inventory source-contracts.json \
  --output snapshot.json \
  --chain-id SOURCE_CHAIN_ID --height SNAPSHOT_HEIGHT \
  --block-hash SNAPSHOT_BLOCK_HASH --total-supply EXACT_NATIVE_TOTAL \
  --scope complete
```

The converter reports the snapshot SHA-256 and excluded non-balance keys.
Reconcile the supplied total independently; an allowance is not part of supply.
For a partial rehearsal use `--scope sample` and its sample subtotal instead.

Create `plan.json` with schema `xian.balance_migration.v1`, a `source` object
containing the snapshot's `chain_id`, integer `height`, `block_hash` and file
`sha256`, a distinct `target_chain_id`, and `contract_dispositions`. User balances
cannot be redirected. Every nonzero contract holding needs a disposition with
`reason` and a `balances` map whose amounts sum exactly to that holding. Address
destinations retain their spelling. Contract destinations must be deployed by the
target genesis bundle; a name intended for later deployment is insufficient.
Review escrow and staking beneficiary obligations before assigning contract money.

```bash
xian network migrate-balances \
  --snapshot snapshot.json --plan plan.json \
  --contracts-dir /path/to/xian-configs/contracts --bundle mainnet \
  --output-dir /path/to/migration-bundle
```

Sample snapshots additionally require `--rehearsal`. Output must be a new directory.
The output includes current contract sources, a reconciled bundle, exact inputs,
and `migration-report.json`. Construction rechecks balances, input/source hashes,
constructor settings, supply and closed enrollment. The canonical mainnet
bundle has an empty `pending_snapshot` allocation and rejects genesis creation
without an explicit reconciled import. The importer does not transfer anything
on the source network.

Build the generated bundle with an explicit target chain ID and UTC genesis time:

```bash
xian network build-genesis \
  --contracts-dir /path/to/migration-bundle --bundle mainnet \
  --chain-id TARGET_CHAIN_ID --genesis-time ACCEPTED_UTC_TIME \
  --output /path/to/new-genesis.json
```

The time is used for constructor execution as well as the genesis header.
Independent operators must use identical inputs and compare the resulting hash.
This writes a file; it does not start a network or enable enrollment.

Complete snapshots also include `contracts`, the full source-contract name
inventory at the cutoff. Pass its JSON array file to the converter using
`--contract-inventory source-contracts.json`. This distinguishes a hexadecimal
contract name from an actual user account; such a contract's funds still require
an explicit disposition. New genesis contract names cannot collide with account
address syntax. Inventory completeness is part of independent source verification.
