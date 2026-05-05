# Fake External HTTP Agent Engine Harness Slice

## Current Repo Truth

Joined agent runners can execute `external_http` profiles by POSTing the
shared agent-engine turn payload to a configured endpoint. The adapter has
runner unit coverage, and the distributed proof kit can generate Host setup
commands for external HTTP engines, but operators did not yet have a
deterministic no-credential HTTP engine process that implements the same turn
contract.

## Target Model

Operators should be able to validate custom HTTP engine plumbing without live
model credentials or a real third-party service. The fixture should run as a
normal process, expose a health route, accept the shared turn request on
`/turn`, optionally mutate the runner-provided source workspace, and return a
valid `AgentEngineTurnResult` JSON object with schema-valid tool evidence,
optional engine session id, and optional approval directives.

This harness is not a second runtime engine inside Entangle. It is a
deterministic endpoint for testing the existing `external_http` boundary while
Entangle still owns graph identity, runner assignment, policy, signed messages,
projection, artifacts, and User Node surfaces.

## Impacted Modules/Files

- `package.json`
- `scripts/fake-agent-engine-http.mjs`
- `scripts/smoke-fake-agent-engine-http.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:fake-agent-engine-http` as an operator-started deterministic
  HTTP agent-engine fixture.
- Add `pnpm ops:smoke-fake-agent-engine-http` to start that fixture on an
  ephemeral port, check `/health`, POST a turn to `/turn`, verify the shared
  turn result shape, verify optional workspace mutation, and inspect
  `/debug/state`.
- Return runner-valid `toolExecutions` fields and optional
  `approvalRequestDirectives` so the fixture can be used by the real
  `external_http` runner adapter.
- Document how to bind the fake endpoint to an `external_http` engine profile
  and how to use it with the distributed proof kit.

## Tests Required

- `node --check scripts/fake-agent-engine-http.mjs`
- `node --check scripts/smoke-fake-agent-engine-http.mjs`
- `pnpm ops:smoke-fake-agent-engine-http`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- search for old local product identity markers across the repository
- `git diff --check`

## Migration/Compatibility Notes

The harness is additive. It does not change OpenCode defaults, external
process behavior, or the `external_http` adapter protocol. Existing custom HTTP
engine profiles continue to use their configured endpoints.

## Risks And Mitigations

- Risk: operators may treat the fake engine as evidence of real model quality.
  Mitigation: README states that the harness validates protocol plumbing and
  workspace mutation only, not live model behavior.
- Risk: a test write escapes the intended source workspace.
  Mitigation: the fixture resolves and validates `--write-file` against
  `runtime.workspace.sourceWorkspaceRoot` before writing.
- Risk: future authenticated HTTP profiles need stronger semantics.
  Mitigation: this fixture intentionally leaves auth out of scope and continues
  to rely on the documented future contract work for profile-scoped HTTP auth.

## Open Questions

None for this slice.
