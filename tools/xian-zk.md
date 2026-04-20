# xian-zk

`xian-zk` is the current external proving, wallet, and deployment-tooling
package for Xian's shielded note and shielded command flows.

It is not part of the validator runtime. Validators only need the runtime-side
`zk` verifier bridge. `xian-zk` is the off-chain package for:

- proving shielded deposit, transfer, and withdraw transitions
- proving shielded command execution transitions
- scanning encrypted note records
- managing shielded wallet state
- generating deployment bundles and verifying-key manifests

## Installation

```bash
pip install xian-tech-zk
```

The published PyPI package name is `xian-tech-zk`. The import package remains
`xian_zk`, and the CLI command remains `xian-zk-shielded-bundle`.

For local development against the editable workspace package:

```bash
cd xian-contracting/packages/xian-zk
uv sync --group dev
uv run maturin develop -r
```

## What It Ships

The current package surface includes:

- Groth16 / BN254 verification helpers
- shielded-note proof generation for the `shielded_note_v3` circuit family
- shielded-command proof generation for the `shielded_command_v4` circuit
  family
- note commitments, nullifiers, Merkle roots, and auth-path helpers
- `ShieldedWallet` for seed backup, wallet snapshots, sync, note selection, and
  request planning
- `ShieldedRelayTransferWallet` for relayed note-to-note transfers where the
  public L1 sender is the relayer instead of the hidden note owner
- `ShieldedRelayTransferProver` for proof-bound relayer-fee transfers on top of
  the shielded note pool
- `ShieldedCommandWallet` for planning relayed shielded commands with proof-bound
  relayer fees and optional proof-bound public spend
- encrypted note payload handling with separated spend keys and viewing keys
- anonymous note-discovery tags for newer encrypted payloads
- proof-bound output payload hashes for note and command outputs
- optional disclosed viewers on output payloads
- a CLI for generating a random shielded-note trusted-setup bundle plus a
  registry-ready manifest
- programmatic bundle / manifest generation for shielded-command circuits
- a trusted local prover service and matching prover clients for wallet-side
  proving offload

## Canonical Wallet Model

The current Python-side wallet model is:

- `owner_secret`: spend authority inside the shielded pool
- `viewing_private_key` / `viewing_public_key`: note decryption and disclosure
  authority
- `ShieldedWallet`: local state wrapper around keys, note records, commitments,
  and transaction planning

Basic example:

```python
from xian_py import Xian
from xian_zk import ShieldedWallet

indexed_client = Xian("http://127.0.0.1:26657")

wallet = ShieldedWallet.from_parts(
    asset_id=token.asset_id(signer="sys"),
    owner_secret="0x...",
    viewing_private_key="11" * 32,
)

wallet.sync_transactions(
    indexed_client.list_txs_by_contract("con_private_usd", limit=64, offset=0)
)
balance = wallet.available_balance()
```

`ShieldedWallet` now syncs from indexed transaction history rather than reading
encrypted note payloads out of contract state. On a live node, that means BDS
or another equivalent indexed transaction feed needs to be available.

For newer payloads, `xian-zk` no longer embeds the recipient viewing public key
in cleartext. Instead it stores anonymous discovery-tag entries plus ephemeral
keys inside the encrypted payload bundle. Wallet sync uses those entries to
prefilter candidate notes before full decryption.

Wallet snapshots:

```python
seed_backup = wallet.export_seed_json()
state_snapshot = wallet.to_json()
restored = ShieldedWallet.from_json(state_snapshot)
```

`seed_backup` is the minimal recovery secret. `state_snapshot` is the richer
resume file that keeps synced commitments and note state.

If you already have extracted note records, you can prefilter them before a
full sync:

```python
candidates = wallet.candidate_records(records)
sync_result = wallet.sync_records(candidates)
```

Indexed note records now also expose `payload_tags`, which indexers can persist
for future selective note-discovery queries. Newer wallet sync flows should use
the higher-level `shielded_wallet_history` feed first. That feed keeps the full
commitment sequence in note-index order and only includes `output_payload` for
rows whose indexed tag matches the wallet. If that feed is not available,
`ShieldedWallet.sync_indexed_client(...)` still falls back to the older
event/tag/transaction fan-out path.

Browser and mobile wallet integrations can now treat `state_snapshot` as a
first-class user backup. Stored shielded snapshots are included in full wallet
backup exports, and users can also store, export, or remove shielded wallet
snapshots directly through the wallet settings flows. Both wallet apps can now
also check indexed shielded history after a stored snapshot so users can tell
whether the chain has already advanced beyond that snapshot before attempting a
restore or spend.

## Runtime Cost Direction

Recent shielded-fee work moved the Merkle frontier append and relay-digest hot
paths out of Python contract code and into native `xian-zk` bindings exposed
through the runtime `zk` bridge. That was the change that materially lowered
shielded transaction cost.

Using the reproducible benchmark in
`xian-abci/scripts/benchmark_shielded_chi.py`, the local April 2026 numbers
for the current implementation are roughly:

- shielded deposit with 2 outputs: `3,347` chi
- shielded transfer with 2 inputs / 2 outputs: `3,600` chi
- shielded withdraw with 1 input / 1 output: `3,128` chi
- exact withdraw with no new output note: `2,175` chi
- relayed hidden-sender transfer: `5,288` chi

Those are still above a plain public transfer, but they are dramatically lower
than the earlier five-digit shielded costs from the all-Python contract path.

## Planning Shielded Actions

`ShieldedWallet` can build note requests and payloads directly:

```python
transfer_plan = wallet.build_transfer(
    recipient=recipient_bundle.recipient,
    amount=25,
)

withdraw_plan = wallet.build_withdraw(
    amount=10,
    recipient="alice",
)
```

The returned plan objects include:

- the proving request
- the selected input notes
- any change note
- encrypted output payloads to pass into the contract

Exact exits are supported. If a withdraw needs no change note, the plan uses
`outputs=[]`.

For hidden-sender note-to-note transfers, use `ShieldedRelayTransferWallet`:

```python
from xian_zk import (
    ShieldedRelayTransferProver,
    ShieldedRelayTransferWallet,
)

relay_wallet = ShieldedRelayTransferWallet.from_json(wallet.to_json())

relay_plan = relay_wallet.build_relay_transfer(
    recipient=recipient_bundle.recipient,
    amount=25,
    relayer="relayer-1",
    chain_id="xian-mainnet-1",
    fee=2,
)

relay_prover = ShieldedRelayTransferProver.build_random_bundle(
    contract_name="con_private_usd",
    vk_id_prefix="private-usd-relay-20260406",
)
relay_proof = relay_prover.prove_relay_transfer(relay_plan.request)
```

The relayed transfer binds all of the following into the proof statement:

- the spent input nullifiers
- the relayer account
- the chain id
- the optional expiry
- the exact relayer fee

That means the relayer can submit the transaction and get paid, but cannot
change the fee, redirect the execution to a different relayer account, or reuse
the proof on another chain.

## Private Submission Relayer

The proof-bound relayed transfer and shielded-command paths now also have a
concrete network-facing relayer service:

- Python client: `ShieldedRelayerClient`
- async Python client: `ShieldedRelayerAsyncClient`
- Python pool clients: `ShieldedRelayerPoolClient`,
  `ShieldedRelayerAsyncPoolClient`
- TypeScript client: `XianShieldedRelayerClient`
- TypeScript pool client: `XianShieldedRelayerPoolClient`
- stack-managed runtime: `xian-shielded-relayer`

HTTP surface:

- `GET /health`
- `GET /v1/info`
- `GET /metrics`
- `POST /v1/quote`
- `POST /v1/jobs/shielded-note-transfer`
- `POST /v1/jobs/shielded-command`
- `GET /v1/jobs/{job_id}`

The important rule is that `quote` returns the exact relayer account, chain id,
fee, and expiry that the proof must bind. The relayer service then submits the
matching on-chain call through the normal `xian-py` transaction path.

Networks can now advertise one or more relayers in their manifest. The
canonical field is `shielded_relayers`, while the older single-entry
`shielded_relayer` field is still readable for compatibility.

The canonical network manifests can also carry three privacy-specific policy
surfaces alongside those relayer endpoints:

- `privacy_artifact_catalog`: a checksum-pinned catalog of approved shielded
  registry manifests for that network
- `shielded_history_policy`: the network's compatibility and retention
  commitment for `shielded_wallet_history`
- `privacy_submission_policy`: the network's operator-facing relayer auth and
  hidden-sender submission posture

Example:

```json
{
  "shielded_relayers": [
    {
      "id": "primary-eu",
      "base_url": "https://relayer-eu.example.org",
      "auth_scheme": "bearer",
      "public_info": true,
      "public_quote": false,
      "public_job_lookup": false,
      "priority": 10,
      "submission_kinds": [
        "shielded_note_relay_transfer",
        "shielded_command"
      ]
    }
  ]
}
```

The current CLI-side selection rule is intentionally simple: sort by
`priority`, then `id`, then `base_url`, and expose the first entry as the
primary relayer while keeping the full catalog available to tooling. The routed
pool clients in `xian-py` and `xian-js` now use that same ordered catalog.

If a public network actually enables shielded assets, the recommended posture
is:

- publish approved registry manifests through `privacy_artifact_catalog`
- treat `shielded_history_policy` as a real operator commitment, not a hint
- make the relayer auth and retention posture in
  `privacy_submission_policy` match the deployed relayer configuration

Current pool-client behavior is:

- `get_info` / `getInfo` and `get_quote` / `getQuote` can fail over across the
  ordered relayer list
- submit and `get_job` / `getJob` stay explicitly routed when more than one
  relayer is configured
- if only one candidate relayer exists for a submission kind, submit can use it
  directly without an explicit relayer id

That split is intentional: quote/info are safe to retry, but submissions are
proof-bound to a specific relayer and job ids are relayer-local.

For local operator use through `xian-stack`:

```bash
export XIAN_SHIELDED_RELAYER_PRIVATE_KEY=<relayer-ed25519-private-key>
python3 ./scripts/backend.py start --no-service-node --shielded-relayer
python3 ./scripts/backend.py endpoints --no-service-node --shielded-relayer
```

The relayer can optionally require a bearer token for quote and submission
routes:

```bash
export XIAN_SHIELDED_RELAYER_AUTH_TOKEN=local-dev-token
```

If the relayer binds to a non-loopback host, the current stack-managed runtime
now requires `XIAN_SHIELDED_RELAYER_AUTH_TOKEN`. Treat that as a minimum
hardening rule, not an optional production extra.

Operational knobs now also include:

```bash
export XIAN_SHIELDED_RELAYER_PUBLIC_INFO=1
export XIAN_SHIELDED_RELAYER_PUBLIC_QUOTE=0
export XIAN_SHIELDED_RELAYER_PUBLIC_JOB_LOOKUP=0
export XIAN_SHIELDED_RELAYER_METRICS_ENABLED=1
export XIAN_SHIELDED_RELAYER_METRICS_PUBLIC=0
export XIAN_SHIELDED_RELAYER_RATE_LIMIT_REQUESTS_PER_MINUTE=120
export XIAN_SHIELDED_RELAYER_RATE_LIMIT_BURST=30
export XIAN_SHIELDED_RELAYER_JOB_HISTORY_TTL_SECONDS=86400
```

`expires_at` uses the canonical contract-time string format:

```text
YYYY-MM-DD HH:MM:SS
```

That second-resolution format is important because the proof binds the same
logical expiry value the contract checks on-chain.

Operational privacy notes:

- the relayer is a trusted submission hop, not an anonymity network
- the relayer can still observe submitter transport metadata unless another
  anonymity layer sits in front of it
- relayer job lookups are for short-lived operational status, not long-term
  privacy-preserving storage
- `/metrics` is for operator monitoring, and should normally stay private on
  shared relayers

## Trusted Local Prover Service

`xian-zk` now ships a local prover-service entrypoint for wallet-side proving
offload:

```bash
uv run xian-zk-prover-service \
  --host 127.0.0.1 \
  --port 8787 \
  --auth-token local-dev-token \
  --insecure-dev-note \
  --insecure-dev-command
```

Clients can talk to that service directly:

```python
from xian_zk import ShieldedNoteProverClient

client = ShieldedNoteProverClient(
    "http://127.0.0.1:8787",
    auth_token="local-dev-token",
)
proof = client.prove_deposit(deposit_plan.request)
```

This is a trusted local companion service, not a true split-prover protocol.
It improves browser/mobile deployment options, but the service still handles
the witness material.

For relayed anonymous execution, use `ShieldedCommandWallet`:

```python
from xian_zk import ShieldedCommandWallet

command_wallet = ShieldedCommandWallet.from_json(wallet.to_json())

command_plan = command_wallet.build_command(
    target_contract="con_shielded_dex_adapter",
    relayer="relayer-1",
    chain_id="xian-mainnet-1",
    fee=5,
    public_amount=100,
    payload={
        "action": "swap_exact_in",
        "pair": 7,
        "recipient": "alice",
        "amount_out_min": 95,
        "deadline": "2026-04-04 13:00:00",
    },
)
```

The command plan includes:

- the proving request
- selected hidden input notes
- any hidden change note
- encrypted hidden output payloads
- the bound `command_binding` and `execution_tag`

The `public_amount` is part of the proof statement. Allowlisted adapter
contracts can spend only that exact public budget during the active execution.

## Deployment CLI

For a real deployment, use the CLI instead of the deterministic dev bundle:

```bash
uv run xian-zk-shielded-bundle \
  --output-dir ./artifacts/private-usd-mainnet \
  --contract-name con_private_usd \
  --vk-id-prefix private-usd-mainnet-20260327
```

The output directory contains:

- `shielded-note-bundle.json`: private proving bundle
- `shielded-note-registry-manifest.json`: public verifying-key manifest
- `shielded-note-deployment.md`: operator registration / binding guide

The manifest can be registered directly in `zk_registry` and then bound into
the token contract with `configure_vk(...)`.

The registry entries now carry richer metadata. The easiest operator path is to
register each manifest entry directly after removing the helper-only `action`
field:

```python
for entry in manifest["registry_entries"]:
    args = dict(entry)
    args.pop("action", None)
    zk_registry.register_vk(**args, signer="sys")
```

## Dev Bundle vs Deployment Bundle

For local tests:

```python
from xian_zk import ShieldedNoteProver

prover = ShieldedNoteProver.build_insecure_dev_bundle()
```

For deployment:

```python
prover = ShieldedNoteProver.build_random_bundle(
    contract_name="con_private_usd",
    vk_id_prefix="private-usd-mainnet-20260327",
)
manifest = prover.registry_manifest()
```

For shielded commands:

```python
from xian_zk import ShieldedCommandProver

command_prover = ShieldedCommandProver.build_random_bundle(
    contract_name="con_shielded_commands",
    vk_id_prefix="shielded-command-mainnet-20260404",
)
command_manifest = command_prover.registry_manifest()
```

The deployment bundle is random and suitable for operator use. The dev bundle
is deterministic local tooling only.

For relayed note transfers:

```python
from xian_zk import ShieldedRelayTransferProver

relay_prover = ShieldedRelayTransferProver.build_random_bundle(
    contract_name="con_private_usd",
    vk_id_prefix="private-usd-relay-20260406",
)
relay_manifest = relay_prover.registry_manifest()
```

## Important Warning

The built-in deployment generator is still a single-party random trusted setup.
That is a real deployment path, but it is not a substitute for an MPC
ceremony.

If a network wants ceremony-grade trust reduction, use the explicit import and
validation flow rather than treating the built-in random generator as an MPC
flow:

```bash
xian-zk-shielded-bundle validate-note --bundle ./ceremony-note-bundle.json
xian-zk-shielded-bundle import-note \
  --bundle ./ceremony-note-bundle.json \
  --output-dir ./artifacts/note

xian-zk-shielded-bundle validate-command --bundle ./ceremony-command-bundle.json
xian-zk-shielded-bundle import-command \
  --bundle ./ceremony-command-bundle.json \
  --output-dir ./artifacts/command
```

The import flow enforces bundle-shape validation plus setup metadata checks. If
`setup_mode` is not `insecure-dev` or `single-party`, the bundle must carry a
non-empty `setup_ceremony` label so operators can track ceremony provenance in
network rollout and rotation policy.

## Prover Service Guardrails

`xian-zk-prover-service` still assumes the prover is trusted with witness
material, but it now has basic bind-safety guardrails:

- loopback binds are allowed without extra flags
- non-loopback binds are refused unless `--unsafe-allow-remote-host` is passed
- non-loopback binds also require a non-empty `--auth-token`

So the intended posture is still "local trusted prover first", with deliberate
operator acknowledgement required before exposing the service to any remote
network path.

## See Also

- [Building a Shielded Privacy Token](/tutorials/shielded-privacy-token)
- [Building Shielded Commands](/tutorials/shielded-commands)
- [ZK Stdlib](/smart-contracts/stdlib/zk)
