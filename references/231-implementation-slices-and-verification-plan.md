# Implementation Slices And Verification Plan

## Current Repo Truth

The repo already follows a slice discipline: each implemented runtime
capability has a reference record, tests, wiki log entry, and usually a
coherent commit. The root `pnpm verify` gate runs lint, typecheck, and tests.
Same-machine deployment smokes cover Compose, diagnostics, reliability,
disposable runtime, and preview demo.

The federated pivot is larger than the earlier same-machine delivery plan. It
must proceed in large but controlled slices with audit loops after each slice.

## Target Model

Each slice must keep contracts, Host, runner, clients, tests, docs, and wiki in
sync. A slice is not done until:

- code and docs agree;
- targeted tests pass;
- broader tests run when shared contracts changed;
- local-only assumptions are searched and classified;
- `git diff` is reviewed;
- the coherent batch is committed.

## Impacted Modules/Files

All major packages are impacted across the full plan:

- `packages/types`
- `packages/validator`
- `services/host`
- `services/runner`
- `packages/host-client`
- `apps/cli`
- `apps/studio`
- `deploy`
- `scripts`
- `README.md`
- `references`
- `wiki`

## Concrete Changes Required

### Slice 1: Federated Contracts

Add Host Authority, User Node identity, runner registration, assignment,
lease, control event, observe event, projection, and gateway schemas. Export
them from `packages/types`. Add semantic validator coverage.

Implementation record:

- [232-federated-contracts-slice.md](232-federated-contracts-slice.md)

Verification:

- `pnpm --filter @entangle/types test`
- `pnpm --filter @entangle/validator test`
- `pnpm typecheck`

### Slice 2: Host Authority Store

Add Host Authority state, key generation, status, export/import, and signature
helpers. Add Host API and client read surfaces.

Implementation record:

- [233-host-authority-store-slice.md](233-host-authority-store-slice.md)

Verification:

- Host unit tests;
- host-client tests;
- CLI status smoke for authority.

### Slice 3: Nostr Control/Observe Transport

Add publish/subscribe transport for `entangle.control.v1` and
`entangle.observe.v1`, including signing, verification, NIP-59 wrapping, and
dedupe.

Implementation record:

- [234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md)

Verification:

- Host and runner transport tests;
- relay-backed smoke where feasible.

### Slice 4: Runner Registry

Implement runner hello, pending registration, trust, revoke, heartbeat, and
stale/offline projection.

Implementation record:

- [235-runner-registry-slice.md](235-runner-registry-slice.md)

Verification:

- Host registry tests;
- CLI runner commands;
- Studio helper tests.

### Slice 5: Assignment Lifecycle

Implement assignment offer, accept, reject, revoke, and lease handling. Keep
assignment state separate from Docker runtime state.

Implementation record:

- [236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md)

Verification:

- assignment reducer tests;
- Host API tests;
- runner acceptance tests.

### Slice 6: Generic Runner Bootstrap

Allow runner to start from join config without graph context, receive
assignment offers, and emit signed receipts, acceptance, or rejection. This
slice introduces an explicit materializer boundary; the real federated
materializer that fetches Host-signed graph/resource snapshots and starts the
node service is the next runner-runtime slice.

Implementation record:

- [237-generic-runner-bootstrap-slice.md](237-generic-runner-bootstrap-slice.md)
- [248-runner-default-assignment-materializer-slice.md](248-runner-default-assignment-materializer-slice.md)
- [256-portable-runtime-bootstrap-bundle-slice.md](256-portable-runtime-bootstrap-bundle-slice.md)

Verification:

- runner bootstrap tests without `ENTANGLE_RUNTIME_CONTEXT_PATH`;
- negative tests for missing/invalid Host Authority.
- authenticated bootstrap bundle tests;
- runner materialization tests proving package/memory snapshots are written
  under runner-owned assignment state.

### Slice 7: Local Adapter Rebase

Change Docker federated dev profile to launch generic runners and assign them through
the same protocol. Shared volumes may remain only for local launcher state, not
canonical Host observation.

Implementation record:

- [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md)

Verification:

- local runtime smoke;
- no-shared-observation assertions.

Current status:

- `ops:smoke-federated-process-runner` now starts a real joined runner process,
  assigns a node through the Host control plane, starts the assigned runtime
  from a portable bootstrap bundle, publishes a signed User Node message over
  the live relay, verifies runner-owned session/conversation intake, and
  verifies Host projection of the User Node conversation without requiring
  model-provider credentials. It now also starts a second real joined runner
  process for the graph User Node, assigns it as a `human_interface` runtime,
  verifies its projected User Client URL, checks User Client health, and proves
  Host, agent runner, and User Node runner state roots are isolated.

### Slice 8: ProjectionStore

Create projection reducers and Host APIs backed by signed observations.
Gradually move sessions, turns, approvals, artifacts, source, and wiki surfaces
off direct runtime file reads.

Implementation record:

- [239-host-projection-snapshot-slice.md](239-host-projection-snapshot-slice.md)
- [252-federated-runtime-projection-surface-slice.md](252-federated-runtime-projection-surface-slice.md)
- [255-public-runtime-api-path-boundary-slice.md](255-public-runtime-api-path-boundary-slice.md)
- [257-federated-session-conversation-observations-slice.md](257-federated-session-conversation-observations-slice.md)
- [269-runner-observed-ref-emission-slice.md](269-runner-observed-ref-emission-slice.md)
- [270-source-change-ref-summary-projection-slice.md](270-source-change-ref-summary-projection-slice.md)

Verification:

- projection reducer tests;
- Host API parity tests;
- CLI/Studio regression tests.

Current status:

- runtime projection is public through Host/CLI/Studio;
- public runtime inspection no longer exposes `contextPath`;
- session and conversation observations now flow from joined runners to Host
  projection for the first User Node conversation path;
- turn phase observations now flow from joined runners to Host
  `runner.turn.updated` events;
- joined agent runners now emit observed artifact, source-change candidate, and
  wiki refs during normal turn execution, feeding Host projection through the
  same `entangle.observe.v1` path;
- observed source-change refs now include bounded source-change summaries for
  projection consumers;
- deep runtime detail endpoints still need projection-backed replacement.

### Slice 9: User Node Runtime

Add stable user-node identity records, assignable `human_interface` runtimes,
Human Interface Runtime startup, a dedicated User Client, gateway signing,
inbox/outbox projection, and multi-user support.

Implementation record:

- [240-user-node-identity-slice.md](240-user-node-identity-slice.md)
- [258-human-interface-runtime-realignment-plan.md](258-human-interface-runtime-realignment-plan.md)
- [259-user-node-inbox-client-slice.md](259-user-node-inbox-client-slice.md)
- [260-multi-user-human-runtime-smoke-slice.md](260-multi-user-human-runtime-smoke-slice.md)
- [261-user-node-message-history-slice.md](261-user-node-message-history-slice.md)
- [262-user-node-inbound-message-intake-slice.md](262-user-node-inbound-message-intake-slice.md)
- [263-user-node-approval-controls-slice.md](263-user-node-approval-controls-slice.md)
- [264-user-node-artifact-ref-rendering-slice.md](264-user-node-artifact-ref-rendering-slice.md)
- [265-user-node-artifact-preview-slice.md](265-user-node-artifact-preview-slice.md)
- [266-user-node-source-change-diff-preview-slice.md](266-user-node-source-change-diff-preview-slice.md)
- [267-user-node-approval-response-context-slice.md](267-user-node-approval-response-context-slice.md)
- [268-user-client-message-delivery-state-slice.md](268-user-client-message-delivery-state-slice.md)
- [271-user-client-source-summary-projection-slice.md](271-user-client-source-summary-projection-slice.md)
- [272-cli-user-node-approval-context-slice.md](272-cli-user-node-approval-context-slice.md)
- [273-user-client-projected-source-diff-excerpt-slice.md](273-user-client-projected-source-diff-excerpt-slice.md)
- [278-user-node-local-read-state-slice.md](278-user-node-local-read-state-slice.md)
- [279-user-client-wiki-ref-projection-slice.md](279-user-client-wiki-ref-projection-slice.md)
- [280-user-node-read-receipt-slice.md](280-user-node-read-receipt-slice.md)
- [281-projected-wiki-preview-slice.md](281-projected-wiki-preview-slice.md)
- [283-user-node-parent-message-read-model-slice.md](283-user-node-parent-message-read-model-slice.md)
- [284-user-node-delivery-retry-state-slice.md](284-user-node-delivery-retry-state-slice.md)
- [287-user-client-runtime-status-live-refresh-slice.md](287-user-client-runtime-status-live-refresh-slice.md)
- [288-user-client-source-candidate-review-slice.md](288-user-client-source-candidate-review-slice.md)
- [290-human-interface-json-api-slice.md](290-human-interface-json-api-slice.md)
- [291-human-interface-json-api-smoke-slice.md](291-human-interface-json-api-smoke-slice.md)
- [292-dedicated-user-client-app-slice.md](292-dedicated-user-client-app-slice.md)
- [293-runtime-served-user-client-assets-slice.md](293-runtime-served-user-client-assets-slice.md)
- [294-docker-user-client-packaging-slice.md](294-docker-user-client-packaging-slice.md)

Current status:

- stable User Node identities exist;
- User Nodes map to `human_interface` assignments;
- multiple User Nodes can be assigned to distinct `human_interface` runners in
  focused Host tests;
- joined runners start a minimal Human Interface Runtime for assigned User
  Nodes;
- Host bootstrap and identity-secret APIs now support User Nodes;
- Host projection, Studio, and CLI can carry/display the Human Interface
  Runtime `clientUrl`;
- the process-boundary smoke covers one assigned agent runner plus one assigned
  User Node `human_interface` runner with a live User Client health check;
- Host now exposes a User Node-specific projected inbox API;
- CLI inbox commands and the runner-served User Client use that inbox API;
- the User Client has a first usable server-rendered conversation list,
  selected thread metadata, `/api/state`, recorded inbound/outbound messages,
  approval response controls, approval resource rendering, source-change diff
  preview, projected source-change summary rendering, projected source diff
  excerpts with runtime-diff fallback, scoped approval-response context,
  artifact-ref rendering, projection-backed bounded artifact preview with
  runtime fallback, delivery labels, local conversation read state, projected
  wiki-ref rendering, projected wiki preview rendering, wiki-scoped approval
  context rendering, signed read receipts, parent-message links, message
  delivery retry state, runtime status, live state refresh, local JSON APIs for
  selected conversation detail and message publishing, and Host-mediated
  source-candidate accept/reject controls stamped with the running User Node id,
  and message publishing that preserves selected conversation/session context;
- the CLI signed User Node `approve`, `reject`, and generic
  `user-nodes message` commands can now carry the same optional scoped
  approval-response operation/resource/reason metadata;
- the process-boundary smoke now proves two User Nodes assigned to two distinct
  `human_interface` runner processes, each with its own User Client endpoint
  and stable publishing pubkey, and now drives the primary user publish,
  selected conversation inspection, and approval response through the running
  User Client JSON API;
- a first dedicated `apps/user-client` app exists and consumes the Human
  Interface Runtime JSON API for runtime state, conversations, message publish,
  and approval response;
- the Human Interface Runtime can serve configured static User Client assets
  from `ENTANGLE_USER_CLIENT_STATIC_DIR`;
- the federated dev runner image now bundles the built User Client app and sets
  `ENTANGLE_USER_CLIENT_STATIC_DIR` by default;
- the Docker launcher adapter can publish a configurable, deterministic host
  port and public User Client URL for User Node runtime contexts;
- projection-backed source/wiki review and richer artifact object-backend
  review remain open.

Verification:

- user-node identity tests;
- multiple user-node graph tests;
- Human Interface Runtime assignment and endpoint projection tests;
- inbox/outbox projection tests.

### Slice 10: Signed User Conversations And Approvals

Convert session launch, replies, approvals, and rejections to signed User Node
A2A messages. Retire direct approval mutation as canonical behavior.

Implementation record:

- [241-signed-user-node-messages-slice.md](241-signed-user-node-messages-slice.md)
- [272-cli-user-node-approval-context-slice.md](272-cli-user-node-approval-context-slice.md)
- [275-cli-user-node-approval-from-message-slice.md](275-cli-user-node-approval-from-message-slice.md)
- [276-user-node-message-lookup-slice.md](276-user-node-message-lookup-slice.md)

Verification:

- signed task/reply/approval tests;
- Studio and CLI user action tests;
- negative Host-signed user-message tests.

### Slice 11: Artifact, Source, And Wiki Ref Projection

Add projection records and Host reducers for observed artifact refs,
source-change refs, and wiki refs.

Implementation record:

- [242-observed-artifact-source-wiki-refs-slice.md](242-observed-artifact-source-wiki-refs-slice.md)
- [277-projected-artifact-preview-slice.md](277-projected-artifact-preview-slice.md)

Verification:

- projection contract tests;
- Host reducer/projection tests;
- no new runner filesystem read paths.

### Future Slice: Engine Adapter Upgrade

Keep OpenCode default. Move beyond only one-shot `opencode run` where needed
by attaching to OpenCode server APIs for sessions, permissions, events, abort,
and long-running state. Preserve Entangle policy and projection ownership.

Implementation record:

- [286-opencode-tool-evidence-slice.md](286-opencode-tool-evidence-slice.md)
  adds bounded generic tool evidence from OpenCode JSON events while preserving
  the adapter boundary.
- [289-opencode-server-health-probe-slice.md](289-opencode-server-health-probe-slice.md)
  verifies attached OpenCode server health and version before launching
  `opencode run --attach`.

Verification:

- OpenCode adapter tests using mocked server/SDK;
- permission bridge tests;
- cancellation tests;
- source/artifact/wiki observation tests;
- bounded tool evidence contract and presentation tests.
- attached-server health and auth probe tests.

### Slice 12: Studio And CLI Federation Surfaces

Add first-pass authority, runners, assignments, projection, User Node identity,
projection inbox, reply, approve, and reject surfaces. Full transport health
and Studio chat remain follow-up work.

Implementation record:

- [243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)

Verification:

- CLI command tests;
- Studio helper/component tests;
- lint and typecheck.

This slice now includes first-pass CLI assignment/User Node/inbox/reply/
approve/reject commands, scoped CLI approval-response context flags, and a
Studio projection/User Node panel with runtime placement, User Client URL,
conversation, active, unread, and pending-approval counts. CLI approve/reject
can now derive signed response context from directly looked-up recorded
approval-request messages. Full Studio chat, signed approval card migration,
and durable inbox/outbox projection remain follow-up work.

### Slice 13: Product Naming Migration

Update current product docs and user-facing copy to Entangle. Keep Local as a
profile.

Implementation record:

- [244-product-naming-migration-slice.md](244-product-naming-migration-slice.md)

Verification:

- naming audit search;
- docs review;
- CLI/Studio tests where wording is asserted.

### Slice 14: Distributed Smoke

Add smoke path that can run Host and runners with separate filesystem roots and
shared reachable relay/git backend.

Implementation records:

- [253-live-relay-federated-smoke-slice.md](253-live-relay-federated-smoke-slice.md)
- [254-process-runner-federated-smoke-slice.md](254-process-runner-federated-smoke-slice.md)

Current status:

- live relay control/observe smoke is implemented;
- separate OS process runner smoke is implemented;
- the same-machine but topology-agnostic fast product proof now runs with one
  assigned agent runner and one assigned User Node `human_interface` runner
  exposing and serving a User Client endpoint;
- the same process proof now includes a second User Node assigned to a second
  `human_interface` runner;
- the same process proof now uses the running User Client JSON API for the
  first user publish, selected conversation inspection, and approval response;
- the remaining distributed proof is the three-machine/multi-network demo with
  reachable relay and git service.

Verification:

- distributed smoke;
- local Docker adapter smoke;
- full `pnpm verify`.

## Tests Required

Minimum full pivot gates:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify`
- contract/schema tests if `packages/types` changed;
- validator tests if semantics changed;
- Host tests for authority, registry, assignment, projection;
- runner tests for bootstrap, transport, assignment, observations;
- host-client tests;
- CLI tests;
- Studio tests;
- federated dev profile smoke;
- distributed smoke.

## Migration/Compatibility Notes

Because the project has not released publicly, controlled breaking changes are
acceptable. Still, preserve local adapter operations long enough to compare old
and new behavior and to keep the current demo path useful.

## Risks And Mitigations

- Risk: pivot scope is too large for one batch.
  Mitigation: commit every slice atomically and keep docs current.
- Risk: federation introduces security regressions.
  Mitigation: role-specific signature validation and negative tests.
- Risk: OpenCode integration consumes the product.
  Mitigation: use OpenCode behind engine adapter; Entangle owns graph,
  identity, policy, projection, artifacts, and user-node surfaces.
- Risk: Studio/CLI drift.
  Mitigation: host-client contracts first, shared presentation helpers where
  practical, and matching tests.

## Open Questions

- Should the distributed smoke initially use multiple local processes with
  isolated temp roots, or require three physical/VM machines? Start with local
  isolated roots in CI and document the physical-machine proof demo.
