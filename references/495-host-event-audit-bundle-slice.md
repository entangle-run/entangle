# Host Event Audit Bundle Slice

## Current Repo Truth

Host events are persisted as typed JSONL records and now carry optional
audit-hash fields. Host can inspect the hash chain and export a compact Host
Authority-signed integrity report. CLI and Studio can already show integrity
state, and CLI can print the signed report.

Before this slice, operators still had to call event listing and signed
integrity export separately. There was no single typed Host API response that
bundled the events, the signed integrity report, and bundle-level hashes for
offline support or audit handoff.

## Target Model

Host should expose a conservative audit bundle export containing:

- the current typed Host event records in persisted order;
- a SHA-256 hash of canonical JSONL event content;
- the Host Authority-signed integrity report computed from the same event set;
- a bundle hash over the canonical bundle payload.

This remains bootstrap audit export. It is not external retention, immutable
storage, periodic archival, or production Operator Identity.

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
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/490-host-event-hash-chain-slice.md`
- `references/491-host-event-integrity-inspection-slice.md`
- `references/493-signed-host-event-integrity-report-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `hostEventAuditBundleResponseSchema` and exported
  `HostEventAuditBundleResponse`.
- Refactor Host event integrity calculation so bundle export can sign integrity
  computed from the same in-memory event set included in the bundle.
- Add `exportHostEventAuditBundle()` in Host state.
- Add `GET /v1/events/audit-bundle`.
- Add `hostClient.exportHostEventAuditBundle()`.
- Add `entangle host events audit-bundle`.

## Tests Required

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

## Migration/Compatibility Notes

The route is additive. Existing event logs, including older partially
unverifiable records, remain parseable through the same legacy compatibility
path used by integrity inspection. Empty event logs produce an empty canonical
JSONL payload and the standard SHA-256 empty-string digest.

## Risks And Mitigations

- Risk: operators mistake an API bundle for durable audit retention.
  Mitigation: docs call this bootstrap export only; external retention remains
  future production hardening.
- Risk: bundle integrity report and events drift under concurrent writes.
  Mitigation: Host waits for pending event appends, reads one event set, and
  signs the integrity result computed from that same set.
- Risk: bundle hashes are hard to reproduce.
  Mitigation: the event JSONL hash uses canonicalized event objects and the
  bundle hash uses the same canonicalization helper already used by signed
  reports.

## Open Questions

- Should bundles later be written to git/object storage automatically after
  significant operator or runtime events?
- Should production bundles include Operator Identity co-signatures once
  durable operators exist beyond bootstrap tokens?

## Result

Entangle now has a single typed Host event audit-bundle export that carries
events, canonical event-content hash, signed Host Authority integrity report,
and a bundle hash through Host API, host-client, and CLI.
