# User Client Runtime Status And Live Refresh Slice

## Current Repo Truth

User Nodes can be assigned to `human_interface` runners. The joined runner
starts a runner-served User Client that exposes `/health`, `/api/state`,
conversation pages, message publishing, approval responses, read receipts,
artifact/source/wiki previews, parent-message links, and delivery retry
controls.

Before this slice, the page did not show enough runtime placement context to a
human participant. It also behaved like a static rendered page unless the user
manually refreshed it after a peer message, projection update, delivery retry,
or wiki/source/artifact observation changed Host projection.

## Target Model

The User Client belongs to the running Human Interface Runtime. It should show
the human participant enough node-local runtime context to understand which
identity and relay/Host surfaces the node is using, while still delegating
signing and policy enforcement to the User Node gateway and Host boundary.

The first implementation remains server-rendered, but it should feel like a
running client by detecting projection/inbox changes through the existing
`/api/state` route and refreshing itself when state changes.

## Impacted Modules

- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Extended the internal User Client state with runtime status:
  - User Node Nostr public key;
  - Host API configured/base URL status;
  - primary relay profile;
  - deduplicated read/write relay URLs.
- Added a Runtime panel to the runner-served User Client page.
- Added a bounded browser-side state fingerprint over conversations,
  source-change refs, and wiki refs.
- Added periodic `/api/state` polling that reloads the page when the
  fingerprint changes and updates a live status indicator when state is
  current or unavailable.
- Updated runner tests to assert runtime state appears through `/api/state` and
  the rendered page.

## Tests Required

- Runner typecheck.
- Runner `index.test.ts` for Human Interface Runtime state/page behavior.
- Runner lint.
- `git diff --check`.

## Migration And Compatibility Notes

No Host API contract changed. `/api/state` is owned by the runner-served User
Client runtime and now returns additional internal runtime fields. Existing
clients that ignore unknown fields remain compatible.

The auto-refresh does not introduce a new websocket or SSE dependency. It uses
the existing Host-backed state route and therefore works in the same deployment
topologies as the current User Client.

## Risks And Mitigations

- Risk: polling causes unnecessary Host load.
  Mitigation: the interval is coarse and only fetches the existing bounded
  state route.
- Risk: exposing runtime URLs leaks local deployment details.
  Mitigation: this User Client is served to the human participant running that
  User Node, and the values are already required for operator/runtime
  diagnostics. No secrets are exposed.
- Risk: the server-rendered shell is mistaken for the final app.
  Mitigation: the docs continue to track a future bundled `apps/user-client`
  as a richer UI step.

## Open Questions

- Whether the eventual bundled User Client should use SSE/websocket updates
  instead of polling `/api/state`.
- Whether multi-device Human Interface Runtime sessions need per-device read
  state and refresh coordination.
