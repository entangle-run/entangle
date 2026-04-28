# User Node Message Lookup Slice

## Current Repo Truth

User Node conversation detail exposes recorded inbound/outbound messages through
`GET /v1/user-nodes/:nodeId/inbox/:conversationId`. CLI
`approve/reject --from-message` initially resolved a message by scanning all
projected conversations and loading each conversation detail.

Before this slice, Host did not expose a direct lookup route for one recorded
User Node message by event id.

## Target Model

User Node clients should be able to resolve one recorded message without
scanning conversation history:

```http
GET /v1/user-nodes/:nodeId/messages/:eventId
```

This remains a Host projection/read-model surface. It does not command runners
and does not mint message truth outside recorded User Node message records.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `packages/host-client/src/index.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `apps/cli/src/index.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/275-cli-user-node-approval-from-message-slice.md`
- `references/README.md`
- `README.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `userNodeMessageInspectionResponseSchema`;
- added Host state lookup for one recorded User Node message by event id;
- added `GET /v1/user-nodes/:nodeId/messages/:eventId`;
- added host-client `getUserNodeMessage(nodeId, eventId)`;
- updated CLI `approve/reject --from-message` to use the direct lookup instead
  of scanning inbox conversations;
- added contract and Host route tests.

Deferred:

- pagination and filtering for full message history;
- a message lookup route scoped by conversation id for stricter URL structure;
- response correlation that marks an approval request as answered.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/cli test -- user-node-output.test.ts`
- `pnpm --filter @entangle/types lint`
- `pnpm --filter @entangle/host lint`
- `pnpm --filter @entangle/host-client lint`
- `pnpm --filter @entangle/cli lint`
- `node --check scripts/smoke-federated-process-runner.mjs`
- `git diff --check`

Verification record:

- all listed typechecks passed;
- types, Host, and CLI tests passed;
- all listed lints passed;
- process smoke syntax check passed;
- `git diff --check` passed.

## Migration/Compatibility Notes

This is additive. Existing inbox and conversation routes remain unchanged.

## Risks And Mitigations

- Risk: callers may treat message lookup as transport truth.
  Mitigation: naming and response shape keep it under User Node recorded
  message inspection; actual coordination still flows through signed A2A
  messages and Host projection.
- Risk: event ids collide across User Nodes.
  Mitigation: lookup is scoped by `nodeId` and reads the existing
  `userNodeId--eventId` persisted record key.

## Open Questions

Should future message lookup include response-correlation metadata, such as
`answeredByEventId`, for approval request cards?
