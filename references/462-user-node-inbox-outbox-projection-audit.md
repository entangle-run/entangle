# User Node Inbox Outbox Projection Audit

## Current repo truth

The current codebase already has durable User Node inbox/outbox projection:

- `packages/types/src/host-api/user-nodes.ts` defines
  `UserNodeMessageRecord`, inbox responses, conversation detail responses, and
  read-marker responses.
- `packages/types/src/projection/projection.ts` defines
  `UserConversationProjectionRecord` and includes `userConversations` in Host
  projection.
- `services/host/src/state.ts` persists inbound and outbound User Node message
  records under Host-observed state, persists read markers, and builds
  projected User Node conversations from observed conversation activity plus
  message history.
- `services/host/src/index.ts` exposes User Node inbox, conversation detail,
  direct message lookup, inbound message recording, outbound publish, and
  conversation read routes.
- `packages/host-client`, `apps/cli`, and `apps/user-client` consume the same
  Host/User Node APIs.
- Host, runner, and User Client tests cover inbox state, inbound/outbound
  message history, selected conversation publishing, and read markers.

The `durable user-node inbox/outbox projection` entry in the Studio/CLI surface
spec was stale.

## Target model

User Node inbox/outbox history should remain Host-projected and durable enough
for User Client, CLI, and Studio/operator summaries to agree on conversation
state. Participant messages remain signed User Node messages; Studio remains an
operator surface.

## Impacted modules and files

- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/README.md`
- `wiki/log.md`

## Concrete changes required

- Remove the stale missing-surface entry.
- Document the implemented Host projection and persisted inbound/outbound
  message record path as current repo truth.
- Keep richer participant source/wiki review and reassignment/health panels as
  real remaining work.

## Tests required

No new code tests are required for this documentation-only audit. Existing
coverage already includes:

- Host User Node inbox/conversation/message tests in `services/host/src/index.test.ts`;
- Human Interface Runtime/User Client API tests in `services/runner/src/index.test.ts`;
- User Client runtime API tests in `apps/user-client/src/runtime-api.test.ts`;
- type contract coverage in `packages/types/src/index.test.ts`.

## Migration and compatibility

No runtime migration is required. This slice corrects documentation drift.

## Risks and mitigations

- Risk: removing the stale missing item hides future UX gaps.
  Mitigation: the spec keeps richer User Node runtime reassignment, health, and
  participant-side source/wiki review flows as explicit open work.

## Open questions

- Whether User Node message history should later be exportable as a separate
  memory/wiki repository for that User Node remains a product design question.
