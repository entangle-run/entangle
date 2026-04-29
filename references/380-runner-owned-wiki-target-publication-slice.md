# Runner-Owned Wiki Target Publication Slice

## Current Repo Truth

Explicit wiki repository publication already used the correct federated shape:
Host accepted a request, signed a `runtime.wiki.publish` control command for
the accepted assignment, and the owning runner synced and pushed its
runner-local wiki repository. That path intentionally kept Host out of
runner-owned wiki files and git mutation.

The remaining limitation was target selection. The command, Host API, CLI,
Studio helper, joined-runner handler, and runner publication service all
published only to the node's primary git repository target.

Source-history publication already had the better target model: a generic git
target selector can identify a non-primary repository while omitted selector
fields fall back through the effective artifact context.

## Target Model

Wiki publication remains runner-owned and federated:

- Host signs a `runtime.wiki.publish` control command;
- the command may carry a partial git target selector;
- the runner resolves that selector against its effective artifact context;
- omitted selector fields fall back to the primary git target or default
  artifact context values;
- the runner syncs and pushes its wiki snapshot from runner-owned state;
- primary publication keeps the existing artifact id format;
- non-primary publication includes resolved target identity in the artifact id
  so publication records do not collide across repositories;
- Host observes the result through signed `artifact.ref` evidence.

Studio and CLI remain operator surfaces. This slice does not add a signed
User Node request protocol for wiki promotion and does not add a new wiki
publication approval policy.

## Impacted Modules And Files

- `packages/types/src/artifacts/git-repository-target.ts`
- `packages/types/src/runtime/session-state.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/protocol/control.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/federated-control-plane.test.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/wiki-repository.ts`
- `services/runner/src/wiki-repository.test.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-wiki-publication.ts`
- `apps/studio/src/runtime-wiki-publication.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/346-runner-owned-wiki-publication-control-slice.md`
- `references/347-studio-wiki-publication-control-slice.md`
- `references/348-process-smoke-wiki-publication-control-slice.md`
- `references/379-runner-owned-source-history-target-publication-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `gitRepositoryTargetSelectorSchema` and
  `GitRepositoryTargetSelector` as the generic partial selector shared by
  source-history and wiki publication requests.
- Rebased `sourceHistoryPublicationTargetSchema` on the generic selector so the
  repo has one contract for git target selection.
- Extended `runtimeWikiPublishRequestSchema` and
  `runtimeWikiPublishPayloadSchema` with optional `target`.
- Forwarded `target` through Host API, Host federated control-plane
  publication, joined-runner control handling, and `RunnerService`.
- Renamed the runner helper to `publishWikiRepositoryToGitTarget`.
- Added runner-side wiki target resolution through effective artifact context
  and the existing git target resolver.
- Preserved the existing primary artifact id shape and added resolved target
  identity for non-primary wiki publication artifact ids.
- Added CLI options:
  `--target-git-service`, `--target-namespace`, and `--target-repository`.
- Added Studio Runtime Memory target fields beside the existing reason,
  requester, and retry controls.

## Tests Required

Implemented and passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/runner test -- wiki-repository.test.ts index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts federated-control-plane.test.ts`
- `pnpm --filter @entangle/studio test -- runtime-wiki-publication.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm ops:check-product-naming`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`

Key behavioral coverage:

- control and Host API contracts preserve wiki target selectors;
- Host forwards wiki target selectors into signed control payloads;
- joined runners forward wiki target selectors to assignment runtime handles;
- runner wiki publication pushes to primary and sibling non-primary bare git
  repositories resolved from the artifact context;
- host-client and Studio helper tests serialize the new request shape.
- the process smoke still proves the Host-signed wiki publication command over
  a live relay with separate Host/runner/User Node process state roots and
  verifies both primary and non-primary git branch heads.

Added-line local-assumption audit used the standard project regex for obsolete
local product labels, local runtime profile assumptions, Host/runner filesystem
coupling, shared filesystem assumptions, bootstrap context files, and
container-only assumptions.

Findings:

- runner state-root references in runner service/wiki publication tests are
  valid runner-owned state fixture usage;
- no Host-local runner filesystem read, shared filesystem dependency,
  container-only product assumption, or obsolete product name was added.

## Migration And Compatibility Notes

Existing wiki publication requests remain valid. If `target` is omitted, the
runner publishes to the primary git target exactly as before.

The new selector is partial by design. A request can specify only
`repositoryName` when the runtime artifact context already supplies the primary
git service and default namespace.

This is a pre-release contract extension, so no compatibility shim is needed
beyond preserving primary-target defaults.

## Risks And Mitigations

- Risk: operators publish memory to an unintended repository with a partial
  selector.
  Mitigation: selector resolution uses the same artifact-context resolver as
  other git artifact paths, and non-primary artifact ids include resolved
  target identity.
- Risk: wiki publication policy lags source-history publication policy.
  Mitigation: this path is currently Host-authority/operator controlled; a
  future policy slice should decide whether participant-triggered wiki
  promotion needs signed User Node approval resources.
- Risk: process smoke coverage could accidentally validate the primary artifact
  for a non-primary request.
  Mitigation: `381-process-smoke-wiki-target-publication-slice.md` filters the
  projected artifact by requested repository name and verifies the sibling bare
  git repository branch head.

## Open Questions

- Should non-primary wiki publication require a dedicated approval resource
  when graph policy enables participant-triggered memory promotion?
- Should a published node wiki become a long-lived remote memory repository
  with pull/merge semantics, or remain a runner-local repository that can
  publish snapshots to selected artifact repositories?
- Should the distributed smoke also cover non-primary wiki target publication
  once the multi-machine demo profile is automated?
