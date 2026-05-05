# CLI Wiki Conflict Receipts Slice

## Current Repo Truth

Runtime command receipts already carry projected wiki page hash evidence. The
running User Client now renders stale-edit wiki page failures as explicit
conflict blocks, but the CLI summary paths still surfaced the same condition
only as raw receipt hash fields.

The relevant CLI paths are:

- `entangle projection command-receipts --summary`
- `entangle user-nodes command-receipts <nodeId> --summary`

## Target Model

Headless operators and human-node participants should see the same compact
wiki conflict evidence as browser users. Summary JSON should keep existing
fields and add a structured `wikiConflict` object when a failed
`runtime.wiki.upsert_page` receipt has mismatched expected/current hashes.

## Impacted Modules And Files

- `apps/cli/src/runtime-command-receipt-output.ts`
- `apps/cli/src/projection-output.ts`
- `apps/cli/src/projection-output.test.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared CLI projection helper for wiki conflict summaries.
- Include `wikiConflict` in global runtime command receipt summaries.
- Include `wikiConflict` in User Node command receipt summaries.
- Keep full receipts unchanged for callers that do not pass `--summary`.

## Tests Required

- CLI projection-output test for global command receipt conflict summaries.
- CLI user-node-output test for participant-scoped conflict summaries.
- CLI typecheck and lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

This is an additive JSON summary field. Existing full receipt output and
protocol/storage schemas do not change.

## Risks And Mitigations

- Risk: scripts that strictly validate summary JSON may need to ignore the new
  optional field. Mitigation: the field is present only in the existing
  `--summary` mode and only for a specific failed wiki upsert condition.
- Risk: duplicate conflict logic between browser and CLI helpers may drift.
  Mitigation: the CLI uses one shared helper for both operator and User Node
  summary projections.

## Open Questions

The next collaborative wiki step is still a retry/merge workflow. This slice
only improves headless inspection of the existing conflict evidence.

## Verification

Planned for this slice:

- `pnpm --filter @entangle/cli test -- src/projection-output.test.ts src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
- `pnpm ops:check-product-naming`
- `git diff --check`
- changed-diff local-assumption marker audit over CLI and updated docs
