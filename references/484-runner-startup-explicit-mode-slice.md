# Runner Startup Explicit Mode Slice

## Current Repo Truth

The runner already supported generic federated `join` startup through CLI
arguments and `ENTANGLE_RUNNER_JOIN_CONFIG_PATH` or
`ENTANGLE_RUNNER_JOIN_CONFIG_JSON`. It also supported direct
`runtime-context` startup for compatibility/debug operation. However, invoking
the runner process without a command or startup environment still implicitly
selected `runtime-context` and let `resolveRuntimeContextPath` guess
`injected/effective-runtime-context.json`.

That implicit fallback was inconsistent with the federated model because an
unconfigured process could silently assume a colocated injected file instead of
requiring a federated join config or an explicit compatibility/debug startup
choice.

## Target Model

A runner process must start in an explicit mode:

- `entangle-runner join --config <path>` or join config environment variables
  for federated operation;
- `entangle-runner runtime-context --context <path>`, `entangle-runner run
  <path>`, or `ENTANGLE_RUNTIME_CONTEXT_PATH` for compatibility/debug startup.

No-command startup must fail fast with actionable instructions. Unknown
commands must fail instead of being interpreted as direct runtime-context
startup.

## Impacted Modules/Files

- `services/runner/src/index.ts`
- `services/runner/src/index.test.ts`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/222-current-state-codebase-audit.md`
- `references/230-migration-from-local-assumptions-plan.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Update `parseRunnerCliMode` so no-command startup throws unless a join config
  env var or `ENTANGLE_RUNTIME_CONTEXT_PATH` is present.
- Keep `join`, `run`, and `runtime-context` command parsing stable.
- Make unknown commands fail with a clear error.
- Update runner tests to cover explicit runtime-context command parsing and
  failure for unconfigured or unknown startup.
- Update canonical docs to state that runner startup is explicit and that
  runtime-context mode is a compatibility/debug path, not a process default.

## Tests Required

- `pnpm --filter @entangle/runner test -- src/index.test.ts`
- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm ops:smoke-federated-process-runner:fake-external-http`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

Pre-release operators who previously ran `entangle-runner` with no command and
relied on a default injected context path must now choose an explicit mode.
Federated deployments should use `join`; direct runtime-context users can set
`ENTANGLE_RUNTIME_CONTEXT_PATH` or pass `runtime-context --context`.

## Risks And Mitigations

- Risk: an ad hoc developer script starts the runner without arguments.
  Mitigation: the new error message names both supported startup paths.
- Risk: direct compatibility/debug startup is mistaken for the canonical model.
  Mitigation: docs now describe it as explicit, while Docker managed runners
  and smoke paths use generic join.
- Risk: unknown commands could mask typos if they still defaulted to
  runtime-context.
  Mitigation: unknown commands now fail fast.

## Open Questions

None for this slice.
