# Projected Source History Replay Read Model Slice

## Current Repo Truth

Source-history replay is runner-owned and requested through the federated
control plane. Host publishes `runtime.source_history.replay` to the accepted
runner assignment, the runner validates source-application approval policy,
persists a runner-local replay record, and emits `source_history.replayed`
observation evidence.

Before this slice, replay outcomes were visible only through generic Host event
history and assignment receipt evidence. Host projection did not expose a
typed source-history replay read model, and CLI/Studio could request replay but
could not inspect replay outcomes through a first-class projected surface.

## Target Model

Replay outcomes should be projected like other runner-owned work evidence.
Host must store bounded replay records received through signed observations and
serve them through typed Host API, host-client, CLI, and Studio summary
surfaces without reading runner-local state.

Replay request acceptance remains separate from replay completion. Completion
is proven by `source_history.replayed` observation projection and assignment
receipt/audit evidence.

## Impacted Modules/Files

- `packages/types/src/projection/projection.ts`
- `packages/types/src/host-api/runtime.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/federation-inspection.ts`
- related contract, Host, host-client, CLI, and Studio tests
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- federated redesign references

## Concrete Changes Required

- Add `sourceHistoryReplays` to the Host projection snapshot contract.
- Persist `source_history.replayed` observations as typed projection records
  keyed by node and replay id.
- Add Host list/detail APIs for projected source-history replay outcomes.
- Add host-client methods for replay list/detail inspection.
- Add CLI list/detail commands for replay outcomes.
- Add Studio federation summary count for projected replay outcomes.
- Keep replay mutation/request APIs separate from replay projection/read APIs.

## Tests Required

- Projection contract test covering `sourceHistoryReplays`.
- Host API tests for replay list/detail projection.
- Host-client method tests for replay list/detail.
- CLI projection summary fixture coverage.
- Studio federation summary fixture coverage.
- Typecheck and lint for changed packages.

## Verification Run

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/types exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host-client exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/host exec vitest run --config ../../vitest.config.ts --environment node src/index.test.ts`
- `pnpm --filter @entangle/cli exec vitest run --config ../../vitest.config.ts --environment node src/projection-output.test.ts src/user-node-output.test.ts`
- `pnpm --filter @entangle/studio exec vitest run --config ../../vitest.config.ts --environment node src/federation-inspection.test.ts src/runtime-assignment-control.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio lint`

## Migration/Compatibility Notes

Existing runner-local replay records remain runner-owned. Host only projects
records that arrive through observation ingestion. Local compatibility readers
should not become the canonical replay outcome surface.

The projection snapshot shape gains an optional-with-default
`sourceHistoryReplays` array at parse time, so existing projection fixtures can
be migrated by adding an empty array where static TypeScript fixtures require
the full inferred type.

## Risks And Mitigations

- Risk: operators treat requested control commands as completed replays.
  Mitigation: replay request APIs still return command/request evidence; replay
  list/detail APIs expose only observed replay outcomes.
- Risk: replay projection duplicates Host events.
  Mitigation: Host events remain audit chronology, while the projection record
  is the typed read model for CLI/Studio/API inspection.
- Risk: Host depends on runner filesystem again.
  Mitigation: the new read APIs are populated from
  `source_history.replayed` observations and can return projected records
  without runtime context access.

## Open Questions

- A richer per-assignment replay timeline should join replay records,
  assignment receipts, and control command ids once assignment detail
  inspection becomes a dedicated operator surface.
