# Distributed Proof Published Git Ref Check Slice

## Current Repo Truth

`440-distributed-proof-published-git-evidence-slice.md` tightened the post-work
proof by requiring projected published git artifact or source-history
publication evidence from the agent node. That still trusted Host projection
and runner observations. It did not let the operator machine verify that a
projected git artifact locator is actually advertised by the configured remote.

The catalog already distinguishes `gitServiceProfile.baseUrl` from
`gitServiceProfile.remoteBase`, and artifact publication metadata can carry the
concrete `remoteUrl` used by the runner.

## Target Model

The default proof remains topology and Host-projection based. When an operator
also has network and credential access to the git backend, the verifier should
optionally run `git ls-remote` against projected published git artifact refs and
check that the advertised branch contains the projected commit.

This must be opt-in because some deployments may deliberately give runners git
credentials that the operator verifier does not have.

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
- `references/440-distributed-proof-published-git-evidence-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add optional `checkPublishedGitRef` to the distributed proof profile
  contract and script-side normalizer.
- Add `--check-published-git-ref` to the verifier.
- Fetch Host catalog when that check is enabled so locator-only artifact refs
  can resolve `remoteBase`.
- Prefer concrete `artifactRecord.publication.remoteUrl` when available, then
  derive a remote URL from the artifact locator and catalog git service.
- Run `git ls-remote` against the projected branch and require the projected
  commit to be advertised.
- Redact URL credentials in verifier output.
- Add passing and failing self-test coverage.
- Add a proof-kit option that writes the requirement into
  `operator/proof-profile-post-work.json` and the generated post-work verifier
  command.

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

Existing proof profiles remain valid because the new field is optional. New
proof kits only enable the git ref check when generated with
`--check-published-git-ref`. The existing post-work verifier remains usable in
projection-only environments.

## Risks And Mitigations

- Risk: the operator verifier lacks git credentials even though the runner
  published successfully.
  Mitigation: the check is opt-in and documented as an operator-machine git
  reachability check.
- Risk: verifier output leaks credential-bearing remote URLs.
  Mitigation: verifier details redact URL username/password fields.

## Open Questions

- Should a later proof mode clone/fetch into a temp directory and inspect the
  artifact path, rather than only checking that the branch advertises the
  projected commit?
