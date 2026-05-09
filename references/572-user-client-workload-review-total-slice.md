# User Client Workload Review Total Slice

## Current Repo Truth

The running React User Client and fallback Human Interface Runtime already
render a grouped Review Queue over projected pending approval ids and pending
source-change refs. Their Workload panels also show separate pending approval
and source-change review counts, but did not show the total number of pending
review items derived from the same queue.

The User Client runtime API fetches typed JSON from the Human Interface Runtime
without schema validation in the browser helper, so UI projection helpers must
remain tolerant of partial source-change records while still preferring
canonical projection timestamps when available.

## Target Model

The human participant surface should present one concise total for review
workload before the human opens the grouped Review Queue. The total should be
computed from the same Review Queue projection used by the detailed queue, so
the React client, fallback HTML client, and headless CLI stay aligned around
one participant-review model.

## Impacted Modules And Files

- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pendingReviewCount` to the User Client Workload summary model.
- Derive `pendingReviewCount` from `buildUserClientReviewQueue(state).length`.
- Render the total pending review count in both the React User Client Workload
  formatter and the fallback Human Interface Runtime Workload list.
- Keep source-change review queue timestamp handling tolerant of partial
  projection records by falling back to an empty timestamp when neither the
  candidate nor projection timestamp is present.

## Tests Required

- User Client runtime API test proving the Workload summary includes the total
  pending review count.
- Human Interface Runtime fallback test proving the served fallback page shows
  the same total.
- User Client typecheck.
- Runner typecheck.
- Focused ESLint for changed TypeScript files.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. The new count is derived from already projected
inbox/source-change state and does not change Host state, runner state, or
protocol schemas.

## Risks And Mitigations

- Risk: the total count drifts from detailed queue rows. Mitigation: the total
  is computed from `buildUserClientReviewQueue`, the same helper used by the
  detailed React queue.
- Risk: partial projection records crash participant UI rendering. Mitigation:
  source-change queue timestamps now use a bounded fallback when projection
  metadata is absent.

## Open Questions

Future review workflow work can decide whether batch review decisions should
exist. This slice remains read-only for workload and queue presentation.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/user-client test -- -t "summarizes participant workload"`
- Runner focused Vitest for `serves User Node inbox state`
- User Client typecheck.
- Runner typecheck.
- Focused ESLint.

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
