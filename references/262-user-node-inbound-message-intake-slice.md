# User Node Inbound Message Intake Slice

## Current Repo Truth

User Nodes could publish signed outbound messages through the Host gateway and
the User Client could render those outbound records. A running
`human_interface` runtime did not yet listen as the User Node on the A2A relay,
so agent-to-user messages could be sent over Nostr but were not recorded in the
User Node inbox.

## Target Model

A running User Node is a graph participant. Its Human Interface Runtime owns the
User Client surface, subscribes to A2A messages addressed to the User Node
identity, and forwards bounded inbox observations to Host projection. Host
persists the message record and exposes it through the same conversation detail
API used by outbound records.

This keeps Studio as the operator surface and makes the per-node User Client the
human participant surface.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/state.ts`
- `services/host/src/index.test.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `services/host/scripts/federated-process-runner-smoke.ts`
- `references/263-user-node-approval-controls-slice.md`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `references/259-user-node-inbox-client-slice.md`
- `references/261-user-node-message-history-slice.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added a `userNodeInboundMessageRecordRequestSchema` contract;
- added `POST /v1/user-nodes/:nodeId/messages/inbound`;
- added Host persistence for inbound message records after validating that the
  decrypted A2A message is addressed to the target User Node identity;
- merged User Node message records into inbox projection so outbound-only or
  inbound-only conversations can appear before a runner conversation observation
  exists;
- made the Human Interface Runtime subscribe with the User Node identity when
  key material is available and post inbound A2A envelopes back to Host;
- extended the process runner smoke with a synthetic signed builder-to-user
  A2A message, avoiding any live model-provider dependency.

Deferred:

- browser-side key custody/signing;
- inbound delivery/read receipt state;
- artifact/source/wiki review panels;
- direct User Client relay storage independent of Host projection.

Follow-up implemented:

- `263-user-node-approval-controls-slice.md` adds approval metadata retention
  and approve/reject controls in the User Client.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- lints for changed packages;
- `node --check scripts/smoke-federated-process-runner.mjs`;
- process runner smoke against a live relay.

Verification record:

- focused typechecks passed for `types`, `host`, and `runner` before docs;
- focused tests passed for `host` and `runner`; `types` failed once on the
  missing required `parentMessageId` for `task.result`, then passed after the
  fixture was corrected;
- package lints passed for `types`, `host`, and `runner`;
- `node --check scripts/smoke-federated-process-runner.mjs` passed;
- `pnpm ops:smoke-federated-process-runner -- --relay-url ws://localhost:7777 --timeout-ms 60000`
  passed against the federated dev relay, including
  `user-node-inbound-message-history`, two User Node runtimes, and filesystem
  isolation.

## Migration/Compatibility Notes

The new inbound endpoint and records are additive. Existing outbound message
records keep the same shape. Inbox projection now uses message records as an
additional projection source, so conversations can become visible earlier than
runner conversation observations.

## Risks And Mitigations

- Risk: Host records messages that are not for the selected User Node.
  Mitigation: the endpoint rejects messages whose `toNodeId` or `toPubkey` do
  not match the inspected User Node identity.
- Risk: relay subscription failure prevents inbound intake while leaving the
  HTTP User Client usable.
  Mitigation: startup keeps the client available and the process smoke covers
  the successful relay-backed path.
- Risk: Host sees decrypted inbound summaries.
  Mitigation: this is a bounded projection bridge for the current Host-backed
  User Client; browser-side key custody and local User Client storage remain a
  separate hardening step.

## Open Questions

The next design choice is whether the dedicated User Client should keep its own
local encrypted inbox store and sync only bounded projections to Host, or
whether Host projection remains the canonical participant inbox for v1.
