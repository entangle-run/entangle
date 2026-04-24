# Docker Gitea Multi-Node Handoff Smoke Slice

## Purpose

Promote the runner-level git handoff proof into the real local deployment
profile. The disposable runtime smoke now proves that two host-managed runner
containers can collaborate through local Gitea using host-resolved
provisioning, host-managed git principals, Nostr task intake, and published
artifact references.

## Implemented behavior

- The local Gitea Compose service now starts in non-interactive installed mode
  for disposable profiles by setting sqlite, `INSTALL_LOCK`, and disabled
  public registration defaults.
- `scripts/smoke-local-runtime.mjs` now waits for the Gitea API, creates a
  disposable Gitea user through the Gitea CLI as the `git` user, and captures a
  disposable access token.
- The smoke writes that token into the host secret volume as both:
  - the selected git service's `gitea_api` provisioning credential;
  - the HTTPS-token transport secret for a host-managed git external principal.
- The smoke applies a graph with a user node, an upstream worker, and a
  downstream worker bound to the same model endpoint, git service, and git
  principal.
- The host provisions the primary Gitea repository through the Gitea API before
  the runtimes are considered realizable.
- The upstream runner publishes a provider-backed git report artifact to local
  Gitea.
- The downstream runner receives that published `ArtifactRef`, retrieves it
  from Gitea into its retrieval cache, records the consumed artifact id, and
  produces its own published report.

## Boundary decisions

This smoke still belongs outside `pnpm verify` because it depends on Docker,
Compose, Gitea, strfry, a runner image, mutable host state, and runtime
containers.

The direct `pnpm ops:smoke-local:runtime` path mutates whichever local host
profile is running. The disposable wrapper remains the recommended path because
it starts from a fresh Gitea volume and tears down all local state afterward.

## Remaining hardening

- CI-grade execution for the full local profile, if the CI environment can
  provide Docker reliably.
- Non-disposable upgrade and repair behavior for local Gitea volumes created
  before the installed-mode defaults were added.
- Autonomous node-to-node task initiation, where a worker itself sends the
  downstream task instead of the smoke harness sending both tasks as the user
  node.

## Verification

- `node --check scripts/smoke-local-runtime.mjs`
- `docker compose -f deploy/compose/docker-compose.local.yml config >/dev/null`
- `pnpm ops:smoke-local:disposable:runtime --skip-build`
- `pnpm ops:smoke-local:disposable:runtime`
