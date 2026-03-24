# Credits Ledger Pack

The Credits Ledger Pack is the first concrete Xian solution pack.

It shows how to use Xian as an application-controlled internal ledger for
credits, balances, issuance, transfers, burns, and auditability.

## When To Use It

This pattern fits well when you need:

- platform credits
- community or loyalty points
- API usage credits
- marketplace balances
- partner settlement units

The application keeps its own relational data off-chain and uses Xian as the
authoritative shared credits ledger.

## Why Xian Fits

This pack is intentionally close to the product thesis:

- simple contract logic
- strong Python integration through `xian-py`
- clear event and history model
- easy local and remote operator flows
- straightforward monitoring and recovery story

## Recommended Operator Paths

Use these templates:

- local development: `single-node-indexed`
- remote deployment: `embedded-backend`

Those operator paths already give this pack the right posture:

- indexed reads through BDS
- dashboard and health visibility
- service-oriented integration defaults

## Pack Assets

### Contract Asset

The reusable credits-ledger contract lives in `xian-configs`:

- `solution-packs/credits-ledger/contracts/credits_ledger.s.py`

The intended deployed contract name in the examples is:

```text
con_credits_ledger
```

### SDK Examples

The `xian-py` repo includes pack-specific examples under:

- `examples/credits_ledger/admin_job.py`
- `examples/credits_ledger/api_service.py`
- `examples/credits_ledger/event_worker.py`

Those cover:

- contract bootstrap / admin flow
- API-service integration
- resumable event consumption

## Local Walkthrough

### 1. Create And Start A Local Indexed Node

```bash
cd ~/xian/xian-cli
uv run xian network create credits-local --chain-id xian-credits-local-1 \
  --template single-node-indexed --generate-validator-key --init-node
uv run xian node start validator-1
uv run xian node health validator-1
```

### 2. Bootstrap The Credits Ledger Contract

Use the admin job from `xian-py`:

```bash
cd ~/xian/xian-py
export XIAN_NODE_URL=http://127.0.0.1:26657
export XIAN_CHAIN_ID=xian-credits-local-1
export XIAN_WALLET_PRIVATE_KEY=<private-key-hex>
uv run python examples/credits_ledger/admin_job.py
```

The admin job:

- connects to the node
- deploys `con_credits_ledger` if it does not exist yet
- prints the current operator and total supply
- optionally issues credits when `XIAN_CREDITS_ISSUE_TO` and
  `XIAN_CREDITS_ISSUE_AMOUNT` are set

### 3. Run The API Service

```bash
uv run uvicorn examples.credits_ledger.api_service:app --reload --app-dir .
```

The service exposes:

- `GET /health`
- `GET /balances/{address}`
- `GET /events/transfer`
- `POST /issue`
- `POST /transfer`

### 4. Run The Event Worker

```bash
uv run python examples/credits_ledger/event_worker.py
```

The worker consumes:

- `Issue`
- `Transfer`
- `Burn`

It persists the last seen event IDs so it can resume cleanly after restarts.

## Remote Operator Story

For remote Linux hosts, use `xian-deploy` with the `embedded-backend`
deployment posture.

The main remote commands are:

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
and remote runbooks behind those paths.

## What This Pack Proves

The Credits Ledger Pack proves that Xian can act as:

- a programmable ledger backend
- a service-friendly integration target for Python applications
- an operationally manageable indexed node stack

It is the first pack because it exercises nearly the full golden path without
needing domain-heavy workflow logic.
