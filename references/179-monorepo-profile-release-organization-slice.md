# Monorepo Profile And Release Organization Slice

## Purpose

This slice applies the current monorepo organization decision without splitting
Entangle into multiple repositories.

The goal is to make the active Local release and deployment paths explicit
while preserving the monorepo advantages that still matter: shared contracts,
single quality gates, and tightly coordinated host, runner, CLI, Studio, and
deployment changes.

## Changes

- Moved the active deployment profile under `deploy/local/`.
- Kept `deploy/README.md` as the deployment-profile index.
- Added `scripts/local-profile-paths.mjs` so local profile scripts share path
  constants instead of duplicating the Compose and Dockerfile paths.
- Added `releases/` as the release-control area.
- Added `releases/local/l1-local-operator-baseline.md` as the active Local L1
  release packet.
- Kept the canonical R1/L1 release ledger in `references/177-r1-local-operator-release-ledger.md`.

## Non-Changes

- Did not split the monorepo into multiple repositories.
- Did not move `apps/`, `services/`, or `packages/`.
- Did not create active Cloud or Enterprise deployment profiles.
- Did not rename the machine `hackathon_local` runtime profile in this slice.

## Rationale

The current product plan has three final products, but the implementation still
depends on synchronized changes across contracts, validators, host, runner,
clients, deployment, and release evidence. A multi-repo split would add
versioning and coordination overhead before the Local product has reached GA.

The safe reorganization is therefore internal:

- deployment profiles are partitioned by product/profile;
- release-control packets are separated from canonical specifications;
- scripts depend on shared path constants;
- later Cloud and Enterprise material remains blocked by roadmap gates.

## Verification

Checks run for this slice:

- `node --check scripts/check-local-profile.mjs`
- `node --check scripts/smoke-local-profile.mjs`
- `node --check scripts/smoke-local-profile-disposable.mjs`
- `node --check scripts/smoke-local-runtime.mjs`
- `node --check scripts/local-profile-paths.mjs`
- `docker compose -f deploy/local/compose/docker-compose.local.yml config --quiet`
- `pnpm ops:check-local:strict`
- `pnpm verify`

Result: all passed on 2026-04-25. The strict local preflight was run with
Docker socket access.
