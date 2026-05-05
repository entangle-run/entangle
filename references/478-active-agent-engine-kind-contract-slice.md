# Active Agent Engine Kind Contract Slice

## Current Repo Truth

The shared catalog schema, CLI help, Host default-catalog initialization, and
distributed proof profile helper still accepted `claude_agent_sdk` even though
the runner executable did not have a native Claude agent adapter. Operators
could therefore create or select a profile kind that passed contract validation
but could not execute in a joined runner.

## Target Model

Entangle should only expose active agent engine kinds that have a runner
execution boundary. OpenCode remains the default. Custom engines are supported
through `external_process` and `external_http`. Native Claude integration can
return later as its own adapter, but until then Claude Code or other tools
should be wrapped behind one of the generic engine boundaries.

## Impacted Modules/Files

- `packages/types/src/resources/catalog.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `apps/cli/src/index.ts`
- `scripts/distributed-proof-profile.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `references/476-external-process-agent-engine-adapter-slice.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Remove `claude_agent_sdk` from the active shared agent engine kind enum.
- Stop Host default-catalog env handling from selecting an unsupported Claude
  profile kind.
- Remove `claude_agent_sdk` from CLI help and distributed proof profile
  validation.
- Add a schema test proving inactive engine kinds are rejected.
- Document that Claude-native support requires a future runner adapter and can
  be integrated today through external-process or external-HTTP wrappers.

## Tests Required

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

The project is pre-release, so removing an unsupported active profile kind is
acceptable. Any existing local catalog that used `claude_agent_sdk` should be
rewritten to `external_process` or `external_http` until a native Claude runner
adapter exists.

## Risks And Mitigations

- Risk: this appears to reduce engine choice.
  Mitigation: it removes only a non-executable active option; operators can
  still run Claude-based tools through the generic engine adapters.
- Risk: future Claude-native support loses its placeholder.
  Mitigation: the future adapter should re-add the kind in the same slice that
  wires runner execution and tests.

## Open Questions

None for this slice.
