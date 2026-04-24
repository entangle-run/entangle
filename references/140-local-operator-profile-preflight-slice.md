# Local Operator Profile Preflight Slice

## Purpose

Make the local operator profile easier to validate before starting the full
Compose topology.

Before this slice, the Compose files and Dockerfiles existed, but the complete
bootstrap path was scattered across project memory and prior implementation
notes. Operators did not have one documented preflight command that checked the
local profile shape before running the system.

## Implemented behavior

- Added `deploy/README.md` with:
  - component inventory;
  - preflight commands;
  - runner image bootstrap command;
  - stable service startup command;
  - default local URLs;
  - operator token notes;
  - runtime state volume notes;
  - reset commands.
- Added `scripts/check-local-profile.mjs`.
- Added package scripts:
  - `pnpm ops:check-local`
  - `pnpm ops:check-local:strict`
- The preflight validates:
  - local profile files;
  - Node version;
  - `pnpm` availability;
  - Docker availability;
  - Docker Compose availability;
  - Docker daemon access;
  - Compose config validity.
- Non-strict mode treats Docker and Compose availability as warnings when the
  repository is checked on a machine that is not currently running Docker.
- Strict mode fails when Docker, Compose, daemon access, or Compose config
  validation are unavailable.

## Design notes

This slice does not start services and does not mutate Docker volumes. It is a
preflight layer, not a live smoke test.

The next operations-hardening step should be an active smoke that starts the
stable services, builds the runner image, and proves host, relay, git, and
runner interactions over the local profile.

## Verification

- `pnpm ops:check-local`
- `pnpm ops:check-local:strict`
