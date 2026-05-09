# CLI Inbox Approval Requests Slice

## Current Repo Truth

`entangle inbox show` can inspect one User Node conversation and filter recorded
messages by direction, message type, and result limit. That gives a headless
participant the primitive data needed to find approval requests, but it still
requires knowing which conversation to inspect before running
`approve --from-message` or `reject --from-message`.

## Target Model

The CLI should expose a focused participant approval inbox over Host-recorded
User Node messages. A human graph node should be able to list inbound
`approval.request` messages across its projected conversations, see the event
id and scoped approval metadata, and then answer through the existing signed
User Node response commands.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/560-cli-inbox-message-filter-slice.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a CLI helper that extracts inbound `approval.request` messages with
  approval metadata from recorded User Node messages.
- Include approval id, operation, resource id, resource kind, resource label,
  and decision when projecting compact User Node message summaries.
- Add `entangle inbox approvals --user-node <nodeId>` with optional
  `--peer-node`, `--unread-only`, `--limit`, and `--summary` flags.
- Build the command from Host User Node inbox and conversation detail APIs
  without adding Host mutation or runner-local reads.
- Update canonical docs and wiki state.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `inbox approvals`.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

This is additive. Existing `inbox list`, `inbox show`, `approve`, and `reject`
commands are unchanged. Compact message summaries gain optional approval fields
when a recorded message carries approval metadata.

## Risks And Mitigations

- Risk: the command makes one Host conversation-detail request per matched
  conversation. Mitigation: this is a headless operator/participant convenience
  command over bounded projected inboxes, and `--peer-node`/`--unread-only`
  reduce scan scope.
- Risk: operators may confuse listing approval requests with answering them.
  Mitigation: the command is read-only and preserves the existing signed
  `approve --from-message` and `reject --from-message` response path.

## Open Questions

Future participant CLI work may add richer grouped pending-work views. Focused
source-review discovery is now covered by
`562-cli-inbox-source-review-requests-slice.md`.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev inbox approvals --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; no added-line hits were found for
  obsolete product naming, runner filesystem context, shared-volume, or
  container-only deployment markers
