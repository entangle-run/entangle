# Host Event Hash Chain Slice

## Current Repo Truth

Host event records were typed, persisted as JSONL under Host-owned trace state,
filterable through Host APIs, and visible through CLI/Studio/host-client
surfaces. Bootstrap operator request audit events already carried operator id,
role, permissions, method, path, status, and auth mode.

Before this slice, persisted Host events did not carry a tamper-evidence link
between records. Operators could inspect and filter events, but could not see
whether a trace sequence had been modified after persistence.

## Target Model

Every newly appended Host event should carry a deterministic audit hash and a
previous-event hash. The fields must be additive so older persisted event logs
remain readable. Host event appends must be serialized so concurrent operator
requests do not fork the local audit chain.

This is still bootstrap hardening, not final production audit retention. It
adds local tamper evidence, and
`493-signed-host-event-integrity-report-slice.md` adds compact signed report
export. Full event-bundle export, external retention, and durable operator
principals remain separate.

## Impacted Modules/Files

- `packages/types/src/host-api/events.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/runtime-trace-output.ts`
- `apps/cli/src/runtime-trace-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/445-bootstrap-operator-permissions-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `auditPreviousEventHash` and `auditRecordHash` fields to every
  Host event contract.
- Compute Host event hashes from a canonicalized event record that excludes
  only `auditRecordHash`.
- Link each new event to the latest persisted event hash, with a deterministic
  genesis hash for an empty log.
- Serialize Host event appends through an in-process queue so concurrent
  mutation audit writes do not race.
- Make Host event reads wait for pending append operations before reading the
  persisted log.
- Include audit hash fields in CLI runtime-trace summary records when present.

## Tests Required

Implemented for this slice:

- schema test proving Host event contracts accept audit hash fields;
- Host test proving adjacent operator audit events form a hash chain;
- CLI runtime-trace summary test proving audit hash fields remain visible in
  structured output.

Passed for this slice:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/cli test -- src/runtime-trace-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`

## Migration/Compatibility Notes

The fields are optional in the shared schema, so older JSONL trace entries
without audit hashes still parse. When a new event follows an older un-hashed
event, Host computes a compatible previous hash from the parsed older event and
continues the chain from that point.

## Risks And Mitigations

- Risk: concurrent event append creates a forked hash chain.
  Mitigation: Host serializes append operations and event reads await the
  append queue before reading the log.
- Risk: operators mistake local hash chaining for immutable retention.
  Mitigation: docs keep full event-bundle export, external retention, and
  production operator identity as remaining hardening work.
- Risk: canonicalization drift makes verification brittle.
  Mitigation: the hash is computed from sorted object keys and stable array
  order, excluding only `auditRecordHash`.

## Open Questions

- `491-host-event-integrity-inspection-slice.md` adds a Host API and CLI
  command that verifies the full event chain and reports the first broken or
  unverifiable event.
- `493-signed-host-event-integrity-report-slice.md` signs compact integrity
  reports with Host Authority.
- `495-host-event-audit-bundle-slice.md` adds typed API/CLI bundle export;
  production external retention and Operator Identity co-signing remain future
  work.
