# User Node Client Workload Summary Slice

## Current Repo Truth

`entangle user-nodes clients` joins User Node identities with Host-projected
Human Interface Runtime placement. It already shows runtime assignment, runner,
desired/observed state, client URL, and last-seen fields.

Before this slice, the command did not summarize each User Node's participant
workload. Operators could inspect conversations and command receipts through
separate commands, but the User Client endpoint list did not show unread
conversation load, pending approvals, or command receipt health.

## Target Model

The headless User Node client overview should be useful as an operational
roster. An operator can see which human nodes are running, where their clients
are reachable, and whether they have unread work, pending approvals, or failed
participant-requested runtime commands.

## Impacted Modules And Files

- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `README.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/overview.md`
- `wiki/log.md`

## Concrete Changes Required

- Extend `UserNodeClientCliSummary` with:
  - conversation count;
  - unread count;
  - pending approval count;
  - latest message timestamp;
  - participant-requested command receipt count;
  - failed command receipt count.
- Derive conversation counts from Host projection `userConversations`.
- Derive command receipt counts from Host projection records with
  `requestedBy === userNodeId`.
- Keep the existing JSON output shape additive so current consumers remain
  compatible.

## Tests Required

- CLI User Node output tests for runtime placement plus workload summary
  projection.
- CLI typecheck and lint.

## Migration And Compatibility Notes

The command remains read-only and still uses Host projection. Existing scripts
that ignore additional JSON fields remain compatible.

The counts are operator projection summaries, not signed User Node messages and
not a participant-side authorization decision.

## Risks And Mitigations

- Risk: command receipt counts from the full projection differ from the
  participant-scoped Host route.
  Mitigation: both use the same `requestedBy` attribution rule; the scoped
  route remains the authoritative participant read path.
- Risk: the clients command becomes too noisy.
  Mitigation: the added fields are compact counts and timestamps, not embedded
  conversation or receipt detail.

## Open Questions

None for this slice.

## Verification

Completed in this slice:

- `pnpm --filter @entangle/cli test -- src/user-node-output.test.ts`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli lint`
