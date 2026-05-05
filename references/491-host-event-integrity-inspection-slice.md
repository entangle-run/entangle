# Host Event Integrity Inspection Slice

## Current Repo Truth

`490-host-event-hash-chain-slice.md` added optional hash-chain fields to newly
appended Host events and serialized Host event appends. Operators could see
the hash fields in raw event JSON and CLI runtime-trace summaries, but there
was no Host-owned verification surface that classified the persisted trace as
valid, broken, or partially unverifiable because of older un-hashed records.

## Target Model

Host should expose a read-only event integrity check over the same Host API
boundary as event list/watch. The check should verify the persisted JSONL trace
without trusting client-side reconstruction and should remain compatible with
older event records that predate audit hashes.

## Impacted Modules/Files

- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/490-host-event-hash-chain-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add typed `HostEventIntegrityResponse` contracts with `valid`, `broken`, and
  `unverifiable` statuses.
- Add Host state verification over persisted event JSONL records.
- Treat older events without audit hash fields as `unverifiable`, not broken,
  while continuing the expected hash chain with their computed record hash.
- Add `GET /v1/events/integrity`.
- Add `hostClient.inspectHostEventIntegrity()`.
- Add `entangle host events integrity`.

## Tests Required

Implemented for this slice:

- schema test for integrity responses;
- Host route test proving newly appended event logs verify as `valid`;
- host-client test proving the new route parses and uses the expected URL.

Passed for this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

Existing event logs without hash fields remain readable. Integrity inspection
reports them as `unverifiable` instead of `broken`, which lets upgraded Hosts
continue from pre-hash event traces while still exposing the trust gap.

## Risks And Mitigations

- Risk: operators overinterpret `valid` as external immutability.
  Mitigation: the response verifies the Host-local persisted chain only; signed
  export and external retention remain separate hardening work.
- Risk: older logs are reported as failures.
  Mitigation: the API distinguishes `unverifiable` from `broken`.

## Open Questions

- Signed report and typed bundle export are now implemented in later slices;
  external retention remains future hardening.
- `492-studio-host-event-integrity-slice.md` adds the Host Status panel
  surface for the same Host-owned event-integrity response.
- `493-signed-host-event-integrity-report-slice.md` adds compact Host
  Authority-signed integrity report export.
- `495-host-event-audit-bundle-slice.md` adds typed API/CLI event-bundle
  export; external retention remains open.
