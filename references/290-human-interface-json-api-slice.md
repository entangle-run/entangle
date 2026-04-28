# Human Interface JSON API Slice

## Current Repo Truth

User Nodes can run as `human_interface` runtimes and expose a runner-served
User Client. Before this slice, that runtime already had `/health`,
`/api/state`, server-rendered conversation pages, HTML form message publishing,
approval responses, artifact preview, wiki preview, source diff preview, and
source-candidate review controls.

The remaining product direction calls for a dedicated User Client app or an
equivalent richer human-node client. A richer app should not need to scrape
server-rendered HTML, and Studio must remain the operator surface rather than
the human-node chat client.

## Target Model

The Human Interface Runtime should expose a small local JSON API that a bundled
or external User Client can consume while preserving the existing User Node
gateway boundary.

The local API belongs to the running User Node runtime. It forwards through the
Host User Node API and therefore still signs and records messages through the
stable User Node identity path instead of giving the browser direct Host
Authority power.

## Impacted Modules And Files

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Added `GET /api/conversations/:conversationId` to return projected User Node
  conversation detail as JSON through the running Human Interface Runtime.
- Added `POST /api/messages` to accept the existing Host
  `userNodeMessagePublishRequest` JSON shape and publish through the same User
  Node gateway used by the form client.
- Extended the runtime publish helper to forward optional artifact refs,
  intent, turn id, and response policy when provided by JSON clients.
- Updated the process runner smoke in
  `291-human-interface-json-api-smoke-slice.md` to exercise JSON publish,
  selected-conversation inspection, and JSON approval response through the
  running User Client.
- Kept existing HTML routes and form behavior unchanged.

## Tests Required

- Runner typecheck.
- Runner Human Interface Runtime test proving conversation JSON retrieval.
- Runner Human Interface Runtime test proving JSON message publishing forwards
  through the Host User Node gateway with bearer auth.
- Runner full `index.test.ts`.
- Runner lint.
- `git diff --check`.
- Process runner smoke with a live relay when available.

## Migration And Compatibility Notes

No Host API contract changed. The runtime API reuses existing Host request and
response contracts from `packages/types`.

Existing server-rendered User Client routes remain compatible. The new JSON API
is additive and prepares the runtime for `apps/user-client` or another bundled
client implementation.

## Risks And Mitigations

- Risk: the local API is mistaken for an operator API.
  Mitigation: the routes live under the Human Interface Runtime and forward
  through User Node gateway semantics, not Host Authority semantics.
- Risk: richer clients bypass policy.
  Mitigation: JSON publish uses the same Host User Node message schema and Host
  gateway used by CLI and form publishing.
- Risk: API growth duplicates Host APIs.
  Mitigation: the runtime API is intentionally small and scoped to the running
  User Node client surface.

## Open Questions

- Should the bundled app live at `apps/user-client` or
  `apps/human-interface`?
- Should future JSON routes support artifact/source/wiki review actions under
  `/api/*`, or should those remain page/form routes until object-backed review
  is complete?
- Should the Human Interface Runtime expose server-sent events or a WebSocket
  stream for live inbox updates instead of the current polling fingerprint?
