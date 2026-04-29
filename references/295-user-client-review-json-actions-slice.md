# User Client Review JSON Actions Slice

## Current Repo Truth

The server-rendered Human Interface Runtime shell already had richer review
behavior than the dedicated `apps/user-client` app:

- projection-first artifact preview;
- projection-first source-change diff preview;
- Host-mediated source-change candidate accept/reject with `reviewedBy` set to
  the running User Node id;
- wiki preview cards for approval resources.

The dedicated User Client app could inspect conversations, send messages, and
publish approval responses, but it did not yet expose the source/artifact/wiki
review flows through local JSON APIs.

## Target Model

The dedicated User Client should be the primary human graph participant client.
It should not scrape server-rendered HTML and should not call Host Authority
internals directly. Review actions should flow through the running Human
Interface Runtime:

- browser -> Human Interface Runtime JSON API;
- Human Interface Runtime -> Host/User Node gateway or Host review API;
- Host projection -> browser refresh.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `apps/user-client/src/runtime-api.ts`
- `apps/user-client/src/runtime-api.test.ts`
- `apps/user-client/src/App.tsx`
- `apps/user-client/src/styles.css`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/292-dedicated-user-client-app-slice.md`

## Concrete Changes

- Added `GET /api/artifacts/preview`.
- Added `GET /api/source-change-candidates/diff`.
- Added `POST /api/source-change-candidates/review`.
- Artifact preview and source diff APIs prefer Host projection excerpts before
  falling back to runtime-specific Host preview endpoints.
- Source candidate review JSON requests stamp `reviewedBy` as the running User
  Node id.
- As of
  [358-user-client-source-change-visibility-boundary-slice.md](358-user-client-source-change-visibility-boundary-slice.md),
  source-change diff and review routes also require selected-conversation
  context and verify the matching inbound approval request before returning
  evidence or publishing a review message.
- The dedicated User Client app can now:
  - preview artifact content;
  - load source-change diffs;
  - accept/reject source-change candidates;
  - render related wiki preview cards for wiki-scoped approval resources.

## Tests Required

- Runner typecheck.
- Runner Human Interface Runtime tests for JSON artifact preview, JSON source
  diff, and JSON source review.
- User Client typecheck.
- User Client runtime API helper tests.
- User Client lint and build.
- Root typecheck when convenient.

## Migration And Compatibility Notes

The server-rendered shell remains available as a fallback/debug surface. The
new JSON routes are additive and use the same Human Interface Runtime origin as
the dedicated app.

No Host API contract changed. The runtime JSON responses are local User Client
view models built from existing Host projection and runtime inspection
contracts.

`296-process-smoke-dedicated-user-client-assets-slice.md` makes the process
smoke auto-serve built User Client assets when available, so manual
`--keep-running` sessions can exercise these actions from the dedicated app.

## Risks And Mitigations

- Risk: the dedicated app diverges from the shell behavior.
  Mitigation: both use the same underlying Human Interface Runtime helper paths
  for projection-first preview and Host-mediated review.
- Risk: source review is confused with approval response.
  Mitigation: the UI keeps approval response controls separate from
  source-candidate accept/reject actions.
- Risk: raw runtime paths leak to the browser.
  Mitigation: projection previews omit runtime-local `sourcePath`, and the app
  renders bounded content only.

## Open Questions

- Should review JSON routes be promoted to shared `packages/types` contracts
  once the local User Client API stabilizes?
- Should the User Client switch from polling to event-driven refresh for review
  status changes?
