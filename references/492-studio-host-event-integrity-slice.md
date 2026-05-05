# Studio Host Event Integrity Slice

## Current Repo Truth

`491-host-event-integrity-inspection-slice.md` added Host API, host-client, and
CLI surfaces for checking the Host event audit hash chain. Studio's Host
Status panel still showed security, transport, artifact cache, relay, and state
layout summaries, but not the event-integrity posture.

## Target Model

Studio is the admin/operator console, so it should expose the same Host-owned
event-integrity truth that CLI operators can inspect headlessly. The panel
should remain read-only and should not reimplement chain verification in the
browser.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `apps/studio/src/host-event-integrity.ts`
- `apps/studio/src/host-event-integrity.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/491-host-event-integrity-inspection-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Load `client.inspectHostEventIntegrity()` during Studio overview refresh.
- Store the Host-owned integrity response separately from Host status.
- Render an Event integrity row in the Host Status panel.
- Keep formatting in a small Studio helper with unit coverage.

## Tests Required

Implemented and passed for this slice:

- `pnpm --filter @entangle/studio test -- src/host-event-integrity.test.ts`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`

## Migration/Compatibility Notes

If an older Host does not expose `/v1/events/integrity`, Studio leaves the row
as `not loaded` instead of failing the entire overview refresh. The Host-owned
route remains the source of truth when available.

## Risks And Mitigations

- Risk: Studio duplicates verification logic.
  Mitigation: Studio only formats the Host response.
- Risk: overview refresh becomes fragile if integrity inspection fails.
  Mitigation: the integrity request is non-critical and failures degrade to
  `not loaded`.

## Open Questions

`493-signed-host-event-integrity-report-slice.md` adds compact signed report
export. Full event-bundle export and external retention remain separate
production hardening work.
