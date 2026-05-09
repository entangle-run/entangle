# Participant Review Queue Batching Slice

## Current Repo Truth

The running React User Client and the fallback Human Interface Runtime already
show a Review Queue built from Host projection state. The queue includes
deduplicated pending approval ids from projected conversations and pending
source-change refs. Before this slice, both clients rendered that queue as a
flat bounded list, which made it harder for a human node to see which agent or
peer owned a batch of pending review work.

## Target Model

A running User Node should see pending review work grouped by peer/node before
opening a conversation. The grouping is presentation-only: Host projection,
signed User Node messages, approval responses, and source-change reviews remain
the operational truth.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add review-queue grouping helpers that batch queue items by peer node when
  available, or by runtime node for source-change refs without a peer.
- Include per-group totals for review items, approval items, source-change
  items, conversation ids, and newest update time.
- Render grouped review sections in both the React User Client and fallback
  Human Interface Runtime.
- Preserve existing per-item navigation and source-change/approval action
  flows.

## Tests Required

- User Client runtime helper test for grouped queue ordering, counts, and
  formatted group labels.
- Runner fallback User Node page test proving the grouped Review Queue is
  rendered.
- User Client typecheck.
- Runner typecheck.
- Focused lint for changed TypeScript files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No state or protocol migration is required. Grouping is derived from existing
projection fields and only changes client presentation.

## Risks And Mitigations

- Risk: group counts imply authority that the projection does not have.
  Mitigation: grouping is explicitly presentation-only and still links into the
  conversation/item flows that perform signed actions.
- Risk: approvals shown in the selected thread are confused with projected
  pending-approval queue items. Mitigation: the queue uses projected
  `pendingApprovalIds`; selected-thread messages remain independently visible.
- Risk: long queues overwhelm the surface. Mitigation: groups and item lists
  stay bounded with overflow counts.

## Open Questions

Future slices can add true batch review actions only after the protocol defines
multi-item signed approval/source-review messages.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- -t "builds a grouped participant review queue"`
- `vitest run --config ../../vitest.config.ts --environment node src/index.test.ts --pool=forks --maxWorkers=1 --testTimeout=30000 -t "serves User Node inbox state"`
- User Client typecheck.
- Runner typecheck.
- Focused ESLint over changed TypeScript files.

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
