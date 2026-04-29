# Process Smoke Wiki Target Publication Slice

## Current Repo Truth

`380-runner-owned-wiki-target-publication-slice.md` added optional git target
selectors to `runtime.wiki.publish`. Focused contract, Host, runner,
host-client, CLI, and Studio coverage proved serialization and runner-side
publication to a non-primary bare git repository.

The process-runner smoke still verified only the default primary-target wiki
publication path. That meant the full Host Authority control path, relay
delivery, joined runner handling, Host projection, and git branch verification
had no process-level proof for non-primary wiki target selection.

## Target Model

The process smoke should prove both wiki publication modes:

- default primary git target publication;
- explicit non-primary git target publication using a partial target selector.

Both checks must use the same federated boundary:

- Host signs `runtime.wiki.publish`;
- the command travels through the live relay;
- the joined runner resolves the target from its artifact context;
- the runner pushes from runner-owned wiki state;
- Host sees only signed `artifact.ref` projection evidence;
- the smoke verifies the selected bare git repository branch head.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/348-process-smoke-wiki-publication-control-slice.md`
- `references/380-runner-owned-wiki-target-publication-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Create a sibling bare git repository for targeted wiki publication during
  smoke setup.
- Keep the existing primary wiki publication assertion.
- Add a second Host wiki publication request with
  `target.repositoryName` set to the sibling repository.
- Poll Host artifact projection for a `knowledge_summary` artifact whose git
  locator identifies that non-primary repository.
- Inspect the projected artifact through Host API.
- Verify the non-primary bare repository has
  `refs/heads/builder/wiki-repository` at the projected commit.
- Extend the shared smoke artifact identity helper so it asserts and returns
  the git repository name.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration And Compatibility Notes

This is additive verification only. It does not change public API contracts
beyond the already-implemented target selector support.

The smoke keeps the primary-target wiki publication path because it remains
the default behavior and acceptance baseline.

## Risks And Mitigations

- Risk: the smoke accidentally passes by finding the primary publication
  artifact.
  Mitigation: the non-primary check filters projected artifact refs by the
  requested repository name and verifies the sibling bare repository head.
- Risk: target repository setup hides a provisioning gap.
  Mitigation: this smoke intentionally validates preexisting repository
  publication, matching the current file-backed git service behavior. Managed
  provisioning for target repositories remains a separate product capability.
- Risk: the smoke becomes too slow.
  Mitigation: the additional publish uses the same runner assignment and wiki
  snapshot, adding only one control command, one projection wait, and one git
  branch check.

## Open Questions

- Should future distributed multi-machine smoke also create and verify
  non-primary source-history and wiki publication targets?
- Should Host projection eventually expose target-publication policy warnings
  to Studio before an operator submits a non-primary wiki publication request?
