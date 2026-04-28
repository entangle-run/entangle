# Studio Wiki Publication Retry Slice

## Current Repo Truth

Superseded by `335-host-wiki-publication-removal-slice.md` and later replaced
by `347-studio-wiki-publication-control-slice.md`. Host, host-client, CLI, and
Studio no longer support direct runtime wiki repository publication because
that path required Host-readable runner filesystem state.

Historical context from this slice: Host, host-client, CLI, and Studio once
supported publishing a runtime wiki repository as a git-backed artifact. CLI
exposed `--retry`, and Host required retry when the current wiki commit already
had a non-published publication attempt.

Studio could create a first wiki publication attempt but always sent
`retry: false`, so an operator could get stuck after a failed attempt unless
they switched to CLI.

## Target Model

The target model described by this slice was replaced. Explicit wiki
publication has returned as runner-owned protocol behavior: Studio now asks
Host to send `runtime.wiki.publish` to the accepted runner assignment, not to
publish a runner-local repository itself.

## Impacted Modules/Files

- `apps/studio/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/285-studio-wiki-publication-retry-slice.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Supersession note: the Studio wiki publication retry action described here was
removed by `335-host-wiki-publication-removal-slice.md` because it depended on
a direct Host filesystem mutation against runner-owned wiki state. The valid
replacement is the Host-signed control request described by `347`.

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
