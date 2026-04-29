# Deterministic OpenAI-Compatible Provider Dev Server Slice

## Current Repo Truth

`@entangle/agent-engine` already has a package-local fake OpenAI-compatible
provider fixture for automated tests. The process-runner smoke can exercise
the OpenCode adapter with a fake executable, and live provider credentials
remain manual operator validation.

Before this slice, the deterministic provider was not available as an
operator-started HTTP server for manual Entangle/OpenCode plumbing tests.

## Target Model

Entangle should have a no-credential provider harness that can be started by an
operator and addressed like any other OpenAI-compatible endpoint. The harness
must be explicitly non-production: it proves transport, auth, catalog,
adapter, and UI wiring, not model quality.

## Impacted Modules/Files

- `scripts/fake-openai-compatible-provider.mjs`
- `package.json`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a root `pnpm ops:fake-openai-provider` script.
- Serve deterministic `GET /v1/models`, `POST /v1/chat/completions`, and
  `POST /v1/responses` responses with bearer-token validation.
- Support OpenAI chat-completions streaming and Responses API streaming shapes
  so OpenCode/OpenAI-compatible clients can exercise streaming paths.
- Document manual usage next to the existing federated process-runner manual
  harness.

## Tests Required

- Start the server on an ephemeral port and verify `/health`, `/v1/models`,
  `/v1/chat/completions`, and streaming `/v1/responses`.
- `pnpm lint`
- `pnpm typecheck`

## Migration/Compatibility Notes

No runtime contract changes are required. Existing live-provider and fake
OpenCode executable tests remain unchanged. Operators can point a
`openai_compatible` model endpoint at `http://127.0.0.1:<port>/v1` when they
want deterministic local responses.

## Risks And Mitigations

- Risk: the fake provider is mistaken for agent-quality validation.
  Mitigation: docs state that it validates integration plumbing only.
- Risk: clients require streaming responses.
  Mitigation: both chat-completions and Responses API streaming routes emit
  deterministic SSE frames.
- Risk: auth behavior differs from real providers.
  Mitigation: bearer-token validation is enabled by default, with an explicit
  `--allow-missing-auth` escape hatch for debugging.

## Open Questions

- Should a future smoke wire this provider into a full OpenCode run instead of
  the current fake OpenCode executable path?
