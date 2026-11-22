# Xian Wallet CLI

`xian-wallet` is a terminal wallet for people and agents. It manages encrypted
accounts, prepares and reviews transactions, and tracks receipts. An owner can
approve a transaction in the terminal or through a configured Telegram bot.
An agent can submit the signed transaction without access to the spending key.

## Install

Use Python 3.14 and uv on macOS or Linux.

```sh
uv tool install xian-tech-wallet-cli
xian-wallet --help
```

If uv reports that its executable directory is outside `PATH`, run
`uv tool update-shell` and open a fresh terminal.

The wallet uses `$XDG_STATE_HOME/xian-wallet` or `~/.local/state/xian-wallet`
for local state. Set `XIAN_WALLET_HOME` or pass `--home PATH` before the
subcommand to select a different wallet home.

## Accounts and networks

```sh
xian-wallet account create primary
xian-wallet account backup primary --out primary.backup.json
xian-wallet receive primary --qr
xian-wallet ui
```

The vault asks for a password when an operation needs the signing key.
Keep encrypted backups in a separate location. Use `account restore-backup
FILE` to verify and restore a backup. Use `account restore NAME
--mnemonic-file FILE --index INDEX` with an owner-only recovery phrase file
and the matching account index from the browser or mobile wallet.
`account watch NAME ADDRESS` adds a public address for balance checks and
transaction preparation.

The default node RPC is `http://127.0.0.1:26657`. Use the [node CLI](/tools/xian-cli)
to start a local network. To save a different RPC, obtain the chain ID and
first-block hash from a trusted source and add a network profile.

```sh
xian-wallet network add dev "$RPC_URL" --chain-id "$CHAIN_ID" --first-block-hash "$FIRST_BLOCK_HASH"
xian-wallet --network dev network check
xian-wallet network use dev
```

Named profiles accept loopback RPCs and HTTPS RPCs. The node must be synced and
serve block 1. Use the global `--network NAME` option to select a profile for a
single command.

Once you add a profile, the wallet requires at least one saved profile. To
replace the active profile, use `network use NAME` to select another, then
remove the old profile with `network remove NAME`.

## Send and track a transfer

Fund the account on the selected network. Set `RECIPIENT` to the recipient's
public address or a saved contact.

```sh
xian-wallet prepare --from primary --to "$RECIPIENT" --amount 1.25 --out proposal.json
xian-wallet approve proposal.json --account primary --out approval.json --textual
xian-wallet submit proposal.json --approval approval.json
```

Preparation simulates the transfer. Review the exact amount, sender, recipient,
network, chi limit, and expiry before signing. Use `--token CONTRACT` with
`prepare` for a fungible-token transfer, or `prepare-call` for a typed contract
call. Use a plain decimal string for transfer amounts and
`{"__fixed__":"1.25"}` for fractional values in generic contract arguments.

`portfolio ACCOUNT` shows native and watched-token balances. Use
`activity --refresh` to check locally tracked approvals and receipts against
the selected node. `incoming ACCOUNT --token CONTRACT` reads a page of
BDS-indexed transfers. Use the returned `next_offset` to continue scanning.

If submission is interrupted or reports `pending`, use `receipt TX_HASH`
with the hash in the approval file. Retrying with the same proposal and
approval uses the same signed transaction. Resolve the original outcome
before preparing a replacement.

## Approve a transfer for an agent

Run the signer under a separate OS identity or on a separate host. Give the
agent a copy of the request token. Keep the account, vault password, and
signer configuration with the owner. Use a random request token of at least
32 ASCII letters or digits, stored in an owner-only file.

On the signer host, start the service with a Unix socket in an
owner-controlled directory.

```sh
xian-wallet agent serve --socket "$SIGNER_SOCKET" --request-token-file request.token
```

Review requests in the **Approvals** tab of `xian-wallet ui`. For Telegram
review, configure a dedicated bot with `--telegram-token-file`,
`--telegram-owner-id`, `--telegram-account`, and `--password-file` on
`agent serve`. The configured owner opens the bot's private chat and approves
or declines the exact proposal from that chat.

The agent prepares a proposal on the same network and connects to the signer
socket. Use an SSH-forwarded socket when the agent runs under a different
identity or on a different host.

```sh
xian-wallet --json agent request proposal.json --socket "$SIGNER_SOCKET" --token-file request.token
xian-wallet --json agent fetch "$PROPOSAL_ID" --socket "$SIGNER_SOCKET" --token-file request.token --out approval.json
xian-wallet --json submit proposal.json --approval approval.json
```

Use the full proposal ID from the preparation result. Poll `fetch` until the
owner approves or declines, or the proposal expires. `fetch` writes an approval
file when a signed approval is available.

For recurring transfers, the owner can use `grant create` to authorize a
specific account, network, token, and recipient with per-transfer and total
amount and chi limits plus an expiry. Enable grant signing by starting
`agent serve` with `--password-file`. The agent uses `agent authorize` with
the grant credential. `grant revoke` stops future signing. Previously issued
approvals remain relayable for their signed transactions.

With the global `--json` flag, command results use the
`xian-wallet-cli/v1` schema and contain either `data` or `error`.
A `completed` submission reports a successful finalized transaction.

## Advanced workflows

- Use `dex quote`, `dex allowance`, and `dex prepare` for a direct swap with
  an explicit spend allowance and minimum output. Use `nft inspect` and
  `nft transfer` for XSC-0005 ownership and transfers.
- Use `message sign` and `message verify` with the chain-bound Xian message
  envelope. WalletConnect requires Node.js 22 or later, `walletconnect setup`,
  and a Reown project ID.
- Use `x402 quote`, `x402 approve`, and `x402 submit` for exact GET payments.
- Shielded notes require the optional shielded SDK, a deployed shielded-note
  contract, BDS history, and the matching registered proving bundle. Install
  the optional dependency with `uv tool install 'xian-tech-wallet-cli[shielded]'`.

See the [wallet workflows guide](https://github.com/xian-technology/xian-wallet-cli/blob/main/docs/WALLET.md)
for command examples and integration requirements.
