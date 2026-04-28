# Projected Artifact Read API Slice

## Current Repo Truth

Host already reduces runner-signed `artifact.ref` observations into artifact
projection records, and joined runners emit those observations during normal
OpenCode-backed turn execution. User Client artifact preview paths can read the
bounded projected preview before falling back to runtime-local preview routes.

The Host runtime artifact list/detail API still depended on local runtime
context availability before this slice. That meant a remote runner could
publish a signed artifact ref, Host projection could store it, but
`GET /v1/runtimes/:nodeId/artifacts` and
`GET /v1/runtimes/:nodeId/artifacts/:artifactId` could still fail when Host had
no readable runner filesystem.

## Target Model

Artifact list/detail reads should be projection-first Host read models. Host
may merge local same-machine compatibility records when available, but remote
artifact refs observed through signed runner events must be visible without
Host reading `runtimeRoot`.

The active graph remains the authority boundary: Host should only expose
runtime artifact records for nodes in the current graph/runtime projection.

## Impacted Modules/Files

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

- Build runtime artifact records from `ArtifactRefProjectionRecord`.
- Make `listRuntimeArtifacts(nodeId)` merge projected artifact refs with local
  compatibility artifact records, with local records winning on id when both
  exist.
- Allow artifact list/detail GET routes to return projected data even when the
  runtime inspection has no local context.
- Keep preview, history, diff, restore, and promote routes local-context backed
  because those operations still need runner-local materialization or a future
  object-backend resolver.
- Extend Host tests to prove projected artifact list/detail reads from signed
  observation projection.

## Tests Required

- Host typecheck.
- Host API tests for projected artifact list/detail.
- Host lint and build.
- Federated process-runner smoke to preserve the no-live-provider OpenCode path.

## Migration/Compatibility Notes

This is a read-model change only. Existing same-machine artifact records remain
supported and are merged with projection records. The route guard still requires
the runtime to exist in the active graph through `getRuntimeInspection`; it only
removes the local-context requirement for list/detail reads.

## Risks And Mitigations

- Risk: projected artifact records lack deep file preview/history detail.
  Mitigation: only list/detail are projection-backed in this slice; preview and
  mutation routes continue to require local context until an object-backend
  resolver is introduced.
- Risk: duplicate local and projected artifact ids diverge.
  Mitigation: same-machine local records win for now, preserving existing
  compatibility behavior while projection covers remote runners.

## Open Questions

- Should artifact preview/detail later resolve object backend refs directly
  through Host-owned backend credentials, or should runners publish bounded
  preview/update observations for every user-visible artifact view?
