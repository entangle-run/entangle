# Distributed Proof Runtime State Verifier Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` already checked Host Authority state,
runner registry trust/liveness, assignments, projection records, User Client
URLs, optional User Client health, and optional User Node conversation evidence
through Host/User Client HTTP surfaces only.

Before this slice, runtime projection checks only required a matching
projection record. A distributed proof could therefore pass with assigned
runtimes that had reported a non-running state.

## Target Model

The distributed proof verifier must treat a runtime as proven only when Host
projection contains the expected runtime record and its latest observed state is
`running`.

An operator can still pass `--allow-non-running-runtimes` for diagnostics, but
that is an explicit relaxation rather than the default acceptance criterion.

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

- Added `--allow-non-running-runtimes` to the verifier.
- Added a separate `runtime <nodeId> running` check for each expected runtime
  projection.
- Added `--self-test-runtime-state <state>` so the embedded verifier fixture can
  deterministically simulate stopped/non-running runtime observations.
- Made self-test verification evaluate the embedded fixture once instead of
  polling until timeout; self-test snapshots are immutable, so negative fixture
  checks should fail immediately.
- Extended the distributed proof tool smoke to require verifier failure for a
  stopped runtime by default.
- Extended the same smoke to prove the diagnostic override accepts the stopped
  self-test fixture when explicitly requested.

## Tests Required

Implemented for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:distributed-proof-verify --self-test --json --require-conversation --check-user-client-health`
- `node scripts/federated-distributed-proof-verify.mjs --self-test --json --self-test-runtime-state stopped` must fail with `ok: false`.
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

This is an intentional verifier behavior tightening. Existing running
distributed proofs continue to pass. Proofs that only reached assignment or
projection creation without a `running` runtime observation now fail until the
runtime actually starts, or until an operator opts into
`--allow-non-running-runtimes` for diagnostic inspection.

No Host, runner, CLI, Studio, User Client, or protocol contract changed.

## Risks And Mitigations

- Risk: an operator uses the verifier while runtimes are still starting and sees
  failure.
  Mitigation: the verifier already polls until timeout; operators can increase
  `--timeout-ms`.
- Risk: diagnostic workflows need to inspect partially converged topologies.
  Mitigation: `--allow-non-running-runtimes` keeps that path explicit.
- Risk: the smoke only covers embedded verifier fixtures.
  Mitigation: the real distributed proof still remains the acceptance path for
  separate-machine execution; this slice prevents the local tooling from
  accepting a known false-positive condition.

## Open Questions

- Future infrastructure-backed proof execution should include at least one
  negative runtime-state test against a real Host projection, not only the
  embedded verifier fixture.
