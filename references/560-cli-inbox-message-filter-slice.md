# CLI Inbox Message Filter Slice

## Current Repo Truth

`entangle inbox show <conversationId> --user-node <nodeId>` reads the Host
User Node conversation detail endpoint and returns recorded inbound/outbound
messages for one projected participant conversation. Before this slice, the
command always returned the full message list, which made headless participant
inspection noisy for long conversations.

## Target Model

The headless User Node CLI should support practical conversation triage without
adding Host-side mutation or local runtime assumptions. A participant should be
able to inspect only inbound or outbound messages, focus on one message type,
and cap the number of returned records while still reading Host projection and
recorded User Node messages.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add a shared CLI helper that sorts User Node messages by recency and filters
  them by direction and exact message type.
- Add `--direction <inbound|outbound>`, `--message-type <type>`, and
  `--limit <n>` to `entangle inbox show`.
- Return `returned` and `totalMatched` counts for full and compact output.
- Keep `messageCount` in compact output as the matched unbounded count.
- Add CLI helper test coverage for message direction, type, recency, and limit.
- Update canonical docs and wiki state.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `inbox show` options.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

The command remains backward compatible for callers that read `conversation` and
`messages`. The default message limit is `50`, and callers can request a larger
limit explicitly. Output now includes `returned` and `totalMatched` counters.

## Risks And Mitigations

- Risk: callers expected unbounded full-thread output. Mitigation: the command
  remains explicit and can be given a higher `--limit`, while default output is
  safer for interactive terminals.
- Risk: filters could hide relevant approval or source-review context.
  Mitigation: the filters are opt-in and the default still includes all message
  types, bounded only by the visible default limit.

## Open Questions

Future participant CLI work may add source-review focused aliases on top of the
same recorded message read model. Approval-request discovery is now covered by
`561-cli-inbox-approval-requests-slice.md`.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev inbox show --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; no added-line hits were found for
  obsolete product naming, runner filesystem context, shared-volume, or
  container-only deployment markers
