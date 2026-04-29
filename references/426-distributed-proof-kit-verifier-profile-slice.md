# Distributed Proof Kit Verifier Profile Slice

## Current Repo Truth

`pnpm ops:distributed-proof-kit` can generate custom runner ids, graph node ids,
and agent engine kinds for the three-runner distributed proof profile.

Before this slice, the generated `operator/commands.sh` verifier command only
passed the selected agent engine kind. If an operator used custom runner or
node ids, the trust and assignment commands used the custom profile, but the
verifier command fell back to default runner and node ids.

## Target Model

The proof kit must be self-consistent. Any runner id, graph node id, or agent
engine kind selected while generating the kit must be carried into the
generated verifier command. Dry-run output should expose that command so CI can
verify profile propagation without starting a live Host.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/407-distributed-proof-kit-slice.md`
- `references/411-distributed-proof-tool-ci-smoke-slice.md`
- `references/425-distributed-proof-kit-agent-engine-selection-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added a shared proof-kit verifier command builder.
- Generated `operator/commands.sh` now passes:
  - `--agent-runner`;
  - `--user-runner`;
  - `--reviewer-user-runner`;
  - `--agent-node`;
  - `--user-node`;
  - `--reviewer-user-node`;
  - `--agent-engine-kind`.
- Proof-kit dry-run output now prints the exact verifier command that would be
  written into the operator script.
- Extended `pnpm ops:smoke-distributed-proof-tools` with a custom-profile
  proof-kit dry-run that verifies runner id, node id, and engine propagation.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Default proof-kit output is unchanged for operators who do not customize runner
or node ids. Custom proof profiles are now safer because the generated operator
script validates the same profile it trusts and assigns.

## Risks And Mitigations

- Risk: dry-run output is mistaken for an executed proof.
  Mitigation: dry-run lines remain explicitly prefixed and still state that
  files would be written rather than executed.
- Risk: future verifier flags drift from kit flags.
  Mitigation: the verifier command is centralized in one proof-kit helper and
  smoke-tested with a custom profile.

## Open Questions

- Should a later proof kit emit a machine-readable proof profile manifest that
  both operator scripts and `pnpm ops:distributed-proof-verify` can consume?
