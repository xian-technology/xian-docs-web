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
uv run maturin develop
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
- proof-bound output payload hashes for note and command outputs
- optional disclosed viewers on output payloads
- a CLI for generating a random shielded-note trusted-setup bundle plus a
  registry-ready manifest
- programmatic bundle / manifest generation for shielded-command circuits

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

Wallet snapshots:

```python
seed_backup = wallet.export_seed_json()
state_snapshot = wallet.to_json()
restored = ShieldedWallet.from_json(state_snapshot)
```

`seed_backup` is the minimal recovery secret. `state_snapshot` is the richer
resume file that keeps synced commitments and note state.

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

If a network wants ceremony-grade trust reduction, the next step is importing
externally generated proving material rather than treating the built-in random
generator as an MPC flow.

## See Also

- [Building a Shielded Privacy Token](/tutorials/shielded-privacy-token)
- [Building Shielded Commands](/tutorials/shielded-commands)
- [ZK Stdlib](/smart-contracts/stdlib/zk)
