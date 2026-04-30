# OpenCode Session Continuity Process Smoke Slice

## Current repo truth

`references/456-opencode-session-continuity-slice.md` added adapter-local
mapping from Entangle session ids to OpenCode session ids and unit coverage for
passing `--session` on later turns. Before this slice, the federated
process-runner smoke executed one deterministic OpenCode-backed turn but did
not prove session continuity through the real Host, User Client, joined runner,
and signed message path.

## Target model

The no-credential process smoke should prove that a coding node can continue
the same underlying OpenCode session across multiple User Node task messages in
one Entangle session. The proof must stay observable through Host projection
instead of reading adapter-private state.

## Impacted modules and files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete changes

- Extended the deterministic fake `opencode` executable in the process smoke
  to detect `opencode run --session <id>`.
- The fake engine now emits `opencode-smoke-session` for the first turn and
  `<previous-session>-continued` only when it received `--session`.
- The smoke now approves the engine gate as the assigned User Node, submits a
  second `task.request` in the same Entangle session, and verifies through the
  Host runtime-turn projection that the second turn observed
  `opencode-smoke-session-continued`.

## Tests required

- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host lint`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777`
- `pnpm ops:check-product-naming`

## Migration and compatibility

This is a verification-only slice. Runtime contracts and public APIs do not
change. The fake OpenCode behavior remains scoped to the process smoke and does
not affect live OpenCode execution.

## Risks and mitigations

- Risk: the process smoke becomes too broad and slow.
  Mitigation: the continuation proof reuses the already-running Host, runners,
  User Client, relay, fake OpenCode binary, and graph.
- Risk: the proof accidentally depends on runner-private files.
  Mitigation: the assertion reads the projected runtime turn through Host API.
- Risk: the deterministic fake diverges from OpenCode CLI behavior.
  Mitigation: the fake models only the documented CLI contract already audited
  in the local OpenCode source: `run --session` and JSON `sessionID` output.

## Open questions

- Live-provider validation still belongs to manual/operator testing because it
  requires real model credentials and real OpenCode runtime behavior.
- A later attached-server adapter should add deeper permission/event/cancel
  coverage beyond CLI session continuation.
