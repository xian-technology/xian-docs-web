# 5-Validator Localnet E2E

The `xian-stack` localnet harness validates the integrated runtime on one
machine with five validators, the fixed Xian VM, and optional indexed services.

## Choose a Flow

| Goal | Command |
| --- | --- |
| disposable five-node network | `LOCALNET_NODES=5 make localnet-init && make localnet-up` |
| broad whole-stack E2E | `make localnet-e2e` |
| validator/governance safety | `make localnet-protocol-safety` |
| release-grade gate | `make release-safety` |

Use the clean localnet for interactive debugging. Use the E2E or release gate
when you need recorded cross-repo evidence.

## Run the Harness

```bash
cd ../xian-stack
make localnet-e2e
```

Machine-facing equivalent:

```bash
python3 ./scripts/backend.py localnet-e2e
```

By default, `make localnet-e2e` rebuilds the node image from the local
`xian-abci`, `xian-configs`, `xian-contracting` and `xian-py` checkouts.
Update those checkouts before running if you want to test current `main`.
Local edits are included in the build. Setting `LOCALNET_E2E_BUILD=0` reuses
an existing image, so its compiler and VM can differ from the host checkout.

The full harness uses periodic block production at a one-second interval,
including when throughput tuning is selected. Agreement and result-hash checks
need subsequent proof blocks even when the mempool is empty. Set
`XIAN_LOCALNET_BLOCK_POLICY_INTERVAL` to keep another periodic interval; an
explicit `XIAN_LOCALNET_BLOCK_POLICY_MODE=on_demand` is rejected before
bootstrap. This requirement belongs to the full E2E harness. An interactive
localnet can use on-demand production and is expected to stop advancing while
idle.

For scheduled and manually dispatched **Localnet Safety** runs, the selected
`xian-stack` revision determines the inputs. Its `release-manifest.json` pins
the four node build repositories by commit. The shared checkout action in
`.github/actions/checkout-localnet/action.yml` pins the CLI and, for the full
suite, the contract catalog, DEX and DEX recovery worker.
To reproduce a hosted run locally, check out those same commits before building.

The Make target uses the locked `xian-stack` Python environment, including
the native ZK binding that generates shielded proofs. A fresh host needs a
Rust toolchain (1.98 or newer) and C compiler to build the native
dependencies. To require
shielded coverage explicitly:

```bash
make localnet-e2e LOCALNET_E2E_REQUIRE_SHIELDED=1
```

`make release-safety` always enables this requirement: a missing native binding
fails before network setup, and a skipped shielded phase fails the run.
Ordinary developer runs allow missing native ZK support and record the phase
as skipped, so check the summary before treating a run as full coverage.
The focused IntentKit suite does not contain the shielded phase and rejects
this requirement; use the full suite for shielded coverage.
Resuming after a required phase also requires its saved successful, non-skipped
result. An earlier optional skip cannot be promoted into required coverage.

Artifacts are written under:

```text
.artifacts/localnet-e2e/<run-id>/
```

Successful runs contain `summary.json`, per-phase JSON, and the generated
network description. A failed phase writes its error to its phase JSON and
captures bounded RPC, peer, container-state, and container-log diagnostics in
`<phase>-failure/nodes.json` before release-gate cleanup removes the containers.
Unavailable probes are recorded as errors without replacing the original
failure. The protocol safety harness captures the same diagnostics in its
own artifact directory.

A failed run can resume from a supported phase with the
backend's `--start-phase` and `--resume-dir` options. Resume at a phase that
has not begun. Use a fresh run when repeating a partially executed recovery,
nonce, accounting, or replay scenario: those checks retain stateful fixtures
and refuse to reuse existing observer or replay directories.

## Coverage

### IntentKit Payment Integration

Run the focused five-validator payment suite from `xian-stack` with a sibling
`xian-intentkit` checkout:

```bash
make localnet-e2e LOCALNET_E2E_SUITE=intentkit-x402 LOCALNET_E2E_INTENTKIT_X402=1
```

This runs bootstrap, health, core x402 settlement and the IntentKit x402 buyer
phase. All four are required; a skipped phase fails this suite. The separate
`IntentKit x402 Integration` GitHub workflow pins sibling revisions, runs weekly
and on relevant pull requests, and supports manual dispatch. Core node CI does
not require IntentKit.

The test uses a local HTTP seller, generated test wallets and real settlement
on the five-node chain. It checks payment state, consumed allowance and buyer/
seller balances on every validator. It supplies agent context and signer lookup
and captures the order in memory; LLM orchestration and IntentKit database
persistence are outside its coverage. No external AI-provider credentials are
needed. CI publishes source revisions, a phase summary and node report, excluding
private network/configuration files and signed payment payloads.

### Full Suite

The layered harness covers:

- five-node startup, health, peers, validator count, and app-hash agreement
- application version, submission-name admission, and query-height/error
  semantics through each running node's CometBFT RPC
- rejection of forged and noncanonical Ed25519 transactions at each node,
  plus committed contract verification of valid and adversarial signatures
- genesis contract timestamps matching the genesis header across all five nodes
- proposal byte-budget and nonce-selection checks in isolated processes using
  each node image's installed runtime and fee configuration
- real deployment at the 64-character contract-name limit, with constructor
  state checked through RPC on all five validators
- `xian-py` reads, simulation, source deployment, and transactions
- nested contract deployment/calls and rollback, immediate-caller ownership,
  authorized ownership transfer, and rejection of unauthorized metadata changes
- shared execution budgets across serial and nested constructors, including
  consumed-chi accounting after failed execution
- rejection of unencodable writes with rollback and continued block production
- dictionary duplicate replacement, numeric-key equality, exact large-integer
  comparisons, and nested list removal; unhashable-key failures roll back writes
  and events, with matching receipts on all five validators and a successful
  follow-up transaction
- periodic, burst, conflicting, and invalid transaction workloads
- DEX bootstrap and mixed trading
- canonical DEX automation recovery (`07-dex-automation-recovery`): concurrent
  evaluation, a process killed after broadcast, recovery through another validator
  during a configuration change, reverted-swap follow-up, and an unrelated wallet
  transfer while automation is pending; receipts and balances agree across all
  five validators, with no duplicate nonce consumption or input-token debit;
  hidden receipts for successful and reverted swaps must allow independent
  same-wallet trades without repeating the original decision, including across
  worker recreation, RPC reload, and eventual receipt restoration
- BDS outage, catch-up, indexed reads, reindex, and watchers
- validator governance, policy transitions, governed fee-distribution changes,
  and rejection of contract-mediated validator registration
- governed forward state patches
- application logging modes
- shielded-note and relayed proof flows with governed verifier registration
- same-block ordering: independent writers, one sender's nonce sequence,
  read-after-write, and prefix scans within a block
- restart/chaos convergence and soak checks
- process crashes before state persistence, after persistence, and before the
  commit response, with transaction effects and nonces checked after recovery
- real 4/1 and 3/2 network partitions, progress with quorum, a halt without
  quorum, reconvergence after healing, and a full-network restart
- fresh non-validator catch-up from genesis, followed by signed full-store
  export/restore, pre-checkpoint evidence verification, rejected tampered or
  incomplete archives, and restart convergence
- stale-time preflight, idle block-policy checks, successor unbond anchors and
  evidence-retention growth across restore/restart
- nonce gaps, conflicting pending nonces, submission-node restart, replay
  rejection, and a queued transaction whose balance becomes insufficient
- zero-chi admission rejection at every node without consuming the sender's nonce
- a seeded accounting model covering transfers, minting, burning, staking,
  unstaking, failed-call rollback, native fees, rewards, and a network restart
- exact transaction-size boundaries, pending transaction bytes exceeding one
  block, compute exhaustion with rollback, and successful execution afterward
- offline replay from public block data, rebuilding application state and
  comparing every block's application root, transaction outcomes, chi usage, and events

The `03-contract-functionality` phase deploys authored contracts and exercises successful calls and expected failures on the five-node network. V2 coverage includes exact decimal literals, numeric inputs, division, rounding, and failure rollback alongside collection, storage, import, event, time and authorization cases. The runner compares receipts and state across validators.

The [source and coverage matrix](https://github.com/xian-technology/xian-stack/tree/main/workloads/e2e/contract_suite)
describes the scenarios and exclusions. Nominal builtin coverage does not prove
full Python compatibility or coverage of every input combination.

The validator-governance phase proposes and approves a non-default transaction
fee split of 60% validators, 10% burn, 10% foundation, and 20% contract
developers. It waits for the `rewards` state to converge on all five nodes,
executes a fee-paying contract transaction, and verifies the resulting
validator/delegator, implicit burn, foundation, and developer totals against
the approved ratios. The test-specific split is deliberately different from
the canonical 70/0/0/30 genesis default.

The `15-zk-feature-toggle` phase switches the chain's `zk` runtime feature with
governed state patches. It checks that a zk contract deploys and runs while zk
is on, that zk calls, zk deploys and shielded-token calls fail with ordinary
charged receipts while it is off (a plain call still succeeds and simulation
reports the same reason), and that everything works again after a second patch
turns it back on. Node-4 is stopped through each activation and must catch up
with identical app hashes and block results.

## Recovery and Accounting Checks

Recovery phases temporarily stop validators, disconnect Docker networks, and
terminate an application process at a selected persistence boundary. Each
crash scenario checks that the network recovers without losing or duplicating
the transaction. Crash hooks are installed only in disposable test containers;
they are not included in the node image.

The partition test checks voting power before splitting the network. Four
validators must keep producing blocks when one is isolated. With neither side
holding more than two thirds of the voting power, the 3/2 split must halt.
E2E bootstrap assigns fixed container addresses within a Docker-selected local
subnet so partition reconnects and process restarts preserve peer addresses.
After reconnecting, all five nodes must agree on application hashes and block
results. Fresh observers have newly generated keys and no validator voting
power. They must catch up to the running network. Peer-to-peer application
state sync is disabled; full-store restore requires the separate bootstrap
checks in [Snapshot Restore Boundaries](/node/recovery-plans#snapshot-restore-boundaries).

The accounting phase compares contract state after each operation against a
separate Python model, including zero, negative, and oversized amounts. It
checks conservation of the test asset, rollback on failure, native currency
charged as fees, and the net supply reduction from
burning. The governed fee-distribution phase checks reward recipients and
ratios. A restart midway through the accounting sequence checks persistence.
The default accounting workload is 48 operations:

```bash
LOCALNET_E2E_INVARIANT_ROUNDS=120 \
LOCALNET_E2E_SEED=accounting-review-1 \
make localnet-e2e
```

The seed and operation trace are recorded with the phase results. A seed
reproduces the generated choices; network timing and block grouping can vary.

## Replay Across Architectures

A successful E2E run exports `replay-corpus/` and performs a local replay. The
corpus contains public configuration, CometBFT block databases, expected
result digests, source revisions, execution policy and the source image ID.
Application state and validator private
keys are excluded. A fresh application must re-execute the stored blocks;
copying an existing state database cannot satisfy this test.

The scheduled **Localnet Safety** workflow uses that same corpus on native
ARM64 and x86-64 runners. Each runner builds the runtime from the five captured
revisions: Stack, ABCI, contracting, Python SDK and configs. Reviewed replay
harness code and hooks come from the workflow revision in a separate checkout,
outside those captured runtime trees. The result records both
`replay_harness_revision` and `runtime_stack_revision`.

Native replay compares each height's transaction-result digest, including receipt
fee data and events, and its post-block application root. The live five-node gate
separately compares complete `block_results`, consensus updates and the next
header's `LastResultsHash`. These checks do not independently assert equality of
every field in the entire `FinalizeBlock` response envelope. A local E2E pass
covers the host architecture; check both CI replay jobs before treating
cross-architecture behavior as validated.

Exported replay configuration and the disposable extracted configuration clear
`persistent_peers`, `seeds` and `external_address`, and disable peer exchange. This removes
source-network DNS and advertised-address dependencies without rewriting a
retained archive, genesis or ledger data. An exited replay container fails
promptly instead of waiting for the replay deadline; its local diagnostic log is
written with private file permissions.

Private replay jobs schedule cleanup of plaintext and raw diagnostics on success
or failure. Cleanup-step success does not prove file absence: directory removal
is best effort. Retain the replay proofs, then separately remove and verify the
absence of temporary transport secrets, evidence refs and local key files.

To check a retained corpus against a locally built node image:

```bash
uv run python scripts/localnet_replay_corpus.py \
  --corpus .artifacts/localnet-e2e/<run-id>/replay-corpus \
  --image xian-node-integrated:local --output .artifacts/replay-check
```

Use a fresh output directory. Its `result.json` records the image,
architecture, replay height, root, and number of compared blocks. Local runs
also flag uncommitted source changes; CI requires committed revisions so the
replay builds can reproduce the source network.

The replay tool checks the selected image's execution policy before extracting
blocks or creating the output directory. Current-revision replay accepts
independently built images with the same policy, so ARM64 and x86-64 can be
compared. The recorded source image ID remains provenance, not a requirement
that both architectures share the same image bytes.

Keep the captured corpus and its expected hashes unchanged. A Git revision
alone cannot reproduce a run made from uncommitted sources; retain the exact
image or a verified source/build bundle for that run.

## Release Safety

```bash
make release-safety
```

This runs release validation for the contracting/runtime repos, stack
validation, the full E2E, a node capability report, and protocol-safety
coverage. Use it before tagging changes to execution, genesis, networking,
governance, validator behavior, or localnet plumbing.

## Operational Notes

- Generated validator keys and proving material are disposable local test
  assets.
- The BDS phase intentionally causes an outage; block production must continue
  and the indexed head must recover afterward.
- Localnet PostgreSQL uses a Docker-managed volume. Normal `localnet-down`
  preserves it; a fresh E2E bootstrap and `localnet-clean FORCE=1` remove the
  generated localnet's volumes. Copying `.localnet/` alone does not back up BDS.
- Shielded phases perform real proving and can dominate runtime. Recovery and
  replay add temporary observer containers and extra disk usage. The resource
  boundary phase deliberately submits several large transactions; leave Docker
  enough memory and disk space for the five validators plus an observer. That
  phase temporarily allows 30 seconds for proposals and 10 seconds for voting
  steps so full-size blocks can propagate at the configured P2P bandwidth. It
  restores the ordinary timings afterward; this is a resource-boundary check,
  not a throughput benchmark.
- `TRACE` logging is temporary diagnostic posture.
- A running container is not ready until health checks pass.
- `make localnet-clean` is destructive and requires `FORCE=1`.

## Review Results

Inspect `summary.json`, the first failing phase, BDS indexed-height progress,
node application logs, Docker logs, and final app-hash agreement. Preserve the
run directory with the exact sibling SHAs when using it as release evidence.
