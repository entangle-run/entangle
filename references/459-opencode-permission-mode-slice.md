# OpenCode Permission Mode Slice

## Current repo truth

Entangle uses OpenCode as the default coding-agent engine profile. The
OpenCode CLI `run` command auto-rejects permission prompts unless
`--dangerously-skip-permissions` is passed. Before this slice, Entangle had no
explicit engine-profile field for that behavior, so operators could not declare
whether an OpenCode-backed node should auto-reject tool permissions or allow
OpenCode to proceed inside the runner sandbox.

The local OpenCode source under
`/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`
confirms that `packages/opencode/src/cli/cmd/run.ts` exposes
`--dangerously-skip-permissions` and otherwise replies `reject` to
`permission.asked` events.

## Target model

Every coding node should have an explicit engine permission stance. In this
intermediate CLI-adapter phase:

- `auto_reject` keeps current conservative OpenCode CLI behavior;
- `auto_approve` passes `--dangerously-skip-permissions` to OpenCode so the
  engine can perform tool calls in the runner sandbox;
- Entangle still owns graph policy, runner isolation, source-change review,
  artifact handoff, wiki state, and User Node approvals.

This does not replace the later attached-server permission bridge. It gives
operators a clear, typed control while the deeper bridge is still open.

## Impacted modules and files

- `packages/types/src/resources/catalog.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/opencode-engine.ts`
- `services/runner/src/opencode-engine.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes required

- Add `permissionMode` to `AgentEngineProfile` with `auto_reject` and
  `auto_approve` values.
- Keep the default OpenCode profile conservative with `auto_reject`.
- Allow `ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE` to set the default
  catalog profile permission mode.
- Pass `--dangerously-skip-permissions` only when the resolved profile is
  configured with `permissionMode: "auto_approve"`.
- Add schema and runner adapter coverage.

## Tests required

- Agent engine profile schema tests for explicit permission mode.
- OpenCode adapter test proving `auto_approve` adds
  `--dangerously-skip-permissions`.
- Typecheck and lint for `packages/types`, `services/host`, and
  `services/runner`.

## Migration and compatibility

Existing catalog profiles remain valid because `permissionMode` is optional.
Default generated OpenCode profiles include `auto_reject`, preserving current
behavior unless an operator opts into `auto_approve` through catalog config or
`ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE=auto_approve`.

## Risks and mitigations

- Risk: `auto_approve` grants OpenCode broad tool execution inside the runner.
  Mitigation: the mode is explicit and opt-in; Entangle still runs the engine
  inside the assigned runner workspace and keeps source publication/review
  policy outside OpenCode.
- Risk: users mistake this for the final policy bridge.
  Mitigation: docs state that the attached-server permission bridge remains a
  later slice.
- Risk: custom non-OpenCode adapters interpret `permissionMode` differently.
  Mitigation: current runtime behavior only maps the field inside the OpenCode
  adapter.

## Open questions

- The target permission bridge should subscribe to OpenCode permission events,
  publish Entangle approval requests, and reply through OpenCode server routes
  after signed User Node or operator decisions.
