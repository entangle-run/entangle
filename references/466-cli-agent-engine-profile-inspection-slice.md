# CLI Agent Engine Profile Inspection Slice

## Current Repo Truth

The CLI can now upsert typed agent engine profiles into the active Host catalog,
and `host catalog get` can print the full catalog. That full-catalog output is
useful for automation, but it is too broad for common operator checks like
confirming which OpenCode profile is default or whether a node-ready attached
profile has the expected permission mode.

## Target Model

CLI should expose focused agent engine profile inspection:

- list profiles in deterministic order;
- show one profile by id;
- emit either full profile data or compact operator summaries;
- include the current default profile marker without requiring downstream JSON
  filtering.

## Impacted Modules And Files

- `apps/cli/src/catalog-agent-engine-command.ts`
- `apps/cli/src/catalog-agent-engine-command.test.ts`
- `apps/cli/src/index.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add compact agent engine profile summary projection helpers.
- Add deterministic profile sorting for CLI output.
- Add `entangle host catalog agent-engine list` with optional `--summary`.
- Add `entangle host catalog agent-engine get <profileId>` with optional
  `--summary`.
- Document the focused inspection commands next to the upsert workflow.

## Tests Required

- CLI helper tests for compact summary projection and default marking.
- CLI lint, typecheck, focused helper test, and full CLI package test.
- Product naming guard and diff checks.

## Migration And Compatibility

No persisted state change. The new commands are read-only Host catalog
inspection surfaces over the existing `GET /v1/catalog` endpoint.

## Risks And Mitigations

- Risk: profile ordering differs across machines and makes automation noisy.
  Mitigation: the helper sorts profiles by id before CLI presentation.
- Risk: compact summaries hide fields that matter for debugging.
  Mitigation: default command output still includes the full profile record;
  `--summary` is explicitly opt-in.

## Open Questions

- None for this slice.
