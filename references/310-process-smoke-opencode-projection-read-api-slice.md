# Process Smoke OpenCode Projection Read API Slice

## Current Repo Truth

The process-runner smoke proved joined agent and User Node runners, Human
Interface Runtime startup, User Client JSON publishing, signed User Node
messages, and Host projection of User Node conversations. Projection-backed
session, approval, and turn read APIs were covered by unit/integration tests,
but the process smoke did not exercise an agent-engine turn because it avoided
requiring live model-provider credentials.

Runner service also wrote a `waiting_approval` session and
`awaiting_approval` conversation when an engine returned approval directives,
but did not publish those final session/conversation observations before
returning from the blocked turn.

## Target Model

The federated process smoke should prove the read path that matters for remote
agent nodes:

- a joined runner executes an OpenCode-adapter turn without Host filesystem
  access;
- the runner publishes signed turn, approval, session, and conversation
  observations;
- Host runtime/session read APIs can inspect those projected records;
- no live LLM API is required for automated CI-style smoke coverage.

Live provider-backed OpenCode testing remains a manual or environment-specific
verification layer.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `services/runner/src/service.ts`
- `services/runner/src/service.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/228-distributed-state-projection-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a temporary fake `opencode` executable to the process smoke runner PATH.
- Publish a signed User Node `task.request` so the assigned agent runner
  executes the OpenCode adapter path.
- Make the fake OpenCode process return deterministic JSON events with bounded
  tool evidence and an `entangle-actions` approval request directive.
- Assert Host runtime turn list/detail APIs can read the projected blocked turn.
- Assert Host runtime approval list/detail APIs can read the projected pending
  approval.
- Assert Host session list/detail APIs can read the projected
  `waiting_approval` session.
- Publish runner session and conversation observations after an engine approval
  directive blocks a turn.

## Tests Required

- Runner typecheck.
- Host typecheck.
- Runner service tests for blocked-turn observation emission.
- Host and runner lint.
- Federated process-runner smoke.

## Migration/Compatibility Notes

The smoke-only `opencode` executable is created under the temporary smoke
directory and is injected only into the spawned agent runner process PATH. It
does not change the production OpenCode adapter or runtime catalog defaults.

Existing live provider-backed testing still uses the real OpenCode binary and
real model credentials when configured by the operator.

## Risks And Mitigations

- Risk: a fake OpenCode executable can overstate live provider coverage.
  Mitigation: the smoke labels this as deterministic adapter/projection
  coverage; live API-backed OpenCode testing remains explicitly separate.
- Risk: extra observations could duplicate records.
  Mitigation: Host projection reducers already key activity by graph, node,
  session/conversation/approval/turn id, and local compatibility imports still
  prefer local files where present.

## Open Questions

- Should the future distributed smoke include an optional `--real-opencode`
  mode that requires a configured OpenCode server and model credentials?
