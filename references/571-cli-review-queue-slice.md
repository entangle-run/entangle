# CLI Review Queue Slice

## Current Repo Truth

The CLI already exposes User Node inbox list/show flows, inbound approval
request listing, and inbound source-change review request listing. The running
React User Client and fallback Human Interface Runtime now show grouped review
queues, but the headless CLI did not yet provide the same combined queue view.

## Target Model

A human node should be operable without a browser. The CLI should expose a
single grouped review queue over inbound approval requests and source-change
review requests, using the same Host/User Node boundary as existing inbox
commands and without introducing direct runner mutation.

## Impacted Modules And Files

- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/cli/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add CLI projection helpers that turn inbound `approval.request` messages into
  review-queue items.
- Classify `source_change_candidate` approval resources as source-change review
  items while keeping other approval requests as approval items.
- Group review items by peer node with bounded counts and label summaries.
- Add `entangle inbox review-queue --user-node <nodeId>` with the same
  `--peer-node`, `--unread-only`, `--limit`, and `--summary` conventions as
  nearby inbox commands.

## Tests Required

- CLI output helper test for item projection, source-change classification,
  group ordering, and group label formatting.
- CLI typecheck.
- Focused CLI lint.
- Product naming guard.
- Diff whitespace check.
- Changed-diff local-assumption marker audit.

## Migration And Compatibility Notes

No data migration is required. The command reads existing inbox and
conversation APIs and returns JSON only.

## Risks And Mitigations

- Risk: the combined queue duplicates the specialized `inbox approvals` and
  `inbox source-reviews` commands. Mitigation: the new command is a grouped
  triage view, while the existing commands remain precise filters.
- Risk: batch grouping is mistaken for batch approval authority. Mitigation:
  the CLI command only reads and groups; signed approval/review responses still
  use existing message commands.

## Open Questions

Future protocol work can add signed multi-item review decisions if batch
approval becomes an explicit product requirement.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- user-node-output.test.ts -t "builds a grouped review queue"`
- CLI typecheck.
- Focused CLI ESLint.

The final slice audit also runs product naming, whitespace, changed-diff marker
checks, and `git diff` review before commit.
