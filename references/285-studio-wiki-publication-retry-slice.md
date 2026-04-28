# Studio Wiki Publication Retry Slice

## Current Repo Truth

Host, host-client, CLI, and Studio already support publishing a runtime wiki
repository as a git-backed artifact. CLI exposes `--retry`, and Host requires
retry when the current wiki commit already has a non-published publication
attempt.

Studio could create a first wiki publication attempt but always sent
`retry: false`, so an operator could get stuck after a failed attempt unless
they switched to CLI.

## Target Model

Studio should provide the same operator-level wiki publication path as CLI. If
the selected runtime has any non-published wiki repository publication attempt,
the Studio action should retry publication through the same Host API and make
the button label explicit.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/285-studio-wiki-publication-retry-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Detect retryable wiki repository publication attempts in Studio.
- Send `retry: true` to `publishRuntimeWikiRepository` when a retryable attempt
  exists.
- Adjust the action label between publish and retry states.
- Update docs so wiki publication actions are no longer listed as an open gap.

## Tests Required

- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio lint`
- `git diff --check`

## Migration/Compatibility Notes

No contract change. Studio uses the existing Host API and `retry` request field.

## Risks And Mitigations

- Risk: Studio retries when a previous failed attempt belongs to an older wiki
  commit.
  Mitigation: Host only applies retry semantics when the active wiki commit has
  a matching previous attempt; otherwise `retry: true` is harmless.

## Open Questions

Whether Studio should later expose explicit target git-service/namespace/repo
controls for wiki publication instead of using the runtime's resolved default
target.
