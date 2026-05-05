# Process Smoke User Client Wiki Patch-Set Slice

## Current Repo Truth

The process-runner federated smoke already proves the running User Client can
publish signed User Node messages, approve OpenCode permission requests, review
source changes, publish and reconcile source history, publish wiki repositories,
upsert a visible wiki page, and apply a single-page wiki patch. After the
participant JSON patch-set endpoint was added, that full process smoke still
did not prove that a running User Client could request the signed
`runtime.wiki.patch_set` command and observe the resulting projected wiki
evidence.

## Target Model

The main no-credential process smoke should prove the same path operators and
users will manually exercise: a User Node receives a visible `wiki_page`
approval resource, the running User Client requests a patch-set through its
Human Interface Runtime, Host publishes the signed command, the assigned runner
applies it, Host projects the completed command receipt, and the projected wiki
ref carries the updated page preview.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Parse User Client patch-set responses with
  `runtimeWikiPatchSetResponseSchema`.
- After the existing User Client wiki page patch proof, request
  `/api/wiki/pages/patch-set` from the running User Client with one append page
  scoped to the visible wiki page.
- Assert the response has `source: "runtime"`, `userNodeId: "user"`,
  `pageCount: 1`, append mode, the expected base hash, and normalized path.
- Wait for Host projection to expose the completed
  `runtime.wiki.patch_set` command receipt with `wikiPageCount: 1`.
- Wait for Host projection to expose the updated wiki ref preview content.

## Tests Required

- Host workspace typecheck.
- Host workspace lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.
- `pnpm ops:smoke-federated-process-runner:fake-opencode` when a relay is
  reachable.

## Migration And Compatibility Notes

This is verification-only. It does not change public Host API, runner behavior,
or User Client JSON contracts.

## Risks And Mitigations

- Risk: the process smoke becomes slower or more fragile.
  Mitigation: the new proof reuses the already-created visible wiki page
  resource and the already-running User Client, runner, Host, relay, and git
  backend.
- Risk: the patch-set path is tested only with one page.
  Mitigation: package-level runner tests already cover multi-page validation;
  the smoke focuses on proving the participant process boundary.

## Open Questions

The browser UI still needs a multi-page draft workflow. This slice only hardens
the executable process proof for the participant JSON boundary.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; no new relevant hits
- `pnpm ops:smoke-federated-process-runner:fake-opencode`
