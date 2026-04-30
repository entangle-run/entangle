# Distributed Proof Published Git Evidence Slice

## Current Repo Truth

`pnpm ops:distributed-proof-verify` could already require projected work
evidence from the expected agent node through `--require-artifact-evidence`.
That check intentionally accepted any projected `artifact.ref`,
`source_change.ref`, `source_history.ref`, or `wiki.ref` record. It proved that
runner-signed work evidence reached Host projection, but it did not prove that
the agent runner published a git-backed artifact or source-history publication.

Generated proof kits also had one topology profile,
`operator/proof-profile.json`, while `operator/verify-artifacts.sh` represented
the stricter post-work check mostly through command flags.

## Target Model

The distributed proof should distinguish:

- topology/runtime/conversation readiness;
- post-work evidence that the agent runner produced projected work;
- post-work git publication evidence that the agent runner handed off source or
  wiki/artifact state through a git-backed publication path.

The proof kit should write a separate post-work profile so the stricter
contract is durable and inspectable instead of existing only as shell flags.

## Impacted Modules/Files

- `packages/types/src/ops/distributed-proof-profile.ts`
- `packages/types/src/index.test.ts`
- `scripts/distributed-proof-profile.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/427-distributed-proof-profile-manifest-slice.md`
- `references/428-distributed-proof-artifact-evidence-verifier-slice.md`
- `references/433-distributed-proof-profile-contract-slice.md`
- `references/435-distributed-proof-kit-post-work-verifier-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `requirePublishedGitArtifact` to the distributed proof profile
  contract and script-side normalizer.
- Add `--require-published-git-artifact` to the verifier.
- Count published git-backed artifact refs and published source-history
  publication records for the expected agent node.
- Generate `operator/proof-profile-post-work.json` with
  `requireArtifactEvidence` and `requirePublishedGitArtifact` enabled.
- Point `operator/verify-artifacts.sh` at the post-work profile and keep the
  explicit flags for clear command-line output.
- Extend the proof-tool smoke with passing and failing published-git-artifact
  self-tests.

## Tests Required

Implemented for this slice:

- `node --check scripts/distributed-proof-profile.mjs`
- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit

## Migration/Compatibility Notes

Existing proof profiles remain valid because the new field is optional. Existing
manual verifier commands still work. New proof kits add
`operator/proof-profile-post-work.json`; the topology profile remains the
default for immediate verification after assignment and task publication.

## Risks And Mitigations

- Risk: operators run the post-work verifier before source/wiki/git publication
  has completed.
  Mitigation: generated docs describe it as a post-work step, and the verifier
  failure reports the missing published git evidence explicitly.
- Risk: projected evidence could still be malformed or point at an unreachable
  git backend.
  Mitigation: combine this check with `--check-git-backend-health` for
  operator-machine git service reachability. A future runner-side canary can
  prove push/pull with runner credentials directly.

## Open Questions

- Should the next proof-hardening slice verify a concrete git ref by cloning or
  fetching the projected locator from the verifier machine?
