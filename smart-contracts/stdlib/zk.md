# ZK

The contract runtime exposes a narrow `zk` module for Groth16/BN254 proof
verification and protocol helpers used by the maintained shielded contracts.
Proof generation, witnesses, wallet sync, and proving keys remain off-chain.

## Verification API

```python
zk.is_available()
zk.has_verifying_key(vk_id)
zk.get_vk_info(vk_id)
zk.verify_groth16(vk_id, proof_hex, public_inputs)
zk.verify_groth16_bn254(vk_hex, proof_hex, public_inputs)
```

`verify_groth16` is the preferred contract API. It loads an active verifying
key from `zk_registry` and caches its prepared form by `(vk_id, vk_hash)`.

`verify_groth16_bn254` is the lower-level raw-key form. It sends the full key
through the call and therefore has a larger payload and metering cost.

Both verification functions return `True` or `False` for well-formed inputs.
Malformed encodings raise an assertion error.

## Input Encoding

- verifying keys and proofs are `0x`-prefixed compressed canonical bytes
- every public input is a `0x`-prefixed, exactly 32-byte, big-endian BN254 field
  element
- shortened field encodings are rejected

Limits:

| Input | Maximum |
| --- | ---: |
| verifying-key hex | 8,192 characters |
| proof hex | 4,096 characters |
| public inputs | 32 |
| verifying-key ID | 128 characters |

## Registry Binding

Contracts that keep a long-lived verifier binding should store and recheck:

- `vk_id`
- `vk_hash`
- any required circuit family, statement version, tree depth, and input/output
  bounds from `zk.get_vk_info(vk_id)`

This prevents an unexpected registry update from silently changing proof
semantics.

```python
@export
def verify_join(vk_id: str, expected_hash: str, proof: str, inputs: list):
    info = zk.get_vk_info(vk_id)
    assert info is not None and info["active"], "Unknown verifying key"
    assert info["vk_hash"] == expected_hash, "Verifying key changed"
    return zk.verify_groth16(vk_id, proof, inputs)
```

## Shielded Protocol Helpers

The module also exposes helpers for shielded tree appends, public-input
construction, nullifier digests, command bindings, execution tags, and output
payload hashes. These functions are part of the maintained shielded-note and
shielded-command protocols; application contracts should use those higher-level
contracts instead of designing a new protocol from the helpers alone.

## Node Requirement

A chain with the `zk` runtime feature requires the native verifier on every
validator. `xian-abci` fails closed when the required backend is unavailable.
`zk.is_available()` is useful for tests and tooling, not for treating verifier
availability as optional during consensus.

## Security Requirements

- bind every public input to the intended contract state and action
- derive post-state from canonical on-chain state, not caller-provided metadata
- keep witnesses and proof generation outside the validator runtime
- use registry governance and two-step ownership transfer
- never use deterministic development setup material for value-bearing
  networks
- require an accepted multi-party ceremony and checksum-pinned artifacts for
  mainnet proving keys

Groth16 setup integrity and `zk_registry` control are both trust assumptions.
A compromised setup or malicious registry authority can invalidate proof
soundness.

## Metering

Verification is metered by a fixed base, public-input count, and payload size.
Registry-backed verification has a lower per-byte rate and supports prepared-key
reuse. See [Chi Cost Table](/reference/chi-costs) for current constants and use
readonly simulation for a complete transaction estimate.

## Related Pages

- [Shielded and ZK Stack](/concepts/shielded-zk-stack)
- [xian-zk](/tools/xian-zk)
- [Shielded Privacy Token](/tutorials/shielded-privacy-token)
