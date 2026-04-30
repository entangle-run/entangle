# Runner-Owned Wiki Page Upsert Slice

## Current repo truth

Before this slice, Entangle could publish a runner-owned wiki repository through
`runtime.wiki.publish`, and normal agent turns could synchronize `memory/wiki`
into the runner's wiki git repository. There was no generic protocol-backed
way for Host, CLI, or future user surfaces to ask an assigned runner to mutate
a specific wiki page without Host filesystem access.

## Target model

Wiki page mutation is a runner-owned runtime command:

- Host validates the request and publishes signed
  `runtime.wiki.upsert_page` control events to the accepted assignment;
- the assigned runner writes only inside its own `memory/wiki` root;
- the runner synchronizes its wiki repository from runner-owned state;
- the runner emits `runtime.command.receipt` observations correlated by
  `wikiPagePath`;
- the runner emits `wiki.ref` evidence for successful synchronized pages.

Host never writes runner wiki files directly.

## Impacted modules and files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/projection/projection.ts`
- `services/host/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/state.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/service.ts`
- `packages/host-client/src/index.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/studio/src/federation-inspection.ts`

## Concrete changes

- Added the `runtime.wiki.upsert_page` control command and runtime command
  receipt correlation field `wikiPagePath`.
- Added Host API `POST /v1/runtimes/:nodeId/wiki/pages`.
- Added host-client `upsertRuntimeWikiPage`.
- Added CLI command `entangle host runtimes wiki-upsert-page`.
- Added runner path validation for POSIX markdown paths, append/replace modes,
  wiki index registration, wiki repository sync, `wiki.ref` publication, and
  command receipts.

## Tests required

- Contract parsing for the new control event and receipt field.
- Host control route request test for accepted federated assignments.
- Host control-plane publication test.
- Runner join-service command dispatch and command-receipt test.
- Runner service test proving page write, index update, git sync, and `wiki.ref`
  emission.
- host-client request test.

## Migration and compatibility

This is additive. Existing wiki repository publication, runtime memory read
paths, and post-turn wiki sync behavior remain compatible.

The command intentionally requires an accepted federated runner assignment.
Non-federated/local adapter mutation is not reintroduced.

## Risks and mitigations

- Path traversal risk is mitigated in the runner by rejecting absolute paths,
  backslashes, NULs, `..` segments, and non-`.md` pages.
- Large payload risk is bounded by the shared 128 KiB request/control payload
  content limit.
- Repository sync failures return failed command receipts instead of pretending
  the mutation is fully object-backed.

## Open questions

- [448-user-client-wiki-page-upsert-slice.md](448-user-client-wiki-page-upsert-slice.md)
  resolved the first participant policy: User Client page edits target visible
  peer-node `wiki_page` resources in the selected conversation and are
  forwarded with `requestedBy` set to the User Node id.
- User-owned personal wiki mutation remains a separate future policy question.
- Source merge/reconcile workflows remain outside this slice.
