# CLI Inbox Filter Slice

## Current Repo Truth

`entangle inbox list --user-node <nodeId>` reads Host projection for one User
Node and returns its conversations sorted by recency. Before this slice, the
command always returned every projected conversation for that User Node, which
made headless participant workflows noisy once a human node had multiple peers
or old read conversations.

## Target Model

The CLI inbox should behave like a practical participant inbox. Operators and
human-node users should be able to list only unread conversations, focus on one
peer node, and bound the number of returned conversations without changing Host
state or the signed messaging model.

## Impacted Modules And Files

- `apps/cli/src/index.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Add `filterUserConversationsForCli` for unread and peer-node filtering while
  preserving the existing recency sort.
- Add `--unread-only`, `--peer-node <nodeId>`, and `--limit <n>` to
  `entangle inbox list`.
- Return `returned` and `totalMatched` counts for both summary and full JSON
  output.
- Add helper coverage for unread and peer-node filtering.
- Update canonical docs and wiki state.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `inbox list` options.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

The command remains backward compatible for callers that only read
`conversations`. The output now also includes count metadata. The default limit
is `20`, which keeps the command bounded; operators that need more can pass a
larger `--limit`.

## Risks And Mitigations

- Risk: callers expected unbounded inbox output. Mitigation: the default is
  still enough for interactive headless use, and `--limit` is explicit.
- Risk: filtering could change sort order. Mitigation: filtering delegates to
  the existing recency sort helper.

## Open Questions

Future CLI inbox work may add status filters or approval/source-review focused
views. This slice keeps the filter set minimal and participant-oriented.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev inbox list --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; relevant hits were existing
  Docker/local adapter documentation and tests, not invalid new local-only
  assumptions from this slice
