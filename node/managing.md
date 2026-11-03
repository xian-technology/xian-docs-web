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

Xian application logs are separate from CometBFT logs. The active application
file is `<node-home>/xian/logs/xian-abci.log`; timestamped segments in the same
directory hold older entries. Settings live in `config/xian.toml`.

```bash
tail -F ~/.cometbft/xian/logs/xian-abci.log
```

Start at `INFO`, use `DEBUG` for focused diagnosis, and use `TRACE` only
briefly. Keep `transaction_trace_logging` disabled during normal operation.

Useful stages include `check_tx`, `prepare_proposal`, `process_proposal`,
`finalize_*`, and `simulate_tx`.

Xian-owned records have a UTC timestamp with milliseconds, severity, component,
message and named context. For a failed transaction, search its hash, then
compare its block height, stage and outcome across nodes. Node `tx_hash` is the
canonical execution hash recorded as `hash` inside the finalized execution
receipt. The CometBFT RPC/submission hash identifies the submitted bytes and is
a different digest; it appears as `raw_tx_hash` in stages that receive raw bytes.
Hex letter case can differ, but changing case does not convert one digest to the
other. Keep both identifiers when collecting an incident. Off-chain services use
request, rule or incident identifiers where available. Unexpected errors retain
exception types and stack locations; private keys, request bodies, arguments,
SQL parameters and local variables are excluded. Expected rejections include
safe reason codes. Multiline and oversized values are escaped or shortened.

Keep the incident's relevant log excerpts, effective configuration without
credentials, software revisions, affected transaction hashes, and heights from
each node. A later matching height does not establish which state an earlier
read observed. Metrics and receipts complement logs; logging is not a durable
transaction ledger.

### Retention and Disk Limits

| Setting | Default | Meaning |
| --- | --- | --- |
| `app_log_rotation_hours` | `1` | Rotate an active segment by elapsed time |
| `app_log_retention_days` | `7` | Remove expired managed application files |
| `app_log_max_file_mb` | `50` | Maximum segment size in MiB |
| `app_log_max_total_mb` | `250` | Combined active/archive budget in MiB |

Size limits can remove older entries before seven days. The archive budget
reserves room for a full active segment, so deletion can occur before actual
usage reaches the total. Cleanup runs at startup, rotation and hourly while the
node is running, including idle periods. Expired files on a stopped node are
removed when it starts again. Archives are uncompressed to avoid temporary
duplicate storage during compression. Existing managed timestamped ZIP archives
are included in cleanup; unrelated files are left alone.
Age is measured from each segment's last write. A record can therefore outlive
the configured interval by the segment's time span and the cleanup interval;
these are both bounded while the service is running.

File write failures emit a safe UTC diagnostic to stderr at most once per minute;
cleanup failures emit one per cleanup cycle. These include the operation, error
type and numeric OS error code without paths or exception payloads. A failed
record is dropped and later writes/cleanup retry. Failure of stderr itself does
not stop the node. Alert on these diagnostics and disk usage: retention cannot
recover space when the filesystem denies access.

Set size limits through `xian setup node`, `xian network create`, or
`xian network join` with `--app-log-max-file-mb` and
`--app-log-max-total-mb`. Both must be positive integers, and the total must be
at least the segment limit. Restart the application after changing logging
configuration.

Stack containers use Docker's `local` logging driver with 50 MiB segments and
five retained segments per container. Docker copies are size/count bounded;
they do **not** have a seven-day age guarantee. Third-party services such as
CometBFT and PostgreSQL retain their native record formats. Recreate existing
containers to apply changed driver options. Do not delete or truncate files
inside Docker's log storage directly.

Docker limits are configurable through `XIAN_DOCKER_LOG_MAX_FILE_MB` and
`XIAN_DOCKER_LOG_MAX_FILES`. The detached DEX worker and shielded relayer have
separate bounded process-capture logs, exposed by their backend status paths.
Their limits use `XIAN_SERVICE_LOG_MAX_FILE_MB`, `XIAN_SERVICE_LOG_MAX_TOTAL_MB`
and `XIAN_SERVICE_LOG_RETENTION_DAYS` with the same 50/250 MiB and seven-day
defaults. Capture rotates hourly and checks expiry every five minutes, including
quiet periods. Restart these services to change their capture limits.

Budgets apply per log root or container, not to the whole host. Include every
enabled container and application log root in disk sizing. Chain data, BDS data,
backups, exported incident evidence and E2E artifacts have separate retention.

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
