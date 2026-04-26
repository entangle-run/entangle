# OpenCode Version Probe And Timeout Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle L3 workstream B2 by hardening the per-node
OpenCode adapter lifecycle without changing the product boundary. Entangle
still owns graph, identity, policy, artifacts, wiki, and inspection. OpenCode
remains a node-local coding engine behind the runner adapter.

## Source Audit

The local OpenCode source was inspected under
`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`
before implementation.

Relevant findings:

- `packages/opencode/src/index.ts` registers the CLI version with
  `InstallationVersion`, so `opencode --version` is the narrow executable probe
  available to Entangle.
- `packages/opencode/src/cli/cmd/run.ts` provides the one-shot `run` command
  and supports `--format=json`, `--dir`, `--attach`, `--agent`, and
  `--dangerously-skip-permissions`.
- `run` auto-rejects permission prompts unless
  `--dangerously-skip-permissions` is passed. Entangle must not pass that
  unsafe bypass by default.
- `packages/opencode/src/cli/cmd/serve.ts` exposes an attached server mode,
  but adopting it requires a separate lifecycle, auth, readiness, and teardown
  design.
- `packages/opencode/src/global/index.ts`,
  `packages/opencode/src/storage/db.ts`, and
  `packages/opencode/src/flag/flag.ts` confirm the state roots and flags that
  Entangle already isolates through `OPENCODE_DB`, `OPENCODE_CONFIG_DIR`,
  `OPENCODE_TEST_HOME`, and XDG directory overrides.

## Implemented Behavior

The runner now probes OpenCode availability with `opencode --version` before a
node turn. The probe uses the same node-scoped environment and source workspace
as the subsequent `opencode run` call.

The generic engine outcome contract now carries an optional `engineVersion`.
The OpenCode adapter records the probed version on successful engine results
and on bounded engine error-event results. Runner turn outcomes persist that
value, host runtime inspection exposes it as `lastEngineVersion`, and the
shared host-client, CLI, Studio runtime detail, runtime trace, and runtime turn
presentations render it without adding OpenCode-specific DTO fields.

The OpenCode adapter now applies a bounded process timeout to both the version
probe and the one-shot run process. On timeout, the adapter sends `SIGTERM` to
the child process and raises a classified `provider_unavailable` execution
error with bounded evidence. Non-zero exits and process start failures are also
classified as `provider_unavailable`.

## Boundary Decisions

- Entangle continues to use one-shot `opencode run` for this slice. The
  attached OpenCode server remains a future B2 lifecycle decision because it
  needs explicit auth, readiness, per-node process ownership, and teardown.
- Engine version is modeled generically as engine metadata. OpenCode-specific
  session fields do not leak into graph, A2A, or host API core schemas.
- Timeout is implemented now; external cancellation, approval resumption, and
  permission-request bridging remain separate L3 tasks.
- The adapter still does not pass `--dangerously-skip-permissions` by default.

## Remaining L3 Gaps

- Permission and approval bridge between OpenCode engine events and Entangle
  approval records.
- External cancellation and attached lifecycle management.
- Runtime availability/degraded-status DTOs beyond last failure evidence.
- Richer source publication policy, retry/target controls, and artifact
  restore/replay semantics.
- Wiki-repository behavior and memory-as-repo migration semantics.
- OpenCode-backed disposable runtime smoke coverage.

## Verification

Focused verification for this slice covered:

```bash
pnpm --filter @entangle/runner test
pnpm --filter @entangle/runner typecheck
pnpm --filter @entangle/runner lint
pnpm --filter @entangle/types test
pnpm --filter @entangle/types typecheck
pnpm --filter @entangle/types lint
pnpm --filter @entangle/host-client test
pnpm --filter @entangle/host-client typecheck
pnpm --filter @entangle/host-client lint
pnpm --filter @entangle/host test
pnpm --filter @entangle/host typecheck
pnpm --filter @entangle/host lint
pnpm --filter @entangle/cli test
pnpm --filter @entangle/cli typecheck
pnpm --filter @entangle/cli lint
pnpm --filter @entangle/studio test
pnpm --filter @entangle/studio typecheck
pnpm --filter @entangle/studio lint
```

The coherent repository gate also passed:

```bash
git diff --check
pnpm verify
pnpm build
```

One initial aggregate `pnpm build` attempt was manually terminated after the
Studio Vite step stopped producing output. A direct
`pnpm --filter @entangle/studio build` completed immediately with only the
known Vite chunk-size warning, and a repeated aggregate `pnpm build` then
completed successfully.
