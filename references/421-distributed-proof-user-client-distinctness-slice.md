# Distributed Proof User Client Distinctness Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` expects one agent runner plus two Human
Interface Runtime runners. It already verifies that each projected Human
Interface Runtime exposes a User Client URL, and the proof tool smoke already
checks positive and negative runtime-state fixtures.

Before this slice, the verifier did not fail when multiple projected User Nodes
reported the same User Client URL. That could hide a bad multi-user deployment
where two human graph participants were assigned but only one reachable client
surface was actually exposed.

## Target Model

The distributed proof should demonstrate that multiple User Nodes are
independently reachable. The verifier must therefore reject duplicate User
Client URLs across expected Human Interface Runtime projections.

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

- Added a `user client urls distinct` verifier check when the proof expects
  more than one Human Interface Runtime.
- Added `--self-test-shared-user-client-url` so the embedded verifier fixture
  can simulate a duplicated User Client endpoint.
- Extended `pnpm ops:smoke-distributed-proof-tools` to require that duplicated
  User Client URLs fail the verifier self-test.

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

This only tightens operator proof tooling. A valid distributed proof with
separate User Client endpoints continues to pass. A topology where two Human
Interface Runtime projections point at the same exact URL now fails until the
runtime placement or published URL is corrected.

## Risks And Mitigations

- Risk: an operator intentionally serves multiple User Nodes from the same
  origin.
  Mitigation: the verifier compares the full URL, so shared origin with
  distinct paths remains valid.
- Risk: the distinctness check passes when one User Client URL is missing.
  Mitigation: each missing URL is already checked per node and fails
  separately; the distinctness check is an additional multi-user invariant.

## Open Questions

- Future proof tooling could also require successful User Client health checks
  for all User Nodes by default once the proof kit always publishes externally
  reachable User Client URLs.
