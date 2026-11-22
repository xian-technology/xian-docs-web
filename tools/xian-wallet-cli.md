# Xian Wallet CLI

`xian-wallet` prepares, reviews, signs, and relays native XIAN transfers on
a localnet. The sender's spending key stays on the wallet owner's machine or
with their trusted signer. An agent can submit and track an approved transfer
using the proposal and its signed approval.

## Install

From the `xian-wallet-cli` source checkout, use Python 3.14 and uv.

```sh
uv sync
uv run xian-wallet --help
```

Use `uv run xian-wallet` in the checkout, or install the checkout with
`uv tool install .` to use `xian-wallet` directly. The CLI takes a synced,
loopback RPC that can serve block 1. The default is
`http://127.0.0.1:26657`. Override it with `XIAN_WALLET_RPC` or the global
`--rpc` option.

## Prepare and review

```sh
xian-wallet generate --out owner.key
xian-wallet --json prepare --from "$SENDER" --to "$RECIPIENT" \
  --amount 1.25 --out proposal.json
xian-wallet ui proposal.json
```

Use the public address printed by `generate` as `SENDER`. Fund it on
localnet before preparing. Use a plain decimal amount. Preparation is
read-only and checks the transfer through simulation. The review shows the
network, exact amount, sender, recipient, estimated and maximum chi, expiry,
and proposal ID.

The wallet owner signs with
`xian-wallet approve proposal.json --key-file owner.key --out approval.json --textual`.
For remote approval, a trusted messaging integration displays those same
fields, authenticates the user, and matches their approval to the exact
proposal ID. It can then run `xian-wallet --json approve` with the same
proposal, key and output options and use `--yes` in place of `--textual`.
It returns the approval file to the agent. Transfer that file privately;
it can relay the approved transaction. The CLI checks proposal expiry.
On-chain replay protection uses the signed nonce and chain ID.

## Submit and recover

```sh
xian-wallet --json submit proposal.json --approval approval.json
xian-wallet --json receipt "$TX_HASH"
```

Both commands run without a prompt or key file. The result includes a
transaction hash and a status. `completed` is a successful finalized receipt.
`failed` reports an execution failure, `rejected` reports admission rejection,
and `pending` means the final outcome is unknown. After a timeout or lost
response, use the hash stored in the approval file. A retry with the same
proposal and approval uses the same transaction bytes and nonce.
