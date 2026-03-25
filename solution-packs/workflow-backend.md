# Workflow Backend Pack

The Workflow Backend Pack is the third concrete Xian solution pack.

It is also the third pack that has been deepened into a fuller reference
application slice.

It shows how to use Xian as a job-style workflow backend where clients submit
items, workers claim them, and workers complete or fail them while off-chain
systems consume events and indexed state/history.

## When To Use It

This pattern fits well when you need:

- order or fulfillment workflows
- claims processing
- ticket or task lifecycles
- shared job queues with explicit state transitions

The application keeps richer business data elsewhere and uses Xian as the
authoritative workflow state machine and transition history layer.

## Why Xian Fits

This pack is the strongest expression of Xian as a decentralized backend:

- explicit workflow rules on-chain
- event-driven Python workers around the chain
- clear API-service integration
- strong history and auditability through indexed reads
- a clean operator story for backend-oriented deployments

## Reference-App Pattern

The deeper reference-app slice for this pack uses a four-part shape:

1. the Xian contract remains the authoritative workflow state machine
2. a processor worker reacts to submitted items and drives the workflow
3. indexed BDS events trigger a resumable projector
4. the projector hydrates current item state from authoritative contract reads
   into a local SQLite projection

This is the clearest expression of Xian as a decentralized backend:

- the chain enforces workflow transitions
- a processor worker performs application work around the chain
- a projector builds queue and activity views for application reads

## Recommended Operator Paths

Use these templates:

- local development: `single-node-indexed`
- remote deployment: `embedded-backend`

Those operator paths match the pack:

- indexed reads for current workflow state and history
- backend-oriented runtime defaults
- monitoring and recovery surfaces that fit event-driven services

## CLI Starter Flow

The same canonical starter flow used for this page is also packaged in
`xian-cli`:

```bash
cd ~/xian/xian-cli
uv run xian solution-pack starter workflow-backend
uv run xian solution-pack starter workflow-backend --flow remote
```

Use `starter` when you want the concise machine-readable flow. Use the rest of
this page when you want the fuller narrative walkthrough.

## Pack Assets

### Contract Asset

The reusable workflow contract lives in `xian-configs`:

- `solution-packs/workflow-backend/contracts/job_workflow.s.py`

The intended deployed contract name in the examples is:

```text
con_job_workflow
```

The contract models:

- submitted items
- worker claims
- completion
- failure
- cancellation

### SDK Examples

The `xian-py` repo includes pack-specific examples under:

- `examples/workflow_backend/admin_job.py`
- `examples/workflow_backend/api_service.py`
- `examples/workflow_backend/processor_worker.py`
- `examples/workflow_backend/projector_worker.py`
- `examples/workflow_backend/event_worker.py`

Those cover:

- bootstrap and worker setup
- API submission/query/cancel flows
- event-driven worker processing
- a local projected queue and activity model

## Local Walkthrough

### 1. Create And Start A Local Indexed Node

```bash
cd ~/xian/xian-cli
uv run xian network create workflow-local --chain-id xian-workflow-local-1 \
  --template single-node-indexed --generate-validator-key --init-node
uv run xian node start validator-1
uv run xian node health validator-1
```

### 2. Bootstrap The Workflow Contract

Use the admin job from `xian-py`:

```bash
cd ~/xian/xian-py
uv sync --group dev --extra app
export XIAN_NODE_URL=http://127.0.0.1:26657
export XIAN_CHAIN_ID=xian-workflow-local-1
export XIAN_WALLET_PRIVATE_KEY=<private-key-hex>
uv run python examples/workflow_backend/admin_job.py
```

The admin job:

- deploys `con_job_workflow` if it does not exist yet
- optionally adds worker accounts from `XIAN_WORKFLOW_WORKERS`
- funds those configured workers with native balance by default so they can pay
  for claim/complete transactions in the reference flow
- optionally submits an initial item when `XIAN_WORKFLOW_ITEM_ID` is set

Set `XIAN_WORKFLOW_WORKER_FUND_AMOUNT=0` if you want to disable the automatic
worker top-up behavior.

### 3. Run The API Service

```bash
uv run uvicorn examples.workflow_backend.api_service:app --reload --app-dir .
```

The service exposes:

- `GET /health`
- `GET /projection/health`
- `GET /projection/summary`
- `GET /items`
- `GET /items/{item_id}`
- `GET /items/{item_id}/activity`
- `GET /activity/recent`
- `POST /items`
- `POST /items/{item_id}/cancel`

The important split is:

- `items/{item_id}` still exposes the authoritative contract read
- `projection/*`, `items`, and `activity/*` expose the local projected queue
  and workflow views

The service now uses decoded readonly `call(...)` helpers for item hydration
instead of returning raw simulation envelopes.

### 4. Run The Processor Worker

```bash
uv run python examples/workflow_backend/processor_worker.py
```

The processor worker:

- watches `ItemSubmitted`
- claims new items
- completes or fails them
- keeps its own submission cursor so processing resumes cleanly after restarts

### 5. Run The Projector Worker

```bash
uv run python examples/workflow_backend/projector_worker.py
```

The projector:

- backfills from indexed BDS events on first start
- persists a local SQLite queue/activity projection
- maintains resumable cursors inside that projection database
- hydrates current item state from `con_job_workflow.get_item`
- merges indexed and non-indexed event payload fields so the projection matches
  the live BDS event shape

It consumes:

- `ItemSubmitted`
- `ItemClaimed`
- `ItemCompleted`
- `ItemFailed`
- `ItemCancelled`

The default projection database path is:

```text
.workflow-backend-projection.sqlite3
```

Override it with:

```bash
export XIAN_WORKFLOW_PROJECTION_PATH=/path/to/workflow-backend.sqlite3
```

### 6. Query The Reference-App Views

Once the projector is running, you can query the richer application views:

```bash
curl http://127.0.0.1:8000/projection/summary
curl http://127.0.0.1:8000/items
curl http://127.0.0.1:8000/items?status=processing
curl http://127.0.0.1:8000/activity/recent
```

Those routes demonstrate the intended division of labor:

- Xian stores and enforces workflow state
- the processor worker reacts to submitted items
- indexed events trigger projection updates
- authoritative `get_item` reads hydrate the projection
- the API serves both on-chain reads and application-oriented queue views

This exact shape was validated live against an indexed local node:

- one submitted item was claimed and completed by the processor worker
- the projector reflected `ItemSubmitted`, `ItemClaimed`, and `ItemCompleted`
  exactly
- after pausing the processor, a second submitted item was cancelled through
  the API
- projected queue, item, and activity views all matched the authoritative
  on-chain workflow state

## Remote Operator Story

For remote Linux hosts, use `xian-deploy` with the `embedded-backend`
deployment posture.

Use the matching remote preset and host-layout references from `xian-deploy`:

- preset: `presets/templates/embedded-backend.yml`
- host-layout example:
  `inventories/example/solution-packs/embedded-backend-hosts.yml`

The main remote commands remain:

```bash
ansible-playbook playbooks/deploy.yml \
  -e @presets/templates/embedded-backend.yml
ansible-playbook playbooks/health.yml \
  -e @presets/templates/embedded-backend.yml
ansible-playbook playbooks/bootstrap-state-sync.yml
ansible-playbook playbooks/restore-state-snapshot.yml
```

Use recovery intentionally:

- prepared node-home archive: `push-home.yml` then `deploy.yml`
- application-state snapshot import: `restore-state-snapshot.yml`
- protocol state sync: `bootstrap-state-sync.yml`

When monitoring is enabled through the embedded-backend preset, Grafana also
includes the `Xian Embedded Backend` dashboard and the matching embedded-backend
Prometheus alert preset.

See [Starting, Stopping & Monitoring](/node/managing) for the concrete local
and remote runbooks.

## What This Pack Proves

The Workflow Backend Pack proves that Xian can act as:

- a shared job/workflow state machine
- an event-driven backend coordination layer
- a projected queue and activity source for backend services
- a practical integration target for Python services and workers

It is the third pack because it is the strongest full expression of the
product thesis after the simpler ledger and approval patterns.
