# Distributed Proof Git Backend Health Verifier Slice

## Current Repo Truth

Host exposes the active deployment resource catalog through `/v1/catalog`.
The catalog already contains git service profiles with `baseUrl`,
`remoteBase`, `transportKind`, provisioning mode, and a default
`gitServiceRef`. The distributed proof verifier already reads Host status,
runner registry, assignments, projection, optional User Client health, optional
artifact evidence, and optional relay WebSocket health. Before this slice, it
did not verify that the distributed proof was using a reachable non-file git
service.

## Target Model

The distributed proof should be able to validate the shared artifact backend
from the operator machine without reading Host or runner files. The check
should stay optional because topology can be verified before any artifact work
has been produced, but real multi-machine proof runs should be able to reject
file-backed local git services and missing Host catalog git bindings.

## Impacted Modules And Files

- `scripts/federated-distributed-proof-verify.mjs`
- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/427-distributed-proof-profile-manifest-slice.md`
- `references/429-distributed-proof-relay-health-verifier-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes

- Added `--check-git-backend-health` to
  `pnpm ops:distributed-proof-verify`.
- Added repeated/comma-separated `--git-service-ref <id>` verifier overrides.
- The verifier falls back to `gitServiceRefs` in the proof profile and then to
  `catalog.defaults.gitServiceRef` from Host `/v1/catalog`.
- The verifier checks that each selected git service exists, is not a
  `file://`/`transportKind: "file"` backend, and has a reachable public
  `baseUrl`.
- Added `--git-service-ref <id>` and `--check-git-backend-health` to
  `pnpm ops:distributed-proof-kit`, so generated proof profiles can carry the
  expected git service refs and generated operator commands can include the
  backend health check when requested.
- The distributed proof tool smoke now proves:
  - git backend health can pass in self-test mode;
  - generated-style proof profiles can request git backend health;
  - file-backed git services fail the distributed proof health check;
  - missing git service refs fail the distributed proof health check.

## Tests Required

Implemented and passed for this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/federated-distributed-proof-verify.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- added-line local-assumption audit from the implementation checklist.

## Migration And Compatibility Notes

Git backend health is opt-in. Existing generated kits and verifier invocations
continue to work. Operators can add `--check-git-backend-health` when they want
the proof to reject local file-backed git services or unreachable public git
base URLs.

The check intentionally uses Host catalog metadata and public service
reachability. It does not require Host secret access, and it does not prove that
an individual runner can authenticate to push every target repository.

## Risks And Mitigations

- Risk: a git service public UI/API base URL is reachable, but a runner's SSH or
  HTTPS push credentials are misconfigured.
  Mitigation: this slice is a topology/backend reachability check; runner-owned
  publication and projected artifact evidence remain the behavioral proof for
  actual artifact handoff.
- Risk: a deliberately local file git service is useful for a single-machine
  development adapter.
  Mitigation: the check is optional and scoped to distributed proof. When it is
  enabled, file-backed git is correctly rejected because it cannot prove a
  topology-independent artifact backend.

## Open Questions

- Should a future infrastructure-backed proof also perform a runner-side git
  push/pull canary against each selected git service before assigning agent
  work?
