# Runtime-Served User Client Assets Slice

## Current Repo Truth

`292-dedicated-user-client-app-slice.md` introduced `apps/user-client`, a
dedicated Vite/React client that consumes Human Interface Runtime JSON APIs.
Before this slice, the app could run as a separate dev server with a proxy, but
the Human Interface Runtime still served only its built-in server-rendered HTML
shell.

That meant the codebase had a dedicated app, but the running User Node runtime
did not yet have a controlled way to serve that app where the User Node is
running.

## Target Model

A Human Interface Runtime should be able to serve the dedicated User Client
assets from the same origin as its local JSON API. This preserves the product
boundary:

- Studio remains the operator surface.
- The User Client is served by the running User Node runtime.
- The browser talks to the runtime-local JSON API instead of Host Authority
  internals.

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
- `references/292-dedicated-user-client-app-slice.md`

## Concrete Changes

- Added `ENTANGLE_USER_CLIENT_STATIC_DIR`.
- When configured, the Human Interface Runtime serves `/`, `/index.html`,
  `/assets/*`, and `/favicon.ico` from that directory.
- API routes such as `/api/state`, `/api/conversations/:id`, and
  `/api/messages` remain runtime-handled and are not shadowed by static assets.
- The server-rendered HTML shell remains the fallback when no static directory
  is configured.

## Tests Required

- Runner typecheck.
- Runner Human Interface Runtime test proving static `index.html` and asset
  serving while `/api/state` remains available.
- Runner lint.
- Full runner `index.test.ts` when convenient.

## Migration And Compatibility Notes

No deployment is forced to ship built assets yet. Existing runtimes continue to
serve the built-in shell unless `ENTANGLE_USER_CLIENT_STATIC_DIR` is set.

A future packaging slice can decide whether runner images should build
`apps/user-client` during image build, copy prebuilt assets into the runner, or
mount a static asset directory.

## Risks And Mitigations

- Risk: static serving shadows runtime APIs.
  Mitigation: only root, `index.html`, `assets`, and `favicon.ico` are served
  from the static directory; `/api/*` remains dynamic.
- Risk: path traversal through decoded URLs.
  Mitigation: resolved static paths must stay under the configured static root.
- Risk: deployments assume the static app is mandatory.
  Mitigation: the server-rendered shell remains the default fallback.

## Open Questions

- Should the federated dev runner image build and include `apps/user-client`
  assets by default?
- Should Host expose the active User Client UI mode in runtime projection?
- Should the server-rendered shell be kept as a recovery/debug page once the
  bundled app is the default?
