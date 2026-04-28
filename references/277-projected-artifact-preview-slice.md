# Projected Artifact Preview Slice

## Current Repo Truth

The runner-served User Client already renders artifact refs from User Node
message records and exposes `/artifacts/preview`, but that preview route still
called Host's deep runtime artifact preview endpoint. That endpoint reads the
runtime artifact record and materialized artifact file through Host-side access
to `runtimeRoot`, which is a same-machine compatibility path rather than the
federated projection model.

`artifact.ref` observations and Host projection records existed, but they only
carried the `ArtifactRef`. They did not carry any bounded content preview, so a
remote User Client could show the ref but still needed the older Host runtime
preview path for human-readable content.

## Target Model

Agent runners emit bounded text previews with `artifact.ref` observations when a
materialized artifact has local file content that can be safely previewed. Host
stores that bounded preview in the artifact projection record. The User Client
prefers projected preview content and falls back to the legacy runtime preview
only when projection has no preview.

Full artifact content still belongs in git/object backends. Nostr observation
events carry only bounded text excerpts plus refs and hashes.

## Impacted Modules/Files

- `packages/types/src/artifacts/artifact-ref.ts`
- `packages/types/src/protocol/observe.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/service.ts`
- `services/runner/src/index.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/runner/src/service.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/227-nostr-event-fabric-spec.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a reusable bounded `ArtifactContentPreview` schema without local
  `sourcePath`.
- Allow `artifact.ref` observation payloads to include optional bounded preview
  content.
- Add optional artifact preview content to artifact projection records.
- Have Host persist the projected preview when reducing an observed artifact
  ref.
- Have the runner build a bounded text preview from the materialized artifact's
  local file before publishing the artifact-ref observation.
- Have the Nostr observation publisher include the preview in `artifact.ref`.
- Have the User Client artifact preview route fetch Host projection, render the
  projected preview when present, and avoid the runtime-local preview endpoint
  in that path.
- Keep legacy runtime preview fallback for older records without projected
  preview.

## Tests Required

- Types contract tests for projected artifact preview and observation payloads.
- Host reducer/projection test proving `artifact.ref` preview is retained in
  `/v1/projection`.
- Runner service test proving produced report artifacts publish a bounded
  preview.
- User Client test proving artifact preview renders projection content and does
  not call Host's deep runtime artifact preview endpoint when projection has a
  preview.
- Runner/Host/Types typechecks and lints.

## Migration/Compatibility Notes

Existing artifact projection records without `artifactPreview` remain valid.
The User Client falls back to the existing Host runtime artifact preview route
when no projected preview exists, preserving current same-machine behavior while
new federated observations become projection-first.

The preview deliberately omits local source paths and is bounded to avoid
turning Nostr into a blob transport.

## Risks And Mitigations

- Risk: large artifact content leaks through observation events.
  Mitigation: the runner reads at most a bounded preview and reports truncation.
- Risk: binary artifacts produce unreadable previews.
  Mitigation: previews with null bytes are marked unavailable with a bounded
  reason instead of emitting content.
- Risk: projection preview becomes stale after artifact mutation.
  Mitigation: artifact refs are immutable handoff records keyed by artifact id
  and updated by subsequent observations.
- Risk: Host still has older deep runtime preview APIs.
  Mitigation: this slice makes the User Client projection-first but leaves the
  legacy endpoint as fallback until all runtime inspection paths are migrated.

## Open Questions

- Whether full artifact review should be backed directly by git/object backend
  reads from Host or by a dedicated artifact gateway service.
- Whether non-text artifact previews should later expose thumbnails or metadata
  through an object backend rather than Nostr.
