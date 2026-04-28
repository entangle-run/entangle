# Deployment Profiles

This directory is organized by deployment profile.

## Active Profiles

- [federated-dev](federated-dev/README.md) — Entangle deployment profile for
  running Host, Studio, relay, git service, and runner infrastructure on one
  workstation while preserving the federated runtime model.

## Future Profiles

Managed or hosted deployment material should not be added here until the
roadmap reaches the relevant product gate. Preparatory notes belong in
`references/` or `wiki/` unless they are needed to keep the active
`federated-dev` profile clean.

## Path Policy

Operational scripts should consume profile paths from
`scripts/federated-dev-profile-paths.mjs` instead of hardcoding the
federated-dev Compose, Dockerfile, or config paths in multiple places.
