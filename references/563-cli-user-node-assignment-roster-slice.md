# CLI User Node Assignment Roster Slice

## Current Repo Truth

`entangle user-nodes assign <nodeId> --runner <runnerId>` can offer a Human
Interface Runtime assignment and can optionally revoke current assignments
before offering the new one. Before this slice, a headless operator had to use
the generic assignment list or User Client roster to infer the exact assignment
records for one User Node before reassignment.

## Target Model

User Node reassignment should be inspectable before mutation. The CLI should
let an operator list all assignment records for one User Node, or only the
current active/accepted/offered set that `--revoke-existing` would affect.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/506-canonical-user-node-surface-spec-repair.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared CLI helper that filters assignment records to one User Node and
  optionally narrows to current active/accepted/offered assignments.
- Add `entangle user-nodes assignments <nodeId>` with `--current-only` and
  `--summary`.
- Build the command from the existing Host assignment list API.
- Update canonical docs and wiki state.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `user-nodes assignments`.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing generic `assignments` commands and
`user-nodes assign` mutation behavior are unchanged.

## Risks And Mitigations

- Risk: operators mistake the focused roster for an assignment mutation.
  Mitigation: the command is read-only and separate from
  `user-nodes assign`.
- Risk: `--current-only` drift from reassignment revocation behavior.
  Mitigation: it uses the same active/accepted/offered status set already used
  by the CLI reassignment helper.

## Open Questions

Future reassignment UX can group current assignment rows with runner liveness
and User Client health. This slice provides the focused assignment roster first.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev user-nodes assignments --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; no added-line hits were found for
  obsolete product naming, runner filesystem context, shared-volume, or
  container-only deployment markers
