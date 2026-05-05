# Release Naming Guardrail Slice

## Current Repo Truth

The active product naming guard checked README, apps, deploy, examples,
packages, scripts, services, and package metadata. It did not scan `releases/`.
Historical release packets still contained retired runtime-profile and
milestone wording that should not remain in public release-control material.

## Target Model

Release packets are public project artifacts and should follow the same active
product identity guardrail as runtime code and operator docs. Historical
context may remain, but retired machine values and obsolete milestone wording
should not appear as live release claims.

## Impacted Modules/Files

- `scripts/check-active-product-naming.mjs`
- `releases/local/l1-local-operator-baseline.md`
- `releases/local/l1.5-local-operator-preview.md`
- `releases/local/l2-local-workbench.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `releases/` to the active product naming scan roots.
- Remove retired runtime-profile literal wording from release packets.
- Replace obsolete milestone wording with Entangle GA wording where release
  packets state production-readiness exclusions.
- Keep release history intact without preserving retired public claims.

## Tests Required

- `pnpm ops:check-product-naming`
- `git diff --check`
- targeted release-content search for forbidden product naming markers.

## Migration/Compatibility Notes

No runtime migration is required. This only tightens public release-control
documentation and the naming guardrail.

## Risks And Mitigations

- Risk: historical release context becomes unclear.
  Mitigation: release status, tags, verification evidence, and historical
  sequence remain intact; only retired literals and obsolete readiness wording
  are removed.
- Risk: future release packets reintroduce old product naming.
  Mitigation: the existing naming guard now scans `releases/`.

## Verification

Completed for this slice:

- `pnpm ops:check-product-naming`
- `git diff --check`
- `rg -n "Entangle Local|entangle-local|hackathon_local|Local GA" releases README.md apps deploy examples package.json packages scripts services`: no hits.

## Open Questions

No product question blocks this release-control cleanup.
