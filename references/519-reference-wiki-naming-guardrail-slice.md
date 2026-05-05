# Reference And Wiki Naming Guardrail Slice

## Current Repo Truth

The active product naming guard already scanned runtime code, deployment files,
operator surfaces, package metadata, and release packets. It did not scan the
canonical `references/` corpus or the project `wiki/`.

Those corpora still preserved literal retired product, runtime-profile, and
readiness milestone strings in historical notes. That made public documentation
less aligned with the current Entangle identity even though active runtime
surfaces were already guarded.

## Target Model

Canonical design docs and wiki notes should use Entangle as the product
identity. Historical context may remain, but it should describe retired labels
without preserving their exact public strings.

The naming guard should scan `references/` and `wiki/` so future design or
session notes cannot reintroduce retired public identity markers.

## Impacted Modules/Files

- `scripts/check-active-product-naming.mjs`
- historical reference docs that still contained retired product or milestone
  wording
- `references/221-federated-runtime-redesign-index.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `references/` and `wiki/` to the active product naming scan roots.
- Rewrite historical reference and wiki wording to describe retired labels
  generically instead of preserving exact strings.
- Keep historical sequence and release-readiness context intact.
- Record the slice in the federated redesign index, references index, and wiki
  log.

## Tests Required

- `pnpm ops:check-product-naming`
- repository-wide forbidden product naming marker search
- `git diff --check`

## Migration/Compatibility Notes

No runtime migration is required. This is a documentation and guardrail
hardening slice.

## Risks And Mitigations

- Risk: historical notes become harder to map to older commits.
  Mitigation: docs now use precise descriptive wording such as retired
  runtime-profile literal, while release tags and implementation sequence remain
  unchanged.
- Risk: the guard becomes noisy by scanning long-form docs.
  Mitigation: the scan checks only retired identity markers with exact-match
  regexes and avoids dynamic self-matches inside the script.

## Verification

Completed for this slice:

- `pnpm ops:check-product-naming`
- repository-wide forbidden product naming marker search: no hits
- `git diff --check`

## Open Questions

No product question blocks this documentation guardrail cleanup.
