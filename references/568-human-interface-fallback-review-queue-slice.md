# Human Interface Fallback Review Queue Slice

## Current Repo Truth

The React User Client now renders a grouped participant Review Queue from
projected pending approval ids and pending source-change refs. The Human
Interface Runtime fallback HTML client already rendered workload categories,
conversation lists, selected thread messages, approval controls, source-change
review controls, wiki/source-history actions, and command receipts. Before
this slice, the fallback page did not expose the same grouped review queue.

## Target Model

The fallback HTML client is still a participant surface for a running human
graph node. It should remain useful when the React bundle is unavailable. It
should show the same actionable review grouping as the React User Client while
keeping decisions on the existing signed message and source-review forms.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add fallback-side review queue item construction for projected pending
  approvals and pending source-change refs.
- Deduplicate approval ids while keeping newest conversation context.
- Render source-change items even when only the source-change projection is
  available.
- Link queue items to a conversation when the projection can identify one.
- Add fallback HTML styling for compact review queue rows.

## Tests Required

- Runner Human Interface Runtime fallback HTML coverage for the `Review Queue`
  section and a projected pending source-change item.
- Runner typecheck.
- Runner focused lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. The fallback queue is built entirely from the
existing participant-scoped User Client state. Older projections without
source-change conversation ids still show source-change items, but those rows
are not linked unless a unique conversation context can be inferred.

## Risks And Mitigations

- Risk: fallback and React queue behavior drift. Mitigation: the fallback uses
  the same projection fields and formatting shape as the React helper.
- Risk: source-change items without exact conversation ids look actionable but
  cannot navigate. Mitigation: rows render disabled when no conversation link is
  available.
- Risk: the queue duplicates the message timeline controls. Mitigation: queue
  rows only navigate; approval and source-change mutations remain in the
  existing signed forms.

## Open Questions

Future work can factor the queue derivation into a shared package if the
fallback HTML client and React client continue to gain common projection
helpers.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/runner exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "serves User Node inbox state"`

The final slice audit also runs runner typecheck, focused lint, product naming,
whitespace, changed-diff marker checks, and `git diff` review before commit.
