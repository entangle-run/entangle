# Projected Artifact Preview API Slice

## Current Repo Truth

Observed `artifact.ref` projection records can carry a bounded text preview.
The User Client already uses projected previews before falling back to
runtime-local artifact preview routes.

Before this slice, the Host runtime artifact preview route still required a
Host-readable runtime context and returned previews only by resolving local
runner files. That was inconsistent with artifact list/detail, which now reads
projection.

## Target Model

Artifact preview should be projection-aware. Local same-machine preview remains
the richest compatibility path when a local artifact file exists, but remote
runners should be able to expose bounded preview evidence through signed
`artifact.ref` observations.

Projected previews should not fabricate a local filesystem path. `sourcePath`
is now optional in the preview contract so projection-backed responses can omit
local runner paths.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `apps/cli/src/runtime-artifact-command.ts`
- `services/host/src/state.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Make `runtimeArtifactPreviewSchema.sourcePath` optional for available
  previews.
- Allow Host artifact preview GET routes to call the preview read model without
  requiring local context availability.
- Prefer local file preview when local context and artifact file are present.
- Fall back to observed artifact preview projection when local context or local
  artifact files are unavailable.
- Return an unavailable preview for an observed artifact ref that did not carry
  bounded preview content.
- Update CLI projection of artifact preview summaries for optional
  `sourcePath`.
- Extend Host tests to prove projected artifact preview responses.

## Tests Required

- Types typecheck and contract tests.
- Host typecheck and API tests.
- CLI typecheck for optional `sourcePath`.
- Lint/build for touched packages.
- Federated process-runner smoke.

## Migration/Compatibility Notes

Existing local preview responses still include `sourcePath`. Clients must treat
it as optional because projected previews intentionally omit runner-local
paths. This aligns with the broader public API boundary that keeps filesystem
layout out of canonical federated surfaces.

## Risks And Mitigations

- Risk: clients assumed `sourcePath` was always available.
  Mitigation: TypeScript typecheck catches first-party callers; CLI summary now
  treats it as optional.
- Risk: projected previews are stale relative to object backend content.
  Mitigation: projected previews are bounded observation evidence, while future
  object-backend resolvers can provide authoritative content by ref/hash.

## Open Questions

- Should projected preview responses expose the observation timestamp or event
  id that produced the preview?
- Should artifact preview eventually resolve git/object refs directly through
  Host-managed backend credentials?
