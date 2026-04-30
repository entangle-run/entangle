# OpenCode Permission Bridge Slice

## Current repo truth

The OpenCode source in the local reference corpus shows that `opencode run`
subscribes to OpenCode events and replies to `permission.asked` itself. That
means Entangle cannot implement a real approval bridge by wrapping the
one-shot CLI command: the CLI will auto-reject unless
`--dangerously-skip-permissions` is passed.

OpenCode's attached server exposes the required lower-level surface:

- `GET /event` streams `permission.asked`, `message.part.updated`,
  `session.error`, and `session.status` events;
- `POST /permission/:requestID/reply` accepts `{ "reply": "once" | "reject" }`;
- `POST /session` creates a session with permission rules;
- `POST /session/:sessionID/prompt_async` starts a prompt without blocking the
  caller.

Entangle already has signed User Node approval responses and runner-local
approval records, but the agent-engine contract previously had no live callback
for an engine permission request during a turn.

## Target Model

For attached OpenCode server profiles, `permissionMode: "entangle_approval"`
means:

1. the runner uses OpenCode HTTP/SSE APIs instead of `opencode run`;
2. OpenCode `permission.asked` becomes an Entangle approval request;
3. the runner publishes a signed `approval.request` to the requesting User Node;
4. the User Node replies with the existing signed `approval.response` path;
5. the runner replies to OpenCode with `once` or `reject`;
6. the turn outcome preserves bounded pending/allowed/rejected permission
   observations.

The CLI-only OpenCode fallback remains conservative and auto-rejects unless an
operator explicitly configures `auto_approve`.

## Impacted Modules And Files

- `packages/types/src/resources/catalog.ts`
- `packages/agent-engine/src/index.ts`
- `services/host/src/state.ts`
- `services/runner/src/opencode-engine.ts`
- `services/runner/src/service.ts`
- `services/runner/src/opencode-engine.test.ts`
- `services/runner/src/service.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/459-opencode-permission-mode-slice.md`
- `references/460-agent-runtime-permission-mode-visibility-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `entangle_approval` to the engine permission-mode contract.
- Add an optional `requestPermission` callback to `AgentEngineTurnOptions`.
- Add an attached-server OpenCode execution path that creates or resumes an
  OpenCode session, consumes `/event`, handles permission requests, starts
  prompts through `prompt_async`, and maps OpenCode events to Entangle engine
  turn outcomes.
- Have the runner callback materialize approval records, publish signed
  `approval.request` messages to the requester, wait for signed responses, and
  return the decision to the engine adapter.
- Preserve the existing CLI fallback and `auto_approve` flag behavior for
  non-attached profiles.

## Tests Required

- Contract test accepting `entangle_approval`.
- OpenCode adapter HTTP/SSE fixture proving permission request, callback,
  permission reply, allowed observation, and completed turn.
- Runner service test proving a live engine permission callback creates a
  signed approval request and resumes after a signed approval response.
- Runner typecheck.

## Migration And Compatibility

Existing profiles remain valid. `auto_reject` remains the generated OpenCode
default. Operators can opt into `entangle_approval` through catalog config or
`ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE=entangle_approval`, but the
bridge only applies when the OpenCode profile has `baseUrl`.

## Risks And Mitigations

- Risk: live OpenCode behavior differs from the deterministic fixture.
  Mitigation: the implementation is derived from the audited OpenCode server
  routes and keeps live-provider validation as a manual acceptance item.
- Risk: a permission request waits while the same runner must process an
  approval response.
  Mitigation: the Nostr transport invokes inbound handlers asynchronously, and
  the runner approval wait polls durable runner-local approval state.
- Risk: CLI-only OpenCode cannot be bridged.
  Mitigation: the code keeps CLI-only behavior conservative and documents that
  real approval bridging requires an attached server.

## Open Questions

- The next hardening step is a live OpenCode server smoke with a real or
  operator-provided model provider.
- The bridge currently replies with one-shot approvals. Persistent OpenCode
  `always` approvals should remain disabled until Entangle has a first-class
  policy UI for durable engine permission grants.
