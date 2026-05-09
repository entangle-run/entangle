# User Client Review Queue Slice

## Current Repo Truth

The running React User Client already exposes conversation detail, approval
response controls, source-change review controls, artifact/wiki/source-history
actions, and a compact workload summary derived from projected Host state.
Before this slice, the participant still had to open conversations one by one
to find the next pending approval or source-change review.

## Target Model

The User Client is the participant surface for a running human graph node. It
should summarize actionable review work locally from the User Node projection
without requiring Studio/admin context. The queue should remain projection-led:
it navigates to conversation context and uses the existing signed message
actions rather than inventing a second mutation path.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/506-canonical-user-node-surface-spec-repair.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add pure User Client review queue helpers that group pending approval ids
  from projected conversations and pending source-change refs from projected
  source-change state.
- Deduplicate approval ids while preserving the newest projected conversation
  context.
- Include source-change summary counts when available.
- Render a running User Client sidebar review queue that jumps to the related
  conversation when projected or when a unique peer conversation can be
  inferred from the source-change node id.
- Keep approval/source-change decisions on the existing message timeline
  controls, preserving the signed User Node message path.

## Tests Required

- User Client helper coverage for approval deduplication, newest conversation
  selection, pending source-change filtering, source-change summary formatting,
  and queue item formatting.
- User Client typecheck.
- User Client focused lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. The queue derives from existing `/api/state`
projection fields and existing source-change refs. If older state lacks
optional source-change candidate conversation ids, those rows remain visible.
They still navigate when a unique peer conversation can be inferred from the
source-change node id.

## Risks And Mitigations

- Risk: the queue looks like a separate approval system. Mitigation: queue rows
  only navigate; the actual approve/reject and source-change review controls
  stay on the signed message timeline.
- Risk: duplicate approval ids across stale conversation projections create
  noise. Mitigation: the helper deduplicates approval ids and keeps the newest
  conversation context.
- Risk: source-change refs without candidate conversation context cannot always
  jump to a thread. Mitigation: the item uses a unique peer conversation when
  one exists and otherwise remains visible without navigation.

## Open Questions

Richer participant review workflow can still add batch review, saved review
filters, review-owner hints, and direct deep links to a specific message once
message-level projection is available in `/api/state`.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- runtime-api.test.ts`
- `tsc -b apps/user-client/tsconfig.json --pretty false`
- `eslint apps/user-client/src/App.tsx apps/user-client/src/runtime-api.ts apps/user-client/src/runtime-api.test.ts --max-warnings 0`

The final slice audit also runs product naming, whitespace, changed-diff
marker checks, and `git diff` review before commit.
