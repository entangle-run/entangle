# Distributed Proof Agent Engine Capability Slice

## Current Repo Truth

The distributed proof kit configures the expected coding-agent runner with
`agentEngineKinds: ["opencode_server"]`, matching Entangle's default agent
engine boundary. The verifier already checks runner registration, trust,
liveness, runtime-kind capability, assignment convergence, runtime state, and
multi-user User Client URL distinctness.

Before this slice, the verifier did not check that the expected agent runner
advertised the OpenCode server engine capability. A proof could therefore pass
with a runner that had the right `agent_runner` runtime kind but not the
engine-kind capability needed for the proof's coding-agent node.

## Target Model

The distributed proof should validate both placement layers for coding-agent
nodes:

- runtime kind: the runner can host an agent runtime;
- engine kind: the runner can execute the expected coding-agent engine.

For the current proof kit, the expected agent engine is `opencode_server`.
`424-distributed-proof-agent-engine-selection-slice.md` later made that
expected value configurable for custom proof profiles while keeping OpenCode as
the default.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added an expected `agentEngineKind` of `opencode_server` for the proof's
  agent runner profile.
- Added a verifier check requiring the agent runner registration to advertise
  that engine kind.
- Added `--self-test-wrong-agent-engine-kind` so the embedded verifier fixture
  can simulate a runner with the wrong agent engine capability.
- Extended `pnpm ops:smoke-distributed-proof-tools` to require verifier failure
  for the wrong-agent-engine-kind fixture.

## Tests Required

Implemented for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:distributed-proof-verify --self-test --json --require-conversation --check-user-client-health`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This only tightens operator proof tooling. Valid proof-kit-generated agent
runners already advertise `opencode_server`, so they continue to pass. Custom
agent-runner proof profiles must advertise the engine kind expected by the
proof's coding-agent node.

## Risks And Mitigations

- Risk: future proof kits may support non-OpenCode agent engines.
  Mitigation: the expected engine kind is now configurable in the verifier;
  the proof kit can be widened separately to generate matching custom profiles.
- Risk: runtime-kind checks alone were mistaken for engine compatibility.
  Mitigation: the verifier now reports separate runtime-kind and engine-kind
  checks.

## Open Questions

- Should the proof kit also expose `--agent-engine-kind` so generated join
  configs and verifier commands stay parameterized together?
