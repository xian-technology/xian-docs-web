# Becoming a Validator

Becoming a validator is a mix of governance approval and operator setup.

## Local Setup

Generate validator material:

```bash
uv run xian keys validator generate --out-dir ./keys/validator-1
```

Join or create the target network profile:

```bash
uv run xian network join validator-1 --network mainnet \
  --validator-key-ref ./keys/validator-1/validator_key_info.json \
  --stack-dir ../xian-stack
```

Initialize the node home:

```bash
uv run xian node init validator-1
```

Start and verify:

```bash
uv run xian node start validator-1
uv run xian node status validator-1
```

## Network Admission

The operational setup above only prepares the node. Whether the node becomes an
active validator depends on the target network's on-chain validator/membership
rules and governance process.

Inspect the target network bundle in `xian-configs` and the canonical
contracts, especially `members.s.py` and `governance.s.py`, for the active
policy.

On current networks, validator governance is broader than simple membership:

- membership controls who can participate
- protocol governance controls approved contract calls and forward state patches
- validators are expected to carry approved local patch bundles when a governed
  state patch is scheduled

See [Protocol Governance & State Patches](/node/protocol-governance) for the
current remediation model.
