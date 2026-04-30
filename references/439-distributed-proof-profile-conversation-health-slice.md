# Distributed Proof Profile Conversation Health Slice

## Current Repo Truth

Generated distributed proof verifier scripts already invoke
`pnpm ops:distributed-proof-verify` with `--check-user-client-health` and
`--require-conversation`. The machine-readable `operator/proof-profile.json`
did not carry those two requirements, so using only `--profile` could verify a
weaker topology than the generated operator scripts.

## Target Model

The proof profile should be the complete default verification contract for the
generated distributed proof. Operator scripts may still pass explicit flags,
but a verifier invoked with only `--profile <file>` should know whether to
require:

- reachable projected User Client health endpoints;
- a projected primary User Node to agent conversation.

## Impacted Modules And Files

- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
- `scripts/distributed-proof-profile.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/427-distributed-proof-profile-manifest-slice.md`
- `references/433-distributed-proof-profile-contract-slice.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `checkUserClientHealth` and `requireConversation` booleans to
  the TypeScript distributed proof profile contract.
- Add the same fields to the dependency-free script-side profile normalizer.
- Make the verifier read those booleans from `--profile` unless explicit CLI
  flags override by enabling the same checks.
- Make generated proof profiles include both booleans because generated
  verifier scripts already require both checks.
- Extend proof-tool smoke coverage so generated dry-run profiles and direct
  profile self-tests cover the new fields.

## Tests Required

Implemented and passed:

- `node --check scripts/distributed-proof-profile.mjs`
- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm ops:smoke-distributed-proof-tools`

Broader checks for the slice:

- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit

## Migration And Compatibility Notes

Existing proof profiles remain valid because both fields are optional. New
generated profiles are stricter by default and match the generated verifier
scripts. Explicit CLI flags still work and can only enable these checks, not
silently weaken a generated profile.

## Risks And Mitigations

- Risk: hand-written profile users assume profile-only verification includes
  all generated script checks.
  Mitigation: new generated profiles now carry those checks explicitly.
- Risk: older generated profiles are weaker when invoked directly with
  `--profile`.
  Mitigation: operator scripts generated before this slice still pass the
  explicit flags; new profile fields are additive.

## Open Questions

- Future profile versions should decide whether some verification requirements
  need tri-state semantics: unset, require, or explicitly disable.
  Follow-up `440-distributed-proof-published-git-evidence-slice.md` adds
  another optional positive requirement, `requirePublishedGitArtifact`, but does
  not change the current "unset or require" model.
