# CLI User Node Client Filter Slice

## Current Repo Truth

`entangle user-nodes clients` joins User Node identities with Host-projected
Human Interface Runtime placement, User Client URLs, conversation counts,
pending approvals, unread counts, latest message timestamps, and runtime
command receipt counts. It can also probe User Client `/health` endpoints from
the CLI machine. Before this slice, operators with multiple human nodes had to
list and optionally probe every projected User Client even when they only
needed one participant.

## Target Model

The CLI should preserve the full roster by default while allowing focused
participant inspection. `entangle user-nodes clients --node <nodeId>` should
return only the selected User Node client summary and should limit optional
health probing to that selected endpoint.

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

- Add a small `filterUserNodeClientSummariesForCli` helper.
- Add `--node <nodeId>` to the `user-nodes clients` command.
- Apply the filter before optional health checks so `--check-health --node`
  probes only the selected User Client endpoint.
- Add unit coverage for selected-node filtering.
- Update the canonical docs and wiki baseline.

## Tests Required

- CLI user-node output tests.
- CLI typecheck.
- Focused CLI lint.
- CLI help check for `user-nodes clients --node`.
- Product naming guard.
- Diff whitespace check.
- Changed-file local-assumption marker audit.

## Migration And Compatibility Notes

The command remains backward compatible: omitting `--node` keeps returning the
full roster. Missing node ids produce an empty client list instead of a Host
mutation or runtime command.

## Risks And Mitigations

- Risk: operators may expect a missing node id to fail. Mitigation: the command
  is an inspection surface, and returning an empty list matches filter
  semantics while avoiding false runtime errors.
- Risk: health checks could still probe all clients. Mitigation: filtering is
  applied before `attachUserNodeClientHealthForCli`.

## Open Questions

Future CLI parity may add richer participant-scoped chat and approval inbox
filters, but this slice only narrows the User Client endpoint roster.

## Verification

Completed in this slice:

- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli test -- user-node-output.test.ts`
- `./node_modules/.bin/tsc -b apps/cli/tsconfig.json --pretty false`
- `./node_modules/.bin/eslint apps/cli/src/index.ts apps/cli/src/user-node-output.ts apps/cli/src/user-node-output.test.ts --max-warnings 0`
- `npm exec --yes pnpm@10.18.3 -- --filter @entangle/cli dev user-nodes clients --help`
- `node scripts/check-active-product-naming.mjs`
- `git diff --check`
- changed-file local-assumption marker audit; relevant hits were existing
  Docker/local adapter documentation and tests, not invalid new local-only
  assumptions from this slice
