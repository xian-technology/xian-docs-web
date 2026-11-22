# Xian Wallet CLI

`xian-wallet` is a terminal wallet for people and agents. It supports encrypted
accounts, native and fungible-token sends, typed contract calls, transaction
review, and persistent receipts. The owner can approve from the terminal or
Telegram. An agent can submit an approved transfer without the spending key.

## Install

From the source checkout on macOS or Linux with Python 3.14 and uv:

```sh
uv sync
uv run xian-wallet --help
```

Use `uv run xian-wallet` in the checkout or install with `uv tool install .`.
The default RPC is `http://127.0.0.1:26657`. Pin an explicit network with
`network add NAME URL --chain-id ID --first-block-hash HASH` and select it with
`--network NAME` or `network use NAME`. A pinned profile can use an HTTPS
RPC. Use a synced node that serves block 1.

## Accounts and transactions

```sh
xian-wallet account create primary
xian-wallet account backup primary --out primary.backup.json
xian-wallet receive primary --qr
xian-wallet ui
```

Restore the browser or mobile wallet's indexed recovery phrase with
`account restore NAME --mnemonic-file FILE --index INDEX`. Use `account watch`
for a public address, `portfolio ACCOUNT` for balances, `activity --refresh`
for local receipts, and `incoming ACCOUNT` for an indexed transfer page.
The vault unlocks on demand for sensitive operations.

```sh
xian-wallet prepare --from primary --to "$RECIPIENT" --amount 1.25 --out proposal.json
xian-wallet approve proposal.json --account primary --out approval.json --textual
xian-wallet submit proposal.json --approval approval.json
```

Use `--token CONTRACT` for a fungible token. Use `prepare-call` for an exact
typed contract call. Amounts retain their decimal precision. Include the
sender, recipient, network, exact arguments, chi ceiling, and expiry when
presenting a proposal for review.

## Agent approval

Run `agent serve` on the trusted signer's machine under a separate OS identity
from the agent. The owner reviews requests in Textual or enables the
Telegram bot with a dedicated user ID and owner-only credentials. The agent
uses `agent request` and `agent fetch` on the signer socket and receives only
the signed approval. It owns submission and receipt recovery.

Use `grant create` to preauthorize recurring transfers from a specific
account and network to a recipient, within explicit amount and chi limits.
The vault checks those limits when issuing an approval. Agents use
`agent authorize` with the grant credential. `grant revoke` stops future
signing. Released approvals remain relayable for their signed transaction.

Put `--json` before the command. `completed` means final success. `pending`
means the final outcome is unknown. Recover by `receipt TX_HASH` or retry
the same signed proposal. Use the receipt or nonce status before preparing
a replacement.

## Advanced workflows

- `dex quote`, `dex allowance`, and `dex prepare` cover direct swaps with
  a minimum output and an explicit spend allowance.
- `nft inspect` and `nft transfer` cover XSC-0005 ownership and transfers.
- `message sign` and `message verify` use the chain-bound Xian envelope.
- `x402 quote`, `x402 approve`, and `x402 submit` cover exact GET payments.
- `walletconnect setup` and `walletconnect pair` run the optional dapp
  transport with the owner's Reown project configuration.
- `shielded create`, `shielded sync`, and `shielded prepare` use the
  optional shielded SDK, BDS note history and a matching proving bundle.
