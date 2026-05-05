# Signed Host Event Integrity Report Slice

## Current Repo Truth

Host event integrity inspection could classify the persisted event trace as
valid, broken, or partially unverifiable. CLI and Studio could display that
Host-owned result, but there was no Host Authority-signed report that an
operator could archive or hand to another system as provenance evidence.

## Target Model

Host should be able to export a compact signed integrity report without
exporting the full event log. The report should include the exact signed
content, a SHA-256 report hash, and the Nostr event signature metadata from
the active Host Authority key.

This is not final external retention. It is the signed-report building block
for later audit bundle export and SIEM/retention integration.

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
- `references/491-host-event-integrity-inspection-slice.md`
- `references/492-studio-host-event-integrity-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a typed signed integrity report contract.
- Add Host state export that signs canonical integrity report content with the
  active Host Authority key.
- Add `GET /v1/events/integrity/signed`.
- Add `hostClient.exportSignedHostEventIntegrityReport()`.
- Add `entangle host events integrity --signed`.

## Tests Required

Implemented and passed for this slice:

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

## Migration/Compatibility Notes

The unsigned integrity route remains unchanged. Signed reports materialize the
Host Authority if needed, matching existing Host Authority inspection/export
behavior.

## Risks And Mitigations

- Risk: signed report is mistaken for full log retention.
  Mitigation: docs describe it as a compact signed report, not an event bundle
  or external retention store.
- Risk: report verification depends on JSON key order.
  Mitigation: Host signs a returned `signedContent` string directly and also
  returns the SHA-256 `reportHash` of that exact string.

## Open Questions

- `495-host-event-audit-bundle-slice.md` adds a typed Host API/CLI bundle with
  events, a canonical event JSONL hash, the signed integrity report, and a
  bundle hash. It is an API response, not an archive file or retention store.
- Should signed audit reports be periodically written to a separate artifact
  backend instead of only returned through Host API?
