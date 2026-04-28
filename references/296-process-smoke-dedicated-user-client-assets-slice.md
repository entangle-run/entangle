# Process Smoke Dedicated User Client Assets Slice

## Current Repo Truth

The process-runner smoke starts real joined runner processes for one agent node
and two User Node `human_interface` runtimes. It verifies User Client health,
state, conversation inspection, message publishing, and approval response
through the runtime-local JSON API.

Before this slice, the smoke did not help validate the dedicated
`apps/user-client` bundle unless the runtime was launched manually with
`ENTANGLE_USER_CLIENT_STATIC_DIR`.

## Target Model

The smoke should keep proving the no-LLM federated path while making manual
testing of the dedicated User Client easy:

- if a built User Client app exists, serve it from the real User Node runtime;
- if it does not exist, keep using the server-rendered fallback shell;
- allow an explicit static directory override for manual tests.

## Impacted Modules And Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `wiki/log.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/295-user-client-review-json-actions-slice.md`

## Concrete Changes

- Added optional `--user-client-static-dir <path>` support to the process smoke.
- The smoke auto-detects `apps/user-client/dist/index.html` and passes that
  directory as `ENTANGLE_USER_CLIENT_STATIC_DIR` to joined runner processes.
- When static assets are active, the smoke verifies `GET /` serves the
  dedicated app shell before continuing through `/api/state`.
- Without built assets, existing smoke behavior is unchanged.

## Tests Required

- Host typecheck.
- Host lint.
- Existing process smoke when a relay is available.
- User Client build before manual `--keep-running` tests when the dedicated app
  should be served.

## Migration And Compatibility Notes

No smoke caller is forced to build the User Client. The server-rendered fallback
shell remains the default when no static app directory is available.

Manual testing can now use:

```sh
pnpm --filter @entangle/user-client build
pnpm ops:smoke-federated-process-runner -- --keep-running
```

or:

```sh
pnpm ops:smoke-federated-process-runner -- --keep-running --user-client-static-dir /path/to/dist
```

## Risks And Mitigations

- Risk: static app validation makes the smoke depend on frontend build output.
  Mitigation: static validation runs only when a static directory is configured
  or auto-detected.
- Risk: stale `dist` output hides frontend build failures.
  Mitigation: manual docs tell operators to run the User Client build first;
  CI can keep using explicit `@entangle/user-client build`.

## Open Questions

- Should a future disposable smoke build the User Client app as part of the
  full profile path once runtime duration is acceptable?
