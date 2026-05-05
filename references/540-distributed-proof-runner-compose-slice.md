# Distributed Proof Runner Compose Slice

## Current Repo Truth

`pnpm ops:distributed-proof-kit` generates a three-runner proof kit with
runner join configs, runner-local env/start scripts, operator commands, and
verifier profiles. That kit is suitable for copying directories to separate
machines, but it did not generate a same-machine container-boundary harness for
operators who want to test multiple isolated runners before using real
machines.

## Target Model

The proof kit should optionally generate runner-only Docker Compose files that
start the same three generated runners in separate containers. This keeps Host,
relay, and git as network-reachable services and still avoids Host/runner
filesystem sharing. The container path is a proof convenience, not a new
runtime model.

## Impacted Modules/Files

- `scripts/federated-distributed-proof-kit.mjs`
- `scripts/smoke-distributed-proof-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `--write-runner-compose` to the distributed proof kit generator.
- Add runner Compose image/network options, including external-network mode for
  joining an already-running local proof network.
- Generate per-runner `start-container.sh` scripts that source the same runner
  env file and start `/app/dist/index.js join --config ...` inside the runner
  image.
- Generate `docker-compose.runners.yml` with one service per runner directory.
- Document that generated Host/relay/git URLs must be reachable from runner
  containers, for example through `host.docker.internal` or an external Docker
  network.
- Extend the proof-tool smoke dry-run coverage so CI checks the new option
  surface without requiring Docker.

## Tests Required

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit; new `Docker` hits are valid
  runner-container proof tooling/docs, not Host/runner shared-filesystem
  assumptions

## Migration/Compatibility Notes

Existing generated proof kits are unchanged unless `--write-runner-compose` is
passed. Existing machine-copy runner scripts remain the canonical distributed
proof path.

## Risks And Mitigations

- Risk: operators may treat runner Compose as proof that Host and runners share
  a deployment. Mitigation: generated docs describe it as a runner-only
  container boundary and require network-reachable Host/relay/git URLs.
- Risk: Host/relay URLs generated for the host machine may not resolve inside
  runner containers. Mitigation: docs call out `host.docker.internal` and
  external Docker network generation.

## Open Questions

Full infrastructure provisioning across real machines or VMs remains a
separate hardening track.

## Verification

Completed in this slice:

- `node --check scripts/federated-distributed-proof-kit.mjs`
- `node --check scripts/smoke-distributed-proof-tools.mjs`
- runner Compose proof-kit dry-run with custom image and external network
- `pnpm ops:smoke-distributed-proof-tools`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit
