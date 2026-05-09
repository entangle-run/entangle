# Canonical User Node Surface Spec Repair

## Current Repo Truth

Recent implementation slices made several canonical claims in the federated
runtime pack stale:

- Host Authority now has status, import/export, signed report, control-event,
  and integrity-report surfaces.
- bootstrap operator identity now supports hashed token records, scoped
  permissions, route enforcement, and audit attribution.
- User Node identities are materialized in Host state and are used to sign
  task, reply, approval, source-review, and read-receipt messages.
- runners now have signed hello/trust/revoke/heartbeat, assignment lifecycle,
  leases, command receipts, liveness projection, and registry projection.
- User Node inbox/outbox records preserve signer evidence, and Host rejects
  User Node message records whose signer does not match the payload pubkey.
- Human Interface Runtime now exposes the running User Node's own projected
  runtime status and scoped participant command receipts in `/api/state`.
- CLI and Studio now expose User Node workload counts, including
  participant-requested command receipt counts.

The stale parts were in:

- `references/224-entity-model-and-authority-boundaries.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`

## Target Model

The canonical specs should distinguish completed baseline federation behavior
from the remaining hardening work. The current target is:

- Host Authority, runner, assignment, User Node identity, signed message, and
  participant command-receipt basics are implemented.
- Studio remains the operator/admin surface.
- the runner-served User Client remains the participant surface for human graph
  nodes.
- CLI mirrors both operator and headless User Node participant workflows.
- remaining gaps are Studio-side runner-health-aware reassignment UX, deeper
  grouped participant review workflows, production identity/key custody,
  production RBAC/SSO, external User Node custody, and infrastructure-backed
  distributed proof execution.

## Impacted Modules/Files

No implementation modules were changed by this repair. The affected canonical
documents are:

- `references/224-entity-model-and-authority-boundaries.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Update the entity/authority spec so it no longer lists Host Authority,
  User Node identity, runner identity, assignment lifecycle, and signed
  approval lineage as missing baseline features.
- Update the User Node/Human Interface Runtime spec with the scoped
  `/v1/user-nodes/:nodeId/command-receipts` route and own-runtime projection
  fields exposed through `/api/state`.
- Update the Studio/CLI surface spec so workload summaries and participant
  command receipt counts are documented as implemented.
- Keep open gaps focused on production hardening, Studio-side
  runner-health-aware reassignment workflows, and richer grouped participant
  review flows.

## Tests Required

This is a documentation-only repair. Required checks:

- `pnpm ops:check-product-naming`
- `git diff --check`
- audit search for old local-only product markers in the changed diff

No package tests are required because no runtime, API, schema, or UI code was
changed.

## Migration/Compatibility Notes

No data migration is required. This repair changes only the canonical
specification baseline and the implementation record index.

## Risks And Mitigations

- Risk: specs overstate completion.
  Mitigation: each repaired section keeps remaining work explicit and scoped to
  production hardening or richer workflows.
- Risk: docs drift again as small User Node slices land.
  Mitigation: new slices that change User Node, Studio, CLI, or Human
  Interface Runtime behavior should update `224`, `226`, and `229` when they
  change the canonical boundary.

## Verification

Completed for this slice:

- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff audit for old local-only product/runtime markers

## Open Questions

No product question blocks this documentation repair.
