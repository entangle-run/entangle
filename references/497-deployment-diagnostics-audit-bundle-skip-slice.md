# Deployment Diagnostics Audit Bundle Skip Slice

## Current Repo Truth

`entangle deployment diagnostics` now collects Host status, runtime inventory,
runtime evidence, Host events, and the Host event audit bundle when a live Host
client is available. The audit bundle is useful for support handoff because it
contains typed Host events, the canonical event JSONL hash, a Host Authority
signed integrity report, and a bundle hash.

Before this slice, collection was non-fatal but always attempted when live Host
diagnostics were enabled. Large traces or constrained support workflows had no
operator-facing way to produce a lighter diagnostics bundle without also
disabling all live Host collection.

## Target Model

The diagnostics command should keep the strongest audit evidence by default,
while allowing operators to intentionally skip the full Host event audit bundle
for faster or smaller support bundles.

Skipping the audit bundle must not disable Host status, runtimes, external
principals, bounded events, or per-runtime evidence.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/deployment-diagnostics-bundle-command.ts`
- `apps/cli/src/deployment-diagnostics-bundle-command.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/496-deployment-diagnostics-audit-bundle-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `includeAuditBundle` to diagnostics bundle options and profile metadata.
- Keep `includeAuditBundle` defaulting to `true`.
- Add `--no-audit-bundle` to `entangle deployment diagnostics`.
- Pass the CLI flag through to `buildDeploymentDiagnosticsBundle()`.
- Only call `exportHostEventAuditBundle()` when `includeAuditBundle` is true.
- Test both default inclusion and explicit skip behavior.

## Tests Required

Passed for this slice:

- `pnpm --filter @entangle/cli test -- src/deployment-diagnostics-bundle-command.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`

The remaining end-of-slice checks are tracked in `wiki/log.md` and the commit
audit.

## Migration/Compatibility Notes

The default diagnostics JSON remains stronger than before because audit-bundle
collection stays enabled unless explicitly disabled. The bundle profile now
records `includeAuditBundle` so downstream support tooling can distinguish
between an unsupported Host route, a failed collection, and an intentional skip.

## Risks And Mitigations

- Risk: support bundles omit audit evidence accidentally.
  Mitigation: the skip path requires the explicit `--no-audit-bundle` flag and
  the profile records the decision.
- Risk: downstream readers assume `host.auditBundle` is always present.
  Mitigation: the field was already optional because collection is non-fatal.
- Risk: skipping the audit bundle hides event-chain problems.
  Mitigation: bounded Host events and all other Host diagnostics still collect,
  and operators can rerun diagnostics without the skip flag.

## Open Questions

- Should production diagnostics eventually support an audit-bundle event-count
  cap in addition to the full skip flag?
- Should support tooling warn when a submitted diagnostics bundle has
  `includeAuditBundle: false`?

## Result

`entangle deployment diagnostics` now supports `--no-audit-bundle`. By default
it still embeds Host event audit-bundle evidence when available, but operators
can intentionally produce a smaller live diagnostics bundle without losing the
rest of the Host projection.
