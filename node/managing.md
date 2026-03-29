# Starting, Stopping & Monitoring

Use `xian-cli` for local operator-facing lifecycle commands. Use
`xian-deploy` for the remote Linux-host equivalents. Use `xian-stack` directly
only for backend validation or low-level debugging.

For the maintained whole-stack local validation flow, use the dedicated
[4-Node Localnet E2E](/node/localnet-e2e) run instead of stitching together ad
hoc load, governance, and logging checks by hand.

## Start and Stop

```bash
uv run xian node start validator-1
uv run xian node stop validator-1
```

If the node profile enables the dashboard, `xian node start` also brings up the
optional dashboard service on the configured host/port.

If the node profile enables monitoring, `xian node start` also brings up the
Prometheus and Grafana sidecars through the `xian-stack` backend.

If the node profile enables `xian-intentkit`, `xian node start` also brings up
the stack-managed IntentKit frontend, API, worker, scheduler, and support
services as a separate Compose project.

## Status

```bash
uv run xian node status validator-1
uv run xian node endpoints validator-1
uv run xian node health validator-1
```

`node status` reports:

- whether the node home is initialized
- the resolved manifest and profile paths
- the `xian-stack` backend state when available
- optional live RPC reachability
- a compact summary of readiness, sync height, peer count, and optional
  dashboard / monitoring / `xian-intentkit` reachability
- the effective local endpoint catalog for RPC, `abci_query`, metrics, and
  optional dashboard / monitoring / `xian-intentkit` services

`node health` is the concise machine-readable live-health view. It adds:

- backend state as `healthy`, `degraded`, or `stopped`
- RPC reachability and current sync detail
- CometBFT and Xian metrics reachability
- BDS queue, spool, lag, and database status when `service_node` is enabled
- optional dashboard / Prometheus / Grafana reachability when enabled
- optional `xian-intentkit` frontend and API reachability when enabled
- optional disk-pressure checks through the local `xian-stack` storage report
- rendered state-sync readiness from `config.toml`
- the effective snapshot bootstrap URL

`node endpoints` is the quickest discovery command for local operator URLs. It
prints the expected entrypoints for:

- CometBFT RPC
- CometBFT `/status`
- ABCI query
- CometBFT metrics
- Xian metrics
- BDS status and spool ABCI query URLs when `service_node` is enabled
- GraphQL when `service_node` is enabled
- dashboard and dashboard status when enabled
- Prometheus and Grafana when monitoring is enabled
- `xian-intentkit` frontend and API health URLs when enabled

For stack-managed nodes, the endpoint catalog reflects the actual published
Docker host ports of the running services when they differ from the profile
defaults. That matters for localnet and validation workspaces that remap ports
to avoid collisions.

`doctor` is the broader workspace and node-health preflight:

```bash
uv run xian doctor validator-1
uv run xian doctor validator-1 --skip-live-checks
```

By default, `doctor <name>` now performs live health checks when the node name
is known. That includes:

- `xian-stack` backend reachability
- RPC reachability and the current sync summary
- dashboard reachability when the profile enables it
- Prometheus and Grafana reachability when monitoring is enabled
- state-sync readiness from the rendered CometBFT config
- snapshot-bootstrap availability from the effective `snapshot_url`

Use `--skip-live-checks` when you want the older artifact-only behavior for an
offline preflight.

## Application Logs

The Xian application runtime writes its own logs separately from CometBFT's
logs.

Current behavior:

- live stderr output follows `[xian].app_log_level`
- rotated application log files live under `.cometbft/xian/logs`
- rotation follows `[xian].app_log_rotation_hours`
- retention follows `[xian].app_log_retention_days`
- both stderr and file logging are queued asynchronously to avoid blocking the
  runtime on every write
- when `[xian].app_log_json = true`, both stderr and the rotated file sink are
  structured JSON

Use this logger when you need to answer questions like:

- why a transaction was rejected in `CheckTx`
- why `prepare_proposal` dropped a transaction
- what happened during `finalize_block`
- why readonly simulation was rejected, timed out, or failed

`transaction_trace_logging` is the noisy per-transaction debug mode. Keep it
off for normal operation and enable it temporarily when you need tx-by-tx
execution summaries.

Practical detail:

- `app_log_level=DEBUG` gives you compact per-tx summaries
- `app_log_level=TRACE` is the expensive mode that also emits full serialized
  tx-result payloads

### Practical Log Workflow

Typical local path:

```bash
tail -f ~/.cometbft/xian/logs/*.log
```

If JSON logging is enabled:

```bash
tail -f ~/.cometbft/xian/logs/*.log | jq .
```

Useful patterns to look for:

- `stage=check_tx` for mempool admission failures
- `stage=prepare_proposal` for transactions dropped before proposal assembly
- `stage=process_proposal` for proposed-block rejection reasons
- `stage=finalize_start`, `stage=finalize_parallel`, and `stage=finalize_complete` for block lifecycle debugging
- `stage=simulate_tx` for readonly simulation saturation, timeout, or worker failures

Recommended escalation order:

1. start with `app_log_level=INFO`
2. if that is not enough, move to `app_log_level=DEBUG`
3. only use `app_log_level=TRACE` for short-lived deep tx debugging

When you are done debugging, turn `transaction_trace_logging` back off and
return the node to its normal log level.

## Backend Commands

From `xian-stack`, the stable machine-readable backend is:

```bash
python3 ./scripts/backend.py start --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py status --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py endpoints --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py health --no-service-node --no-dashboard --no-monitoring
python3 ./scripts/backend.py stop --no-service-node --no-dashboard --no-monitoring
```

With stack-managed `xian-intentkit`:

```bash
python3 ./scripts/backend.py start --service-node --intentkit --intentkit-network-id xian-mainnet
python3 ./scripts/backend.py endpoints --service-node --intentkit --intentkit-network-id xian-mainnet
python3 ./scripts/backend.py health --service-node --intentkit --intentkit-network-id xian-mainnet
python3 ./scripts/backend.py stop --service-node --intentkit --intentkit-network-id xian-mainnet
```

For BDS-enabled integrated runs:

```bash
python3 ./scripts/backend.py start --service-node --monitoring
python3 ./scripts/backend.py endpoints --service-node --monitoring
python3 ./scripts/backend.py health --service-node --monitoring --no-check-disk
```

Host-side storage inspection from `xian-stack`:

```bash
python3 ./scripts/backend.py storage-report
make storage-report
```

## Remote Hosts With `xian-deploy`

Use `xian-deploy` when the node is running on a remote Linux host and you want
the deployment-side equivalent of the local health and recovery workflow.

The remote starter flows now also have reusable preset files in `xian-deploy`:

- `presets/templates/embedded-backend.yml`
- `presets/templates/consortium-validator.yml`
- `presets/templates/consortium-service-node.yml`

Use those with `ansible-playbook ... -e @presets/templates/<name>.yml` or place
the same values into host/group vars in your private inventory.

Common entrypoints:

```bash
ansible-playbook playbooks/status.yml
ansible-playbook playbooks/health.yml
ansible-playbook playbooks/smoke.yml
```

What they are for:

- `status.yml`: inspect the remote deployment state through the runtime role
- `health.yml`: the full remote equivalent of `xian node health` plus the
  broader deployment checks that matter on a host
- `smoke.yml`: a lighter post-deploy sanity check for services and endpoints

The remote health playbook checks:

- expected running containers for the selected topology
- RPC reachability and current sync status
- Xian metrics
- optional dashboard / Prometheus / Grafana reachability
- BDS queue, spool, lag, and database state when BDS is enabled
- rendered state-sync readiness from the remote `config.toml`
- deploy-root and BDS-spool disk pressure

## Recovery Runbooks

Use the recovery/bootstrap path that matches the artifact you already have.

### Prepared Node-Home Archive

Use this when you already have a full prepared `.cometbft` home for the target
node.

Local path:

```bash
uv run xian network join validator-1 --network mainnet
uv run xian node init validator-1
```

Remote path:

```bash
ansible-playbook playbooks/push-home.yml
ansible-playbook playbooks/deploy.yml
```

This is the closest remote equivalent to a local `snapshot_url` / node-home
restore workflow.

### Application-State Snapshot Import

Use this when you have an exported `xian-state-snapshot` archive and want to
restore Xian application state without replacing the full prepared node home.

Local path:

```bash
uv run xian-state-snapshot import --input-path ./xian-state-snapshot.tar.gz
```

Remote path:

```bash
ansible-playbook playbooks/restore-state-snapshot.yml
```

Required remote variable:

- `xian_state_snapshot_archive`

### Protocol State Sync

Use this when you want the node to bootstrap from trusted peers that already
serve Xian application snapshots through CometBFT state sync.

Local path:

- set the rendered `[statesync]` config through the node profile
- use `xian node health` / `xian doctor` to verify readiness

Remote path:

```bash
ansible-playbook playbooks/bootstrap-state-sync.yml
```

### Forward State Patch Activation

Use this when the chain is still live and the protocol issue can be corrected
forward without rewriting finalized history.

Operator checklist:

1. place the approved patch bundle under `config/state-patches/` on every validator
2. confirm the local bundle inventory and `bundle_hash` match
3. approve the `state_patch` proposal on-chain through protocol governance
4. verify the scheduled activation height through the query/API surfaces
5. watch the activation block and confirm the patch status moves to `applied`

Useful inspection paths:

```text
GET /api/abci_query/state_patch_bundles
GET /api/abci_query/scheduled_state_patches/<height>
GET /api/abci_query/state_patches
GET /api/abci_query/state_patches_for_block/<height>
```

Important boundary:

- validators must already have the local bundle before the activation block
- if the local bundle is malformed or mismatched, the runtime now fails hard
  instead of silently skipping the patch

### Consensus-Halt Emergency Recovery

Use this when the bug itself prevents the chain from continuing, for example a
determinism or metering issue that causes validators to diverge during block
execution.

In that case, on-chain governance is not enough by itself because the chain may
not advance far enough to approve or execute a patch.

Operator response:

1. stop validators from continuing divergent execution
2. agree off-chain on the fixed runtime build and recovery procedure
3. roll the validator set onto the same fixed deterministic runtime
4. restart the network in a coordinated way
5. if the resulting state still needs correction, use a governed forward patch after recovery

Treat this as a social-consensus / operator runbook event, not a normal
contract-level governance action.

For the concrete JSON plan format and `xian recovery validate/apply` commands,
see [Recovery Plans](/node/recovery-plans).

Required remote variables:

- `xian_statesync_enable=true`
- at least two `xian_statesync_rpc_servers`
- `xian_statesync_trust_height`
- `xian_statesync_trust_hash`
- `xian_statesync_trust_period`

This playbook validates the state-sync inputs first, deploys the runtime, then
prints a focused bootstrap summary from the remote host.

## Monitoring Layers

Use the monitoring surfaces in this order:

- CometBFT RPC and raw ABCI query for canonical low-level reads
- Xian Prometheus metrics plus CometBFT metrics for alerting and time-series
  monitoring
- dashboard REST/WebSocket for operator UX and exploration
- BDS-backed ABCI query for indexed/history reads
- GraphQL/PostGraphile v5 only as an optional convenience layer over BDS

## Dashboard and GraphQL

Optional services:

- dashboard: port `8080` by default
- Xian Prometheus metrics: port `9108` by default
- CometBFT metrics: port `26660` by default
- Prometheus: port `9090` by default
- Grafana: port `3000` by default
- GraphQL/PostGraphile v5: port `5000` when BDS is enabled

Use the dashboard for chain inspection and WebSocket subscriptions.

For a direct local dashboard process against an already running node:

```bash
uv run --project /path/to/xian-abci python3 -m xian.dashboard.cli \
  --rpc-url http://127.0.0.1:26657 \
  --host 127.0.0.1 \
  --port 18080
```

Use Prometheus and Grafana for remote monitoring, alerting, and retention.

Template-specific monitoring assets now exist on top of the generic overview:

- `Xian Embedded Backend` dashboard for service-node and embedded-backend
  application deployments
- `Xian Shared Network` dashboard for consortium/shared-network service nodes
- embedded-backend and shared-network Prometheus alert presets

From `xian-stack`:

```bash
make monitoring-up
make monitoring-down
make monitoring-bds-up
make monitoring-bds-down
make monitoring-fidelity-up
make monitoring-fidelity-down
```

The built-in monitoring commands now map to meaningful monitoring postures:

- `monitoring-up`: generic integrated monitoring with the overview dashboard
- `monitoring-bds-up`: integrated service-node monitoring with the
  embedded-backend alert preset
- `monitoring-fidelity-up`: shared-network monitoring with the shared-network
  alert preset

What gets scraped:

- CometBFT metrics on `:26660`
- Xian metrics on `:9108`

In the Docker stack, Xian performance snapshots are enabled by default so the
dashboard can show recent execution timing without additional setup. Override
that with `XIAN_PERF_ENABLED=0` if you explicitly want to disable the
`/perf_status` snapshot path.

What the dashboard adds without duplicating the main node cards:

- validator-set visibility with set height, active validator count, total
  power, a clickable validator list, and rows for jumping to a known peer
  dashboard target
- validator rows keep a consistent height even when the local validator row is
  marked with the `self` badge
- the validator list expands to use the full panel height for smaller
  validator sets and stays scrollable for larger ones, so the validator card
  does not leave dead space on the standard desktop layout
- live P2P peer visibility separate from the validator set, so current network
  connectivity problems remain visible even when the consensus membership is
  unchanged
- a dedicated explorer at `/explorer`, plus `/explorer/contracts`,
  `/explorer/addresses`, and `/explorer/events`, so block/event browsing stays
  in the explorer instead of duplicating those tables on the main dashboard
- the block explorer auto-refreshes while you are on the newest block page, but
  keeps older paginated block views stable while you inspect historical data
- `/explorer/addresses` opens with a recent indexed address list instead of an
  empty prompt-only view when the node exposes the BDS sender-history index,
  and selecting a row drills down into that address's submitted transaction
  history
- contract browsing sorted by creation date or name
- contract code browsing with syntax-highlighted original source when that
  source is available, explicit runtime-code labeling when only the stored
  runtime form is available, and function-to-source jumping
- address drill-down that shows indexed sender history and lets you reopen tx
  detail from an address page
- richer contract metadata, including owner / developer / deployer / creator
  fields, clickable address links, and indexed generated developer-reward
  totals when BDS is available
- recent indexed event browsing on service nodes with BDS enabled
- execution health from `/perf_status`, plus explicit visibility when advanced
  perf capture is disabled
- BDS lag, pending-buffer depth, spool state, filesystem-free space, and alerts
  from `/bds_status`
- click-to-copy middle truncation for long node identity values in the
  dashboard cards
- peer switching that keeps the dashboard scoped to a selected node, including
  localnet host-port inference for the standard `node-<n>` layout

Use the node's ABCI query surface for canonical reads:

- raw current-state reads like `/get/...`, `/contract/...`, `/contract_code/...`, and
  `/simulate_tx/...`
- BDS-backed indexed/history reads like `/blocks/...`, `/tx/...`,
  `/events/...`, `/state_history/...`, and `/developer_rewards/...` when BDS
  is enabled
- BDS operator reads like `/bds_status` and `/bds_spool/...` to inspect queue,
  spool, and indexed-head health
- performance reads like `/perf_status` to inspect recent block timing and
  tracer metadata

Use GraphQL only when you want a convenience query layer over the BDS
database.

## BDS Catch-Up and Reindex

When BDS is enabled, the validator finalizes blocks first and BDS indexes them
asynchronously. Live finalized blocks are buffered in memory and persisted in
strict contiguous block order.

If BDS sees a gap, it catches up from CometBFT RPC automatically while newer
live blocks keep arriving.

Example:

- indexed head is `100`
- live block `102` arrives before `101` was indexed
- BDS keeps `102` pending
- the catch-up worker fetches `101` from RPC
- BDS writes `101`, then `102`

So yes: BDS can receive new block data and simultaneously retrieve missed data.
It just never persists them out of order.

For explicit offline spool maintenance:

```bash
uv run xian-bds-spool compact --offline
uv run xian-bds-spool drain --offline
```

What these are for:

- `compact`: remove stale spool files that are already covered by the indexed
  BDS head
- `drain`: persist the currently pending local spool into Postgres on an
  existing BDS database

Use `drain` when BDS was temporarily unavailable but the local spool still has
the missing finalized blocks. Do not use it as a cold-bootstrap replacement for
historical indexing.

For full historical backfill, use:

```bash
uv run xian-bds-reindex
```

Useful options:

```bash
uv run xian-bds-reindex --start-height 1000
uv run xian-bds-reindex --end-height 5000
uv run xian-bds-reindex --rpc-url http://127.0.0.1:26657
uv run xian-bds-reindex --reset
```

What this needs:

- local or remote CometBFT RPC access
- retained block history for the heights you want to index

If the local node has already pruned away the required history, local reindex
cannot reconstruct it. In that case the practical options are:

- reindex from an archival RPC source
- import a BDS snapshot from another node

## Chain State Snapshots

Application-state snapshots are separate from BDS snapshots.

Use them when you want CometBFT state sync or a clean local application-state
archive:

```bash
uv run xian-state-snapshot list
uv run xian-state-snapshot export
uv run xian-state-snapshot export --output-path ./xian-state-snapshot.tar.gz
uv run xian-state-snapshot import --input-path ./xian-state-snapshot.tar.gz
```

What these snapshots contain:

- latest Xian application height and app hash
- contract state
- nonce state

What they do not contain:

- full CometBFT `data/` history
- BDS/Postgres data

Use `snapshot_url` restore when you already have a full prepared node-home
archive.

Use `xian-state-snapshot` plus CometBFT state sync when you want protocol-level
application snapshot bootstrap.

To consume peer-served application snapshots through state sync, configure the
node with trusted RPC servers and trust metadata:

```bash
uv run xian-configure-node \
  --moniker validator-1 \
  --validator-privkey <hex> \
  --copy-genesis \
  --statesync-enable \
  --statesync-rpc-server http://rpc-1.example:26657 \
  --statesync-rpc-server http://rpc-2.example:26657 \
  --statesync-trust-height 123456 \
  --statesync-trust-hash <trusted-block-hash>
```

Current model:

- snapshot export is manual
- snapshot serving/loading is implemented through the ABCI snapshot lifecycle
- imported snapshots are stored locally so the node can serve them afterward

## Pruning

Current pruning is block-history pruning through `retain_height`.

What this means operationally:

- the current LMDB application state remains available
- historical local replay/reindex depends on retained block history
- pruned nodes are fine for normal operation but not ideal as archival sources

If you enable pruning and later need historical rebuilds beyond the retained
window, use:

- an archival RPC source
- a full-home snapshot
- or a BDS snapshot / reindex workflow, depending on what data you need

## BDS Snapshot Export and Import

For faster bootstrap, migration, or recovery, BDS can now be exported and
imported separately from the live chain state:

```bash
uv run xian-bds-snapshot export --output-path ./xian-bds-snapshot.tar.gz
uv run xian-bds-snapshot import --input-path ./xian-bds-snapshot.tar.gz
```

Recommended use:

- export from a healthy indexed node
- import into a stopped node before bringing BDS online
- let the local spool replay or `xian-bds-reindex` fill any remaining gap after
  the imported indexed height

Snapshot import is the best path when:

- BDS is being enabled for the first time on a large network
- the local node is pruned and cannot rebuild full history from its own RPC
- you want a faster bootstrap than replaying the whole chain from scratch

## Storage and Retention

Docker images themselves are immutable layers. The thing that grows during node
operation is host-side storage:

- CometBFT data under `.cometbft`
- Xian state under `.cometbft/xian`
- the local BDS spool under `.cometbft/xian/bds-spool`
- Postgres data under `.bds.db`
- Docker build cache, image layers, writable layers, and container logs

Use the stack storage report to inspect the Xian-specific paths:

```bash
python3 ./scripts/backend.py storage-report
```

Use `/bds_status` to inspect the BDS worker, indexed head, spool size, and
low-disk alerts.

Interpretation note:

- `current_block_height` and `height_lag` are now derived from the latest
  committed node height even when no block is currently being executed
- `catching_up` reflects actual indexing lag or spool backlog
- `queue_depth` still matters operationally, but a nonzero queue by itself does
  not necessarily mean BDS is behind

Operational guidance:

- on pruned nodes, local BDS reindex only works for heights the node still
  retains
- on archival nodes, local BDS reindex can rebuild the full index directly from
  RPC
- if neither local history nor spool is sufficient, use an archival RPC source
  or import a BDS snapshot from another node

## Multi-Node Testing

Local multi-node consensus testing lives in `xian-stack` localnet:

```bash
python3 ./scripts/backend.py localnet-init --nodes 4 --topology integrated --clean
python3 ./scripts/backend.py localnet-up --wait-for-health
python3 ./scripts/backend.py localnet-status
python3 ./scripts/backend.py localnet-down
```
