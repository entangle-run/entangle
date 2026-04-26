# Studio Session Launch Slice

Date: 2026-04-25.

## Purpose

Close the first Federated Workbench parity gap between CLI and Studio session
launch without moving Nostr publishing or runtime-context resolution into the
browser client.

## Implemented Surface

- Studio's selected-runtime Runtime Sessions panel now includes a launch draft
  with summary and optional intent.
- The launch action calls `client.launchSession(...)`, which posts to
  `POST /v1/sessions/launch`.
- The host remains responsible for resolving the active graph, runtime
  context, default user node, relay selection, NIP-59 wrapping, and relay
  publication.
- Studio stores the last launch response, selects the launched session id, and
  refreshes selected-runtime state after a successful launch.
- Studio disables launch until the selected runtime has a realizable context
  and a non-empty summary.

## Boundaries

Studio remains a host client. It does not:

- read runner-local context files;
- derive relay URLs locally;
- create Nostr events locally;
- infer session completion;
- retry relay publication after the host returns an error.

The current launch flow is intentionally initiation-only. Completed session,
turn, and artifact state still comes from the existing host inspection panels
after runner activity has persisted records.

## Verification

The slice added helper coverage for default draft creation, launch readiness,
and request construction. It was verified with:

```bash
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
pnpm verify
pnpm build
pnpm ops:check-federated-dev:strict
pnpm ops:smoke-federated-dev:disposable --skip-build
pnpm ops:smoke-federated-dev
```

All listed commands passed on 2026-04-25. The first disposable-smoke attempt
was interrupted by an unrelated Docker Desktop restart from a background
maintenance loop; after stopping that process, the same disposable smoke passed
and the active smoke passed against a kept-running profile.
