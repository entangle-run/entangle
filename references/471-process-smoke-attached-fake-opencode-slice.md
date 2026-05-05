# Process Smoke Attached Fake OpenCode Slice

## Current Repo Truth

The federated process-runner smoke already proved the joined Host/runner/User
Node path with a temporary fake `opencode` executable. The deterministic fake
OpenCode attached server also existed and could exercise health, session,
permission, completion, and safe workspace-write behavior, but the main
federated smoke did not yet run the node with an actual `opencode_server`
profile.

## Target Model

The no-credential process smoke should be able to validate the attached
OpenCode server path end to end. In that mode the Host catalog should default
the builder node to an `opencode_server` profile, the runner should attach to a
fake OpenCode HTTP/SSE server, OpenCode permission requests should become
Entangle approvals, the assigned User Node should sign the approval response,
and the fake server should mutate the runner-owned source workspace before the
normal source-change/artifact flow continues.

## Impacted Modules/Files

- `services/host/scripts/federated-process-runner-smoke.ts`
- `scripts/fake-opencode-server.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--use-fake-opencode-server` to the federated process-runner smoke.
- Start `scripts/fake-opencode-server.mjs` on an ephemeral port in that mode.
- Configure Host's default agent engine profile from environment as an
  attached `opencode_server` profile with `permissionMode:
  "entangle_approval"`.
- Pass fake server Basic auth credentials to the joined agent runner.
- Wait for the real Host-projected OpenCode permission approval by
  `sourceMessageId`, session, requester, and permission reason rather than by
  predicting the runner-generated turn id.
- Approve first-turn and continuation OpenCode permissions through the running
  User Client JSON API, preserving User Node signing.
- Allow the fake OpenCode server to handle repeated prompts on the same session
  so attached-server session continuity can be tested.
- Keep the existing fake executable path as the default fastest smoke.

## Tests Required

- `node --check scripts/fake-opencode-server.mjs`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-fake-opencode-server`
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000 --use-fake-opencode-server`
- `pnpm ops:check-product-naming`

## Migration/Compatibility Notes

No production migration is required. The new process-smoke mode is opt-in and
does not change the default process-runner smoke path. The fake OpenCode
server's repeated-prompt behavior is compatible with the previous single-prompt
smoke and only makes the deterministic harness closer to real attached-server
session reuse.

## Risks And Mitigations

- Risk: the smoke couples itself to the runner's internal turn id format.
  Mitigation: it discovers pending OpenCode permission approvals through the
  Host approval projection using durable fields instead of constructing the
  approval id.
- Risk: the fake server path is mistaken for real provider validation.
  Mitigation: docs state that this is deterministic no-credential protocol and
  workspace coverage; live OpenCode/model testing remains manual/operator
  validation.
- Risk: the attached server keeps child processes alive after failures.
  Mitigation: the smoke owns the fake server child process and stops it in the
  same cleanup path as joined runners.

## Open Questions

Live OpenCode/provider behavior still needs operator validation with real model
credentials after the no-credential project path is stable.
