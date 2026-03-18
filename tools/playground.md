# Contracting Playground

There is no maintained standalone playground repo in the current core
workspace.

For local interactive development today, use `xian-contracting` directly with
`ContractingClient`:

```python
from contracting.client import ContractingClient

client = ContractingClient()
client.flush()
```

That gives you the real runtime, linter, storage behavior, and contract loading
logic used by the node stack.
