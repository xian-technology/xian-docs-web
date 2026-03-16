# What is Xian?

Xian is a blockchain platform where smart contracts are written in Python. It combines the accessibility of the world's most popular programming language with the security guarantees of a Byzantine Fault Tolerant consensus engine.

If you can write Python, you can write smart contracts on Xian -- no new language to learn, no compilation step, no Solidity, no Rust.

## Key Features

- **Python smart contracts** -- a restricted, sandboxed subset of Python that enforces security and determinism
- **CometBFT consensus** -- proven BFT consensus engine with instant finality
- **Metered execution** -- every instruction costs stamps (gas), preventing abuse
- **On-chain state** -- persistent storage via `Variable` and `Hash` primitives
- **Cross-contract calls** -- contracts can import and call other deployed contracts
- **Event system** -- contracts emit structured events for real-time subscriptions

## Learn More

- [Architecture Overview](/introduction/architecture-overview) -- how the components fit together
- [Why Python?](/introduction/why-python) -- the rationale behind choosing Python for smart contracts
