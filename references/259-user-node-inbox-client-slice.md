# User Node Inbox Client Slice

## Current Repo Truth

Before this slice, a running User Node `human_interface` runtime served a basic
HTML shell. It could publish User Node messages through Host, but it fetched the
global Host projection directly and rendered projected conversations as raw
JSON.

CLI inbox commands also filtered `/v1/projection` client-side. That worked, but
it kept the User Node surface coupled to the global operator projection instead
of giving the Human Interface Runtime its own Host boundary.

## Target Model

The Human Interface Runtime should use a User Node-specific Host API for
participant state. The first usable client can still be runner-served and
server-rendered, but it should expose:

- runtime health;
- JSON state for automation and future client app replacement;
- conversation list;
- selected thread metadata;
- message publishing that can reuse selected conversation/session context;
- no direct browser access to the Host bearer token.

Studio remains the operator surface. CLI remains a headless/development gateway
over the same Host boundary.

## Impacted Modules/Files

- `packages/types/src/host-api/user-nodes.ts`
- `packages/types/src/projection/projection.ts`
- `packages/types/src/index.test.ts`
- `services/host/src/index.ts`
- `services/host/src/index.test.ts`
- `services/host/src/state.ts`
- `packages/host-client/src/index.ts`
- `packages/host-client/src/index.test.ts`
- `apps/cli/src/index.ts`
- `services/runner/src/human-interface-runtime.ts`
- `services/runner/src/index.test.ts`
- `references/221-federated-runtime-redesign-index.md`
- `references/226-user-node-and-human-interface-runtime-spec.md`
- `references/229-studio-cli-operator-and-user-surfaces-spec.md`
- `references/231-implementation-slices-and-verification-plan.md`
- `references/258-human-interface-runtime-realignment-plan.md`
- `wiki/log.md`

## Concrete Changes Required

Implemented in this slice:

- added `userNodeInboxResponseSchema`;
- enriched projected User Node conversations with conversation status,
  session id, last message type, and artifact ids when available from signed
  conversation observations;
- added `GET /v1/user-nodes/:nodeId/inbox`;
- added `getUserNodeInbox()` to `packages/host-client`;
- moved CLI `inbox list` and `inbox show` to the new User Node inbox API;
- added `GET /api/state` to the Human Interface Runtime;
- replaced raw JSON conversation rendering with a usable server-rendered User
  Client shell that shows conversation list, selected thread metadata, target
  selection, message type, and message composer;
- made the User Client preserve selected conversation/session ids when sending
  replies or answers through the Host User Node gateway.

Deferred:

- durable per-message inbox/outbox history;
- unread/read state owned by the User Node client;
- approval.response controls with approval metadata;
- artifact/source/wiki review panels;
- replacing the server-rendered shell with a bundled `apps/user-client`
  application;
- moving User Node key custody out of Host-provisioned development storage.

## Tests Required

- `pnpm --filter @entangle/types typecheck`
- `pnpm --filter @entangle/host typecheck`
- `pnpm --filter @entangle/host-client typecheck`
- `pnpm --filter @entangle/cli typecheck`
- `pnpm --filter @entangle/runner typecheck`
- `pnpm --filter @entangle/types test -- index.test.ts`
- `pnpm --filter @entangle/host test -- index.test.ts`
- `pnpm --filter @entangle/host-client test -- index.test.ts`
- `pnpm --filter @entangle/runner test -- index.test.ts`
- `pnpm --filter @entangle/cli test -- user-node-output.test.ts projection-output.test.ts`
- package lints for changed packages;
- process runner smoke after the UI/API change.

Verification record:

- focused typechecks passed for types, Host, host-client, CLI, and runner;
- focused tests passed for types, Host, host-client, CLI, and runner;
- package lints passed for types, Host, host-client, CLI, and runner;
- process runner smoke passed against the federated dev `strfry` relay on
  `ws://localhost:7777` after the User Client/inbox change, including
  `/api/state` verification for the assigned User Node and builder edge target.

## Migration/Compatibility Notes

The new inbox API is additive. Existing global projection remains available for
operator surfaces, Studio projection summaries, and development inspection.

The Human Interface Runtime still posts through Host, so the Host bearer token
stays server-side in the runner process and is not exposed to the browser.

## Risks And Mitigations

- Risk: the server-rendered User Client becomes the final product UI by
  accident.
  Mitigation: keep this documented as the first usable runtime shell and leave
  the bundled `apps/user-client` app as the next richer implementation.
- Risk: conversation projection looks like full message history.
  Mitigation: the docs and UI call this a projected conversation list; durable
  per-message inbox/outbox remains explicit deferred work.
- Risk: User Client can bypass graph policy.
  Mitigation: message publishing still goes through Host, which validates the
  selected User Node has an enabled outbound edge to the target node.

## Open Questions

No product question blocks this slice. The next decision is whether the richer
User Client should be bundled as `apps/user-client` and served statically by the
Human Interface Runtime, or remain server-rendered until inbox/outbox reducers
are complete.
