# Docker Engine API Runtime Backend Refinement

This document records the refinement that removed `docker` CLI shell-outs from
the host runtime backend and replaced them with a first-party Docker Engine API
client.

It exists because the earlier runtime-backend slice was directionally correct
but still relied on an implementation shortcut that does not meet the desired
quality bar for Entangle's long-term control-plane foundation.

## Why the earlier implementation was not final-form

The earlier Docker backend was already correct in its high-level architecture:

- the host owned an explicit runtime-backend boundary;
- a Docker-backed local runtime profile existed;
- observed runtime state and reconciliation snapshots were persisted.

However, the host still shelled out to the `docker` binary for:

- image inspection;
- container inspection;
- container creation;
- container start;
- container removal.

That approach has three important weaknesses:

1. it hides the real transport and error boundary behind process execution;
2. it makes backend behavior harder to unit test precisely;
3. it unnecessarily couples the host container image to a CLI tool instead of
   the daemon control surface it actually needs.

Those weaknesses are acceptable in a fast prototype, but not as the intended
long-term host/runtime integration stance for Entangle.

## Final recommendation

For the local Docker-backed runtime profile, `entangle-host` should talk
directly to the Docker Engine API through a first-party client.

The first serious implementation now does that through:

- a dedicated Docker Engine client in `services/host/src/docker-engine-client.ts`;
- explicit Unix-socket or host-url connection resolution;
- version discovery through the Docker Engine API;
- runtime-backend logic that depends on a typed Docker client interface rather
  than raw process execution.

## Scope of the new client

The new client is intentionally narrow.

It supports only the operations the current Entangle host actually needs:

- inspect image presence;
- inspect one managed container by name;
- create one managed runner container;
- start one managed runner container;
- remove one managed runner container.

This keeps the Docker boundary small and auditable.

## Connection model

The current local-first connection resolution order is:

1. `ENTANGLE_DOCKER_SOCKET_PATH`
2. `ENTANGLE_DOCKER_HOST_URL`
3. `DOCKER_HOST`
4. default Unix socket `/var/run/docker.sock`

The preferred local profile remains:

- Docker socket mounted into the host container;
- host using that socket through the first-party Engine API client.

This preserves a clean local operator story without hardcoding CLI behavior.

## Testing implications

This refinement materially improves testability.

The repository now has:

- Unix-socket tests for the Docker Engine client itself;
- runtime-backend unit tests using an injected Docker client interface.

This is a better testing boundary than trying to infer correctness from mocked
`execFile` calls or from occasional end-to-end shell behavior.

## Deployment implications

Because the host no longer shells out to `docker`, the host container no longer
needs the Docker CLI package merely to manage runtimes.

The deployment requirement is now stated more cleanly:

- mount a trusted operator-owned control path to the Docker daemon;
- let `entangle-host` consume that control path directly.

This is both more explicit and more portable across future host packaging
options.

## Architectural result

After this refinement, the Docker-backed runtime backend is still only one
runtime profile, but its implementation quality is now aligned with the rest of
the control-plane design:

- typed boundary;
- direct daemon protocol;
- better testability;
- fewer hidden dependencies;
- cleaner host-container packaging.
