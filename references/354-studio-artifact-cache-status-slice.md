# Studio Artifact Cache Status Slice

## Current Repo Truth

Host status exposes derived artifact backend cache availability, repository
count, and size. The shared host-client and CLI render that summary, but
Studio's Host Status panel still showed transport, runtime, session, and state
layout details without the artifact cache row.

## Target Model

Studio is the operator control room, so it should display the same Host-owned
artifact cache diagnostic that CLI operators can inspect. The row must remain
read-only and path-free; cache clear remains available through the Host API and
CLI while richer Studio cache controls stay future work.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Import the shared artifact backend cache formatter in Studio.
- Add an Artifact cache row to the Host Status definition list.
- Keep the row derived from Host status only.

## Tests Required

- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `pnpm verify`

## Migration/Compatibility Notes

This is an additive Studio presentation change. Older Host responses without
`artifactBackendCache` still render as "artifact backend cache not inspected"
through the shared formatter.

## Risks And Mitigations

- Risk: Studio implies the cache is authoritative artifact state.
  Mitigation: the row is labeled as cache and only reports count/size summary.
- Risk: Studio and CLI vocabulary diverge.
  Mitigation: Studio uses the same shared host-client formatter as CLI.

## Open Questions

- Should Studio later expose dry-run/clear controls with confirmation and
  operator audit hints, or should cache mutation remain CLI/API-only?
