# Process Smoke Wiki Publication Control Slice

## Current Repo Truth

Explicit wiki repository publication is now a federated control command:

- Host accepts `POST /v1/runtimes/:nodeId/wiki-repository/publish`;
- Host signs and publishes `runtime.wiki.publish` to the accepted runner
  assignment;
- the owning runner syncs its runner-local `wiki-repository`, pushes the
  snapshot to the primary git target, persists the publication artifact in
  runner-owned state, and emits signed `artifact.ref` evidence;
- Host projection exposes the published artifact ref without reading or
  pushing runner-local files.

Before this slice, unit/integration tests covered the command path, and CLI plus
Studio could request it. The process-boundary smoke did not yet prove the path
with a real Host process, joined runner process, relay, and git backend.

## Target Model

The process smoke must prove that explicit wiki publication works the same way
when Host and runner are separate OS processes with separate state roots. The
smoke should verify request acceptance, runner-produced projection evidence,
and the remote git branch head.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `pnpm ops:smoke-federated-process-runner` after the deterministic
  source-history publication proof.
- Call the Host wiki publication route for the assigned `builder` runtime.
- Parse the command response with `runtimeWikiPublishResponseSchema`.
- Poll Host runtime artifact projection for the runner-emitted git
  `knowledge_summary` artifact on branch `builder/wiki-repository`.
- Inspect the projected artifact through Host API.
- Verify the bare primary git backend has `refs/heads/builder/wiki-repository`
  at the same commit carried by the projected artifact ref.

## Tests Required

- `node --check scripts/smoke-federated-process-runner.mjs`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `pnpm verify`

The process smoke itself is the primary end-to-end regression test for this
slice.

## Migration/Compatibility Notes

This is additive smoke coverage. It does not add a new public API and does not
restore the removed direct Host wiki publication/list model.

The Host projection record intentionally carries `artifact.ref.status` but not
runner-local publication metadata. The smoke validates projected ref status and
the remote git branch head rather than requiring Host access to the runner's
artifact record.

## Risks And Mitigations

- Risk: the smoke accidentally validates runner-local files instead of the
  federated projection.
  Mitigation: the new assertion reads Host artifact APIs plus the bare primary
  git backend. It does not inspect runner-local wiki files for success.
- Risk: Host artifact projection loses publication metadata.
  Mitigation: this is intentional for observation-derived records; the portable
  signal is the signed published `artifact.ref` plus git branch verification.
- Risk: the check is tied to the current `builder/wiki-repository` branch
  convention.
  Mitigation: that branch is the public behavior of the runner-owned wiki
  publication helper and is already covered by runner unit tests.

## Open Questions

- Should Host projection later preserve selected publication metadata from
  runner `artifact.ref` observations, or should publication details remain a
  runner-owned artifact-record concern?
- Should distributed three-machine smoke also verify wiki publication once the
  manual demo profile is automated?
