# External HTTP Agent Engine Adapter Slice

## Current Repo Truth

Entangle contracts, CLI, Studio, and distributed proof tooling already accepted
`external_http` agent engine profiles with a `baseUrl`, but joined agent
runners did not construct an HTTP adapter. A graph could therefore bind a node
to an advertised custom HTTP engine profile and still fail at runtime with an
unsupported engine-kind error.

## Target Model

Every configured agent node should execute through a real agent-engine boundary.
OpenCode remains the default engine, `external_process` covers local executable
engines, and `external_http` covers remote or sidecar engines that implement
Entangle's shared turn contract over HTTP.

The first HTTP protocol is intentionally minimal:

- `baseUrl` is the POST endpoint for one turn;
- the request body contains `schemaVersion`, `AgentEngineTurnRequest`, and
  bounded runtime metadata;
- the response body must be one `AgentEngineTurnResult` JSON object;
- Entangle validates the response schema before recording turn side effects.

The adapter does not introduce a second orchestrator. The custom HTTP engine
only handles the node's coding turn. Entangle still owns graph identity,
policy, signed communication, runner lifecycle, projection, artifacts, and
User Node surfaces.

## Impacted Modules/Files

- `services/runner/src/external-http-engine.ts`
- `services/runner/src/external-http-engine.test.ts`
- `services/runner/src/index.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a runner-owned `external_http` adapter.
- Wire runtime startup to construct that adapter when
  `agentRuntimeContext.engineProfile.kind === "external_http"`.
- Preserve explicit unsupported-engine errors for kinds not wired into the
  runner build.
- Add runner tests for successful HTTP turn execution, normal startup
  selection, non-OK HTTP classification, and invalid response bodies.

## Tests Required

- `pnpm --filter @entangle/runner lint`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/runner test`
- `pnpm ops:check-product-naming`
- `git diff --check`

## Migration/Compatibility Notes

Existing OpenCode and `external_process` behavior is unchanged. Existing
`external_http` profiles with a valid `baseUrl` now become executable by joined
agent runners instead of configuration-only records.

## Risks And Mitigations

- Risk: operators expect `baseUrl` to be a service root rather than a turn
  endpoint.
  Mitigation: document that v1 posts directly to `baseUrl`.
- Risk: custom HTTP engines return provider-native shapes.
  Mitigation: the adapter validates the shared `AgentEngineTurnResult` schema
  and rejects mismatches as protocol errors.
- Risk: HTTP authentication is under-specified.
  Mitigation: this slice does not invent secret semantics; profile-scoped HTTP
  auth should be added through explicit catalog contracts later.

## Open Questions

- Should a future authenticated HTTP profile use Entangle-managed secret
  bindings, signed HTTP requests, or both?
