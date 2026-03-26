# ZK

The contract runtime exposes a narrow `zk` module for proof verification.

This is a verifier surface, not a proving toolkit.

## Available Functions

```python
zk.is_available()
zk.verify_groth16_bn254(vk_hex, proof_hex, public_inputs)
```

## `zk.is_available()`

Returns `True` when the native zk verifier backend is installed in the node
runtime.

This is mainly useful for tests and controlled deployments. In production, a
network should treat zk verification as a node capability requirement.

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

- This is a low-level transitional API.
- It passes the verifying key in every call, so it is intentionally metered.
- The longer-term runtime model is a verifying-key registry plus
  `zk.verify_groth16(vk_id, proof, public_inputs)`.

## Security Model

- proof verification is deterministic
- verification is metered
- payload sizes are bounded before native verification runs
- this module verifies proofs only; it does not generate them

## Typical Use

```python
import zk

@export
def verify_join(vk_hex: str, proof_hex: str, public_inputs: list):
    return zk.verify_groth16_bn254(
        vk_hex=vk_hex,
        proof_hex=proof_hex,
        public_inputs=public_inputs,
    )
```
