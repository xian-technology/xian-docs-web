# Building a Shielded Privacy Token

This guide uses the maintained `con_shielded_note_token` contract and
`xian_zk` wallet/prover toolkit.

The flow is note-based: public tokens enter a shielded pool, private transfers
spend and create notes, and withdrawals return value to a public address.

## Privacy Boundary

Shielded transfers hide note ownership and transfer amounts. The chain still
publishes commitments, nullifiers, accepted roots, encrypted payloads, and
transaction timing. Deposits and public withdrawals expose their amounts and
public accounts. A relayer can hide the note owner from the public transaction
sender field but does not provide network-layer anonymity.

## Prerequisites

- a chain with the `zk` runtime feature and native verifier on every validator
- the system `zk_registry` contract
- `con_shielded_note_token.py` from `xian-contracts`
- `xian-tech-zk` for proving and wallet operations
- a BDS-enabled node for resumable wallet history

```bash
uv add xian-tech-py xian-tech-zk
```

## 1. Prepare Verifying Keys

For a value-bearing deployment, start with ceremony-derived note and relay
bundles and promote them into operator artifacts:

```bash
xian-zk-shielded-bundle promote \
  --network private-net \
  --contract-name con_private_usd \
  --note-bundle ./ceremony/note.json \
  --relay-command-bundle ./ceremony/relay.json \
  --output-dir ./artifacts/private-usd
```

The output includes private prover bundles, public registry manifests, a
registration/binding helper, a summary, and a privacy-catalog snippet. Keep
private bundles offline. Register public entries through the authority that
owns `zk_registry`, then call `configure_vk(action, vk_id)` on the token.

For local tests only:

```python
from xian_zk import ShieldedNoteProver

prover = ShieldedNoteProver.build_insecure_dev_bundle()
manifest = prover.registry_manifest()
```

The deterministic development bundle exposes toxic waste and must never secure
real value. A single-party random setup is also not an MPC ceremony.

Load an accepted private proving bundle on the proving host with
`ShieldedNoteProver(Path("bundle.json").read_text())`.

## 2. Deploy and Configure the Token

Deploy source through the normal source-backed submission path with constructor
arguments such as token name, symbol, operator, and root-window size. Register
the manifest entries in `zk_registry`, then bind each action:

Submit `configure_vk(action, vk_id)` through the operator or governance
transaction path for every entry in `manifest["configure_actions"]`. Verify
each stored `vk_id` and `vk_hash` before minting supply.

## 3. Create and Back Up a Shielded Wallet

```python
import os

from xian_py import Wallet, Xian
from xian_zk import ShieldedWallet

account = Wallet(private_key=os.environ["XIAN_PRIVATE_KEY"])
client = Xian("http://127.0.0.1:26657", wallet=account)
token = client.contract("con_private_usd")

asset_id = token.call("asset_id")
alice = ShieldedWallet.generate(asset_id)

seed_backup = alice.export_seed_json()
state_snapshot = alice.to_json()
```

The seed backup contains spend and view authority. The state snapshot also
contains synced commitments, notes, and cursors. Protect both; the snapshot is
not a substitute for the seed backup.

On an indexed node, sync before planning an action:

```python
alice.sync_indexed_client(client, contract="con_private_usd")
```

This uses `shielded_wallet_history` when available and resumes by note index.

## 4. Deposit Public Value

Mint or acquire public balance first. Then plan, prove, and submit:

```python
plan = alice.build_deposit(amount=60)
proof = prover.prove_deposit(plan.request)

token.send(
    "deposit_shielded",
    kwargs={
        "amount": 60,
        "old_root": proof.old_root,
        "output_commitments": proof.output_commitments,
        "proof_hex": proof.proof_hex,
        "output_payloads": plan.output_payloads,
    },
    wait_for_tx=True,
)
```

The contract reduces Alice's public balance, increases shielded supply, appends
commitments, and verifies that encrypted payload hashes were bound by the
proof. Sync the wallet after finalization before planning the next action.

## 5. Transfer Privately

The recipient shares a public shielded recipient bundle, not an owner secret.

```python
from xian_zk import ShieldedWallet

bob = ShieldedWallet.generate(asset_id)

alice.sync_indexed_client(client, contract="con_private_usd")
plan = alice.build_transfer(recipient=bob.recipient, amount=25)
proof = prover.prove_transfer(plan.request)

token.send(
    "transfer_shielded",
    kwargs={
        "old_root": proof.old_root,
        "input_nullifiers": proof.input_nullifiers,
        "output_commitments": proof.output_commitments,
        "proof_hex": proof.proof_hex,
        "output_payloads": plan.output_payloads,
    },
    wait_for_tx=True,
)
```

After finalization, mark spent notes and sync outputs before another spend:

```python
alice.refresh_spent_status(
    lambda value: token.call("is_nullifier_spent", nullifier=value)
)
alice.sync_indexed_client(client, contract="con_private_usd")
bob.sync_indexed_client(client, contract="con_private_usd")
```

## 6. Withdraw

```python
plan = alice.build_withdraw(amount=10, recipient=account.public_key)
proof = prover.prove_withdraw(plan.request)

token.send(
    "withdraw_shielded",
    kwargs={
        "amount": 10,
        "to": account.public_key,
        "old_root": proof.old_root,
        "input_nullifiers": proof.input_nullifiers,
        "output_commitments": proof.output_commitments,
        "proof_hex": proof.proof_hex,
        "output_payloads": plan.output_payloads,
    },
    wait_for_tx=True,
)
```

When the selected notes exactly equal the withdrawal amount, the plan has no
change output. Otherwise it creates an encrypted change note for Alice.

The recipient and withdrawn amount are public.

## Relayed Transfers and Disclosure

`ShieldedRelayTransferWallet` and `ShieldedRelayTransferProver` bind a relayer,
chain ID, fee, expiry, nullifiers, commitments, and payload hashes into the
proof. The relayer becomes the public sender and can receive a proof-bound fee.

Output encryption can include additional viewing keys for selective disclosure.
A viewer can decrypt the disclosed note but cannot spend it without the owner
secret.

## Operational Requirements

- pin circuit family, tree depth, bundle hash, `vk_id`, and `vk_hash`
- keep proving material offline or in an authenticated trusted prover service
- retain accepted-root history and wallet state needed for concurrent proofs
- monitor BDS history compatibility and wallet sync cursors
- never trust an encrypted payload until decryption and commitment checks pass
- simulate only when the node's simulation chi cap covers proof verification;
  otherwise use reviewed explicit chi limits

## Related Pages

- [xian-zk](/tools/xian-zk)
- [ZK Contract API](/smart-contracts/stdlib/zk)
- [Shielded and ZK Stack](/concepts/shielded-zk-stack)
