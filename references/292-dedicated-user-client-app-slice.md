# Dedicated User Client App Slice

## Current Repo Truth

The Human Interface Runtime already serves a functional server-rendered User
Client shell from `services/runner/src/human-interface-runtime.ts`. That shell
is enough for the process smoke and for manual runtime testing, but the
federated product model calls for a dedicated User Client app or equivalent
human-node client that is distinct from Studio.

`290-human-interface-json-api-slice.md` added the runtime-local JSON API needed
by such a client: `/api/state`, `/api/conversations/:conversationId`, and
`/api/messages`.

## Target Model

Entangle should have three user-facing surfaces with clear boundaries:

- Studio: operator/admin control room.
- CLI: headless/operator and development gateway.
- User Client: human graph participant surface for a running User Node.

The User Client app should talk to the Human Interface Runtime JSON API, not to
Host Authority internals. It should let the human node inspect conversations,
send messages, and respond to approval requests through the same stable User
Node gateway path used by the runner-served shell.

## Impacted Modules And Files

- `apps/user-client`
- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`

## Concrete Changes

- Added `@entangle/user-client` as a Vite/React workspace app.
- Added a runtime API helper module for Human Interface Runtime JSON routes.
- Added a quiet operational UI with runtime status, conversation list, selected
  thread, message timeline, artifact summaries, composer, and approval
  approve/reject actions.
- Added a Vite dev proxy controlled by `ENTANGLE_USER_CLIENT_RUNTIME_URL` so
  local development can proxy `/api`, `/health`, artifact, and source review
  routes to a running Human Interface Runtime.
- Added unit tests for runtime API URL, conversation selection, and delivery
  label helpers.
- Added the app to the root typecheck script.

## Tests Required

- `pnpm --filter @entangle/user-client typecheck`
- `pnpm --filter @entangle/user-client test`
- `pnpm --filter @entangle/user-client lint`
- `pnpm --filter @entangle/user-client build`
- root `pnpm typecheck` when convenient because the root script now includes
  the User Client app.

## Migration And Compatibility Notes

The existing runner-served HTML shell remains available and remains the smoke
path until deployment packaging makes the bundled app the default.

`293-runtime-served-user-client-assets-slice.md` adds optional static serving
through `ENTANGLE_USER_CLIENT_STATIC_DIR`, so a built User Client can now be
served by the running Human Interface Runtime when assets are available.

The new app can run in development against a runtime by setting
`ENTANGLE_USER_CLIENT_RUNTIME_URL=<runtime-client-url>` and starting
`pnpm --filter @entangle/user-client dev`.

## Risks And Mitigations

- Risk: the app drifts into another operator surface.
  Mitigation: it consumes only Human Interface Runtime JSON routes and has no
  Host Authority controls.
- Risk: the app cannot run cross-origin in production.
  Mitigation: v1 targets same-origin serving by the Human Interface Runtime or
  Vite dev proxying; cross-origin deployment can be handled later with an
  explicit CORS policy.
- Risk: duplicate UI behavior with the server-rendered shell.
  Mitigation: shared JSON routes now define the boundary; future work can serve
  the built app from the runtime and retire most duplicated HTML.

## Open Questions

- Should the federated dev runner image build and include
  `apps/user-client` assets by default?
- Should artifact/source/wiki review actions move under JSON `/api/*` routes
  before the app exposes full review panels?
- Should the app receive live updates through server-sent events or WebSocket
  rather than polling `/api/state`?
