# Wiki Page Optimistic Concurrency Slice

## Current repo truth

Runner-owned wiki page mutation already travelled through Host-signed
`runtime.wiki.upsert_page` control events. Operators, CLI, Studio, and the
running User Client could replace or append a page, and the assigned runner
owned the filesystem write, wiki repository sync, `wiki.ref` evidence, and
command receipt.

That path was federated, but it had no explicit stale-edit guard. If two
participants edited the same page from old projected preview state, the later
command could overwrite current runner-owned page content without proving the
base content it was editing.

## Target model

Wiki page mutation remains runner-owned, but callers can now send
`expectedCurrentSha256`:

- Host validates the optional SHA-256 digest and includes it in the signed
  `runtime.wiki.upsert_page` control payload;
- the assigned runner reads the current page content, hashes it, and refuses
  the mutation when the digest does not match;
- command receipts can carry expected, previous, and next wiki page SHA-256
  values for audit/projection surfaces;
- the Human Interface Runtime derives an expected digest from a visible,
  untruncated projected wiki preview when available, and the User Client can
  also send an explicit digest.

Host still does not read runner wiki files.

## Impacted modules and files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/host-api/runtime.ts`
- `packages/types/src/host-api/events.ts`
- `packages/types/src/projection/projection.ts`
- `services/host/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/host/src/state.ts`
- `services/runner/src/service.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/human-interface-runtime.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `apps/cli/src/projection-output.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-wiki-publication.ts`
- `apps/studio/src/federation-inspection.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/runtime-api.ts`

## Concrete changes

- Added optional `expectedCurrentSha256` to wiki page upsert Host API and
  control payload contracts.
- Added optional wiki page expected/previous/next SHA-256 fields to runtime
  command receipt observations, Host events, and projection records.
- Runner wiki page upsert now hashes the current page before writing and
  returns a failed command receipt with `syncStatus: "conflict"` when the
  expected digest is stale.
- CLI and Studio can provide the expected current digest on operator wiki page
  mutations.
- The User Client can provide an expected digest; the Human Interface Runtime
  also derives one from a visible, complete projected wiki preview when the
  caller does not provide it.

## Tests required

- Type contract test for wiki page digest fields in control, observation,
  Host-event, and projection records.
- Host API and control-plane tests proving the digest is forwarded.
- Runner service test proving a matching digest writes the page and a stale
  digest prevents the write.
- Runner Human Interface Runtime test proving a visible projected wiki preview
  becomes the forwarded expected digest.
- host-client, CLI, Studio, and User Client helper tests for the widened
  request/presentation shape.

## Migration and compatibility

This is additive. Existing callers can omit `expectedCurrentSha256` and retain
the previous replace/append behavior. Operators and user clients that have a
complete projected preview should send the digest to avoid stale edits.

## Risks and mitigations

- Stale projected previews can still exist, but the runner compares against
  current runner-owned content before writing.
- Truncated projected previews are not used to derive an automatic digest, so
  the User Client does not accidentally enforce a hash of partial content.
- The hash is audit metadata, not authorization. Page visibility and Host
  control assignment checks remain the policy boundary.

## Audit notes

The added-line local-assumption audit found no new old product identity
markers, `runtimeProfile.*local`, `contextPath`, `runtimeRoot`, shared-volume,
`effective-runtime-context`, or Docker assumptions.

## Open questions

- [454-wiki-page-patch-mode-slice.md](454-wiki-page-patch-mode-slice.md)
  added the first single-page unified diff patch mode on top of this stale-edit
  guard. Rich merge UI and multi-page patch sets remain open.
- Repository lifecycle and replicated fallback behavior remain separate git
  backend hardening work.
