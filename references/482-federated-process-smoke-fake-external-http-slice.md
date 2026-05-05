# Federated Process Smoke Fake External HTTP Slice

## Current Repo Truth

The runner can execute `external_http` engine profiles, and the deterministic
fake external HTTP engine can validate the shared turn contract without live
model credentials. Before this slice, that fake endpoint had only standalone
smoke coverage and distributed proof-kit setup support; the fastest full
federated process smoke still exercised OpenCode paths only.

## Target Model

The no-credential verification matrix should prove that a graph node can run
through the generic `external_http` engine boundary inside the same federated
Host/runner/User Node path used by OpenCode:

- Host starts with an `external_http` default agent-engine profile;
- the agent runner advertises `external_http` capability;
- the fake HTTP engine receives real runner turn payloads;
- the fake engine writes a source file in the runner-owned workspace;
- the fake engine returns schema-valid tool evidence, an engine session id,
  and a source-application approval directive;
- the existing User Node review, approval, source-history, artifact, wiki, and
  multi-user smoke assertions still pass through signed messages and Host
  projection.

## Impacted Modules/Files

- `package.json`
- `scripts/fake-agent-engine-http.mjs`
- `scripts/smoke-fake-agent-engine-http.mjs`
- `scripts/federated-user-node-runtime-demo.mjs`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Make the fake external HTTP fixture return schema-valid
  `toolExecutions`, optional `approvalRequestDirectives`, and optional
  `engineSessionId`.
- Add `--use-fake-external-http-engine` to the process-runner federated smoke.
- Add root smoke and demo shortcuts for the fake external HTTP profile path.
- Teach the User Node runtime demo wrapper to pass the new fake external HTTP
  mode through to the process smoke.
- Document the new full-federated custom-engine verification path.

## Tests Required

- `node --check scripts/fake-agent-engine-http.mjs`
- `node --check scripts/smoke-fake-agent-engine-http.mjs`
- `node --check scripts/federated-user-node-runtime-demo.mjs`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host typecheck`
- `pnpm ops:smoke-fake-agent-engine-http`
- `pnpm ops:smoke-federated-process-runner:fake-external-http`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

The default process smoke and fake OpenCode smoke are unchanged. The new fake
external HTTP mode is opt-in through explicit flags or root script shortcuts.
OpenCode remains the default engine profile.

## Risks And Mitigations

- Risk: the fake HTTP endpoint drifts from the runner-validated turn schema.
  Mitigation: its smoke now verifies the fields the runner schema requires, and
  the federated process smoke validates the endpoint through the real runner
  `external_http` adapter.
- Risk: full smoke coverage hides real provider problems.
  Mitigation: docs keep the distinction clear: this proves Entangle protocol,
  runner, workspace, and projection behavior, while live model/provider quality
  remains manual validation.
- Risk: custom engine proof diverges from the User Node path.
  Mitigation: the new smoke reuses the existing User Client and signed User
  Node review/approval paths instead of adding a custom testing shortcut.

## Open Questions

None for this slice.
