# xian-zk

`xian-zk` is the current external proving, wallet, and deployment-tooling
package for Xian's shielded-note token flow.

It is not part of the validator runtime. Validators only need the runtime-side
`zk` verifier bridge. `xian-zk` is the off-chain package for:

- proving shielded deposit, transfer, and withdraw transitions
- scanning encrypted note records
- managing shielded wallet state
- generating deployment bundles and verifying-key manifests

## Installation

```bash
pip install xian-zk
```

For local development against the editable workspace package:

```bash
cd xian-contracting/packages/xian-zk
uv sync --group dev
uv run maturin develop
```

## What It Ships

The current package surface includes:

- Groth16 / BN254 verification helpers
- shielded-note proof generation for the `v2` circuit family
- note commitments, nullifiers, Merkle roots, and auth-path helpers
- `ShieldedWallet` for seed backup, wallet snapshots, sync, note selection, and
  request planning
- encrypted note payload handling with separated spend keys and viewing keys
- optional disclosed viewers on output payloads
- a CLI for generating a random trusted-setup bundle plus a registry-ready
  manifest

## Canonical Wallet Model

The current Python-side wallet model is:

- `owner_secret`: spend authority inside the shielded pool
- `viewing_private_key` / `viewing_public_key`: note decryption and disclosure
  authority
- `ShieldedWallet`: local state wrapper around keys, note records, commitments,
  and transaction planning

Basic example:

```python
from xian_zk import ShieldedWallet

wallet = ShieldedWallet.from_parts(
    asset_id=token.asset_id(signer="sys"),
    owner_secret="0x...",
    viewing_private_key="11" * 32,
)

wallet.sync_records(token.list_note_records(start=0, limit=64, signer="sys"))
balance = wallet.available_balance()
```

Wallet snapshots:

```python
seed_backup = wallet.export_seed_json()
state_snapshot = wallet.to_json()
restored = ShieldedWallet.from_json(state_snapshot)
```

`seed_backup` is the minimal recovery secret. `state_snapshot` is the richer
resume file that keeps synced commitments and note state.

## Planning Shielded Actions

`ShieldedWallet` can build requests and payloads directly:

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

The deployment bundle is random and suitable for operator use. The dev bundle
is deterministic local tooling only.

## Important Warning

The built-in deployment generator is still a single-party random trusted setup.
That is a real deployment path, but it is not a substitute for an MPC
ceremony.

If a network wants ceremony-grade trust reduction, the next step is importing
externally generated proving material rather than treating the built-in random
generator as an MPC flow.

## See Also

- [Building a Shielded Privacy Token](/tutorials/shielded-privacy-token)
- [ZK Stdlib](/smart-contracts/stdlib/zk)
