# External Process Agent Engine Adapter Slice

## Current Repo Truth

Entangle contracts and operator surfaces already allowed agent engine profiles
with kind `external_process`, but the runner executable only constructed the
OpenCode adapter for real runtime execution. That meant a node could be
configured with an external-process profile, and proof tooling could advertise
that capability, while the runner would fail at runtime.

## Target Model

Each agent node should always run through an agent engine boundary. OpenCode
remains the default and most complete engine, but the runner should also have a
minimal generic process adapter so operators can plug in custom engines without
changing Entangle's graph, identity, policy, relay, artifact, or User Node
surfaces.

The external process protocol is intentionally narrow:

- runner starts the configured executable;
- runner sends one JSON payload on stdin with `schemaVersion`, the
  `AgentEngineTurnRequest`, and bounded runtime metadata;
- the external executable writes one `AgentEngineTurnResult` JSON object to
  stdout;
- logs belong on stderr;
- Entangle validates the returned result with the shared schema before
  applying turn side effects.

## Impacted Modules/Files

- `services/runner/src/external-process-engine.ts`
- `services/runner/src/external-process-engine.test.ts`
- `services/runner/src/index.ts`
- `packages/types/src/resources/catalog.ts`
- `packages/types/src/index.test.ts`
- `apps/cli/src/catalog-agent-engine-command.test.ts`
- `apps/studio/src/agent-engine-profile-editor.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a runner-owned `external_process` adapter.
- Tighten the shared agent-engine profile schema so `external_process`
  profiles must declare an executable; `opencode_server` remains the profile
  kind that may be attached by base URL.
- Wire `createConfiguredRunnerService`/runtime startup to construct that
  adapter for `agentRuntimeContext.engineProfile.kind === "external_process"`.
- Keep unsupported engine kinds explicit instead of silently falling back to a
  model endpoint or stub.
- Add runner tests for successful JSON stdin/stdout execution, non-zero process
  exit classification, and invalid stdout classification.

## Tests Required

- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/cli test -- src/catalog-agent-engine-command.test.ts`
- `pnpm --filter @entangle/studio test -- src/agent-engine-profile-editor.test.ts`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

No existing OpenCode behavior changes. `external_process` profiles now become
real executable profiles and are rejected by shared catalog validation unless
they declare `executable`. Native Claude agent integration should be added
only when a runner adapter exists; until then Claude-based tools can be wrapped
through `external_process` or `external_http`. `external_http` is handled by
the separate HTTP adapter slice.

## Risks And Mitigations

- Risk: an external process emits arbitrary logs on stdout.
  Mitigation: stdout must be a single JSON result; logs should use stderr.
- Risk: a custom engine hangs.
  Mitigation: the adapter applies a bounded timeout, configurable through
  `ENTANGLE_EXTERNAL_PROCESS_ENGINE_TIMEOUT_MS`.
- Risk: result schema drift.
  Mitigation: returned JSON is parsed through `agentEngineTurnResultSchema`
  before the runner records turn effects.

## Open Questions

- Should a future version support a long-running external-process protocol with
  streaming events and permission callbacks? The first adapter is one process
  per turn to keep the contract inspectable.
