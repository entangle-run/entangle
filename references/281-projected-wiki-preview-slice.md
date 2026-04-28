# Projected Wiki Preview Slice

## Current Repo Truth

`wiki.ref` observations carried portable wiki artifact refs, and the User
Client could render those refs in the selected thread. The human User Node
still could not read any bounded wiki content from Host projection. Full wiki
content remained available only through runner-local repository state or later
publication flows.

## Target Model

Joined agent runners should attach a bounded text preview to observed wiki refs
when a safe wiki page is available. Host projection carries that preview, and
the User Client renders it from projection. Nostr still carries only bounded
preview text and refs; full wiki repositories remain git/object-backed
artifacts.

## Impacted Modules/Files

- `packages/types/src/projection/projection.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/service.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `artifactPreview` to wiki observation and projection records.
- Have runner wiki sync read a bounded markdown preview from the runner-owned
  wiki repository after sync.
- Include the preview in `wiki.ref` observations.
- Persist and expose the preview through Host projection.
- Render available projected wiki preview content in the User Client.

## Tests Required

- Types projection contract test with wiki preview.
- Host projection reducer test for `wiki.ref.artifactPreview`.
- Runner service test proving emitted wiki refs include preview content.
- Runner User Client test proving projected wiki preview renders in the page.
- Typecheck, lint, and focused tests for changed packages.

## Migration/Compatibility Notes

Existing `wiki.ref` records without `artifactPreview` remain valid. User Client
cards still render artifact id, summary, locator, and observed time when no
preview exists.

## Risks And Mitigations

- Risk: leaking too much wiki content through Nostr.
  Mitigation: previews are bounded to 8 KiB and full repositories remain out of
  band.
- Risk: binary or missing wiki files break turn execution.
  Mitigation: preview generation returns unavailable preview metadata or omits
  preview and never blocks wiki sync.

## Open Questions

- Whether future edge policy should control which wiki pages can be previewed
  to which human nodes.
- Whether Host should later fetch full wiki content from a git/object backend
  on demand.
