# xian-intentkit

`xian-intentkit` is a self-hosted IntentKit fork with Xian skills and optional
`xian-stack` integration. It can run scheduled or event-triggered agents that
read Xian state, call contracts, use DEX tools, and send notifications.

## When to Use It

Use IntentKit when a model should interpret a goal or choose a workflow. Use a
deterministic service such as [xian-dex-automation](/tools/xian-dex-automation)
when explicit rules fully define the action.

## Stack-Managed Setup

The stack attaches IntentKit as a separate Compose project:

```bash
cd ../xian-stack
python3 ./scripts/backend.py start --bds-enabled --intentkit
python3 ./scripts/backend.py endpoints --bds-enabled --intentkit
python3 ./scripts/backend.py health --bds-enabled --intentkit
```

Default local endpoints are:

- frontend: `http://127.0.0.1:38000`
- API: `http://127.0.0.1:38080`

`xian-stack` generates the deployment environment from the node profile and
operator configuration. IntentKit retains ownership of its application,
database, frontend, channel adapters, and Compose topology.

The current Xian codebase has no active public testnet or mainnet. Point agents
at a local or operator-managed network and verify the chain ID and RPC URL
before funding an agent wallet.

## Agent Setup

An operational agent needs:

- a configured LLM provider
- a reachable Xian node
- a dedicated wallet with a bounded balance
- only the skills required by its task
- a clear purpose and one or more triggers

BDS is recommended for indexed event triggers and resumable reads.

Typical workflow:

1. Start the frontend and API.
2. Create an agent and choose its model.
3. Define a narrow purpose and prohibited actions.
4. Enable only required Xian and notification skills.
5. Assign a dedicated wallet.
6. Add scheduled or Xian-event tasks.
7. Review autonomous chats and tool calls.

## Triggers

- Scheduled tasks run at configured intervals.
- Xian-event tasks react to matching indexed contract events.

Event-triggered tasks should confirm the indexed event and relevant current
state before submitting a transaction. If a workflow depends on DEX events,
deploy and seed the DEX product first; base local networks do not include it.

## Safety

- Do not give an agent a general-purpose funded wallet.
- Enforce limits in wallet funding, enabled skills, contract configuration,
  and task settings rather than relying only on prompt text.
- Keep secrets in the service's configured secret surfaces.
- Require human review for high-value, governance, or irreversible actions.
- Record tool calls and reconcile submitted transactions with finalized
  receipts.

## Related Pages

- [xian-py](/tools/xian-py)
- [xian-dex-automation](/tools/xian-dex-automation)
- [Local DEX Bootstrap](/node/local-dex-bootstrap)
