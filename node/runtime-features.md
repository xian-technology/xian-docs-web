# Runtime Features

Runtime features are rendered from manifests and node profiles into
`config/xian.toml`. Validators on one chain must agree on settings that affect
transaction validity, fees, or deterministic execution.

## Execution Runtime

`xian_vm_v1` is the only supported execution runtime. Validators derive
canonical IR from submitted source and execute it through the native VM. There
is no supported operator switch to a second engine or gas schedule.

## Chain Runtime Features

Network manifests can enable consensus-relevant features such as `zk`.
Every validator must have the matching native backend before joining a chain
that enables one. A feature mismatch is a startup or consensus safety problem,
not a node-local preference.

## Logging

Important keys are:

- `app_log_level`
- `app_log_json`
- `app_log_rotation_hours`
- `app_log_retention_days`
- `transaction_trace_logging`

Keep transaction tracing off during normal operation. Use `DEBUG` for focused
diagnosis and reserve `TRACE` for short-lived deep inspection because it can
emit large transaction result payloads.

## Readonly Simulation

Simulation runs contract calls without committing state. Configure it with:

- `simulation_enabled`
- `simulation_max_concurrency`
- `simulation_timeout_ms`
- `simulation_max_chi`

Simulation is useful for wallets and SDKs, but it is operator-funded compute.
Bound and rate-limit it on any exposed endpoint.

## Transaction Fee Mode

| Mode | Behavior |
| --- | --- |
| `paid_metered` | sender covers the submitted chi limit; used chi is charged and fee rewards are produced |
| `free_metered` | execution remains metered, but no native-token execution fee or fee-derived reward is created |

`free_metered` requires explicit `free_tx_max_chi` and
`free_block_max_chi` caps. It does not make execution unlimited.

## Parallel Execution

Parallel execution speculates in isolated workers and commits only results
equivalent to serial block order. It is disabled by default.

Key settings include:

- `parallel_execution_enabled`
- `parallel_execution_workers`
- `parallel_execution_min_transactions`
- speculative-wave and acceptance guardrails
- worker warming and access estimates

Test against the real workload and watch acceptance and fallback counters.
Independent state access benefits most; hot shared state and broad scans often
fall back to serial execution. See [Parallel Block Execution](/concepts/parallel-block-execution).

## Metrics and Health

Xian application metrics and CometBFT metrics are separate endpoints. App
metrics include runtime timing and, when BDS is enabled, indexer lag, queue,
pool, spool, and storage posture.

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
- [Pruning and Retention](/node/pruning)
- [BDS Indexed Queries](/api/bds)
