# Process Smoke Artifact Backend History Diff Slice

## Current Repo Truth

Host can now resolve projected git artifact history and diff through a
Host-owned backend cache when artifact locators include enough git backend
metadata. Before this slice, that behavior was covered by Host tests but not by
the process-runner proof that exercises a real Host process, joined runner
processes, relay, User Client, and file-backed git service.

## Target Model

The fast federated product proof should verify not only that runners emit
artifact refs, but also that Host can inspect the published git artifact through
the configured backend without reading runner-local runtime files.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the process-runner smoke after runner-owned source-history
  publication.
- Resolve the published source-history artifact id from Host projection.
- Call Host artifact history and diff APIs for that projected git artifact.
- Require available history containing the projected artifact commit.
- Require available diff containing the smoke-generated source file path.
- Print a dedicated `backend-resolved-artifact-history-diff` pass marker.

## Tests Required

- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-federated-process-runner -- --timeout-ms 60000`
- `pnpm verify`

## Migration/Compatibility Notes

No migration is required. The smoke remains topology-agnostic: Host, runner
processes, User Client runtimes, relay, and git backend use separate roots even
when running on one workstation.

## Risks And Mitigations

- Risk: the smoke becomes too slow.
  Mitigation: it reuses the already-published source-history artifact and only
  performs bounded history/diff reads.
- Risk: the proof accidentally relies on local runtime files.
  Mitigation: the checked artifact is projected by the runner and resolved
  through the configured git backend after accepted federated assignment.
- Risk: git backend failures obscure the main smoke purpose.
  Mitigation: the pass marker is specific and failure details include runner
  stdout/stderr for diagnosis.

## Open Questions

- Should the smoke also verify backend-resolved history/diff for wiki
  publication artifacts, or is one published git artifact enough for this gate?
