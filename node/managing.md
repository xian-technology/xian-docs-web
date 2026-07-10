# Starting, Stopping and Monitoring

Use `xian-cli` for operator-facing node lifecycle. Use `xian-stack` directly
for backend debugging and `xian-deploy` for remote Linux hosts.

## Lifecycle Commands

```bash
xian node start validator-1
xian node status validator-1
xian node endpoints validator-1
xian node health validator-1
xian node stop validator-1
```

Enabled services in the node profile start and stop with the node, including
the dashboard, monitoring, BDS, IntentKit, DEX automation, and the shielded
relayer.

`status` combines local artifacts, backend state, image information, and live
RPC data. `health` is the concise machine-readable readiness view. `endpoints`
prints the effective host URLs and ports, including Docker remapping.

For a broader preflight:

```bash
xian doctor validator-1
xian doctor validator-1 --skip-live-checks
```

The offline form validates artifacts without requiring a running node.

## What to Monitor

At minimum, alert on:

- latest height and block age
- `catching_up` and peer count
- CometBFT and Xian process availability
- validator signing and missed-block behavior
- disk space and retained history
- application errors and transaction rejection rate
- BDS indexed height, lag, queue, pool, and spool when enabled
- parallel-execution acceptance and fallback ratios when enabled

An RPC endpoint that answers can still be unhealthy if height or block age is
stale. Compare against trusted peers.

## Logs

Xian application logs are separate from CometBFT logs. Rotated app logs live
under the node home's `xian/logs` directory and follow the `app_log_*` settings
in `xian.toml`.

```bash
tail -f ~/.cometbft/xian/logs/*.log
```

Start at `INFO`, use `DEBUG` for focused diagnosis, and use `TRACE` only
briefly. Keep `transaction_trace_logging` disabled during normal operation.

Useful stages include `check_tx`, `prepare_proposal`, `process_proposal`,
`finalize_*`, and `simulate_tx`.

## Monitoring Surfaces

| Surface | Use |
| --- | --- |
| CometBFT RPC | canonical node, block, transaction, and consensus reads |
| direct ABCI query | canonical Xian state and runtime queries |
| Xian and CometBFT metrics | alerts and time-series monitoring |
| dashboard REST/WebSocket | operator and explorer UI |
| BDS queries | indexed history and event feeds |
| GraphQL | optional generated query layer over BDS |

Dashboard, GraphQL, and BDS are outside consensus. BDS can lag the finalized
head while it catches up.

## Local Backend Debugging

From `xian-stack`:

```bash
python3 ./scripts/backend.py start --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py status --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py endpoints --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py health --no-bds-enabled --no-dashboard --no-monitoring
python3 ./scripts/backend.py stop --no-bds-enabled --no-dashboard --no-monitoring
```

The backend is a machine-facing contract. Prefer `xian node ...` for routine
operator work.

## Public Monitoring

The stack binds query and monitoring services to loopback by default. Public
exposure requires explicit enablement and appropriate TLS, authentication,
firewalling, and rate limits. Do not publish Prometheus admin endpoints or raw
node RPC simply to make a dashboard reachable.

## Recovery and Maintenance

Use the page that owns the procedure:

- [Recovery Plans](/node/recovery-plans) for snapshot, state-sync, and
  emergency recovery choices
- [Pruning and Retention](/node/pruning) for history and disk policy
- [Protocol Governance and State Patches](/node/protocol-governance) for
  governed forward patches
- [BDS Indexed Queries](/api/bds) for indexed consistency and query behavior
- [5-Validator Localnet E2E](/node/localnet-e2e) for whole-stack validation
