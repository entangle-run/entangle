# Runner Multi-Node Git Handoff Slice

## Purpose

Prove the core runner artifact handoff path with two distinct node contexts:
one node produces and publishes a git-backed artifact, and a downstream node
retrieves that published `ArtifactRef` into its own local engine request.

This closed the first runner-level proof for the architectural rule that
messages coordinate work while artifacts carry work. A later runtime-smoke
hardening pass has now promoted the same handoff to the Docker-backed local
profile with bootstrapped Gitea and two managed runner containers.

## Implemented behavior

- Added runner integration coverage for an upstream `RunnerService` and a
  downstream `RunnerService` sharing a real git remote.
- The upstream service handles a `task.request`, materializes a report file,
  commits it to its artifact workspace, publishes it to the shared remote, and
  emits a `task.result` carrying the published `ArtifactRef`.
- The downstream service receives a new `task.request` with that published
  artifact reference, resolves the repository target from its effective
  runtime context, clones/fetches the remote into its retrieval cache, checks
  out the published commit, and passes the local artifact path into the engine
  request.
- The downstream turn persists both consumed and produced artifact linkage, so
  session, conversation, turn, retrieval, and publication state remain
  inspectable through the existing runner state model.

## Original boundary decisions

The test uses a local bare git remote because the current local Compose Gitea
service is only readiness-checked as a web surface; it is not yet bootstrapped
with an authenticated user, token, repository namespace, and git transport
principal suitable for end-to-end publication and retrieval.

That is a deliberate boundary. The runner artifact contract, git publication,
git retrieval, and engine input path are now proven without pretending that
Gitea bootstrap exists in the deployment profile.

## Follow-up status

The deployment-grade gap identified by this slice is now closed by the
runtime lifecycle smoke. `pnpm ops:smoke-local:disposable:runtime` now
bootstraps local Gitea, starts two managed runner containers, publishes an
upstream git-backed artifact, and verifies downstream retrieval by
`ArtifactRef` over the real host, relay, runtime, model, git, and artifact
surfaces.

## Verification

- `pnpm --filter @entangle/runner test -- --runInBand`
- `pnpm ops:smoke-local:disposable:runtime`
