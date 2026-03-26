# ZK

The contract runtime exposes a narrow `zk` module for proof verification.

This is a verifier surface, not a proving toolkit.

The first real proof-backed contract flow using this module is the
shielded-note token work in `xian-contracts`.

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

## `zk.verify_groth16(...)`

Verifies a Groth16 proof on BN254 using a registered verifying key id and
returns:

- `True` for a valid proof
- `False` for an invalid proof with well-formed inputs

Malformed inputs raise an assertion error instead of returning `False`.

### Input Format

- `vk_id`: non-empty verifying-key id registered in `zk_registry`
- `proof_hex`: `0x`-prefixed hex string of the compressed proof bytes
- `public_inputs`: list of `0x`-prefixed 32-byte big-endian field elements

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
- `proof_hex`: `0x`-prefixed hex string of the compressed proof bytes
- `public_inputs`: list of `0x`-prefixed 32-byte big-endian field elements

### Notes

- This is the low-level raw-key API.
- It passes the verifying key in every call, so it is intentionally metered.
- Prefer `zk.verify_groth16(vk_id, proof, public_inputs)` for stable
  contract-facing integrations.

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
- derive the next state from canonical contract storage instead of trusting
  caller-supplied transition metadata
- keep proof generation and witness construction outside the validator runtime
