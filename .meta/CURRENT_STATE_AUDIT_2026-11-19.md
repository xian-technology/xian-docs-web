# Current-state documentation and configuration audit

Date: 2026-11-19

## Scope and decisions

Reviewed all 118 published Markdown pages in `xian-docs-web` for obsolete
runtime descriptions, retired settings, migration recipes, unsupported entrypoints,
and release-history prose. Updated 36 public pages. The home and every
content section are included; `.meta/`, agent instructions, dependencies and
generated graphs are excluded from the published-page inventory.

Supported API limits, backup/recovery requirements, contract upgrade patterns,
indexed history and currently callable APIs remain documented. A version in a
current schema or storage key is not itself dead functionality. Optional offline
migration/replay and archival fixtures have actual consumers and were not treated
as unused configuration. The exempt `xian-intentkit` checkout was not changed.

## Action log

1. Read workspace orientation, repo conventions, launch status and change gates,
   then the owning repositories' instructions and READMEs.
2. Read and applied `ub-mode` and Graphify guidance. Checked graph freshness,
   refreshed stale graphs and used queries to locate implementation boundaries.
3. Inventoried every published page and searched all sections for historical,
   migration, compatibility and deleted-setting language. Inspected each match
   in context to distinguish current behavior from implementation history.
4. Removed parallel-executor tombstones, V1 signing/testing/migration recipes,
   PostgreSQL 17 upgrade instructions, archived setup/replay recipes and wallet
   release-history prose. Described active hashing, Unicode, datetime, interface
   and staking behavior directly. Retained supported operational constraints.
5. Corrected execution-policy documentation to name all six checked fields and
   repaired the changed execution-policy fragment link.
6. Added a repository instruction to keep deleted features and unreleased revision
   migration recipes out of public docs.
7. In `xian-abci`, replaced retired execution/fee-key rejection helpers with
   validation derived from supported runtime/snapshot fields. BDS validates its
   dataclass fields and is parsed once before state initialization. Removed the
   unused environment input and retired-variable list. Replaced historical
   diagnostics with supported-field errors that do not echo secret values.
8. Removed the unused snapshot import aliases/re-exports and moved stack
   exporters, localnet checks and their tests to `xian.full_node_store`.
9. Found and removed ignored `block_service_mode` settings in all three hidden
   node-test fixtures through full-suite startup validation.
10. In `xian-stack`, removed unversioned credential parsing and the retired BDS
    environment-variable catalog. Validate the supported stack BDS namespace and
    require the versioned JSON credential format. Updated usage documentation and
    tests, preserving literal values, private files and atomic writes.
11. In `xian-deploy`, removed the parallel-setting special case in favor of the
    existing supported-field checks. Deleted two error-only playbooks and their
    references/tests; replay and verified full-store restore are the supported
    bootstrap workflows.
12. Wrote behavior tests before changing runtime/credential handling and observed
    failures for the intended reasons. Ran focused and full validation, repaired
    affected consumers, and checked complexity, duplication and mutations.
    Validation uses isolated temporary credentials rather than rewriting private
    local credentials. Generated graphs and metrics remain uncommitted.

## Validation

- `xian-docs-web`: `npm run build` passed; all fragment links checked across
  119 generated HTML pages with zero broken anchors; `npm audit
  --audit-level=high --omit=dev` reported zero vulnerabilities.
- `xian-abci`: `./scripts/validate-repo.sh` passed (1,620 tests passed,
  1 skipped), including protobuf regeneration, lint and formatting.
- `xian-stack`: `make validate` passed with isolated temporary credentials;
  lint and formatting passed; full suite: 1,413 passed, 6 skipped.
- `xian-deploy`: `make validate` passed, including unit/Ansible role checks,
  inventory validation and syntax checks for every supported playbook.
- Mutation testing: all 11 config mutation sites and all 48 credential mutation
  sites killed. Focused config functions have CRAP scores at most 5; every
  credential function scores below 10. No duplication candidates at 0.8.
- Graph refresh and affected-source review completed for all four changed repos.
  Source searches covered sibling consumers; generated graphs stay local.
- `git diff --check` passed in each changed repository. Existing suite warnings
  concern test marks, aiohttp application keys and test socket cleanup; VitePress
  also reports the existing large-bundle advisory. No failing checks remain.

## Published-page coverage

| Section | Pages |
| --- | ---: |
| (home) | 1 |
| api | 6 |
| concepts | 11 |
| getting-started | 4 |
| introduction | 4 |
| node | 21 |
| products | 4 |
| reference | 6 |
| smart-contracts | 40 |
| tools | 14 |
| tutorials | 7 |

| Page | Review result |
| --- | --- |
| `api/bds.md` | Updated |
| `api/dry-runs.md` | Reviewed; current behavior retained |
| `api/graphql.md` | Reviewed; current behavior retained |
| `api/index.md` | Reviewed; current behavior retained |
| `api/rest.md` | Updated |
| `api/websockets.md` | Reviewed; current behavior retained |
| `concepts/abci.md` | Reviewed; current behavior retained |
| `concepts/block-execution.md` | Updated |
| `concepts/chi.md` | Reviewed; current behavior retained |
| `concepts/consensus.md` | Reviewed; current behavior retained |
| `concepts/deterministic-execution.md` | Updated |
| `concepts/index.md` | Reviewed; current behavior retained |
| `concepts/shielded-zk-stack.md` | Reviewed; current behavior retained |
| `concepts/state-model.md` | Reviewed; current behavior retained |
| `concepts/time-and-blocks.md` | Reviewed; current behavior retained |
| `concepts/transaction-lifecycle.md` | Reviewed; current behavior retained |
| `concepts/xian-vm.md` | Updated |
| `getting-started/deploying.md` | Reviewed; current behavior retained |
| `getting-started/dev-environment.md` | Updated |
| `getting-started/first-contract.md` | Reviewed; current behavior retained |
| `getting-started/index.md` | Reviewed; current behavior retained |
| `index.md` | Reviewed; current behavior retained |
| `introduction/architecture-overview.md` | Updated |
| `introduction/comparison.md` | Reviewed; current behavior retained |
| `introduction/index.md` | Reviewed; current behavior retained |
| `introduction/why-python.md` | Reviewed; current behavior retained |
| `node/architecture.md` | Reviewed; current behavior retained |
| `node/config-taxonomy.md` | Reviewed; current behavior retained |
| `node/configuration.md` | Updated |
| `node/governance-web.md` | Reviewed; current behavior retained |
| `node/index.md` | Reviewed; current behavior retained |
| `node/installation.md` | Updated |
| `node/local-dex-bootstrap.md` | Reviewed; current behavior retained |
| `node/localnet-e2e.md` | Updated |
| `node/managing.md` | Reviewed; current behavior retained |
| `node/performance.md` | Reviewed; current behavior retained |
| `node/profiles.md` | Updated |
| `node/protocol-governance.md` | Reviewed; current behavior retained |
| `node/pruning.md` | Reviewed; current behavior retained |
| `node/recovery-plans.md` | Updated |
| `node/requirements.md` | Reviewed; current behavior retained |
| `node/runtime-features.md` | Updated |
| `node/staking.md` | Reviewed; current behavior retained |
| `node/upgrading.md` | Updated |
| `node/validator-operations-runbook.md` | Reviewed; current behavior retained |
| `node/validator-responsibilities.md` | Reviewed; current behavior retained |
| `node/validators.md` | Reviewed; current behavior retained |
| `products/dex.md` | Reviewed; current behavior retained |
| `products/index.md` | Reviewed; current behavior retained |
| `products/nft.md` | Reviewed; current behavior retained |
| `products/stable-protocol.md` | Updated |
| `reference/cheat-sheet.md` | Reviewed; current behavior retained |
| `reference/chi-costs.md` | Updated |
| `reference/errors.md` | Reviewed; current behavior retained |
| `reference/glossary.md` | Updated |
| `reference/index.md` | Reviewed; current behavior retained |
| `reference/submission-internals.md` | Reviewed; current behavior retained |
| `smart-contracts/context.md` | Reviewed; current behavior retained |
| `smart-contracts/contract-structure.md` | Reviewed; current behavior retained |
| `smart-contracts/events.md` | Reviewed; current behavior retained |
| `smart-contracts/functions.md` | Reviewed; current behavior retained |
| `smart-contracts/imports/dynamic-imports.md` | Reviewed; current behavior retained |
| `smart-contracts/imports/importing-contracts.md` | Reviewed; current behavior retained |
| `smart-contracts/imports/index.md` | Reviewed; current behavior retained |
| `smart-contracts/imports/interface-patterns.md` | Updated |
| `smart-contracts/index.md` | Reviewed; current behavior retained |
| `smart-contracts/numbers.md` | Updated |
| `smart-contracts/security/access-control.md` | Reviewed; current behavior retained |
| `smart-contracts/security/audit-checklist.md` | Reviewed; current behavior retained |
| `smart-contracts/security/index.md` | Reviewed; current behavior retained |
| `smart-contracts/security/pitfalls.md` | Reviewed; current behavior retained |
| `smart-contracts/security/upgradeability.md` | Reviewed; current behavior retained |
| `smart-contracts/staking.md` | Updated |
| `smart-contracts/standards/index.md` | Reviewed; current behavior retained |
| `smart-contracts/standards/xsc-0001.md` | Reviewed; current behavior retained |
| `smart-contracts/standards/xsc-0002.md` | Reviewed; current behavior retained |
| `smart-contracts/standards/xsc-0003.md` | Reviewed; current behavior retained |
| `smart-contracts/standards/xsc-0004.md` | Reviewed; current behavior retained |
| `smart-contracts/standards/xsc-0005.md` | Reviewed; current behavior retained |
| `smart-contracts/stdlib/crypto.md` | Reviewed; current behavior retained |
| `smart-contracts/stdlib/datetime.md` | Updated |
| `smart-contracts/stdlib/hashlib.md` | Updated |
| `smart-contracts/stdlib/index.md` | Reviewed; current behavior retained |
| `smart-contracts/stdlib/random.md` | Reviewed; current behavior retained |
| `smart-contracts/stdlib/zk.md` | Reviewed; current behavior retained |
| `smart-contracts/storage.md` | Updated |
| `smart-contracts/storage/encoding.md` | Reviewed; current behavior retained |
| `smart-contracts/storage/foreign.md` | Updated |
| `smart-contracts/storage/hashes.md` | Updated |
| `smart-contracts/storage/variables.md` | Reviewed; current behavior retained |
| `smart-contracts/testing/chi-costs.md` | Reviewed; current behavior retained |
| `smart-contracts/testing/index.md` | Updated |
| `smart-contracts/testing/multi-contract.md` | Reviewed; current behavior retained |
| `smart-contracts/testing/return-values.md` | Reviewed; current behavior retained |
| `smart-contracts/testing/unit-testing.md` | Updated |
| `smart-contracts/valid-code.md` | Updated |
| `smart-contracts/value-methods.md` | Updated |
| `tools/hub.md` | Reviewed; current behavior retained |
| `tools/ide.md` | Reviewed; current behavior retained |
| `tools/index.md` | Reviewed; current behavior retained |
| `tools/linter.md` | Updated |
| `tools/mcp-server.md` | Reviewed; current behavior retained |
| `tools/playground.md` | Reviewed; current behavior retained |
| `tools/xian-cli.md` | Updated |
| `tools/xian-dex-automation.md` | Updated |
| `tools/xian-intentkit.md` | Reviewed; current behavior retained |
| `tools/xian-js.md` | Updated |
| `tools/xian-py.md` | Updated |
| `tools/xian-wallet-browser.md` | Updated |
| `tools/xian-wallet-mobile.md` | Updated |
| `tools/xian-zk.md` | Reviewed; current behavior retained |
| `tutorials/creating-a-token.md` | Reviewed; current behavior retained |
| `tutorials/dice-game.md` | Reviewed; current behavior retained |
| `tutorials/index.md` | Reviewed; current behavior retained |
| `tutorials/multi-contract-dapp.md` | Reviewed; current behavior retained |
| `tutorials/shielded-commands.md` | Reviewed; current behavior retained |
| `tutorials/shielded-privacy-token.md` | Reviewed; current behavior retained |
| `tutorials/streaming-payments.md` | Reviewed; current behavior retained |
