# User Client Artifact History Diff Slice

## Current Repo Truth

Host can serve projected git artifact history/diff through backend resolution,
and the CLI/Studio operator surfaces can inspect those reads. The Human
Interface Runtime and dedicated User Client already supported artifact preview
and source-change diff review, but human graph participants could not request
artifact history or artifact diff from their running User Node client.

## Target Model

Human User Nodes should review git-backed artifact evidence from their own
runtime surface without becoming Host operators. The User Client can ask its
Human Interface Runtime for artifact history/diff; the runtime proxies through
the Host read boundary and returns bounded, path-free JSON results.

## Impacted Modules/Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add runtime-local JSON helpers for artifact history and artifact diff.
- Add Human Interface Runtime routes for `/api/artifacts/history` and
  `/api/artifacts/diff`.
- Proxy those routes through Host artifact read APIs with Host API auth headers.
- Add User Client buttons for Preview, History, and Diff on artifact refs.
- Keep artifact history/diff read-only and bounded.

## Tests Required

- `pnpm --filter @entangle/user-client test -- src/runtime-api.test.ts`
- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm verify`

## Migration/Compatibility Notes

This is additive. Existing User Client artifact preview behavior remains
unchanged. History/diff requests return unavailable JSON results when Host API
access or backend evidence is unavailable.

## Risks And Mitigations

- Risk: User Client becomes an operator surface.
  Mitigation: the new routes are read-only evidence views scoped to artifact
  refs visible to the User Node runtime.
- Risk: runtime-local paths leak to browser clients.
  Mitigation: the responses reuse bounded Host artifact history/diff contracts.
- Risk: large diffs overwhelm the client.
  Mitigation: Host read APIs already return bounded/truncated diff payloads.

## Open Questions

- Should artifact history/diff buttons be shown only for git-backed artifacts,
  or should unavailable responses remain the universal behavior?
