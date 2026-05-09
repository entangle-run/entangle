# CLI Inbox Source Review Requests Slice

## Current Repo Truth

`entangle inbox approvals` can list inbound approval requests for a User Node,
including approval resource metadata. Source-change review already has a signed
response command, `entangle review-source-candidate --from-message`, but before
this slice the participant had to manually filter generic approval requests to
find those whose resource was a `source_change_candidate`.

## Target Model

The headless participant CLI should expose a focused source-review inbox. A
human graph node should be able to list only inbound approval requests scoped to
source-change candidates, copy the event id, and respond through the existing
signed source-review command.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/561-cli-inbox-approval-requests-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a CLI helper that filters inbound approval requests whose resource kind
  is `source_change_candidate`.
- Add `entangle inbox source-reviews --user-node <nodeId>` with optional
  `--peer-node`, `--unread-only`, `--limit`, and `--summary` flags.
- Build the command from Host User Node inbox and conversation detail APIs
  without adding Host mutation or runner-local reads.
- Update canonical docs and wiki state.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `inbox source-reviews`.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing approval and source-review commands are unchanged.
The new command narrows the same Host-recorded message substrate already used by
the generic approval inbox.

## Risks And Mitigations

- Risk: source-review requests without approval resource metadata are hidden.
  Mitigation: the signed `review-source-candidate --from-message` path already
  requires the inbound approval request to carry a `source_change_candidate`
  resource, so this command follows the executable response contract.
- Risk: the command duplicates `inbox approvals`. Mitigation: this is an
  intentional focused view for one common participant action.

## Open Questions

Future participant CLI work may add richer grouped views for all pending work,
but the two signed review/approval response paths now have focused discovery
commands.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev inbox source-reviews --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; no added-line hits were found for
  obsolete product naming, runner filesystem context, shared-volume, or
  container-only deployment markers
