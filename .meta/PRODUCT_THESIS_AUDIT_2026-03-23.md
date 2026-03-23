# Product Thesis Audit

Date: 2026-03-23

Scope audited:

- `index.md`
- `introduction/index.md`
- `introduction/why-python.md`
- `introduction/comparison.md`
- `introduction/architecture-overview.md`
- `tools/index.md`
- `tools/xian-py.md`

## Main Findings

### 1. The docs still framed Xian primarily as a Python smart-contract blockchain

The new product thesis is narrower and clearer:

- Xian is a Python-first decentralized application platform
- it is intended to be used like infrastructure or a tool
- it should optimize for ease of use, flexible networks, and integration
- it should not be positioned primarily around throughput or general-purpose L1 competition

Several public pages still leaned on the older framing:

- “blockchain platform where smart contracts are written in Python”
- feature emphasis on consensus before integration/tooling
- comparison pages that read more like protocol-stack comparison than product positioning

### 2. The top-level landing path under-emphasized integration and app-specific networks

The old wording talked clearly about Python contracts, but it did not stress:

- programmable networks
- app-specific decentralized backends
- software-friendly integration
- operational clarity and tooling

### 3. The docs needed a more explicit “not speed-first” stance

The product thesis does not reject performance work, but it rejects
throughput-first positioning.

The docs should say that Xian is optimized for:

- developer experience
- simple but powerful contracts
- deployment and operations
- integration with real software systems

instead of benchmarking language or chain speed as a primary selling point.

## Changes Applied

Updated pages:

- `index.md`
- `introduction/index.md`
- `introduction/why-python.md`
- `introduction/comparison.md`
- `introduction/architecture-overview.md`
- `tools/index.md`
- `tools/xian-py.md`

Key changes:

- top-level wording now describes Xian as a Python-first decentralized
  application platform
- homepage features now emphasize programmable networks and integration/tooling
- introduction pages now stress app-specific decentralized infrastructure
- comparison page now positions Xian against general-purpose chains,
  app-chains, and enterprise stacks in product terms
- SDK docs now frame `xian-py` as an application/service integration surface,
  not only a node helper

## Remaining Watchpoints

- Future docs changes should avoid reintroducing “speed-first chain” framing.
- Public pages should prefer “programmable decentralized network/platform/tool”
  over generic “blockchain platform” wording when the broader framing matters.
- Performance docs should remain honest and operational, not promotional.
