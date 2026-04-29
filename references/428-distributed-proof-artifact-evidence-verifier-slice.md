# Distributed Proof Artifact Evidence Verifier Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` verifies Host Authority, runner registry,
trust/liveness, assignments, runtime projections, User Client URLs, optional
User Client health, optional conversation projection, and optional proof
profile manifests. Follow-up
`429-distributed-proof-relay-health-verifier-slice.md` adds optional relay
WebSocket reachability checks.

Before this slice, it did not have an operator-facing check for projected work
evidence after an agent produced artifact/source/wiki refs. That meant the
distributed proof could validate topology and conversation flow without also
checking that Host projection had received runner-signed artifact evidence.

## Target Model

The verifier should keep topology checks fast by default, because the generated
operator script sends a task and verifies the topology immediately. Operators
should also be able to rerun the same verifier after the agent works and
require projected artifact/source/wiki evidence from the agent node without
reading Host or runner files.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/408-distributed-proof-verifier-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/427-distributed-proof-profile-manifest-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--require-artifact-evidence` to the distributed proof verifier.
- The verifier now counts projected `artifactRefs`, `sourceChangeRefs`,
  `sourceHistoryRefs`, and `wikiRefs` for the expected agent node.
- The check passes when at least one projected evidence record exists for the
  agent node.
- Proof profiles can set `"requireArtifactEvidence": true`.
- The verifier self-test fixture now includes projected artifact/source/wiki
  evidence by default.
- Added `--self-test-without-artifact-evidence` for the negative self-test
  fixture.
- The distributed proof tool smoke now proves both the passing artifact
  evidence path and the missing-evidence failure path.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

The new evidence requirement is opt-in. Existing generated operator commands
still perform the topology and conversation proof immediately after task
publication. Operators can rerun the verifier with `--require-artifact-evidence`
after the agent has produced projected work evidence.

## Risks And Mitigations

- Risk: operators enable the evidence requirement too early and see a false
  failure while the agent is still working.
  Mitigation: the flag is explicit and documented as a post-work verification
  step.
- Risk: the check becomes too broad by accepting any work evidence type.
  Mitigation: this slice intentionally checks the first distributed proof
  threshold: at least one runner-signed projected work ref from the agent node.
  More specific source-history/wiki requirements can be added later.

## Open Questions

- Should later verifier modes require specific evidence classes, such as a
  source-history publication, a wiki publication, or a completed command
  receipt tied to a particular artifact id?
