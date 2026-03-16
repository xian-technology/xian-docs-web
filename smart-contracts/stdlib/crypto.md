# Crypto

The `crypto` module provides Ed25519 signature verification and key validation for contracts.

## Functions

### `crypto.verify(vk, msg, signature)`

Verify an Ed25519 signature.

```python
import crypto

@export
def verify_message(public_key: str, message: str, signature: str):
    is_valid = crypto.verify(
        vk=public_key,      # 64-character hex public key
        msg=message,         # the signed message string
        signature=signature  # 128-character hex signature
    )
    assert is_valid, "Invalid signature"
```

Returns `True` if the signature is valid, `False` otherwise.

### `crypto.key_is_valid(key)`

Check if a string is a valid 64-character hex key.

```python
import crypto

@export
def register(public_key: str):
    assert crypto.key_is_valid(public_key), "Invalid key format"
    members[public_key] = True
```

Checks:
- Exactly 64 hex characters
- Valid hexadecimal encoding

## Example: Off-Chain Authorization

```python
import crypto

authorized_signer = Variable()

@construct
def seed():
    authorized_signer.set(ctx.caller)

@export
def execute_signed(action: str, signature: str):
    """Execute an action authorized by an off-chain signature."""
    signer_key = authorized_signer.get()
    assert crypto.verify(
        vk=signer_key,
        msg=action,
        signature=signature
    ), "Unauthorized"

    # ... perform the action
```

## Example: Multi-Sig Verification

```python
import crypto

signers = Hash()
required_signatures = Variable()

@export
def submit_proposal(proposal: str, signatures: list):
    """Verify multiple signatures on a proposal."""
    valid_count = 0
    for sig_data in signatures:
        signer = sig_data["signer"]
        signature = sig_data["signature"]
        if signers[signer] and crypto.verify(
            vk=signer, msg=proposal, signature=signature
        ):
            valid_count += 1

    assert valid_count >= required_signatures.get(), "Not enough signatures"
```
