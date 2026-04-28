# Projected Approval Read API Slice

## Current Repo Truth

Signed `approval.updated` observations now reach Host and are reduced into
observed approval activity, but the runtime approval list and detail APIs still
expected Host-readable runner approval files. A remote approval could therefore
affect projected session counts while `/v1/runtimes/:nodeId/approvals` and
`/v1/runtimes/:nodeId/approvals/:approvalId` remained tied to
same-workstation `runtimeRoot` reads.

## Target Model

Approval read APIs should merge local compatibility records with observed
approval projection. Local files can remain the preferred source when present,
but projected approval records must be sufficient for read-only list/detail
surfaces.

Approval mutation remains local-runtime backed for now. Signed User Node
approval responses are the federated participant path; Host-side direct approval
mutation is still a compatibility/operator path.

## Impacted Modules/Files

- `packages/types/src/runtime/activity-observation.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Persist the full bounded approval record on observed approval activity
  records.
- Add projected approval record listing scoped to active graph id and node id.
- Merge projected approval records with local runtime approval files, with local
  records winning on id collisions.
- Allow approval list/detail GET routes to use projection even when the runtime
  has no local context.
- Keep approval POST mutation guarded by local context availability.
- Extend Host tests for projected approval list/detail.

## Tests Required

- Type schema tests and typecheck.
- Host approval list/detail tests from observed projection.
- Host lint/build.
- Federated process-runner smoke.

## Migration/Compatibility Notes

Existing observed approval activity records without embedded `approval` still
parse, but only records with the full approval can back approval read APIs.
Filesystem-imported approval activity now stores the full approval too, so old
state will become richer after the next local compatibility synchronization.

## Risks And Mitigations

- Risk: a stale projected approval may be returned after graph replacement.
  Mitigation: projected approval reads are scoped to the active graph id and
  active node id.
- Risk: direct Host approval mutation could be mistaken for the federated
  approval path.
  Mitigation: only read APIs are projection-backed in this slice; mutation still
  requires local context and remains documented as compatibility/operator
  behavior.

## Open Questions

- When should direct Host approval mutation be removed or hidden behind an
  explicit compatibility flag in favor of signed User Node approval responses?
