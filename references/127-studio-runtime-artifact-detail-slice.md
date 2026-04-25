# Studio Runtime Artifact Detail Slice

## Summary

This slice brings the new runtime artifact item read boundary into Studio.

The previous Studio artifact panel listed persisted runtime artifacts, but the
operator could not select one artifact and verify the host-backed detail record.
Studio now mirrors the CLI and shared host-client capability added in the
runtime artifact detail inspection slice.

## Implemented Behavior

- Runtime artifact list items in Studio are now selectable.
- Selecting an artifact calls `getRuntimeArtifact(nodeId, artifactId)` through
  `packages/host-client`.
- Studio keeps separate selected-artifact state, loading state, and detail
  error state.
- Runtime changes clear stale artifact selection and detail state.
- Selected-runtime refresh revalidates the selected artifact against the
  current artifact list and refreshes the detail record when it is still
  present.
- Artifact label, status, locator, and detail-line formatting now comes from
  shared `packages/host-client` runtime-artifact presentation helpers, keeping
  Studio aligned with CLI summary output.
- The detail card displays:
  - artifact id;
  - backend;
  - kind;
  - locator summary;
  - created and updated timestamps;
  - creator, session, turn, summary, materialization, publication, and
    retrieval lines when present.

## Design Notes

Studio remains a host client. It does not read runner-local artifact files, and
it does not infer artifact truth from UI-local list state. The selected detail
record is fetched through the same host item boundary used by the CLI.

The detail state is intentionally independent from list loading. A transient
detail failure should not erase the whole selected runtime panel.

## Validation

Focused validation run:

- `pnpm --filter @entangle/studio lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `git diff --check`

The Studio helper coverage now also validates artifact detail-line formatting.

## Resulting State

Host, CLI, shared host-client, and Studio now all understand runtime artifacts
as both a collection and an item resource. This is a stronger foundation for
future artifact retention, approval, promotion, and comparison workflows.
