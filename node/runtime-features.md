# Runtime Features

Runtime features are rendered from manifests and node profiles into
`config/xian.toml`. Validators on one chain must agree on settings that affect
transaction validity, fees, or deterministic execution.

## Execution Runtime

`xian_vm_v2` is the only supported execution runtime. Validators derive
canonical IR from submitted source and execute it through the native VM. There
is no supported operator switch to a second engine or gas schedule.

## Chain Runtime Features

Network manifests can enable consensus-relevant features such as `zk`.
Every validator must have the matching native backend before joining a chain
that enables one. A feature mismatch is a startup or consensus safety problem,
not a node-local preference. Features are hashed chain state
(`__runtime_features.<feature>`, a JSON boolean) set in genesis.

A [governed state patch](/node/protocol-governance#local-bundle) can
switch a feature on or off on a live chain. The switch takes effect from the
block after the activation block, on running and restarted nodes alike.

For `zk`:

- Before a patch enables it, every validator must install the native zk
  verifier (`xian-tech-abci[zk]`). A node without it refuses to apply the patch
  and halts at the activation block before computing that block's state root;
  it resumes once the verifier is installed and the node restarted. Startup,
  state-sync snapshot import and Commit refuse a zk-enabled state on such a
  node the same way.
- While it is off, every transaction that deploys or calls a contract using zk
  host syscalls (directly or through an import) fails with an ordinary failed
  receipt and is charged for the chi it used. The chain keeps producing blocks
  and other transactions are unaffected. Simulation reports the same failure.
  Shielded balances stay locked until zk is enabled again; they are not lost.

## Logging

Important keys are:

- `app_log_level`
- `app_log_json`
- `app_log_rotation_hours`
- `app_log_retention_days`
- `app_log_max_file_mb`
- `app_log_max_total_mb`
- `transaction_trace_logging`

Keep transaction tracing off during normal operation. Use `DEBUG` for focused
diagnosis and reserve `TRACE` for short-lived deep inspection. Diagnostics use
bounded metadata; enabling tracing does not permit dumping private payloads.
Defaults retain application logs for up to seven days within a 250 MiB budget,
with 50 MiB segments. See [Logs and Retention](/node/managing#logs) for cleanup
timing, configuration and the separate Docker log limits.

## Readonly Simulation

Simulation runs contract calls without committing state. Configure it with:

- `simulation_enabled`
- `simulation_max_concurrency`
- `simulation_timeout_ms`
- `simulation_max_chi` (optional)

By default the node simulates with the chain's per-transaction cap
`max_tx_chi`. An operator `simulation_max_chi` can only lower that budget (the
node then uses `min(simulation_max_chi, max_tx_chi)`), and a governed
fee-policy change applies on commit. Profiles and `xian.toml` leave
`simulation_max_chi` unset unless an operator chooses a lower cap.

Simulation is useful for wallets and SDKs, but it is operator-funded compute.
Bound and rate-limit it on any exposed endpoint.

## Transaction Fee Mode

| Mode | Behavior |
| --- | --- |
| `paid_metered` | sender covers the submitted chi limit; used chi is charged and fee rewards are produced |
| `free_metered` | execution remains metered, but no native-token execution fee or fee-derived reward is created |

Both modes carry the same hard chi caps: `max_tx_chi` (default 200,000) bounds
one transaction's `chi_supplied` and `max_block_chi` (default 500,000) bounds
the block's total. `free_metered` does not make execution unlimited.

The mode and caps are fixed in genesis as the hashed consensus state value
`__fee_policy`. They are not node settings: `xian.toml` fee keys are rejected
at startup, and `configure_node` accepts `--tx-fee-mode`, `--max-tx-chi` and
`--max-block-chi` only together with `--genesis-bundle`. See
[Chain Chi Caps](/concepts/chi#chain-chi-caps) for the rules and enforcement.

## Block Execution

Blocks always execute serially, in canonical order, in the Rust block
executor. The settings of the removed parallel executor
(`parallel_execution_*`) are not accepted: a `xian.toml` that sets any of them
is rejected at startup with an error naming the keys to delete. See
[Block Execution](/concepts/block-execution).

## Metrics and Health

Xian application metrics and CometBFT metrics are separate endpoints. App
metrics include runtime timing and, when BDS is enabled, indexer lag, queue,
pool, spool, and storage posture.

Inside the container the node serves application metrics on `0.0.0.0:9108`.
The profile's `advanced.metrics.host` and `advanced.metrics.port` only choose
where that port is published on the host (`XIAN_APP_METRICS_HOST` and
`XIAN_APP_METRICS_PORT` in `xian-stack`, default `127.0.0.1:9108`).

Use:

```bash
xian node health <name>
xian node endpoints <name>
```

for the effective service and endpoint view.

## BDS

BDS is the optional Postgres-backed history index. Its settings cover:

- database connection and pool limits
- statement and acquisition timeouts
- pending queue size
- contiguous-height catch-up and trusted RPC source
- local recovery spool and disk warning thresholds

BDS does not change consensus. Its results can lag finalized state. Use direct
ABCI state queries for authoritative current values and BDS for history,
events, portfolios, candles, shielded feeds, and projections.

## Block Policy

`block_policy_mode` controls idle block production:

- `on_demand`: no scheduled idle blocks
- `idle_interval`: create an empty block after a configured idle period
- `periodic`: maintain scheduled empty-block production

Contract `now` always comes from finalized block time. See
[Time and Block Policy](/concepts/time-and-blocks).

## Related Pages

- [Configuration](/node/configuration)
- [Performance and Capacity](/node/performance)
- [Pruning and Retention](/node/pruning)
- [BDS Indexed Queries](/api/bds)
