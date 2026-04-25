# CLI Session Launch Wait Slice

Date: 2026-04-25.

## Scope

This L2 Local Workbench slice improves the headless session launch workflow
without changing the host API.

Implemented:

- `entangle host sessions launch --wait` launches through
  `POST /v1/sessions/launch`, then polls `GET /v1/sessions/{sessionId}`;
- `--wait-timeout-ms` controls the CLI wait deadline;
- `--wait-interval-ms` controls polling cadence;
- the launch summary now comes from a reusable projection helper;
- wait output includes the final inspected session summary when available;
- the CLI exits non-zero when the wait deadline expires or the inspected
  session reaches `failed`, `cancelled`, or `timed_out`.

Not implemented:

- relay-publish retry after a failed launch request;
- a new host-side session wait endpoint;
- Studio-side wait polling;
- cancellation, repair, or approval resolution.

## Verification

Focused verification passed with:

```bash
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/cli dev host sessions launch --help
```

The full L2 release gate is still pending and must pass before tagging
`v0.2-local-workbench`.
