# User Client Wiki Target Process Proof Slice

## Summary

This slice strengthens the federated process-runner smoke for
conversation-scoped User Client wiki publication.

The previous proof waited for the completed `runtime.wiki.publish` command
receipt after the running User Client requested a target-specific wiki
publication. It did not also prove that the requested git repository received
the published wiki branch. This slice closes that proof gap.

## Current Repo Truth

- User Client wiki publication can now include a git target selected from a
  visible `wiki_repository_publication` approval resource.
- The Human Interface Runtime forwards that target through Host to the assigned
  runner.
- Runner-owned wiki publication emits both command receipts and projected git
  artifact refs.
- The smoke already initializes a dedicated bare git repository for the User
  Client wiki target.

## Target Model

The fast process smoke should prove not only command acceptance and completion,
but also the artifact handoff that an operator would inspect:

- Host projects a published git artifact for the requested User Client wiki
  target.
- The target repository branch head matches the projected artifact commit.
- Host still does not read runner-local filesystem state for this proof.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes

- After the User Client wiki publication command receipt completes, wait for a
  projected `knowledge_summary` git artifact whose repository name is the
  requested User Client wiki target.
- Inspect that projected artifact through Host runtime artifact APIs.
- Verify the dedicated bare git repository's `builder/wiki-repository` branch
  head equals the projected artifact commit.
- Print an explicit smoke pass line for the projected User Client wiki
  publication artifact.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 90000`
- `pnpm test`
- `pnpm typecheck`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit

## Migration And Compatibility

This is test/proof hardening only. It does not change runtime contracts, Host
APIs, runner behavior, Studio, CLI, or User Client behavior.

## Risks And Mitigations

- Risk: the smoke could pass on command receipts while missing broken git
  handoff behavior.
  Mitigation: the smoke now checks both projection and the target repository
  branch head.
- Risk: this could reintroduce Host/runner shared-filesystem assumptions.
  Mitigation: the branch-head check reads the requested git backend proof
  target, not runner-local runtime state.

## Open Questions

- Should the distributed proof verifier also require target-specific artifact
  repository checks once the multi-machine proof is automated?
