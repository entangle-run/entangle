# Host Wiki Publication Removal Slice

## Current Repo Truth

Runner-owned wiki synchronization still snapshots each node's `memory/wiki`
tree into the node-local `wiki-repository` workspace after completed turns, and
joined runners emit signed `wiki.ref` observations when a concrete snapshot is
available. Host projection and the runtime memory read APIs can inspect those
bounded refs without reading runner-local wiki files.

Before this slice, Host also exposed direct wiki publication routes:

- `GET /v1/runtimes/:nodeId/wiki-repository/publications`;
- `POST /v1/runtimes/:nodeId/wiki-repository/publish`.

Those routes required Host-readable runner filesystem state and pushed a git
artifact from the control plane. That boundary was invalid for remote runners.

## Target Model

Wiki publication is node-owned runtime behavior. Host observes signed
`wiki.ref` and future runner-owned publication observations, but Studio, CLI,
host-client, and Host API do not expose a direct Host mutation that reads or
publishes a runner wiki repository.

## Impacted Modules/Files

- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `packages/host-client/src/runtime-wiki-repository.ts`
- `packages/host-client/src/runtime-wiki-repository.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/runtime-wiki-repository-output.ts`
- `apps/cli/src/runtime-wiki-repository-output.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-wiki-repository-inspection.ts`
- `references/222-wiki-repository-publication-slice.md`
- `references/285-studio-wiki-publication-retry-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/log.md`
- `wiki/overview.md`

## Concrete Changes Required

- Remove Host wiki repository publication/list routes.
- Remove Host state helpers that publish wiki repositories from
  Host-readable runner filesystem state.
- Remove host-client methods and Host API schemas for direct wiki repository
  publication.
- Remove CLI `wiki-publications` and `wiki-publish` commands.
- Remove Studio Runtime Memory publish/retry controls and publication history.
- Keep runner-owned wiki sync, `wiki.ref` observation, projected wiki preview,
  and projected runtime memory fallback behavior.
- Mark old host-mediated wiki publication docs as superseded.

## Tests Required

- Type/schema tests for removed Host API contracts.
- Host API tests proving runtime memory/source surfaces still work without
  direct wiki publication.
- host-client tests proving no wiki publication request method remains.
- CLI and Studio typecheck/lint after command and UI removal.
- Federated process smoke proving runner-owned observation/projection still
  works without Host sharing a runner filesystem.

The local-assumption audit for added lines should classify any remaining
`wiki-repository` and `runtimeRoot` mentions as local adapter/debug, test
fixture, or runner-local workspace behavior. They must not be public Host
mutation requirements.

For this slice, the added-line audit found only `context.workspace.runtimeRoot`
in `228-distributed-state-projection-spec.md`, where it documents existing
same-machine compatibility read paths. That is valid compatibility context, not
a new production dependency.

## Migration/Compatibility Notes

This is an intentional pre-release breaking change. Existing callers must stop
posting to Host for wiki repository publication. The supported current path is
read-only projection through `wiki.ref`; explicit wiki repository publication
must return later as a runner-owned protocol command or signed node message.

Historical `wiki_repository.published` event formatting remains readable so old
event logs do not become opaque, but no active public Host API creates new
events of that type.

## Risks And Mitigations

- Risk: operators lose a manual wiki publication button.
  Mitigation: projected `wiki.ref` records keep recent wiki snapshots visible;
  explicit publication should be rebuilt as a runner-owned command.
- Risk: docs still imply Host can publish runner wiki repositories.
  Mitigation: historical slice docs are marked superseded and the active
  federated index points to this removal slice.
- Risk: removing shared git publication helpers hides unused code paths that
  future wiki publication could reuse.
  Mitigation: the runner-owned source-history publication path remains the
  active git publication reference.

## Open Questions

- Define the exact runner-owned command/message shape for explicit wiki
  repository publication and retry.
- Decide whether wiki publication should be requested by a User Node message,
  Host control command, or both with different policy requirements.
- Decide whether a node wiki should remain a runner-local repository with
  published refs, or become a first-class remote repository per node.
