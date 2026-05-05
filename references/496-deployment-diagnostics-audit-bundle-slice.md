# Deployment Diagnostics Audit Bundle Slice

## Current Repo Truth

`entangle deployment diagnostics` builds a read-only support bundle containing
doctor output, bounded Compose command captures, Host status, runtime inventory,
runtime evidence, external principals, and a limited Host event list.

`495-host-event-audit-bundle-slice.md` added a Host-owned audit bundle with
typed events, canonical event JSONL hash, signed Host Authority integrity
report, and bundle hash. Before this slice, deployment diagnostics did not
collect that stronger audit export.

## Target Model

The deployment diagnostics bundle should include the strongest available
Host-owned audit evidence while remaining conservative and non-fatal. If the
Host supports event audit-bundle export, diagnostics should embed it. If the
route is unavailable or fails, diagnostics should record an error and still
return the rest of the support bundle.

This is not external retention. It only makes operator-collected diagnostics
more complete.

## Impacted Modules/Files

- `apps/cli/src/deployment-diagnostics-bundle-command.ts`
- `apps/cli/src/deployment-diagnostics-bundle-command.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/495-host-event-audit-bundle-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the diagnostics Host client boundary with
  `exportHostEventAuditBundle()`.
- Add optional `host.auditBundle` to `DeploymentDiagnosticsBundle`.
- Collect the Host event audit bundle after the bounded event list.
- Preserve existing non-fatal diagnostics behavior by recording collection
  errors instead of failing the whole bundle.
- Extend CLI diagnostics tests with a typed audit bundle fixture.

## Tests Required

Passed for this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-diagnostics-bundle-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`

The CLI test script currently runs the package's full CLI suite for this
invocation; that completed with 33 files and 100 tests passing.

## Migration/Compatibility Notes

The diagnostics JSON shape is additive. Older consumers can ignore
`host.auditBundle`. Hosts that do not expose the route still produce a
diagnostics bundle with a readable `event audit bundle: ...` error in
`host.errors`.

## Risks And Mitigations

- Risk: diagnostics bundles become too large.
  Mitigation: this is an explicit operator diagnostic command. Future work can
  add `--no-audit-bundle` or size caps if real deployments need them.
- Risk: audit bundle collection failure hides other diagnostics.
  Mitigation: collection is non-fatal and appends only one host error.
- Risk: operators mistake diagnostics output for external retention.
  Mitigation: docs keep external retention as future hardening.

## Open Questions

- Should `entangle deployment diagnostics` eventually support
  `--no-audit-bundle` or a maximum audit-event count once production traces get
  large?

## Result

Deployment diagnostics now embeds Host event audit-bundle evidence when
available, giving support bundles typed events, event-content hash, signed
integrity report, and bundle hash without requiring a separate Host event
export command.
