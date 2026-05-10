# Open Work Memory Summary Slice

## Current Repo Truth

Runner-owned memory already stores deterministic task pages, recent-work
summaries, source-change ledgers, approval ledgers, delegation ledgers, focused
model-guided summaries, and bounded memory briefs. Those pages give future
coding-engine turns rich historical context, but active session obligations
were still split across runner state: `SessionRecord.activeConversationIds`,
`SessionRecord.waitingApprovalIds`, pending `ApprovalRecord`s, and
`ConversationRecord`s.

That meant a node could remember recent approval and handoff history while
still lacking a compact deterministic page that says what work is currently
open according to runner state.

## Target Model

Each node should maintain a runner-owned `memory/wiki/summaries/open-work.md`
page generated from current runner state. The page should summarize active
sessions that still have pending approval gates or active conversations, then
feed future agent-engine turns through both `memoryRefs` and the bounded
memory brief.

This page is node-private reasoning memory. Operational truth remains in
runner state records, signed Nostr messages, Host projection, conversations,
approval records, and command receipts.

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

- Add `memory/wiki/summaries/open-work.md` as a deterministic runner-owned
  summary page.
- Rebuild the page during post-turn memory maintenance from current runner
  session, approval, and conversation records.
- Include non-terminal sessions that have pending approval records, waiting
  approval ids, or active conversation ids.
- Render bounded approval metadata: approval id, status, operation, approvers,
  conversation id, scoped resource, label, and reason.
- Render bounded conversation metadata: conversation id, peer, lifecycle
  status, initiator, response policy, artifact count, and last message type.
- Link the page from the node wiki index.
- Include the page in future turn `memoryRefs`.
- Include the page at the front of the bounded memory brief candidate list.

## Tests Required

- Runner memory-maintenance test proving open-work summary creation from
  current runner state.
- Runner memory-maintenance test proving terminal approvals/conversations are
  not presented as current open work.
- Runner memory-maintenance test proving index link, memory-ref inclusion, and
  memory-brief inclusion.
- Runner targeted memory-maintenance suite.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No migration is required. Existing node wiki pages remain valid. The open-work
summary is generated on the next post-turn memory maintenance pass and is
additive to existing memory refs, prompts, Host projection, and runner state
contracts.

## Risks And Mitigations

- Risk: the summary is mistaken for authoritative workflow state.
  Mitigation: the page is documented and rendered as private node memory;
  runner state and Host projection remain operational truth.
- Risk: stale session records cause noisy memory.
  Mitigation: terminal sessions are excluded, pending approvals are restricted
  to pending records or explicit waiting ids, and terminal conversations are
  not rendered as active conversation records.
- Risk: prompt bloat.
  Mitigation: the page is bounded to the latest current open-work sessions and
  the memory brief already enforces per-page and total prompt budgets.

## Open Questions

Future work can derive a cross-session obligation graph or source-area
accountability map from this page and the existing coordination map, but no
schema widening is needed for this slice.

## Verification

Completed in this slice:

- `vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "open-work summary" --reporter verbose`
- `vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 --reporter verbose`
- `vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "bounded focused memory brief" --reporter verbose`
- `vitest run --config ../../vitest.config.ts --environment node src/*.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 --reporter verbose`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over touched code and docs
