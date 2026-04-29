# OpenAI-Compatible Fake Provider Fixture Slice

## Current Repo Truth

`@entangle/agent-engine` already has a real OpenAI-compatible chat-completions
adapter behind the internal model boundary. Existing tests covered request
assembly, bearer-token auth, usage/stop metadata, tool loops, and error
classification through injected client factories, while Docker runtime smokes
use a separate credential-checking model stub.

That left a useful gap: the package did not exercise the actual `fetch` path
against an HTTP OpenAI-compatible API without live model credentials.

## Target Model

Entangle should keep live model-provider credentials out of routine automated
tests, but the agent-engine package should still prove that an OpenAI-compatible
HTTP provider boundary works end to end. The fixture is a deterministic local
API used only for tests; real OpenCode and real provider credentials remain
manual/operator-supplied validation.

## Impacted Modules/Files

- `packages/agent-engine/src/test-fixtures.ts`
- `packages/agent-engine/src/index.test.ts`
- `README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a deterministic local HTTP server that exposes:
  - `GET /v1/models`;
  - `POST /v1/chat/completions`;
  - bearer-token validation when configured;
  - captured request records for assertions;
  - handler-based deterministic success, tool-call, and error responses.
- Add package tests that use the real OpenAI-compatible client path instead of
  an injected client factory.
- Cover plain chat completion, tool-loop continuation, and HTTP 429
  classification.
- Update docs so the remaining gap is clearly real-provider/manual validation,
  not absence of API-backed provider-boundary coverage.

## Tests Required

- `pnpm --filter @entangle/agent-engine test`
- `pnpm --filter @entangle/agent-engine typecheck`
- `pnpm --filter @entangle/agent-engine lint`
- broader lint/typecheck when the slice is committed into the full worktree

## Migration/Compatibility Notes

No runtime contract changed. The fixture is package-local test support and does
not alter public engine exports, Host/runner APIs, resource schemas, or
deployment topology.

## Risks And Mitigations

- Risk: the fake API drifts from provider behavior.
  Mitigation: keep it intentionally narrow and OpenAI-compatible at the HTTP
  shape currently consumed by Entangle: auth header, chat-completions request,
  tool-call continuation, usage metadata, and non-2xx error mapping.
- Risk: tests imply real provider compatibility is fully proven.
  Mitigation: docs state that live API-backed testing with real provider keys
  remains manual/operator validation.

## Open Questions

- Should a later smoke start the same fixture as a standalone process and drive
  a full runner turn through the real model endpoint catalog, instead of only
  testing the package-level agent-engine boundary?
