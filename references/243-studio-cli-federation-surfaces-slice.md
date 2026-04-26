# Studio CLI Federation Surfaces Slice

## Current Repo Truth

Host already exposes Host Authority, runner registry, runtime assignment,
projection, User Node identity, and signed User Node message endpoints. The
host-client has matching methods for those endpoints.

Before this slice, CLI had authority and runner commands, but lacked assignment
commands, User Node identity/message commands, and projection-backed inbox
commands. Studio still focused on local runtime detail and did not show the
federated projection or stable User Node identities.

Studio and CLI still contain legacy local-runtime surfaces for sessions,
approvals, artifacts, source, wiki, and runtime lifecycle. Those surfaces remain
useful compatibility tools, but they are not yet the complete federated user
interaction runtime.

## Target Model

Studio and CLI should be Host-facing surfaces for the same federated projection:

- operator mode shows Host projection freshness, runner placement, assignments,
  artifact/source/wiki refs, and transport health;
- user mode shows User Node identities, conversations, replies, approvals, and
  artifact/source/wiki handoffs;
- user replies and approval decisions are published as signed User Node A2A
  messages through Host gateway endpoints;
- neither Studio nor CLI directly commands runners.

## Impacted Modules/Files

- `apps/cli/src/index.ts`
- `apps/cli/src/assignment-output.ts`
- `apps/cli/src/assignment-output.test.ts`
- `apps/cli/src/user-node-output.ts`
- `apps/cli/src/user-node-output.test.ts`
- `apps/studio/src/App.tsx`
- `apps/studio/src/styles.css`
- `apps/studio/src/federation-inspection.ts`
- `apps/studio/src/federation-inspection.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- add CLI assignment list/get/offer/revoke commands;
- add `host nodes assign <nodeId> --runner <runnerId>` as a node placement
  shortcut over the same assignment offer endpoint;
- add CLI User Node list/get/message commands;
- add top-level CLI `reply`, `approve`, and `reject` commands that publish
  signed User Node A2A messages;
- add projection-backed CLI inbox list/show commands for User Node conversation
  records;
- add CLI presentation helpers and tests for assignments, User Node identities,
  message publication, and inbox conversations;
- load Host projection and User Node identity records in Studio overview;
- add a Studio federation panel showing projection freshness, runner and
  assignment counts, artifact/source/wiki ref counts, User Node counts, and
  projected User Node conversations;
- add Studio federation presentation helpers and tests.

Deferred to later slices:

- full Studio chat composer and threaded conversation detail;
- full Studio signed approve/reject migration for existing approval cards;
- projection-backed replacement of legacy runtimeRoot-backed session, approval,
  artifact, source, and wiki detail endpoints;
- standalone `entangle-runner join` packaging polish;
- transport health panel fed by live control/observe relay status.

## Tests Required

- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test`
- `pnpm --filter @entangle/cli lint`
- `pnpm --filter @entangle/studio typecheck`
- `pnpm --filter @entangle/studio test`
- `pnpm --filter @entangle/studio lint`
- `pnpm typecheck`
- `git diff --check`

Verification record for the implemented slice:

- `pnpm --filter @entangle/cli typecheck` passed;
- `pnpm --filter @entangle/cli test` passed;
- `pnpm --filter @entangle/cli lint` passed;
- `pnpm --filter @entangle/studio typecheck` passed;
- `pnpm --filter @entangle/studio test` passed;
- `pnpm --filter @entangle/studio lint` passed;
- `pnpm typecheck` passed;
- `git diff --check` passed.

## End-Of-Slice Audit

This slice adds no direct runner filesystem reads and does not make Studio or
CLI talk to runners. New user actions call Host gateway endpoints, which sign
with stable User Node key material already owned by the User Node identity
slice.

Remaining local-only assumptions are existing compatibility paths: local Docker
runtime lifecycle, effective runtime context loading, and runtimeRoot-backed
legacy inspection APIs. They should be removed only after projection-backed
replacement endpoints exist.

## Migration/Compatibility Notes

The new commands and Studio panel are additive. Existing CLI and Studio local
runtime surfaces remain available. The CLI inbox commands expose the current
projection record only; they do not claim to be a durable message store until
the User Node inbox/outbox projection reducer exists.

## Risks And Mitigations

- Risk: CLI appears to offer full inbox semantics while only projection records
  exist.
  Mitigation: command descriptions and docs call it projection-backed inbox
  inspection.
- Risk: Studio federation panel becomes stale if projection refresh fails.
  Mitigation: the panel shows projection and User Node loading errors
  independently from the rest of overview loading.
- Risk: approval commands bypass graph policy.
  Mitigation: Host still validates enabled outbound User Node edges before
  publishing signed messages.

## Open Questions

No open question blocks this slice. The next high-value user-surface work is to
move Studio approval cards and session launch forms onto signed User Node
message publication rather than legacy mutation paths.
