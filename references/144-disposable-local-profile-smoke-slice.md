# Disposable Local Profile Smoke Slice

## Purpose

Add a CI-like local smoke mode that can exercise the complete local operator
profile from startup through teardown.

The prior active smoke validated a profile that was already running. That was
useful for operators, but it did not automate the build/start/wait/teardown
loop needed for repeatable integration hardening.

## Implemented behavior

- Added `scripts/smoke-federated-dev-profile-disposable.mjs`.
- Added package script:
  - `pnpm ops:smoke-federated-dev:disposable`
- The disposable smoke:
  - runs `pnpm ops:check-federated-dev:strict`;
  - builds `entangle-runner:federated-dev` through the `runner-build` Compose profile;
  - starts `studio`, `host`, `strfry`, and `gitea` in detached mode;
  - repeatedly runs `scripts/smoke-federated-dev-profile.mjs` until it passes or the
    readiness timeout expires;
  - tears down the Compose profile with volumes by default.

## Operator controls

- `--timeout-ms <milliseconds>` controls the total readiness window.
- `--probe-timeout-ms <milliseconds>` controls each active-smoke probe timeout.
- `--skip-build` reuses an existing local runner image.
- `--keep-running` leaves the Compose profile running after the smoke.
- `--preserve-volumes` tears down services without deleting profile volumes.

## Boundary decisions

The disposable smoke remains outside `pnpm verify` because it requires Docker,
port availability, image builds, and live services.

The script does not introduce a second deployment profile. It orchestrates the
existing federated dev Compose profile and reuses the active smoke as the readiness
oracle.

Early disposable smoke runs exposed stale-image failure modes in the local
Docker path. The host and runner Dockerfiles now clean TypeScript incremental
state before image builds, the Docker context excludes local `*.tsbuildinfo`
files, and both service images assert the presence of service and workspace
package `dist/` outputs before producing runtime images.

## Verification

- `node --check scripts/smoke-federated-dev-profile-disposable.mjs`
- `pnpm ops:check-federated-dev:strict`
- `pnpm ops:smoke-federated-dev:disposable`
- host and runner image payload import probes
- `pnpm verify`
