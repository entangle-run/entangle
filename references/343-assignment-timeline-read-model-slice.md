# Assignment Timeline Read Model Slice

## Current Repo Truth

Runtime assignments and assignment receipts were already projected, but the
operator surfaces still exposed them mostly as separate lists. Debugging a
distributed runner assignment required manually joining the assignment record
with runner receipt projection and Host events.

This is not a filesystem problem, but it is an observability gap: distributed
operation needs a compact per-assignment timeline that does not require
scanning generic events or reading runner-local state.

## Target Model

Host should expose a typed per-assignment timeline built from Host assignment
state plus runner-signed assignment receipt projection. CLI and Studio should
surface the same grouping so an operator can see whether an assignment was
offered, accepted/rejected/revoked, and what receipts the runner emitted.

The timeline is read-only. It does not command runners and does not replace
assignment receipt audit events.

## Impacted Modules/Files

- `packages/types/src/host-api/assignments.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/assignment-output.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- related tests
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- federated redesign references

## Concrete Changes Required

- Add assignment timeline entry and response schemas.
- Add Host state assembly for assignment lifecycle entries plus projected
  assignment receipts.
- Add `GET /v1/assignments/:assignmentId/timeline`.
- Add `host-client.getAssignmentTimeline`.
- Add `entangle assignments timeline <assignmentId>`.
- Add compact CLI assignment timeline summaries.
- Add Studio assignment receipt grouping under projected assignment rows.

## Tests Required

- Contract parsing for assignment timeline responses.
- Host API test for assignment timeline route and receipt grouping.
- Host-client method test.
- CLI assignment timeline summary helper test.
- Studio federation helper test.
- Typecheck and lint for changed packages.

## Verification Run

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli exec vitest run --config ../../vitest.config.ts --environment node src/assignment-output.test.ts`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio exec vitest run --config ../../vitest.config.ts --environment node src/federation-inspection.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`

## Migration/Compatibility Notes

This slice is additive. Existing assignment list/detail, offer, and revoke
routes keep their response shapes. The new timeline route composes existing
Host assignment state and projected receipt evidence.

## Risks And Mitigations

- Risk: operators mistake timeline entries for canonical audit log entries.
  Mitigation: timeline entries are a read model; Host events remain the audit
  event stream.
- Risk: receipts appear without matching assignment state.
  Mitigation: the timeline route is keyed by an existing assignment record and
  filters receipts by assignment id.
- Risk: Studio becomes too detailed for the admin panel.
  Mitigation: Studio only shows compact grouped receipt summaries; CLI/Host API
  expose the detailed timeline.

## Open Questions

- Future assignment detail pages should join lifecycle commands, control event
  ids, receipts, runtime status, source-history replay/publication outcomes,
  and transport diagnostics into a richer distributed execution timeline.
