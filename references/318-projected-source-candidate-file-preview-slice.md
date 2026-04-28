# Projected Source Candidate File Preview Slice

## Current Repo Truth

Host source-change candidate list/detail/diff reads can now use runner
observations, but the changed-file preview endpoint still required a
Host-readable runtime context and shadow git store. That made source review
partly local even after projected candidate and diff reads were available.

Runner source-change summaries already carried bounded diff excerpts and file
metadata in `source_change.ref` observations.

## Target Model

The basic source-review surface should work from Host projection alone. Runners
may include bounded text previews for a small number of changed files in the
observed source-change summary. Host should prefer local shadow-git previews
when it has runner-local state, then fall back to projected file previews when
the runtime is remote.

Nostr still must not carry full workspaces or large source archives. The new
payload is a bounded observability preview, not the canonical source artifact.

## Impacted Modules/Files

- `packages/types/src/runtime/session-state.ts`
- `services/runner/src/source-change-harvester.ts`
- `services/runner/src/service.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `sourceChangeFilePreviewSchema` and optional
  `sourceChangeSummary.filePreviews`.
- Have the runner source-change harvester include bounded text previews for the
  first changed, non-deleted files.
- Remove the Host route precondition that source-change candidate file preview
  requires `contextAvailable`.
- Make Host source-change candidate file preview prefer local shadow-git
  content, then fall back to projected `filePreviews`.
- Extend host and runner tests to cover projected file preview behavior.
- Extend the process-runner smoke so the deterministic fake OpenCode source
  edit is visible through the projected file preview endpoint.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test -- src/service.test.ts`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- src/index.test.ts`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`

## Migration/Compatibility Notes

Existing source-change summaries parse with `filePreviews: []`. Local
shadow-git previews remain the highest-fidelity compatibility path. Remote
projection returns an explicit unavailable reason when no bounded preview was
observed for the requested file.

## Risks And Mitigations

- Risk: source content in observation payloads could grow too large.
  Mitigation: runner previews are limited to five files and 4 KB per file.
- Risk: a projected preview is mistaken for a canonical source artifact.
  Mitigation: docs and API behavior keep it as bounded preview evidence; full
  source handoff still belongs in git/object-backed artifact refs.
- Risk: binary files leak unreadable content.
  Mitigation: previews detect NUL bytes and return an unavailable reason.

## Open Questions

- Should future source review retrieve full file content from a git/object
  backend using signed artifact refs instead of carrying any preview content in
  observations?
