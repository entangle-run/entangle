# Delegation Ledger Memory Slice

## Current Repo Truth

The runner can already emit autonomous `task.handoff` messages from validated
engine `handoffDirectives`. The emitted Nostr event ids are persisted on
`RunnerTurnRecord.emittedHandoffMessageIds`, optional model-guided memory
synthesis receives that bounded evidence, and `working-context.md` can carry a
handoff context section.

Before this slice, deterministic task pages and recent-work memory did not
preserve requested handoff directives or emitted message ids. Future turns
could recover some handoff evidence from the synthesized working context, but
only when optional synthesis succeeded and only as the latest working context.

## Target Model

Each coding-agent node should maintain a deterministic delegation ledger in its
private wiki. The ledger should be rebuilt from task-page evidence, keep recent
handoff turns visible to future engine requests, and preserve only bounded
coordination data: requested target/edge, response policy, artifact inclusion,
summary, intent, and emitted Nostr event ids.

## Impacted Modules And Files

- `services/runner/src/memory-maintenance.ts`
- `services/runner/src/runtime-context.ts`
- `services/runner/src/service.ts`
- `services/runner/src/memory-maintenance.test.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `memory/wiki/summaries/delegation-ledger.md` as a deterministic
  runner-owned summary page.
- Add a `Delegation / Handoffs` section to deterministic task pages.
- Rebuild the ledger after each post-turn memory maintenance pass by scanning
  task pages and keeping the latest handoff-bearing entries.
- Include the ledger in recent-work summaries when a recent turn has durable
  handoff evidence.
- Link the ledger from `memory/wiki/index.md`.
- Add the ledger to future turn `memoryRefs`.
- Add the ledger to the bounded memory brief candidate set.
- Delay post-turn memory maintenance on non-blocked turns until after outbound
  handoff publication, so deterministic memory can include emitted event ids.

## Tests Required

- Runner memory-maintenance coverage for task-page handoff sections, ledger
  creation, recent-work inclusion, index linking, and memory-ref inclusion.
- Runner service coverage proving real autonomous handoff turns write emitted
  event ids into task memory and the delegation ledger.
- Runner targeted test suite.
- Runner typecheck.
- Runner lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

Existing task pages remain valid. The delegation ledger is additive and is
rebuilt from task pages on future post-turn memory maintenance passes. It does
not change the A2A message schema, Host projection contracts, assignment
protocols, or engine adapter contracts.

The service ordering change keeps blocked approval turns on the previous path
because those turns do not publish autonomous handoffs before waiting. For
non-blocked turns, memory is now written after handoff publication so emitted
event ids are available.

## Risks And Mitigations

- Risk: deterministic memory becomes confused with operational truth.
  Mitigation: the ledger is explicitly node-private reasoning memory; Nostr
  events, runner turn records, conversations, artifacts, and Host projection
  remain operational truth.
- Risk: memory stores peer transcript content.
  Mitigation: the ledger stores only bounded directive metadata and event ids,
  never peer transcripts, full logs, or artifact bodies.
- Risk: moving memory maintenance later hides failures until after handoff
  publication. Mitigation: this affects only non-blocked successful turns and
  preserves the existing post-turn failure semantics around optional memory
  maintenance and wiki sync.

## Open Questions

Future delegation work can build a richer relation/obligation model from this
ledger, including unresolved delegated work, expected reviewer roles, and
cross-node contribution/accountability summaries.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts src/service.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "post-turn memory maintenance|autonomous handoff" --reporter verbose`
- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/service.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "emits a topology-bound task handoff" --reporter verbose`
- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/memory-maintenance.test.ts src/service.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 --reporter verbose`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit

The broad package wrapper command
`pnpm --filter @entangle/runner test -- src/memory-maintenance.test.ts` was
interrupted after several minutes with no worker output; the direct Vitest
targeted file run above covered the changed runner files and passed.
