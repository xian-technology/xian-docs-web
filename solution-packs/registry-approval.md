# Registry / Approval Pack

The Registry / Approval Pack is the second concrete Xian solution pack.

It shows how to use Xian as shared programmable registry state where records
must be proposed and approved before they become active or revoked.

## When To Use It

This pattern fits well when you need:

- partner or vendor registries
- certificate or credential registries
- allowlists or membership registries
- shared records that require more than one approver

The application keeps richer off-chain data elsewhere and uses Xian as the
authoritative approval and registry history layer.

## Why Xian Fits

This pack highlights the parts of Xian that are strongest for multi-party
coordination:

- simple but explicit multi-contract logic
- `ctx.caller` semantics that cleanly separate approval and mutation
- strong event and indexed history surfaces
- straightforward Python admin/service integration
- a realistic remote operator story through `consortium-3`

## Recommended Operator Paths

Use these templates:

- local development: `single-node-indexed`
- remote deployment: `consortium-3`

Those operator paths match the pack:

- indexed reads for proposals and registry events
- monitoring and recovery that make sense for a shared network
- an easy local path before moving to a real multi-party topology

## Pack Assets

### Contract Assets

The reusable contract assets live in `xian-configs`:

- `solution-packs/registry-approval/contracts/registry_records.s.py`
- `solution-packs/registry-approval/contracts/registry_approval.s.py`

The intended deployed contract names in the examples are:

```text
con_registry_records
con_registry_approval
```

The split is intentional:

- `con_registry_records` stores approved registry state
- `con_registry_approval` manages signers, proposals, approvals, and execution
- the registry contract only mutates when called by the approval contract

### SDK Examples

The `xian-py` repo includes pack-specific examples under:

- `examples/registry_approval/admin_job.py`
- `examples/registry_approval/api_service.py`
- `examples/registry_approval/event_worker.py`

Those cover:

- bootstrap and signer setup
- proposal submission and approval
- event-driven read-side integration

## Local Walkthrough

### 1. Create And Start A Local Indexed Node

```bash
cd ~/xian/xian-cli
uv run xian network create registry-local --chain-id xian-registry-local-1 \
  --template single-node-indexed --generate-validator-key --init-node
uv run xian node start validator-1
uv run xian node health validator-1
```

### 2. Bootstrap The Registry And Approval Contracts

Use the admin job from `xian-py`:

```bash
cd ~/xian/xian-py
export XIAN_NODE_URL=http://127.0.0.1:26657
export XIAN_CHAIN_ID=xian-registry-local-1
export XIAN_WALLET_PRIVATE_KEY=<private-key-hex>
uv run python examples/registry_approval/admin_job.py
```

The admin job:

- deploys `con_registry_records` if it does not exist yet
- deploys `con_registry_approval` if it does not exist yet
- links the registry to the approval contract
- optionally adds additional signers from `XIAN_REGISTRY_SIGNERS`
- optionally updates the threshold from `XIAN_REGISTRY_THRESHOLD`
- optionally submits an initial upsert proposal when `XIAN_REGISTRY_RECORD_ID`
  is set

### 3. Run The API Service

```bash
uv run uvicorn examples.registry_approval.api_service:app --reload --app-dir .
```

The service exposes:

- `GET /health`
- `GET /records/{record_id}`
- `GET /proposals/{proposal_id}`
- `POST /proposals/upsert`
- `POST /proposals/revoke`
- `POST /proposals/{proposal_id}/approve`

### 4. Run The Event Worker

```bash
uv run python examples/registry_approval/event_worker.py
```

The worker consumes:

- `ProposalSubmitted`
- `ProposalApproved`
- `ProposalExecuted`
- `RecordUpserted`
- `RecordRevoked`

It persists the last seen event IDs so it can resume cleanly after restarts.

## Remote Operator Story

For remote Linux hosts, use `xian-deploy` with the `consortium-3` deployment
posture when the registry is actually shared across parties.

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
and remote operator runbooks.

## What This Pack Proves

The Registry / Approval Pack proves that Xian can act as:

- a shared registry with explicit approval policy
- a clean multi-contract coordination backend
- a practical Python-integrated foundation for multi-party application state

It is second because it validates the shared-network story after the simpler
Credits Ledger Pack.
