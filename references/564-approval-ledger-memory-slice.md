# Approval Ledger Memory Slice

## Current Repo Truth

Runner-owned task pages already preserve bounded source-change evidence and
autonomous handoff evidence. Recent-work summaries and dedicated source-change
and delegation ledgers feed future engine turns through `memoryRefs` and the
bounded memory brief.

Before this slice, approval requests emitted by an engine turn were visible
through operational approval records, conversations, and Host projection, but a
coding-agent node's private deterministic wiki did not keep a compact approval
ledger. Future turns could miss recent approval obligations unless optional
model-guided memory synthesis captured them in prose.

## Target Model

Each coding-agent node should maintain a deterministic approval ledger in its
private wiki. The ledger should be rebuilt from task-page evidence, keep recent
approval-request turns visible to future engine requests, and preserve only
bounded policy context: approval id, operation, approver node ids, scoped
resource, label, reason, and task-page link.

The ledger is node memory. Operational truth remains in signed User Node
messages, runner approval records, command receipts, conversations, and Host
projection.

## Impacted Modules And Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/runtime-context.ts`
- `services/runner/src/memory-maintenance.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `memory/wiki/summaries/approval-ledger.md` as a deterministic
  runner-owned summary page.
- Add an `Approval Requests` section to deterministic task pages.
- Rebuild the ledger after each post-turn memory maintenance pass by scanning
  task pages and keeping the latest approval-bearing entries.
- Include approval memory in the recent-work summary only when a task page has
  a durable approval signal.
- Link the approval ledger from `memory/wiki/index.md`.
- Add the approval ledger to future turn `memoryRefs`.
- Add the approval ledger to the bounded memory brief candidate set.

## Tests Required

- Runner memory-maintenance coverage for task-page approval sections, approval
  ledger creation, recent-work inclusion, index linking, and memory-ref
  inclusion.
- Runner targeted memory-maintenance suite.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

Existing task pages remain valid. The approval ledger is additive and is
rebuilt from task pages on future post-turn memory maintenance passes. It does
not change A2A message schemas, Host projection contracts, approval record
contracts, assignment protocols, or engine adapter contracts.

## Risks And Mitigations

- Risk: deterministic memory is mistaken for approval authority. Mitigation:
  the ledger is explicitly node-private reasoning memory; signed messages,
  runner approval records, and Host projection remain authoritative.
- Risk: the ledger stores excessive policy context. Mitigation: it stores only
  bounded directive metadata and task-page links, never peer transcripts, full
  logs, artifact bodies, source diffs, or private keys.
- Risk: no-approval turns add noise. Mitigation: the dedicated ledger and
  recent-work approval memory include only task pages with durable approval
  request signals.

## Open Questions

Future memory work can derive unresolved approval obligations, repeated
approval patterns, and policy friction summaries from this ledger once the
agent runtime needs richer planning context.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "writes deterministic task memory" --reporter verbose`
- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000`
- `tsc -b services/runner/tsconfig.json --pretty false`
- `eslint services/runner/src/memory-maintenance.ts services/runner/src/runtime-context.ts services/runner/src/memory-maintenance.test.ts --max-warnings 0`

The final slice audit also runs product naming, whitespace, changed-diff
marker checks, and `git diff` review before commit.
