# Wiki Page Patch Mode Slice

## Current repo truth

After [453-wiki-page-optimistic-concurrency-slice.md](453-wiki-page-optimistic-concurrency-slice.md),
runner-owned wiki page upsert could guard replacement and append mutations
with `expectedCurrentSha256`. That prevented stale overwrites, but callers
still had to send a full replacement body or an append body.

## Target model

Wiki page mutation should support a patch-shaped operation without making Host
read runner files:

- Host still signs a `runtime.wiki.upsert_page` command;
- `mode: "patch"` means `content` is a unified diff for the target page;
- the assigned runner applies the patch against current runner-owned content;
- context or removal mismatches fail before writing;
- optional `expectedCurrentSha256` remains available as an additional stale-base
  guard;
- command receipts keep the same wiki page path and hash audit metadata.

## Impacted modules and files

- `packages/types/src/protocol/control.ts`
- `packages/types/src/host-api/runtime.ts`
- `services/host/src/index.ts`
- `services/host/src/federated-control-plane.ts`
- `services/runner/src/service.ts`
- `services/runner/src/join-service.ts`
- `services/runner/src/human-interface-runtime.ts`
- `apps/cli/src/index.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/runtime-wiki-publication.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/runtime-api.ts`

## Concrete changes

- Extended wiki page upsert mode contracts from `append | replace` to
  `append | patch | replace`.
- Added runner-side unified diff application for a single wiki page, including
  context/removal checks and deterministic failure on mismatch.
- Added CLI `--patch` for `entangle host runtimes wiki-upsert-page`.
- Added patch mode selection in Studio and the dedicated User Client.
- Kept the protocol as `runtime.wiki.upsert_page` so the Host/runner control
  boundary does not split into a second wiki mutation engine.

## Tests required

- Types contract coverage for the widened mode enum.
- Runner service tests proving patch application, hash reporting, and mismatch
  rejection.
- Existing Host, Human Interface Runtime, User Client, CLI, and Studio tests
  proving the widened enum does not regress replace/append paths.
- Follow-up process proof in
  [455-user-client-wiki-page-patch-process-smoke-slice.md](455-user-client-wiki-page-patch-process-smoke-slice.md)
  covering the running User Client path.

## Migration and compatibility

This is additive. Existing replace/append callers are unchanged. `patch`
callers must send a unified diff in the `content` field; the runner writes only
if the diff matches the current page content.

## Risks and mitigations

- Unified diff parsing is intentionally narrow: only normal single-file hunks,
  context lines, additions, removals, and no-newline markers are accepted.
- Patch mismatch fails before writing and returns through the existing command
  receipt failure path.
- Host remains outside runner files and only transports the signed command.

## Audit notes

The added-line local-assumption audit found no new `Entangle Local`,
`entangle-local`, `runtimeProfile.*local`, `contextPath`, `runtimeRoot`,
shared-volume, `effective-runtime-context`, or Docker assumptions.

## Open questions

- A richer visual merge UI can be built on patch mode plus
  `expectedCurrentSha256`; this slice only adds the runtime-safe patch
  execution primitive.
- Multi-page wiki patch sets remain out of scope until repository lifecycle
  and conflict UX are specified.
