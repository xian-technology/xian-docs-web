# Workflow Backend Pack

The Workflow Backend Pack is the third concrete Xian solution pack.

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

## Recommended Operator Paths

Use these templates:

- local development: `single-node-indexed`
- remote deployment: `embedded-backend`

Those operator paths match the pack:

- indexed reads for current workflow state and history
- backend-oriented runtime defaults
- monitoring and recovery surfaces that fit event-driven services

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
- `examples/workflow_backend/event_worker.py`

Those cover:

- bootstrap and worker setup
- API submission/query/cancel flows
- event-driven worker processing

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
export XIAN_NODE_URL=http://127.0.0.1:26657
export XIAN_CHAIN_ID=xian-workflow-local-1
export XIAN_WALLET_PRIVATE_KEY=<private-key-hex>
uv run python examples/workflow_backend/admin_job.py
```

The admin job:

- deploys `con_job_workflow` if it does not exist yet
- optionally adds worker accounts from `XIAN_WORKFLOW_WORKERS`
- optionally submits an initial item when `XIAN_WORKFLOW_ITEM_ID` is set

### 3. Run The API Service

```bash
uv run uvicorn examples.workflow_backend.api_service:app --reload --app-dir .
```

The service exposes:

- `GET /health`
- `GET /items/{item_id}`
- `POST /items`
- `POST /items/{item_id}/cancel`

### 4. Run The Event Worker

```bash
uv run python examples/workflow_backend/event_worker.py
```

The worker:

- watches `ItemSubmitted`
- claims new items
- completes or fails them
- monitors the resulting `ItemClaimed`, `ItemCompleted`, `ItemFailed`, and
  `ItemCancelled` events
- persists last-seen event IDs so it can resume cleanly

## Remote Operator Story

For remote Linux hosts, use `xian-deploy` with the `embedded-backend`
deployment posture.

The main remote commands remain:

```bash
ansible-playbook playbooks/deploy.yml
ansible-playbook playbooks/health.yml
ansible-playbook playbooks/bootstrap-state-sync.yml
ansible-playbook playbooks/restore-state-snapshot.yml
```

Use recovery intentionally:

- prepared node-home archive: `push-home.yml` then `deploy.yml`
- application-state snapshot import: `restore-state-snapshot.yml`
- protocol state sync: `bootstrap-state-sync.yml`

See [Starting, Stopping & Monitoring](/node/managing) for the concrete local
and remote runbooks.

## What This Pack Proves

The Workflow Backend Pack proves that Xian can act as:

- a shared job/workflow state machine
- an event-driven backend coordination layer
- a practical integration target for Python services and workers

It is the third pack because it is the strongest full expression of the
product thesis after the simpler ledger and approval patterns.
