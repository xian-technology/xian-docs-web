# Building Shielded Commands

This tutorial uses `con_shielded_commands` plus the `xian_zk` proving toolkit
to execute a public on-chain action without linking that action to a normal
public sender account.

The core idea is simple:

- hidden notes fund the action
- a proof binds the exact target contract, payload, relayer, expiry, and fee
- an allowlisted adapter contract performs the public side effect

For the package-level toolkit and API surface, see [xian-zk](/tools/xian-zk).

## What You Get

- anonymous relayed execution through `con_shielded_commands`
- proof-bound relayer fees
- proof-bound hidden change outputs
- proof-bound public spend budgets for adapter contracts
- direct execution indexes by nullifier, command binding, and execution tag

## What Is Still Public

- the target contract being called
- the adapter payload
- the public side effects of the adapter call
- relayer identity

This is sender privacy, not invisible contract execution.

## Before You Start

You need:

- a node/runtime with zk verification enabled
- a `zk_registry` contract available on the network
- the `con_shielded_commands.py` source from `xian-contracts`
- at least one allowlisted adapter such as
  `con_shielded_dex_adapter.py` or `con_shielded_scheduler_adapter.py`
- the `xian_zk` Python package from `xian-contracting`

## Step 1: Deploy The Registry, Command Pool, And Adapter

```python
from pathlib import Path

from contracting.client import ContractingClient

client = ContractingClient()
client.flush()

zk_registry_source = Path(
    "xian-configs/contracts/zk_registry.s.py"
).read_text()
shielded_commands_source = Path(
    "xian-contracts/contracts/shielded-commands/src/con_shielded_commands.py"
).read_text()
shielded_dex_adapter_source = Path(
    "xian-contracts/contracts/shielded-dex-adapter/src/con_shielded_dex_adapter.py"
).read_text()

client.submit(zk_registry_source, name="zk_registry", signer="sys")
zk_registry = client.get_contract("zk_registry")
zk_registry.seed(owner="sys", signer="sys")

client.submit(
    shielded_commands_source,
    name="con_shielded_commands",
    constructor_args={
        "token_contract": "currency",
        "operator_address": "sys",
        "root_window_size": 32,
    },
    signer="sys",
)

client.submit(
    shielded_dex_adapter_source,
    name="con_shielded_dex_adapter",
    constructor_args={
        "dex_contract": "con_dex",
        "controller_contract": "con_shielded_commands",
        "operator": "sys",
    },
    signer="sys",
)
```

## Step 2: Register The Verifying Keys

Generate a real random bundle for deployment:

```python
from xian_zk import ShieldedCommandProver

prover = ShieldedCommandProver.build_random_bundle(
    contract_name="con_shielded_commands",
    vk_id_prefix="shielded-command-mainnet-20260404",
)
manifest = prover.registry_manifest()
```

Register the manifest entries:

```python
for entry in manifest["registry_entries"]:
    args = dict(entry)
    args.pop("action", None)
    zk_registry.register_vk(**args, signer="sys")
```

For local development, `ShieldedCommandProver.build_insecure_dev_bundle()` is
available, but it must never be used for a real network.

The current command-family ids are:

- `shielded-command-deposit-v4`
- `shielded-command-execute-v4`
- `shielded-command-withdraw-v4`

## Step 3: Bind The Keys And Allow The Adapter

```python
commands = client.get_contract("con_shielded_commands")

for action in ("deposit", "command", "withdraw"):
    commands.configure_vk(
        action=action,
        vk_id=prover.bundle[action]["vk_id"],
        signer="sys",
    )

commands.set_target_allowed(
    target_contract="con_shielded_dex_adapter",
    enabled=True,
    signer="sys",
)
commands.set_relayer(account="relayer-1", enabled=True, signer="sys")
commands.set_relayer_restriction(enabled=True, signer="sys")
```

## Step 4: Deposit Hidden Funds

Command execution spends hidden notes from the command pool, so first deposit
public funds into shielded notes:

```python
from xian_zk import ShieldedCommandWallet

wallet = ShieldedCommandWallet.from_parts(
    asset_id=commands.asset_id(signer="sys"),
    owner_secret="0x...",
    viewing_private_key="11" * 32,
)

deposit_plan = wallet.build_deposit(
    amount=150,
    old_root=commands.current_shielded_root(signer="sys"),
    append_state=commands.get_tree_state(signer="sys"),
)

deposit_proof = prover.prove_deposit(deposit_plan.request)

commands.deposit_shielded(
    amount=150,
    old_root=deposit_proof.old_root,
    output_commitments=deposit_proof.output_commitments,
    proof_hex=deposit_proof.proof_hex,
    output_payloads=deposit_plan.output_payloads,
    signer="alice",
)
```

After the deposit lands, sync the new note records into the local wallet before
building the command plan.

## Step 5: Build A Command Plan

Here the hidden sender wants to trade `100` units through the DEX adapter,
allow a `5` unit relayer fee, and keep the remaining value as a hidden change
note.

```python
command_plan = wallet.build_command(
    target_contract="con_shielded_dex_adapter",
    relayer="relayer-1",
    chain_id="xian-mainnet-1",
    fee=5,
    public_amount=100,
    payload={
        "action": "swap_exact_in",
        "pair": 7,
        "recipient": "alice",
        "amount_out_min": 95,
        "deadline": "2026-04-04 13:00:00",
    },
)

command_proof = prover.prove_execute(command_plan.request)
```

Important detail: `public_amount` is part of the proof statement. The adapter
cannot spend more than that budget during execution.

## Step 6: Relay The Command

```python
commands.execute_command(
    target_contract="con_shielded_dex_adapter",
    old_root=command_proof.old_root,
    input_nullifiers=command_proof.input_nullifiers,
    output_commitments=command_proof.output_commitments,
    proof_hex=command_proof.proof_hex,
    relayer_fee=5,
    public_amount=100,
    payload=command_plan.request.payload,
    expires_at=command_plan.request.expires_at,
    output_payloads=command_plan.output_payloads,
    signer="relayer-1",
    environment={"chain_id": "xian-mainnet-1"},
)
```

The contract verifies:

- the inputs belong to a valid accepted root
- the nullifiers are unused
- the proof binds the target, payload, relayer, fee, expiry, and public spend
- the relayer and target are allowlisted

## Step 7: Inspect The Result

```python
execution = commands.get_execution(execution_id=0, signer="sys")

assert execution["target_contract"] == "con_shielded_dex_adapter"
assert execution["fee"] == 5
assert execution["public_amount"] == 100
```

Wallet-side note recovery still works through the stored output payloads and
their proof-bound payload hashes.

## Current Product Split

- `shielded-note-token`: private value pool for private asset flows
- `shielded-commands`: anonymous execution coordinator
- `shielded-dex-adapter`: DEX-facing adapter for proof-bound public spend
- `shielded-scheduler-adapter`: scheduler-facing adapter for deferred actions

## Caveats

- target calls and public side effects are still visible
- the built-in random bundle generator is still a single-party setup, not an
  MPC ceremony
- the DEX adapter spends only the controller token and only the exact
  proof-bound `public_amount`

## See Also

- [xian-zk](/tools/xian-zk)
- [Building a Shielded Privacy Token](/tutorials/shielded-privacy-token)
- [ZK Stdlib](/smart-contracts/stdlib/zk)
