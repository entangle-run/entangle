# OpenCode Runtime State Isolation Slice

Date: 2026-04-25.

## Purpose

This slice advances Entangle Local L3 workstream B1/B2 by making the first
OpenCode runner adapter more diagnosable and more node-scoped without widening
the public node runtime back to legacy model inference.

## Entry Audit

The slice re-read the required repository state files and inspected the touched
runtime contracts, runner adapter, runner service outcome mapping, host-client
runtime presentation helpers, and the local OpenCode source under the external
reference corpus.

Relevant OpenCode findings:

- `opencode run --format json` emits JSON event lines that include a
  `sessionID` field.
- `opencode run` reads stdin when stdin is not a TTY, so Entangle can continue
  sending the rendered node turn prompt through stdin.
- OpenCode DB selection is controlled by `OPENCODE_DB`, while broader config,
  state, cache, and data roots are controlled through XDG environment roots and
  `OPENCODE_CONFIG_DIR`.
- OpenCode permission prompts are a UX and policy surface, not a sandbox. The
  current Entangle adapter must not pass the unsafe
  `--dangerously-skip-permissions` flag as a default.

## Implementation

Changed behavior:

- `AgentEngineTurnResult` and `EngineTurnOutcome` now have a generic optional
  `engineSessionId`.
- The OpenCode adapter captures OpenCode JSON event `sessionID` values and
  stores the latest value as `engineSessionId`.
- Runner turn outcome mapping preserves that `engineSessionId`, so host, CLI,
  and Studio surfaces that read runner turns/events can reason about the last
  engine session without an OpenCode-specific contract field.
- The OpenCode process now receives node-scoped `OPENCODE_DB`,
  `OPENCODE_CONFIG_DIR`, `OPENCODE_TEST_HOME`, `XDG_CONFIG_HOME`,
  `XDG_STATE_HOME`, `XDG_DATA_HOME`, and `XDG_CACHE_HOME` values under the
  node engine-state workspace.
- The adapter prepares those directories and checks workspace and engine-state
  readability/writability before spawning OpenCode. Missing or inaccessible
  roots fail as `configuration_error` without starting the process.
- Shared runtime-turn and runtime-trace presentation now include the generic
  engine session id when present.

## Boundary Decisions

- The new field is generic (`engineSessionId`), not `openCodeSessionId`, so the
  graph, A2A, host-client, CLI, and Studio contracts remain engine-agnostic.
- OpenCode-specific state paths remain adapter-owned and injected only as
  process environment.
- This slice does not implement the permission/approval bridge. OpenCode's
  permission system remains an engine-native input that must later be mapped to
  Entangle policy and approval records.
- This slice does not add timeout or cancellation bridging.
- This slice does not claim L3 completion.

## Verification

Verification passed:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/host-client test`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/host-client typecheck`
- `git diff --check`
- `pnpm verify`
- `pnpm build`

`pnpm build` passed with the existing Vite chunk-size warning for the current
Studio bundle.
