# xian-zk

`xian-zk` is the native Groth16/BN254 verifier and off-chain proving toolkit
inside the `xian-contracting` repository. The PyPI package is `xian-tech-zk`;
imports use `xian_zk`.

It is intentionally scoped to Xian's verifier, shielded-note,
shielded-command, relay, and wallet workflows. It is not a general-purpose ZK
framework.

## Install

```bash
uv add xian-tech-zk
```

Nodes on chains with the `zk` runtime feature need the native verifier
bindings. Wallets and operators use the proving, bundle, and sync helpers
off-chain; proving keys do not belong in validator consensus state.

## Main Surfaces

- Groth16/BN254 verification and canonical encoding helpers
- shielded note, command, relay, and scheduler proof helpers
- commitments, nullifiers, Poseidon hashes, Merkle roots, and auth paths
- `ShieldedWallet` for keys, notes, sync, selection, and action planning
- encrypted note payloads with separate spend and view authority
- bundle generation, validation, import, and promotion commands
- a trusted local prover service and matching clients

## Wallet Model

`owner_secret` authorizes spending. The viewing key decrypts note payloads and
supports controlled disclosure without exposing spend authority.

```python
from xian_zk import ShieldedWallet

wallet = ShieldedWallet.from_parts(
    asset_id="0x...",
    owner_secret="0x...",
    viewing_private_key="11" * 32,
)

snapshot = wallet.to_json()
restored = ShieldedWallet.from_json(snapshot)
```

Use the BDS `shielded_wallet_history` feed for resumable light-wallet sync.
It preserves note order while returning encrypted payloads only for the
requested sync tag. Keep the seed backup separate from the richer state
snapshot.

## Plan and Prove Actions

Wallet helpers select notes and build deposit, transfer, withdrawal, relay, or
command requests. The returned plans include the proof request, selected
inputs, change outputs when needed, and encrypted output payloads.

Exact withdrawals can produce no change note. Relayed actions bind the relayer,
chain ID, fee, expiry, and command or transfer payload into the proof statement.

## Bundle CLI

```bash
xian-zk-shielded-bundle generate-note --output-dir ./artifacts/dev-note
xian-zk-shielded-bundle validate-note --bundle ./artifacts/dev-note/private-bundle.json
xian-zk-shielded-bundle import-note --bundle ./ceremony/note.json --output-dir ./artifacts/note
```

Use `--help` for the command-specific note, command, and promotion arguments.
Only public registry manifests belong in deployment handoffs; private proving
material must remain offline.

## Prover Service

```bash
xian-zk-prover-service --host 127.0.0.1 --port 8787
```

The prover service is a trusted local companion. It sees witness material. It
binds to loopback by default; a non-loopback bind requires explicit unsafe-host
approval, authentication, and transport protection.

## Production Requirements

- Deterministic development bundles expose toxic waste and are test-only.
- Single-party random setup is not a substitute for an accepted multi-party
  ceremony.
- Pin circuit IDs, verifying-key hashes, bundle hashes, and registry bindings.
- A mainnet privacy catalog must remain empty until ceremony-derived artifacts
  are accepted and checksum-pinned.
- Verify the runtime feature and native verifier on every validator before
  enabling shielded contracts.

## Related Pages

- [Shielded and ZK Stack](/concepts/shielded-zk-stack)
- [ZK Contract API](/smart-contracts/stdlib/zk)
- [Shielded Privacy Token](/tutorials/shielded-privacy-token)
- [Package source](https://github.com/xian-technology/xian-contracting/tree/main/packages/xian-zk)
