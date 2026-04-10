# Building a Shielded Privacy Token

This tutorial uses the existing `con_shielded_note_token` contract plus the
`xian_zk` proving toolkit to deploy and use a note-based privacy token on
Xian.

The current implementation works end to end with the existing contract and
tooling. It is still `candidate`, not a finished production wallet stack.

For the package-level `xian_zk` reference, deployment CLI, and wallet API
surface, see [xian-zk](/tools/xian-zk).

## What You Get

- a normal public token surface for minting, balances, approvals, and transfer
- a shielded pool backed by Groth16 proofs
- recipient public shielded addresses instead of recipient spending-secret
  sharing
- encrypted note payloads carried in transaction history for wallet-side note
  recovery
- shielded deposit, transfer, and withdraw flows
- optional relayed shielded transfers where the public tx sender is a relayer
  instead of the hidden note owner
- a depth-20 shielded tree with capacity for `1,048,576` notes

## What Is Private

- shielded transfer values stay inside the proof domain
- note ownership stays off-chain as long as the wallet keeps note material
  private
- relayed shielded transfers can hide the note owner's public transaction sender

## What Is Still Public

- contract deployment and operator configuration
- deposits into the shielded pool
- withdraw amounts and withdraw recipients
- nullifiers, output commitments, and accepted roots
- the relayer account and relayer fee for relayed transfers

## Current Caveats

- there is no standardized network-wide viewing policy yet
- there is no polished end-user GUI or mobile wallet UX yet
- the built-in deployment generator is a single-party random setup, not a
  multi-party ceremony
- `ShieldedNoteProver.build_insecure_dev_bundle()` is local test tooling only
  and must never be used for a real network
- wallet note sync depends on indexed transaction history, not just contract
  state

## Current Cost Profile

The current shielded implementation is much cheaper than the original
all-Python contract path because tree updates and relay-digest hot paths now
run through native `xian-zk` bindings inside the runtime.

Local benchmark reference values from April 2026:

- normal public transfer: `48` chi
- shielded exact withdraw with no new output: about `2,405` chi
- shielded deposit with 2 outputs: about `3,742` chi
- shielded transfer with 2 inputs / 2 outputs: about `4,062` chi
- relayed hidden-sender shielded transfer: about `5,726` chi

Those are still more expensive than a public transfer, but no longer in the
earlier five-digit chi range.

## Before You Start

You need:

- a node/runtime with zk verification enabled
- a `zk_registry` contract available on the network
- the `con_shielded_note_token.py` source from `xian-contracts`
- the `xian_zk` Python package from `xian-contracting`

On a real network, register verifying keys generated from your own trusted
setup ceremony. The deterministic dev bundle is only for local development and
tests.

## Step 1: Deploy The Registry And Token

On a local chain, deploy `zk_registry` first if it does not already exist:

```python
from pathlib import Path

from contracting.client import ContractingClient

client = ContractingClient()
client.flush()

zk_registry_source = Path(
    "xian-configs/contracts/zk_registry.s.py"
).read_text()
shielded_token_source = Path(
    "xian-contracts/contracts/shielded-note-token/src/con_shielded_note_token.py"
).read_text()

client.submit(zk_registry_source, name="zk_registry", signer="sys")
zk_registry = client.get_contract("zk_registry")
zk_registry.seed(owner="sys", signer="sys")

client.submit(
    shielded_token_source,
    name="con_private_usd",
    constructor_args={
        "token_name": "Private USD",
        "token_symbol": "pUSD",
        "operator_address": "sys",
        "root_window_size": 32,
    },
    signer="sys",
)
token = client.get_contract("con_private_usd")
```

On a live network, `zk_registry` should already exist as a system contract.

## Step 2: Register The Verifying Keys

The shielded token needs one verifying key for each shielded action:

- `deposit`
- `transfer`
- `withdraw`
- `relay_transfer`

For a real deployment, generate a random bundle and registry manifest once:

```bash
uv run xian-zk-shielded-bundle \
  --output-dir ./artifacts/private-usd-mainnet \
  --contract-name con_private_usd \
  --vk-id-prefix private-usd-mainnet-20260327
```

That writes:

- `shielded-note-bundle.json`: private proving bundle, keep offline
- `shielded-note-registry-manifest.json`: public verifying-key manifest
- `shielded-note-deployment.md`: operator guide for registration and binding

Then register the manifest entries. The manifest already carries the current
registry metadata surface, so the simplest path is to forward each entry
directly after removing the helper-only `action` field:

```python
import json
from pathlib import Path

manifest = json.loads(
    Path("./artifacts/private-usd-mainnet/shielded-note-registry-manifest.json").read_text()
)

for entry in manifest["registry_entries"]:
    args = dict(entry)
    args.pop("action", None)
    zk_registry.register_vk(**args, signer="sys")
```

For local development, the deterministic `v3` dev bundle still contains the
matching verifying keys:

```python
from xian_zk import ShieldedNoteProver, ShieldedRelayTransferProver

prover = ShieldedNoteProver.build_insecure_dev_bundle()
relay_prover = ShieldedRelayTransferProver.build_insecure_dev_bundle()

for manifest in (prover.registry_manifest(), relay_prover.registry_manifest()):
    for entry in manifest["registry_entries"]:
        args = dict(entry)
        args.pop("action", None)
        zk_registry.register_vk(**args, signer="sys")
```

This registers the current `v3` ids:

- `shielded-deposit-v3`
- `shielded-transfer-v3`
- `shielded-withdraw-v3`
- `shielded-relay-transfer-v4`

## Step 3: Bind The Keys To The Token

The token operator pins each action to a registry key id. The contract also
stores the registry `vk_hash`, so a later registry drift cannot silently
change the live circuit semantics.

```python
for action in ("deposit", "transfer", "withdraw"):
    token.configure_vk(
        action=action,
        vk_id=prover.bundle[action]["vk_id"],
        signer="sys",
    )

token.configure_vk(
    action="relay_transfer",
    vk_id=relay_prover.bundle["relay_transfer"]["vk_id"],
    signer="sys",
)
```

You can inspect the binding at any time:

```python
token.get_vk_binding(action="deposit", signer="sys")
token.get_vk_binding(action="relay_transfer", signer="sys")
```

## Step 4: Mint Public Supply

Public balances are still useful because deposit and withdraw cross the public
and shielded domains.

```python
token.mint_public(amount=100, to="alice", signer="sys")

assert token.balance_of(account="alice", signer="sys") == 100
assert token.get_supply_state(signer="sys") == {
    "total_supply": 100,
    "public_supply": 100,
    "shielded_supply": 0,
}
```

## Step 5: Create Shielded Keys And Deposit

The production-shaped model has two pieces per user:

- an `owner_secret`, which controls spending inside the shielded pool
- a viewing keypair, which lets the sender encrypt the note payload for the
  recipient or any disclosed auditor

The sender does not need the recipient's `owner_secret`. They only need the
recipient's public shielded address and viewing public key.

```python
import secrets

from xian_zk import (
    ShieldedDepositRequest,
    ShieldedKeyBundle,
    ShieldedNote,
    note_records_from_transactions,
    recover_encrypted_notes,
)
from xian_py import Xian

FIELD_MODULUS = (
    21888242871839275222246405745257275088548364400416034343698204186575808495617
)


def rand_field() -> str:
    return f"0x{secrets.randbelow(FIELD_MODULUS):064x}"


indexed_client = Xian("http://127.0.0.1:26657")


def load_all_records(indexed_client, contract_name):
    txs = []
    offset = 0
    while True:
        page = indexed_client.list_txs_by_contract(
            contract_name,
            limit=128,
            offset=offset,
        )
        if not page:
            break
        txs.extend(page)
        if len(page) < 128:
            break
        offset += len(page)
    return note_records_from_transactions(txs)


alice_keys = ShieldedKeyBundle.generate()
alice_note_1 = ShieldedNote(
    owner_secret=alice_keys.owner_secret,
    amount=60,
    rho=rand_field(),
    blind=rand_field(),
)

deposit = prover.prove_deposit(
    ShieldedDepositRequest(
        asset_id=token.asset_id(signer="sys"),
        old_root=token.current_shielded_root(signer="sys"),
        append_state=token.get_tree_state(signer="sys"),
        amount=60,
        outputs=[alice_note_1.to_output()],
    )
)

deposit_payloads = [
    alice_note_1.to_output().encrypt_for(
        asset_id=token.asset_id(signer="sys"),
        viewing_public_key=alice_keys.viewing_public_key,
    )
]

token.deposit_shielded(
    amount=60,
    old_root=deposit.old_root,
    output_commitments=deposit.output_commitments,
    proof_hex=deposit.proof_hex,
    output_payloads=deposit_payloads,
    signer="alice",
)

records = load_all_records(indexed_client, "con_private_usd")
alice_discovered = recover_encrypted_notes(
    asset_id=token.asset_id(signer="sys"),
    commitments=[record.commitment for record in records],
    payloads=[record.payload for record in records],
    owner_secret=alice_keys.owner_secret,
    viewing_private_key=alice_keys.viewing_private_key,
)
```

After the deposit:

- Alice public balance drops from `100` to `40`
- shielded supply rises from `0` to `60`
- the contract stores the new commitment plus the proof-bound payload hash
- the encrypted payload remains available in indexed transaction history
- Alice can recover the note from `list_txs_by_contract(...)`

Newer payloads use anonymous discovery tags instead of embedding the recipient
viewing key in cleartext, so indexed history is less searchable by recipient.

## Step 5A: Sync And Backup A Wallet Snapshot

The canonical Python-side wallet abstraction is `ShieldedWallet`. It tracks
your keys, synced note records, commitment history, spendable balance, and
seed/state backups.

```python
from xian_zk import ShieldedKeyBundle, ShieldedWallet

alice_wallet = ShieldedWallet.from_parts(
    asset_id=token.asset_id(signer="sys"),
    owner_secret=alice_keys.owner_secret,
    viewing_private_key=alice_keys.viewing_private_key,
)

alice_wallet.sync_transactions(
    indexed_client.list_txs_by_contract(
        "con_private_usd",
        limit=128,
        offset=0,
    )
)

assert alice_wallet.available_balance() == 60

seed_backup = alice_wallet.export_seed_json()
state_snapshot = alice_wallet.to_json()
restored_wallet = ShieldedWallet.from_json(state_snapshot)
```

`seed_backup` is the minimal recovery backup. `state_snapshot` is the richer
resume snapshot that also keeps synced commitments and wallet note state so the
wallet can continue scanning and planning without rebuilding everything first.

The browser and mobile wallet apps now treat this `state_snapshot` as a
first-class backup primitive: users can store shielded snapshots in wallet
settings, include them automatically in full encrypted wallet backups, and
export individual shielded snapshots when needed. They can also check whether
indexed shielded history already contains newer notes after a stored snapshot,
which is the user-facing signal that a restore file is stale and should be
refreshed before spending.

`ShieldedWallet.sync_transactions(...)` now prefilters note payloads before full
decryption. If you already materialized note records from indexed transactions,
you can prefilter first:

```python
records = load_all_records(indexed_client, "con_private_usd")
candidates = alice_wallet.candidate_records(records)
alice_wallet.sync_records(candidates)
```

On live indexed nodes, newer wallet sync can also use the higher-level
`shielded_wallet_history` feed instead of reconstructing note records through
separate event, tag, and transaction reads.

The same wallet can also build deposit, transfer, and withdraw requests plus
their encrypted payloads directly:

```python
next_recipient = ShieldedKeyBundle.generate().recipient

transfer_plan = alice_wallet.build_transfer(
    recipient=next_recipient,
    amount=25,
)

withdraw_plan = alice_wallet.build_withdraw(
    amount=10,
    recipient="alice",
)
```

## Step 6: Transfer Privately To Another Shielded Recipient

The recipient shares only their public shielded address bundle.

```python
from xian_zk import ShieldedOutput, ShieldedTransferRequest

bob_keys = ShieldedKeyBundle.generate()
bob_note_1 = ShieldedNote(
    owner_secret=bob_keys.owner_secret,
    amount=25,
    rho=rand_field(),
    blind=rand_field(),
)
alice_note_2 = ShieldedNote(
    owner_secret=alice_keys.owner_secret,
    amount=35,
    rho=rand_field(),
    blind=rand_field(),
)

transfer = prover.prove_transfer(
    ShieldedTransferRequest(
        asset_id=token.asset_id(signer="sys"),
        old_root=token.current_shielded_root(signer="sys"),
        append_state=token.get_tree_state(signer="sys"),
        inputs=[alice_discovered[0].to_input()],
        outputs=[
            ShieldedOutput.for_recipient(
                bob_keys.recipient,
                amount=bob_note_1.amount,
                rho=bob_note_1.rho,
                blind=bob_note_1.blind,
            ),
            alice_note_2.to_output(),
        ],
    )
)

transfer_payloads = [
    ShieldedOutput.for_recipient(
        bob_keys.recipient,
        amount=bob_note_1.amount,
        rho=bob_note_1.rho,
        blind=bob_note_1.blind,
    ).encrypt_for(
        asset_id=token.asset_id(signer="sys"),
        viewing_public_key=bob_keys.viewing_public_key,
    ),
    alice_note_2.to_output().encrypt_for(
        asset_id=token.asset_id(signer="sys"),
        viewing_public_key=alice_keys.viewing_public_key,
    ),
]

token.transfer_shielded(
    old_root=transfer.old_root,
    input_nullifiers=transfer.input_nullifiers,
    output_commitments=transfer.output_commitments,
    proof_hex=transfer.proof_hex,
    output_payloads=transfer_payloads,
    signer="alice",
)
```

That transfer keeps the value split private inside the proof. On-chain, the
network sees only:

- the accepted `old_root`
- spent nullifiers
- the new output commitments
- the transaction-carried encrypted payload blobs
- the proof-bound payload hashes
- the next accepted root

Bob can now recover the incoming note by reading indexed contract transactions
and decrypting payloads with `recover_encrypted_notes(...)`.

## Optional: Hide The Public Transaction Sender With A Relayer

The standard `transfer_shielded(...)` flow still exposes the caller as the
public L1 transaction sender. If you want the hidden note owner to stay off the
public sender field, use `relay_transfer_shielded(...)` instead.

That relayed flow keeps the note spend private while making the relayer the
public transaction sender:

```python
from xian_zk import (
    ShieldedRelayTransferProver,
    ShieldedRelayTransferWallet,
)

alice_relay_wallet = ShieldedRelayTransferWallet.from_json(alice_wallet.to_json())

relay_plan = alice_relay_wallet.build_relay_transfer(
    recipient=bob_keys.recipient,
    amount=10,
    relayer="relayer-1",
    chain_id="xian-mainnet-1",
    fee=2,
)

relay_proof = relay_prover.prove_relay_transfer(relay_plan.request)

token.relay_transfer_shielded(
    old_root=relay_proof.old_root,
    input_nullifiers=relay_proof.input_nullifiers,
    output_commitments=relay_proof.output_commitments,
    proof_hex=relay_proof.proof_hex,
    relayer_fee=relay_proof.relayer_fee,
    output_payloads=relay_plan.output_payloads,
    signer="relayer-1",
)
```

What the network learns in this mode:

- the relayer account
- the relayer fee
- nullifiers, output commitments, and roots

What stays hidden:

- the hidden note owner's public transaction sender
- the hidden recipient inside the note payload
- the transferred shielded amount

If Alice wants to disclose the transfer to an auditor without giving up spend
authority, she can add an extra viewer:

```python
from xian_zk import (
    ShieldedViewer,
    ShieldedViewingKeyBundle,
    recover_viewable_notes,
)

auditor_keys = ShieldedViewingKeyBundle.generate()

transfer_payloads = [
    ShieldedOutput.for_recipient(
        bob_keys.recipient,
        amount=bob_note_1.amount,
        rho=bob_note_1.rho,
        blind=bob_note_1.blind,
    ).encrypt_for(
        asset_id=token.asset_id(signer="sys"),
        viewing_public_key=bob_keys.viewing_public_key,
        viewers=[
            ShieldedViewer(
                viewing_public_key=auditor_keys.viewing_public_key,
                label="auditor",
            )
        ],
    ),
    alice_note_2.to_output().encrypt_for(
        asset_id=token.asset_id(signer="sys"),
        viewing_public_key=alice_keys.viewing_public_key,
    ),
]

records = load_all_records(indexed_client, "con_private_usd")
auditor_view = recover_viewable_notes(
    asset_id=token.asset_id(signer="sys"),
    commitments=[record.commitment for record in records],
    payloads=[record.payload for record in records],
    viewing_private_key=auditor_keys.viewing_private_key,
)
```

The auditor can read the disclosed note payload with
`recover_viewable_notes(...)`, but cannot spend because they still do not know
the recipient's `owner_secret`.

If a wallet wants to separate those authorities cleanly, it can generate them
independently:

```python
from xian_zk import ShieldedViewingKeyBundle, ShieldedKeyBundle, generate_owner_secret

alice_owner_secret = generate_owner_secret()
alice_viewing = ShieldedViewingKeyBundle.generate()
alice_keys = ShieldedKeyBundle.from_parts(
    owner_secret=alice_owner_secret,
    viewing_private_key=alice_viewing.viewing_private_key,
)
```

## Step 7: Withdraw Back To A Public Balance

Withdraw is still public on the exit side, but the wallet-side note recovery
and change-note flow stay the same. When the selected notes add up exactly to
the public withdraw amount, the proof can now use `outputs=[]` and the
contract accepts a full exit without forcing a change note.

```python
from xian_zk import ShieldedWithdrawRequest

records = load_all_records(token)
alice_notes = recover_encrypted_notes(
    asset_id=token.asset_id(signer="sys"),
    commitments=[record["commitment"] for record in records],
    payloads=[record["payload"] for record in records],
    owner_secret=alice_keys.owner_secret,
    viewing_private_key=alice_keys.viewing_private_key,
)
alice_change = alice_notes[-1]

alice_note_3 = ShieldedNote(
    owner_secret=alice_keys.owner_secret,
    amount=25,
    rho=rand_field(),
    blind=rand_field(),
)

withdraw = prover.prove_withdraw(
    ShieldedWithdrawRequest(
        asset_id=token.asset_id(signer="sys"),
        old_root=token.current_shielded_root(signer="sys"),
        append_state=token.get_tree_state(signer="sys"),
        amount=10,
        recipient="alice",
        inputs=[alice_change.to_input()],
        outputs=[alice_note_3.to_output()],
    )
)

token.withdraw_shielded(
    amount=10,
    to="alice",
    old_root=withdraw.old_root,
    input_nullifiers=withdraw.input_nullifiers,
    output_commitments=withdraw.output_commitments,
    proof_hex=withdraw.proof_hex,
    output_payloads=[
        alice_note_3.to_output().encrypt_for(
            asset_id=token.asset_id(signer="sys"),
            viewing_public_key=alice_keys.viewing_public_key,
        )
    ],
    signer="alice",
)
```

At that point:

- Alice public balance is `50`
- Alice still holds a new shielded note for `25`
- Bob holds a shielded note for `25`

For a full exact exit, the built-in wallet helper will produce a zero-output
withdraw automatically:

```python
exact_exit = alice_wallet.build_withdraw(
    amount=25,
    recipient="alice",
)

assert exact_exit.request.outputs == []
assert exact_exit.output_payloads == []
```

## Operational Notes

- The current shielded circuit family is `shielded_note_v3`.
- Tree depth is fixed per circuit family. If you want a different depth, you
  need a new circuit and new verifying keys.
- The on-chain payload channel is for note delivery and optional viewer
  disclosure. It is not what authorizes spending; only `owner_secret` does
  that.
- `ShieldedWallet` is the current canonical Python-side wallet abstraction for
  seed backup, state snapshots, note sync, note selection, and request
  planning.
- Encrypted payloads are now proof-bound by per-output payload hashes. A wallet
  should still decrypt the payload and recompute the commitment before trusting
  the note, but an attacker cannot swap the stored payload without also
  breaking proof validity.
- The contract accepts proofs against recent accepted roots, not only the
  latest root. That gives wallets some concurrency room while the contract
  still owns the canonical append frontier.
- Viewing access and spend access are intentionally separate. Sharing a viewing
  key should never reveal an `owner_secret`.
- Wallets should persist note material, note ownership metadata, and the roots
  they proved against.

## Remaining Product Gaps

- define ceremony provenance, custody, and rotation policy for imported proving
  material
- define the network-level policy for who gets disclosed viewing access and how
  that is audited
- build a real network-origin privacy story beyond the current relayed
  execution primitives
- ship a polished end-user wallet interface on top of the current `ShieldedWallet`
  and `xian_zk` flow
- improve indexer / app-facing read paths so large live pools do not depend only
  on direct contract paging

See also:

- [xian-zk](/tools/xian-zk)
- [ZK Stdlib](/smart-contracts/stdlib/zk)
- [Creating a Fungible Token](/tutorials/creating-a-token)
