# Deployment Index Profile Cleanup Slice

## Current Repo Truth

The active deployment material lives under `deploy/federated-dev`, but
`deploy/README.md` still linked to `deploy/local/README.md`, which does not
exist, and described the active profile as a local product profile. That was a
public documentation drift from the federated naming cleanup.

## Target Model

The deployment index should point at the real active deployment profile and make
clear that same-workstation operation is only a deployment topology. It should
not imply a separate local product identity or a separate runtime model.

## Impacted Modules/Files

- `deploy/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/250-federated-dev-deployment-naming-cleanup-slice.md`
- `references/304-deployment-index-profile-cleanup-slice.md`
- `wiki/log.md`

## Concrete Changes Required

- Replace the stale `deploy/local/README.md` link with
  `deploy/federated-dev/README.md`.
- Describe `federated-dev` as the active profile for running multiple Entangle
  components on one workstation while preserving the federated model.
- Remove active "Local profile" wording from the deployment index.
- Record the cleanup in the federated runtime index and wiki log.

## Tests Required

- Documentation link audit through `rg "deploy/local|\\[local\\]\\(local/README.md\\)" deploy README.md references wiki`.
- `git diff --check`.

## Migration/Compatibility Notes

This is documentation-only. The old `deploy/local` path is not restored because
keeping it would reintroduce a profile name that no longer matches the product
architecture.

## Risks And Mitigations

- Risk: older notes still refer to local release history.
  Mitigation: this slice only fixes active deployment documentation; historical
  release records remain historical unless they are surfaced as current
  operator instructions.

## Open Questions

No open product question blocks this cleanup.
