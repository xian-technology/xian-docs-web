# Registry / Approval Pack

The Registry / Approval Pack is the second concrete Xian solution pack.

It is also the second pack that has been deepened into a fuller reference
application slice.

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

## Reference-App Pattern

The deeper reference-app slice for this pack uses a three-part shape:

1. the Xian contracts remain the authoritative approval and registry layer
2. indexed BDS events trigger a resumable projector
3. the projector hydrates richer proposal and record views from authoritative
   contract reads into a local SQLite projection

This is the stronger backend pattern for approval workflows:

- use chain events to detect workflow changes
- use authoritative contract reads to hydrate the full proposal and record
  state
- serve pending approvals, record catalogs, and audit activity from the local
  projection

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
- `examples/registry_approval/projector_worker.py`
- `examples/registry_approval/event_worker.py`

Those cover:

- bootstrap and signer setup
- proposal submission and approval
- a local projected workflow read model
- event-driven read-side integration hydrated from authoritative contract reads

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
uv sync --group dev --extra app
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
- funds those configured signers with native balance by default so they can pay
  for approval transactions in the reference flow
- optionally updates the threshold from `XIAN_REGISTRY_THRESHOLD`
- optionally submits an initial upsert proposal when `XIAN_REGISTRY_RECORD_ID`
  is set

Set `XIAN_REGISTRY_SIGNER_FUND_AMOUNT=0` if you want to disable the automatic
signer top-up behavior.

### 3. Run The API Service

```bash
uv run uvicorn examples.registry_approval.api_service:app --reload --app-dir .
```

The service exposes both authoritative and projected workflow reads:

- `GET /health`
- `GET /projection/health`
- `GET /projection/summary`
- `GET /records`
- `GET /records/{record_id}`
- `GET /records/{record_id}/activity`
- `GET /proposals`
- `GET /proposals/pending`
- `GET /proposals/{proposal_id}`
- `GET /proposals/{proposal_id}/approvals`
- `GET /activity/recent`
- `POST /proposals/upsert`
- `POST /proposals/revoke`
- `POST /proposals/{proposal_id}/approve`

The important split is:

- `records/{record_id}` and `proposals/{proposal_id}` still expose the
  authoritative contract reads
- `projection/*`, `records`, `proposals`, and `activity/*` expose the local
  projected workflow views

The service now uses decoded readonly `call(...)` helpers for authoritative
contract hydration instead of returning raw simulation envelopes.

### 4. Run The Projector Worker

```bash
uv run python examples/registry_approval/projector_worker.py
```

The projector:

- backfills from indexed BDS events on first start
- persists a local SQLite workflow projection
- maintains resumable cursors inside that projection database
- hydrates:
  - proposal details from `con_registry_approval.get_proposal`
  - record details from `con_registry_records.get_record`

It consumes:

- `ProposalSubmitted`
- `ProposalApproved`
- `ProposalExecuted`
- `RecordUpserted`
- `RecordRevoked`

The default projection database path is:

```text
.registry-approval-projection.sqlite3
```

Override it with:

```bash
export XIAN_REGISTRY_PROJECTION_PATH=/path/to/registry-approval.sqlite3
```

### 5. Query The Reference-App Views

Once the projector is running, you can query the richer application views:

```bash
curl http://127.0.0.1:8000/projection/summary
curl http://127.0.0.1:8000/proposals/pending
curl http://127.0.0.1:8000/records
curl http://127.0.0.1:8000/activity/recent
```

Those routes demonstrate the intended division of labor:

- Xian stores and enforces the approval workflow and registry state
- indexed events trigger projection updates
- authoritative contract reads hydrate the projection
- the API serves both on-chain reads and application-oriented workflow views

This exact shape was validated live against an indexed local node:

- founder submits the initial proposal
- a second funded signer approves it through the API
- the projector applies `ProposalApproved`, `RecordUpserted`, and
  `ProposalExecuted`
- `records`, `proposals`, and `activity` views all match the on-chain state

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
- an event-driven workflow source for richer projected approval queries
- a practical Python-integrated foundation for multi-party application state

It is second because it validates the shared-network story after the simpler
Credits Ledger Pack.
