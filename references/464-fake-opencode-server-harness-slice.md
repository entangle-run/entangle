# Fake OpenCode Server Harness Slice

## Current Repo Truth

Entangle now has a real attached OpenCode permission bridge in the runner
adapter: attached `opencode_server` profiles use OpenCode HTTP/SSE routes,
translate `permission.asked` events into Entangle approval requests, and reply
to OpenCode through `/permission/:requestID/reply`.

The existing runner tests cover that behavior with mocked `fetch` responses,
and the federated process smoke covers CLI-style fake `opencode` execution.
There was not yet an operator-startable OpenCode server fixture that exposes
the same attached-server routes over a real HTTP process without requiring live
model credentials.

## Target Model

The no-credential harness should let an operator test the attached-server
boundary with deterministic HTTP/SSE behavior:

- `GET /global/health` reports a healthy OpenCode-like server;
- `GET /event` streams OpenCode-shaped SSE events;
- `POST /session` creates a deterministic session;
- `POST /session/:sessionID/prompt_async` starts a deterministic turn and emits
  a `permission.asked` event;
- `POST /permission/:requestID/reply` records the Entangle/OpenCode decision
  and emits either a completion text event or a session error followed by idle;
- optional Basic auth mirrors the adapter's OpenCode server auth path.

This fixture does not replace real OpenCode/provider validation. It narrows
the gap between mocked adapter tests and live API-backed manual validation.

## Impacted Modules And Files

- `scripts/fake-opencode-server.mjs`
- `scripts/smoke-fake-opencode-server.mjs`
- `package.json`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/463-opencode-permission-bridge-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a deterministic fake OpenCode server script with the attached-server
  routes Entangle consumes.
- Add a smoke script that starts the fake server on an ephemeral port, verifies
  Basic-authenticated health, creates a session, opens the SSE stream, starts a
  prompt, answers the deterministic permission request, and verifies completion
  plus recorded debug state.
- Add root package scripts for manual server start and CI/operator smoke.
- Document that this proves attached-server plumbing without live model
  credentials, while real OpenCode and real provider behavior remain manual
  acceptance work.

## Tests Required

- `pnpm ops:smoke-fake-opencode-server`
- Runner OpenCode adapter tests remain the direct Entangle adapter gate.
- Product naming guard remains required because the added scripts and docs are
  active public surfaces.

## Migration And Compatibility

No persisted runtime state changes. The harness is additive and is not part of
normal runtime execution unless an operator intentionally points an
`opencode_server` engine profile at it.

## Risks And Mitigations

- Risk: the fixture diverges from upstream OpenCode.
  Mitigation: route names and event shapes are derived from the audited
  OpenCode server routes, and the fixture is explicitly documented as a
  deterministic harness, not as a replacement for live validation.
- Risk: operators mistake deterministic permission approval for full policy
  coverage.
  Mitigation: the docs state that durable/persistent OpenCode approvals still
  require a first-class Entangle policy model and that the current bridge uses
  one-shot permission replies.

## Open Questions

- Live OpenCode server validation with real model credentials remains a manual
  project acceptance step.
- A future process smoke may run a real OpenCode server plus this same
  Entangle permission path when credentials and provider configuration are
  available.
