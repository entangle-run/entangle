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
- [302-runner-heartbeat-loop-slice.md](302-runner-heartbeat-loop-slice.md)
- [303-runner-heartbeat-config-smoke-slice.md](303-runner-heartbeat-config-smoke-slice.md)

Verification:

- Host registry tests;
- CLI runner commands;
- Studio helper tests.
- runner join heartbeat timer tests.
- process-runner smoke heartbeat projection checks.

Current status:

- Host projects signed heartbeat observations.
- Generic joined runners now emit periodic signed `runner.heartbeat`
  observations with accepted assignment ids and a capacity-derived
  operational state.
- Join configs can optionally tune heartbeat cadence through
  `heartbeatIntervalMs`, and the process-runner smoke validates Host-projected
  heartbeats from all joined runner processes.

### Slice 5: Assignment Lifecycle

Implement assignment offer, accept, reject, revoke, and lease handling. Keep
assignment state separate from Docker runtime state.

Implementation record:

- [236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md)
- [324-federated-runtime-lifecycle-control-slice.md](324-federated-runtime-lifecycle-control-slice.md)
- [326-assignment-receipt-audit-trail-slice.md](326-assignment-receipt-audit-trail-slice.md)
- [327-assignment-receipt-projection-slice.md](327-assignment-receipt-projection-slice.md)
- [328-assignment-receipt-operator-surfaces-slice.md](328-assignment-receipt-operator-surfaces-slice.md)

Verification:

- assignment reducer tests;
- Host API tests;
- runner acceptance tests.
- Host control-plane lifecycle payload tests;
- runner lifecycle command tests.
- process-runner smoke lifecycle command assertions.
- typed Host event and control-plane tests for `assignment.receipt`
  observations.
- Host projection contract/reducer tests for assignment receipt projection.

Current status:

- Host runtime lifecycle routes publish signed `runtime.start`,
  `runtime.stop`, and `runtime.restart` control commands for accepted/active
  federated assignments.
- Joined runners preserve assignment materialization context paths, apply
  lifecycle commands to runner-local runtime handles, and emit signed receipts
  plus `runtime.status` observations.
- Host runtime synchronization no longer reconciles assigned federated nodes
  through the local Docker/memory backend adapter.
- `ops:smoke-federated-process-runner` now proves Host stop/start/restart
  requests reach a real joined runner through the relay and return as projected
  signed runtime observations.
- Signed runner `assignment.receipt` observations now become
  `runtime.assignment.receipt` Host audit events, and the process smoke verifies
  receipt kinds from the real lifecycle path.
- Host projection now exposes bounded `assignmentReceipts` for recent
  assignment lifecycle receipts.
- CLI and Studio now expose compact projected assignment receipt counts and
  recent receipt rows for operator inspection.

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
- [301-runner-join-config-cli-slice.md](301-runner-join-config-cli-slice.md)
- [302-runner-heartbeat-loop-slice.md](302-runner-heartbeat-loop-slice.md)
- [303-runner-heartbeat-config-smoke-slice.md](303-runner-heartbeat-config-smoke-slice.md)

Verification:

- runner bootstrap tests without `ENTANGLE_RUNTIME_CONTEXT_PATH`;
- negative tests for missing/invalid Host Authority.
- authenticated bootstrap bundle tests;
- runner materialization tests proving package/memory snapshots are written
  under runner-owned assignment state.
- CLI join-config helper tests and runner package typecheck/build for
  `entangle-runner join --config`.
- runner heartbeat timer tests for the generic join service.
- process-runner smoke validation that generated process join configs can use a
  short heartbeat interval and project liveness through Host.

### Slice 7: Local Adapter Rebase

Change Docker federated dev profile to launch generic runners and assign them through
the same protocol. Shared volumes may remain only for local launcher state, not
canonical Host observation.

Implementation record:

- [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md)
- [317-docker-join-config-env-slice.md](317-docker-join-config-env-slice.md)

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
  verifies its projected User Client URL, checks User Client health, exercises
  a deterministic OpenCode-adapter task turn through a temporary runner-local
  `opencode` executable, verifies projected turn/source-change
  candidate/approval/session read APIs, and proves Host, agent runner, and
  User Node runner state roots are isolated.
- Docker managed runners can now receive inline join config JSON and the
  federated dev Compose profile selects Docker join mode with Host API bundle
  retrieval, avoiding Host state/secret volume mounts in managed join-mode
  runner containers.

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
- [305-observed-session-projection-pruning-slice.md](305-observed-session-projection-pruning-slice.md)
- [306-projected-session-inspection-slice.md](306-projected-session-inspection-slice.md)
- [307-approval-observation-projection-slice.md](307-approval-observation-projection-slice.md)
- [308-projected-approval-read-api-slice.md](308-projected-approval-read-api-slice.md)
- [309-projected-turn-read-api-slice.md](309-projected-turn-read-api-slice.md)
- [310-process-smoke-opencode-projection-read-api-slice.md](310-process-smoke-opencode-projection-read-api-slice.md)
- [311-runner-lifecycle-observation-completeness-slice.md](311-runner-lifecycle-observation-completeness-slice.md)
- [312-projected-artifact-read-api-slice.md](312-projected-artifact-read-api-slice.md)
- [313-projected-source-candidate-read-api-slice.md](313-projected-source-candidate-read-api-slice.md)
- [314-projected-artifact-preview-api-slice.md](314-projected-artifact-preview-api-slice.md)
- [315-projected-source-candidate-diff-api-slice.md](315-projected-source-candidate-diff-api-slice.md)
- [316-process-smoke-projected-source-candidate-slice.md](316-process-smoke-projected-source-candidate-slice.md)
- [318-projected-source-candidate-file-preview-slice.md](318-projected-source-candidate-file-preview-slice.md)
- [319-projected-memory-wiki-read-api-slice.md](319-projected-memory-wiki-read-api-slice.md)
- [320-projected-artifact-history-diff-read-api-slice.md](320-projected-artifact-history-diff-read-api-slice.md)
- [330-runner-owned-source-history-application-slice.md](330-runner-owned-source-history-application-slice.md)
- [331-projected-source-history-ref-slice.md](331-projected-source-history-ref-slice.md)
- [332-runner-owned-source-history-publication-slice.md](332-runner-owned-source-history-publication-slice.md)
- [333-host-source-history-publication-removal-slice.md](333-host-source-history-publication-removal-slice.md)
- [334-host-source-application-replay-removal-slice.md](334-host-source-application-replay-removal-slice.md)
- [335-host-wiki-publication-removal-slice.md](335-host-wiki-publication-removal-slice.md)

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
- observed activity records now distinguish signed observation-event records
  from same-workstation filesystem imports, local synchronization no longer
  deletes observation-event activity records, and Host session listing can
  surface projected remote sessions that have no local runtime session file;
- Host session inspection now also falls back to bounded projected session
  detail for observed remote sessions when no local runtime session file exists;
- approval lifecycle changes now flow through signed runner
  `approval.updated` observations and Host approval activity projection;
- runtime approval list/detail GET routes now use observed approval projection
  when local runtime approval files are unavailable;
- runtime turn list/detail GET routes now use observed turn projection when
  local runtime turn files are unavailable;
- the process-runner smoke now exercises a deterministic OpenCode-adapter
  `task.request` through a real joined agent runner process and asserts the
  projected turn, source-change candidate list/detail/diff/file, approval, and
  session read APIs over signed observations;
- joined runners now emit session/conversation observations for later lifecycle
  transitions such as handoffs, coordination result/close, approval
  request/response, completion, cancellation, and failure paths;
- runtime artifact list/detail GET routes now merge projected `artifact.ref`
  records with local compatibility files and can serve remote artifact refs
  without Host-readable runner filesystem context;
- runtime artifact preview GET routes now fall back to bounded projected
  `artifact.ref` preview content when local preview files are unavailable, and
  the preview contract no longer requires a runner-local `sourcePath`;
- `source_change.ref` observations can now carry full bounded candidate
  records, and runtime source-change candidate list/detail GET routes can merge
  those projected candidates with local compatibility files;
- runtime source-change candidate diff GET routes can fall back to projected
  `diffExcerpt` evidence when local shadow-git state is unavailable;
- runtime source-change candidate file preview GET routes can fall back to
  bounded projected file preview evidence when local shadow-git state is
  unavailable;
- runtime memory list/page GET routes can fall back to observed `wiki.ref`
  projection records with bounded preview content when local memory files are
  unavailable;
- runtime artifact history/diff GET routes can fall back to projected artifact
  records with explicit unavailable reasons when no backend-resolved repository
  checkout is attached to Host;
- accepted signed source-candidate reviews now make the owning runner record a
  runner-local source-history application and emit the updated candidate through
  `source_change.ref`, so Host projection can see `candidate.application`
  without Host mutating runner-owned files;
- signed `source_history.ref` observations now carry the runner-owned
  `SourceHistoryRecord`, Host projection exposes `sourceHistoryRefs`, and
  runtime source-history list/detail GET routes can return projected entries
  without Host-readable runner filesystem context;
- when source publication policy allows it and a primary git target is
  configured, the owning runner now publishes accepted source-history records as
  git commit artifacts, persists publication metadata locally, and emits both
  `artifact.ref` and updated `source_history.ref` observations;
- the direct Host source-history publication mutation, host-client method, CLI
  `--publish` path, and Studio publish/retry action have been removed so Host
  observes source-history publication instead of owning the push;
- the direct Host source-candidate apply mutation and source-history replay
  mutation/list surfaces have been removed from Host, host-client, CLI, and
  Studio; source application is now public only through signed User Node review
  and runner-owned behavior;
- the direct Host wiki repository publication/list surfaces have been removed
  from Host, host-client, CLI, and Studio; wiki inspection remains public
  through runner-owned sync, signed `wiki.ref` projection, and projected memory
  read fallback;
- deeper artifact history computation, explicit runner-owned wiki publication,
  and mutation endpoints still need projection-backed or backend-resolved
  replacement.

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
- [295-user-client-review-json-actions-slice.md](295-user-client-review-json-actions-slice.md)
- [296-process-smoke-dedicated-user-client-assets-slice.md](296-process-smoke-dedicated-user-client-assets-slice.md)
- [297-cli-user-client-endpoints-slice.md](297-cli-user-client-endpoints-slice.md)
- [298-studio-runtime-assignment-control-slice.md](298-studio-runtime-assignment-control-slice.md)
- [299-studio-runtime-assignment-revocation-slice.md](299-studio-runtime-assignment-revocation-slice.md)
- [321-signed-source-candidate-review-slice.md](321-signed-source-candidate-review-slice.md)
- [322-public-direct-mutation-surface-quarantine-slice.md](322-public-direct-mutation-surface-quarantine-slice.md)
- [323-direct-host-approval-review-api-removal-slice.md](323-direct-host-approval-review-api-removal-slice.md)

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
  selected conversation detail and message publishing, signed source-candidate
  accept/reject messages handled by the owning runner, and message publishing
  that preserves selected conversation/session context;
- the CLI signed User Node `approve`, `reject`, and generic
  `user-nodes message` commands can now carry the same optional scoped
  approval-response operation/resource/reason metadata;
- the process-boundary smoke now proves two User Nodes assigned to two distinct
  `human_interface` runner processes, each with its own User Client endpoint
  and stable publishing pubkey, and now drives the primary user publish,
  selected conversation inspection, signed source-candidate review, runner-owned
  source-history application, and approval response through the running User
  Client JSON API;
- a first dedicated `apps/user-client` app exists and consumes the Human
  Interface Runtime JSON API for runtime state, conversations, message publish,
  and approval response;
- the Human Interface Runtime can serve configured static User Client assets
  from `ENTANGLE_USER_CLIENT_STATIC_DIR`;
- the federated dev runner image now bundles the built User Client app and sets
  `ENTANGLE_USER_CLIENT_STATIC_DIR` by default;
- the Docker launcher adapter can publish a configurable, deterministic host
  port and public User Client URL for User Node runtime contexts;
- the dedicated User Client app now consumes local JSON APIs for artifact
  preview, source diff, source-candidate review, and wiki preview cards;
- the process-runner smoke auto-serves and validates built User Client assets
  when `apps/user-client/dist` exists or an explicit static directory is passed;
- CLI now exposes `entangle user-nodes clients` to list active User Nodes with
  projected Human Interface Runtime state, runner placement, assignment id, and
  User Client URL;
- richer artifact object-backend review remains open.

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
- [321-signed-source-candidate-review-slice.md](321-signed-source-candidate-review-slice.md)
- [322-public-direct-mutation-surface-quarantine-slice.md](322-public-direct-mutation-surface-quarantine-slice.md)
- [323-direct-host-approval-review-api-removal-slice.md](323-direct-host-approval-review-api-removal-slice.md)
- [330-runner-owned-source-history-application-slice.md](330-runner-owned-source-history-application-slice.md)

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
- [312-projected-artifact-read-api-slice.md](312-projected-artifact-read-api-slice.md)
- [313-projected-source-candidate-read-api-slice.md](313-projected-source-candidate-read-api-slice.md)
- [314-projected-artifact-preview-api-slice.md](314-projected-artifact-preview-api-slice.md)
- [315-projected-source-candidate-diff-api-slice.md](315-projected-source-candidate-diff-api-slice.md)
- [316-process-smoke-projected-source-candidate-slice.md](316-process-smoke-projected-source-candidate-slice.md)
- [318-projected-source-candidate-file-preview-slice.md](318-projected-source-candidate-file-preview-slice.md)
- [319-projected-memory-wiki-read-api-slice.md](319-projected-memory-wiki-read-api-slice.md)
- [320-projected-artifact-history-diff-read-api-slice.md](320-projected-artifact-history-diff-read-api-slice.md)
- [330-runner-owned-source-history-application-slice.md](330-runner-owned-source-history-application-slice.md)
- [331-projected-source-history-ref-slice.md](331-projected-source-history-ref-slice.md)
- [332-runner-owned-source-history-publication-slice.md](332-runner-owned-source-history-publication-slice.md)
- [333-host-source-history-publication-removal-slice.md](333-host-source-history-publication-removal-slice.md)
- [334-host-source-application-replay-removal-slice.md](334-host-source-application-replay-removal-slice.md)
- [335-host-wiki-publication-removal-slice.md](335-host-wiki-publication-removal-slice.md)

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
projection inbox, reply, approve, reject, and Host transport-health surfaces.
Deeper per-relay diagnostics and richer User Client participant workflows
remain follow-up work.

Implementation record:

- [243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)
- [300-host-transport-health-slice.md](300-host-transport-health-slice.md)
- [328-assignment-receipt-operator-surfaces-slice.md](328-assignment-receipt-operator-surfaces-slice.md)
- [329-per-relay-transport-diagnostics-slice.md](329-per-relay-transport-diagnostics-slice.md)

Verification:

- CLI command tests;
- Studio helper/component tests;
- lint and typecheck.

This slice now includes first-pass CLI assignment/User Node/inbox/reply/
approve/reject commands, scoped CLI approval-response context flags, CLI User
Client endpoint discovery through `entangle user-nodes clients`, and a Studio
projection/User Node panel with runtime placement, User Client URL,
conversation, active, unread, and pending-approval counts. Studio also has a
first Host-backed assignment offer control for assigning graph nodes, including
User Nodes, to trusted runners plus projected assignment rows with Host-backed
revoke actions. CLI approve/reject can now derive signed response context from
directly looked-up recorded approval-request messages. Host status now exposes
first federated control/observe transport health and both CLI and Studio render
that Host-owned read model. Host status now also includes per-relay
control/observe diagnostic rows, and Studio renders those rows in the Host
Status panel. Richer Studio reassignment controls and removal of old admin/debug
approval mutation paths remain follow-up work.

CLI also now exposes `entangle runners join-config` to write Host-derived,
schema-validated generic runner join configs without embedding secrets.

CLI projection summaries now include assignment receipt counts, and Studio
renders recent projected assignment receipt rows near the assignment/runtime
operator panel. A richer per-assignment detail timeline remains follow-up work.

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
  first user publish, selected conversation inspection, signed source-candidate
  review, and approval response;
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
