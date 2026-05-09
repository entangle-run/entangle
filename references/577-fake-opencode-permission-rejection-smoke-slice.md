# Fake OpenCode Permission Rejection Smoke Slice

## Current Repo Truth

The deterministic fake OpenCode server already supports permission approval
and rejection. The smoke verified Basic-authenticated health, session creation,
permission approval, deterministic assistant output, idle status, workspace
mutation, and debug-state plumbing.

Before this slice, the smoke did not exercise the rejection branch. That left
the no-credential attached-server harness weaker than the runner adapter tests
for policy-denied permission behavior.

## Target Model

The local fake OpenCode harness should prove both sides of the permission
bridge without live provider credentials: approved permissions can complete and
write the workspace, while rejected permissions produce a session error, idle
status, and no assistant completion event.

## Impacted Modules And Files

- `scripts/smoke-fake-opencode-server.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend the fake OpenCode server smoke with a second deterministic session.
- Reply to the permission request with `reject`.
- Verify `session.error`, `session.status idle`, absence of
  `message.part.updated`, and debug-state persistence of the rejection reply.

## Tests Required

- Red smoke run showing the missing rejection helper.
- Green `node scripts/smoke-fake-opencode-server.mjs`.
- `node --check` for the changed smoke script.
- Focused ESLint for the changed smoke script.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No product data or protocol migration is required. This strengthens local
no-credential test coverage only.

## Risks And Mitigations

- Risk: the smoke becomes slower. Mitigation: the second session reuses the
  same fake server process and remains bounded by the existing event-stream
  closure behavior.
- Risk: the rejection path is mistaken for live OpenCode behavior coverage.
  Mitigation: docs keep real attached OpenCode/provider validation as manual
  operator validation.

## Open Questions

Future smokes can propagate this rejection path through the full joined-runner
process proof when a deterministic policy-denied scenario is needed end to end.

## Verification

Completed in this slice:

- Red `node scripts/smoke-fake-opencode-server.mjs` failed because
  `verifyPermissionRejection` did not exist.
- Green `node scripts/smoke-fake-opencode-server.mjs` passed after adding the
  rejection session.

The final slice audit also runs syntax check, focused ESLint, product naming,
whitespace, changed-diff marker checks, and `git diff` review before commit.
