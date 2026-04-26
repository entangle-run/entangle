# Deployment Profiles

This directory is organized by deployment profile.

## Active Profiles

- [local](local/README.md) — Entangle deployment operator profile for a single
  workstation, backed by Docker Compose, `strfry`, Gitea, `entangle-host`,
  Studio, and host-managed local runners.

## Future Profiles

Cloud and Enterprise deployment material should not be added here until the
roadmap reaches the relevant product gate. Preparatory notes belong in
`references/` or `wiki/` unless they are needed to keep the active Local
profile clean.

## Path Policy

Operational scripts should consume profile paths from
`scripts/federated-dev-profile-paths.mjs` instead of hardcoding the Federated dev Compose,
Dockerfile, or config paths in multiple places.
