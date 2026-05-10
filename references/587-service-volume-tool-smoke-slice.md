# Service Volume Tool Smoke Slice

## Current Repo Truth

`references/586-service-volume-export-import-slice.md` added dry-run-capable
`entangle deployment service-volumes export` and `entangle deployment
service-volumes import` commands. The helper tests verify deterministic Docker
command generation and manifest validation, but the root operator smoke list
did not yet include a no-infrastructure check for the CLI command surface.

## Target Model

Entangle should have a fast, no-Docker smoke that proves the service-volume CLI
dry-run paths remain usable:

- export dry-run returns a two-volume Gitea/strfry plan;
- the plan excludes Host secret state;
- each planned action includes a Docker command;
- import dry-run can read a typed service-volume manifest and archive fixture;
- the root package exposes a stable `pnpm ops:*` command for CI and operators.

## Impacted Modules And Files

- `package.json`
- `scripts/smoke-deployment-service-volume-tools.mjs`
- `README.md`
- `deploy/federated-dev/README.md`
- `references/README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `pnpm ops:smoke-deployment-service-volume-tools`.
- Implement a smoke script that runs CLI export/import dry-run commands through
  the same package entry point operators use.
- Create a temporary service-volume manifest/archive fixture for import dry-run.
- Validate the exported and imported summaries.
- Keep the smoke independent of Docker and live deployment state.

## Tests Required

- Red/green `pnpm ops:smoke-deployment-service-volume-tools`.
- Script syntax check.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is a test/tooling addition only. It does not change service-volume bundle
shape or runtime behavior.

## Risks And Mitigations

- Risk: the smoke accidentally requires Docker. Mitigation: it only calls
  `--dry-run` commands and validates planned command arrays.
- Risk: pnpm lifecycle output pollutes parsed CLI JSON. Mitigation: the smoke
  invokes the CLI package through `pnpm --silent`.

## Open Questions

`references/589-service-volume-quiescing-acknowledgement-slice.md` and
`references/590-service-volume-running-container-check-slice.md` add the
service-aware safety gates. `references/594-service-volume-disposable-roundtrip-slice.md`
adds the Docker-gated disposable non-dry-run export/import verification.

## Verification

Completed in this slice:

- `pnpm ops:smoke-deployment-service-volume-tools`

The final slice audit also runs syntax checks, product naming, whitespace,
changed-diff marker checks, and `git diff` review before commit.
