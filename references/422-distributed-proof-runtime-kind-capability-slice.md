# Distributed Proof Runtime Kind Capability Slice

## Current Repo Truth

The distributed proof verifier checks expected runner registration, trust,
liveness, heartbeat assignment ids, assignment convergence, runtime projection
state, and multi-user User Client URL distinctness.

Host assignment offer logic already rejects assigning a graph node to a runner
that does not advertise the required `runtimeKind`. Before this slice, the
proof verifier did not independently check that the runner registry still
projects the expected runtime-kind capability for each expected assignment.

## Target Model

The proof verifier should fail if the topology converges with a runner that no
longer advertises the runtime kind required by its assigned node. This keeps the
operator proof aligned with the assignment authority model:

- coding-agent nodes require an `agent_runner` capability;
- User Nodes require a `human_interface` capability.

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

- Added a per-runner verifier check requiring advertised
  `registration.capabilities.runtimeKinds` to include the expected assignment
  runtime kind.
- Added `--self-test-wrong-runtime-kind` so the embedded verifier fixture can
  simulate a runner with the wrong capability.
- Extended `pnpm ops:smoke-distributed-proof-tools` to require verifier failure
  for the wrong-runtime-kind self-test fixture.

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

This only tightens operator proof tooling. Valid Host-assigned topologies should
continue to pass because Host already enforces runner capability compatibility
at assignment-offer time. If a runner registration is stale, malformed, or
missing the expected runtime kind, the verifier now fails with an explicit
capability check.

## Risks And Mitigations

- Risk: a future runner supports aliases or a broader runtime-kind taxonomy.
  Mitigation: v1 assignment contracts use the canonical runtime-kind strings;
  verifier widening should happen only with a contract migration.
- Risk: the check duplicates Host offer validation.
  Mitigation: duplication is intentional for proof tooling because it verifies
  the observed registry projection, not just the historical assignment decision.

## Open Questions

- Should future distributed proof modes also verify engine-kind compatibility
  for agent runners once engine selection becomes part of assignment placement?
