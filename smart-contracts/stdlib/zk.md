# ZK

The contract runtime exposes a narrow `zk` module for proof verification.

This is still a verifier surface inside contracts.

The first real proof-backed contract flow using this module is the
shielded-note token work in `xian-contracts`.

For off-chain proof generation and note helpers, the current development path
is the `xian-zk` package in `xian-contracting`. That proving toolkit stays
outside the validator runtime.

The current shielded-note circuit family is `v2`, built around Merkle auth
paths and a chain-owned append frontier rather than whole-tree witnesses.

## Available Functions

```python
zk.is_available()
zk.has_verifying_key(vk_id)
zk.verify_groth16(vk_id, proof_hex, public_inputs)
zk.verify_groth16_bn254(vk_hex, proof_hex, public_inputs)
```

## `zk.is_available()`

Returns `True` when the native zk verifier backend is installed in the node
runtime.

This is mainly useful for tests and controlled deployments. In production, a
network should treat zk verification as a node capability requirement.

## `zk.has_verifying_key(...)`

Returns `True` when an active verifying key exists in the system `zk_registry`
contract.

This is a probe helper for contracts that want to branch cleanly before
attempting proof verification.

This only answers whether an active registry entry exists. If a contract stores
an ongoing verifier binding, it should also persist and re-check the registry
`vk_hash` so a later registry drift cannot silently change live proof
semantics.

## `zk.verify_groth16(...)`

Verifies a Groth16 proof on BN254 using a registered verifying key id and
returns:

- `True` for a valid proof
- `False` for an invalid proof with well-formed inputs

Malformed inputs raise an assertion error instead of returning `False`.

### Input Format

- `vk_id`: non-empty verifying-key id registered in `zk_registry`
- `proof_hex`: non-empty `0x`-prefixed hex string of the compressed proof bytes
- `public_inputs`: list of `0x`-prefixed 32-byte big-endian field elements
  using exact 32-byte encodings

Shortened field encodings are rejected. For example, `0x02` is not accepted in
place of `0x0000000000000000000000000000000000000000000000000000000000000002`.

### Registry Model

The preferred runtime path is registry-backed:

- a system contract named `zk_registry` stores active verifying keys
- the runtime loads the registered verifying key by `vk_id`
- the runtime keeps a local prepared-key cache keyed by `(vk_id, vk_hash)`

This is the recommended contract API because:

- contracts do not need to pass the full verifying key on every call
- metering stays simpler and more predictable
- prepared-key reuse is possible inside the validator runtime

## `zk.verify_groth16_bn254(...)`

Verifies a Groth16 proof on BN254 and returns:

- `True` for a valid proof
- `False` for an invalid proof with well-formed inputs

Malformed inputs raise an assertion error instead of returning `False`.

### Input Format

- `vk_hex`: `0x`-prefixed hex string of the compressed verifying key bytes
- `proof_hex`: non-empty `0x`-prefixed hex string of the compressed proof bytes
- `public_inputs`: list of `0x`-prefixed 32-byte big-endian field elements
  using exact 32-byte encodings

### Notes

- This is the low-level raw-key API.
- It passes the verifying key in every call, so it is intentionally metered.
- Prefer `zk.verify_groth16(vk_id, proof, public_inputs)` for stable
  contract-facing integrations.

## Current Proof-Backed Pattern

The first real contract family using this verifier surface is the
shielded-note token in `xian-contracts`.

The current pattern is:

- prove note membership against an accepted `old_root`
- keep witness construction, Merkle auth paths, and note scanning off-chain
- address outputs to recipient `owner_public` values rather than recipient
  spending secrets
- let the contract derive the next root from canonical on-chain note storage
- optionally persist encrypted note payloads on-chain for recipient recovery
- separate spend authority (`owner_secret`) from viewing authority, with
  optional per-output disclosed viewers
- use a wallet-side sync and backup layer to track note records and commitment
  history off-chain
- use a chain-owned append frontier for post-state projection

The shipped `v2` shielded-note flow uses:

- Merkle auth paths instead of whole-tree witnesses
- a default tree depth of `20`
- a shielded note capacity of `1,048,576`
- exact withdraw support with `0` outputs when no change note is needed
- recent-root proving, where a proof may target a still-accepted recent root
  while outputs are still appended against the current canonical frontier

For the full contract-level deployment and wallet-side usage flow, see
[Building a Shielded Privacy Token](/tutorials/shielded-privacy-token).

For the off-chain prover, wallet, and deployment-tool reference itself, see
[xian-zk](/tools/xian-zk).

For that workflow, off-chain tooling such as `xian_zk` tracks:

- the accepted root being proved
- the current append frontier state
- the input notes and their Merkle auth paths
- wallet-side snapshots of note records, keys, and commitment history

Operator-side tooling now also exists to generate a random shielded-note
bundle plus a registry-ready verifying-key manifest. That replaces the
deterministic dev bundle for deployment, but it is still a single-party setup,
not an MPC ceremony.

Deterministic dev proving bundles remain local test tooling only. They are not
network-ready setup material.

## Security Model

- proof verification is deterministic
- verification is metered
- payload sizes are bounded before native verification runs
- this module verifies proofs only; it does not generate them
- public inputs must be canonical BN254 field elements, not arbitrary 32-byte
  hashes

## Typical Use

```python
@export
def verify_join(vk_id: str, proof_hex: str, public_inputs: list):
    assert zk.has_verifying_key(vk_id), "Unknown verifying key!"
    return zk.verify_groth16(
        vk_id=vk_id,
        proof_hex=proof_hex,
        public_inputs=public_inputs,
    )
```

Low-level raw-key verification is still available when a contract must work
with an explicit verifying key:

```python
@export
def verify_raw(vk_hex: str, proof_hex: str, public_inputs: list):
    return zk.verify_groth16_bn254(
        vk_hex=vk_hex,
        proof_hex=proof_hex,
        public_inputs=public_inputs,
    )
```

## Design Guidance

- bind every public input on-chain before verification
- prefer registry-backed `vk_id` usage for contract-facing integrations
- if a contract stores a verifier binding, persist both `vk_id` and `vk_hash`
  from `zk_registry`
- derive the next state from canonical contract storage instead of trusting
  caller-supplied transition metadata
- when using recent-root proving, treat `old_root` and append-state as separate
  concepts
- keep proof generation and witness construction outside the validator runtime
- treat deterministic dev proving bundles as local test tooling only, not as
  network-ready setup material
