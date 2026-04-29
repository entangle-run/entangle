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
- [343-assignment-timeline-read-model-slice.md](343-assignment-timeline-read-model-slice.md)
- [344-process-smoke-assignment-timeline-slice.md](344-process-smoke-assignment-timeline-slice.md)

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
- Host now exposes a per-assignment timeline read model built from assignment
  lifecycle state plus projected runner receipts and assignment-scoped runtime
  command receipts; CLI can inspect it directly, and Studio groups lifecycle
  and command receipt summaries under assignment rows while listing recent
  command receipts from Host projection.
- The process-runner smoke now validates that the real joined runner path
  produces assignment acceptance, `started` receipt evidence, and completed
  runtime command receipt entries visible through the assignment timeline read
  model.

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
- `@entangle/agent-engine` now has deterministic OpenAI-compatible HTTP
  provider fixture coverage for the real `fetch` provider path, including
  plain chat completion, tool-loop continuation, and 429 classification without
  live model-provider credentials.
- `pnpm ops:fake-openai-provider` now starts a deterministic
  OpenAI-compatible development provider for manual no-credential
  catalog/auth/adapter wiring tests.
- `pnpm ops:smoke-fake-openai-provider` now starts that provider on an
  ephemeral port and verifies health, models, non-streaming chat completions,
  streaming chat completions, and streaming Responses API frames.
- `pnpm ops:check-product-naming` now checks active product surfaces for old
  local product/profile labels.
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
- [336-host-artifact-restore-promotion-removal-slice.md](336-host-artifact-restore-promotion-removal-slice.md)
- [337-federated-session-cancellation-control-slice.md](337-federated-session-cancellation-control-slice.md)
- [342-projected-source-history-replay-read-model-slice.md](342-projected-source-history-replay-read-model-slice.md)
- [346-runner-owned-wiki-publication-control-slice.md](346-runner-owned-wiki-publication-control-slice.md)
- [347-studio-wiki-publication-control-slice.md](347-studio-wiki-publication-control-slice.md)
- [379-runner-owned-source-history-target-publication-slice.md](379-runner-owned-source-history-target-publication-slice.md)
- [380-runner-owned-wiki-target-publication-slice.md](380-runner-owned-wiki-target-publication-slice.md)
- [381-process-smoke-wiki-target-publication-slice.md](381-process-smoke-wiki-target-publication-slice.md)
- [382-source-history-multi-target-publication-slice.md](382-source-history-multi-target-publication-slice.md)
- [383-source-history-publication-presentation-slice.md](383-source-history-publication-presentation-slice.md)
- [384-runner-owned-artifact-restore-control-slice.md](384-runner-owned-artifact-restore-control-slice.md)
- [385-artifact-restore-operator-surfaces-slice.md](385-artifact-restore-operator-surfaces-slice.md)
- [386-process-smoke-artifact-restore-slice.md](386-process-smoke-artifact-restore-slice.md)
- [387-runner-owned-artifact-source-proposal-slice.md](387-runner-owned-artifact-source-proposal-slice.md)
- [388-artifact-source-proposal-operator-surfaces-slice.md](388-artifact-source-proposal-operator-surfaces-slice.md)
- [389-user-client-artifact-source-proposal-slice.md](389-user-client-artifact-source-proposal-slice.md)
- [390-artifact-proposal-correlation-slice.md](390-artifact-proposal-correlation-slice.md)
- [391-runtime-command-receipt-projection-slice.md](391-runtime-command-receipt-projection-slice.md)
- [392-runner-owned-command-receipt-adoption-slice.md](392-runner-owned-command-receipt-adoption-slice.md)
- [393-lifecycle-session-command-receipts-slice.md](393-lifecycle-session-command-receipts-slice.md)
- [394-assignment-command-receipt-timeline-slice.md](394-assignment-command-receipt-timeline-slice.md)
- [395-studio-command-receipt-operator-visibility-slice.md](395-studio-command-receipt-operator-visibility-slice.md)

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
- runtime artifact history/diff GET routes can resolve projected git artifact
  locators through a Host-owned backend cache when the locator and semantic
  artifact context identify a reachable git backend, and otherwise fall back to
  projected artifact records with explicit unavailable reasons;
- accepted signed source-candidate reviews now make the owning runner record a
  runner-local source-history application and emit the updated candidate through
  `source_change.ref`, so Host projection can see `candidate.application`
  without Host mutating runner-owned files;
- signed `source_history.ref` observations now carry the runner-owned
  `SourceHistoryRecord`, Host projection exposes `sourceHistoryRefs`, and
  runtime source-history list/detail GET routes can return projected entries
  without Host-readable runner filesystem context;
- when source publication policy allows it, the owning runner now publishes
  accepted source-history records as git commit artifacts, persists publication
  metadata locally, and emits both `artifact.ref` and updated
  `source_history.ref` observations. Automatic publication defaults to the
  primary git target; explicit `runtime.source_history.publish` commands can
  carry an approval id and explicit git target selectors for policy-gated
  non-primary repository publication;
- the direct Host source-history publication mutation, host-client method, CLI
  `--publish` path, and Studio publish/retry action have been removed so Host
  observes source-history publication instead of owning the push;
- explicit source-history publication and failed-publication retry now use a
  Host-signed `runtime.source_history.publish` control command to the accepted
  runner assignment; the runner performs the git publication from runner-owned
  state, resolves optional target selectors from effective artifact context,
  validates `source_publication` approval scope when required, and emits
  projection evidence;
- explicit source-history replay now uses a Host-signed
  `runtime.source_history.replay` control command to the accepted runner
  assignment; the runner validates source-application approval policy, refuses
  diverged workspace trees, persists runner-local replay records, and emits
  `source_history.replayed` evidence;
- `source_history.replayed` evidence is now reduced into typed Host projection
  records exposed through `sourceHistoryReplays`, Host replay list/detail APIs,
  host-client, CLI replay inspection commands, and Studio federation summary
  counts without Host-readable runner files;
- the direct Host source-candidate apply mutation and previous direct
  source-history replay mutation/list surfaces have been removed from Host,
  host-client, CLI, and Studio; source application is now public only through
  signed User Node review and runner-owned behavior, and explicit replay is a
  runner-executed control request;
- the direct Host wiki repository publication/list surfaces have been removed
  from Host, host-client, CLI, and Studio; wiki inspection remains public
  through runner-owned sync, signed `wiki.ref` projection, and projected memory
  read fallback;
- explicit wiki repository publication now uses a Host-signed
  `runtime.wiki.publish` control command to the accepted runner assignment; the
  runner syncs and publishes its wiki repository from runner-owned state to the
  primary git target by default or to an explicit resolved git target selector,
  persists artifact publication metadata, and emits `artifact.ref` evidence;
  Host API, host-client, CLI, and Studio can request that command without
  reading runner-local files;
- `ops:smoke-federated-process-runner` now verifies that same wiki publication
  command with a real Host process, joined runner process, relay, and primary
  git backend by checking projected `artifact.ref` evidence and the remote git
  branch head; it also verifies a second explicit non-primary wiki publication
  target through the same Host-signed control path and checks the sibling git
  backend branch head;
- public deep runtime read paths now quarantine Host filesystem reads for
  accepted federated assignments, so artifacts, memory, approvals,
  source-change candidates, source history, and turns are served from
  projection/backend evidence instead of stale Host-local runtime files;
- projected git artifact history/diff can now be computed from a Host-owned
  backend cache without reading runner-local runtime files;
- `ops:smoke-federated-process-runner` now verifies that backend-cache
  history/diff path against the runner-published source-history git artifact;
- Host status now reports bounded artifact backend cache availability, count,
  and size as derived operational metadata;
- Host API, host-client, and CLI can now dry-run or clear the derived artifact
  backend cache without deleting authoritative artifact/projection state;
- Studio's Host Status panel renders the same path-free artifact backend cache
  summary for admin visibility;
- the User Client can request bounded artifact history/diff from its Human
  Interface Runtime through Host artifact read APIs;
- explicit source-history publication can now target policy-gated non-primary
  git repositories through the same runner-owned control boundary;
- explicit wiki publication can now target resolved non-primary git
  repositories through the same runner-owned control boundary;
- artifact restore now uses a Host-signed `runtime.artifact.restore` control
  command, with the assigned runner retrieving into runner-owned state and
  emitting `artifact.ref` retrieval evidence;
- CLI and Studio can now request that runner-owned artifact restore path from
  artifact inspection surfaces without reintroducing Host filesystem mutation;
- artifact source-change proposals now use runner-owned control behavior, and
  CLI/Studio operator surfaces can request the same path from artifact
  inspection without reintroducing Host source workspace mutation;
- the running User Client can request the same artifact source-change proposal
  path for artifacts visible in the selected User Node conversation, with the
  Human Interface Runtime forwarding through Host control and tagging the
  request with the User Node id;
- Host now returns an effective proposal id for every artifact source-change
  proposal request and sends that same id to the runner, so request
  acknowledgements identify the candidate id to follow;
- artifact proposal completion now has explicit signed command receipt
  projection: joined runners emit `runtime.command.receipt` observations for
  received/completed/failed proposal commands, Host records
  `runtime.command.receipt` audit events, and projection exposes
  `runtimeCommandReceipts` correlated by `commandId`, `proposalId`, and
  `candidateId`;
- artifact restore, source-history publish, source-history replay, and wiki
  publication commands now use the same command receipt model, so operators can
  close the Host command loop through `runtimeCommandReceipts` while still
  relying on artifact/source/wiki domain observations for content evidence;
- lifecycle start/stop/restart and session cancellation commands now also emit
  signed `runtime.command.receipt` observations, with session cancellation
  receipts carrying cancellation/session correlation ids;
- richer source/wiki mutation endpoints and richer cache policy still need
  protocol-backed replacement.

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
- [338-user-node-runtime-projection-retention-slice.md](338-user-node-runtime-projection-retention-slice.md)
- [345-user-client-json-read-state-slice.md](345-user-client-json-read-state-slice.md)

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
- Host runtime synchronization retains observed Human Interface Runtime
  projection records for active User Nodes instead of pruning them as
  non-runtime graph nodes;
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
  runtime fallback, source file preview actions for source-change candidates,
  delivery labels, local conversation read state, projected
  wiki-ref rendering, projected wiki preview rendering, wiki-scoped approval
  context rendering, signed read receipts, parent-message links, message
  delivery retry state, runtime status, live state refresh, local JSON APIs for
  selected conversation detail, conversation read state, and message publishing,
  signed source-candidate accept/reject messages handled by the owning runner,
  and message publishing that preserves selected conversation/session context;
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
  preview, source diff, source file preview, source-candidate review, wiki
  preview cards, and automatic thread read-state convergence;
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
- [336-host-artifact-restore-promotion-removal-slice.md](336-host-artifact-restore-promotion-removal-slice.md)
- [337-federated-session-cancellation-control-slice.md](337-federated-session-cancellation-control-slice.md)
- [339-federated-source-history-publication-control-slice.md](339-federated-source-history-publication-control-slice.md)
- [340-federated-source-history-replay-control-slice.md](340-federated-source-history-replay-control-slice.md)
- [341-studio-source-history-replay-control-slice.md](341-studio-source-history-replay-control-slice.md)
- [342-projected-source-history-replay-read-model-slice.md](342-projected-source-history-replay-read-model-slice.md)
- [346-runner-owned-wiki-publication-control-slice.md](346-runner-owned-wiki-publication-control-slice.md)
- [347-studio-wiki-publication-control-slice.md](347-studio-wiki-publication-control-slice.md)
- [379-runner-owned-source-history-target-publication-slice.md](379-runner-owned-source-history-target-publication-slice.md)
- [380-runner-owned-wiki-target-publication-slice.md](380-runner-owned-wiki-target-publication-slice.md)
- [381-process-smoke-wiki-target-publication-slice.md](381-process-smoke-wiki-target-publication-slice.md)
- [382-source-history-multi-target-publication-slice.md](382-source-history-multi-target-publication-slice.md)
- [383-source-history-publication-presentation-slice.md](383-source-history-publication-presentation-slice.md)
- [384-runner-owned-artifact-restore-control-slice.md](384-runner-owned-artifact-restore-control-slice.md)
- [385-artifact-restore-operator-surfaces-slice.md](385-artifact-restore-operator-surfaces-slice.md)
- [386-process-smoke-artifact-restore-slice.md](386-process-smoke-artifact-restore-slice.md)
- [387-runner-owned-artifact-source-proposal-slice.md](387-runner-owned-artifact-source-proposal-slice.md)

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
- [343-assignment-timeline-read-model-slice.md](343-assignment-timeline-read-model-slice.md)

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
Status panel. Richer Studio reassignment controls remain follow-up work, while
old public direct Host approval/review mutation paths have already been removed
by the direct API removal cleanup.

CLI also now exposes `entangle runners join-config` to write Host-derived,
schema-validated generic runner join configs without embedding secrets.

CLI projection summaries now include assignment receipt counts, and Studio
renders recent projected assignment receipt rows near the assignment/runtime
operator panel. Studio selected-runtime source-history detail now exposes the
federated replay request path through Host, matching the CLI
`host runtimes source-history-replay` command. CLI can now inspect projected
replay outcomes through source-history replay list/detail commands, and Studio
summarizes projected replay outcome counts in the Federation panel. CLI can now
inspect per-assignment timelines, and Studio shows grouped receipt summaries
under projected assignment rows. A richer assignment detail page that joins
control command ids, transport diagnostics, runtime status, and source-history
outcomes remains follow-up work.

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
- [344-process-smoke-assignment-timeline-slice.md](344-process-smoke-assignment-timeline-slice.md)
- [348-process-smoke-wiki-publication-control-slice.md](348-process-smoke-wiki-publication-control-slice.md)
- [349-federated-runtime-filesystem-read-quarantine-slice.md](349-federated-runtime-filesystem-read-quarantine-slice.md)
- [350-federated-artifact-backend-history-diff-slice.md](350-federated-artifact-backend-history-diff-slice.md)
- [351-process-smoke-artifact-backend-history-diff-slice.md](351-process-smoke-artifact-backend-history-diff-slice.md)
- [352-artifact-backend-cache-status-slice.md](352-artifact-backend-cache-status-slice.md)
- [353-artifact-backend-cache-clear-slice.md](353-artifact-backend-cache-clear-slice.md)
- [354-studio-artifact-cache-status-slice.md](354-studio-artifact-cache-status-slice.md)
- [355-user-client-artifact-history-diff-slice.md](355-user-client-artifact-history-diff-slice.md)
- [356-user-client-artifact-visibility-boundary-slice.md](356-user-client-artifact-visibility-boundary-slice.md)
- [357-process-smoke-user-client-artifact-history-diff-slice.md](357-process-smoke-user-client-artifact-history-diff-slice.md)
- [358-user-client-source-change-visibility-boundary-slice.md](358-user-client-source-change-visibility-boundary-slice.md)
- [359-process-smoke-user-client-source-diff-slice.md](359-process-smoke-user-client-source-diff-slice.md)
- [360-user-client-source-file-preview-slice.md](360-user-client-source-file-preview-slice.md)
- [361-source-change-aware-memory-synthesis-slice.md](361-source-change-aware-memory-synthesis-slice.md)
- [362-source-change-memory-carry-forward-slice.md](362-source-change-memory-carry-forward-slice.md)
- [363-approval-message-lineage-slice.md](363-approval-message-lineage-slice.md)
- [364-approval-approver-enforcement-slice.md](364-approval-approver-enforcement-slice.md)
- [365-runner-a2a-signer-hardening-slice.md](365-runner-a2a-signer-hardening-slice.md)
- [366-user-node-inbox-signer-audit-slice.md](366-user-node-inbox-signer-audit-slice.md)
- [367-nip59-seal-signer-verification-slice.md](367-nip59-seal-signer-verification-slice.md)
- [368-user-node-signer-surface-slice.md](368-user-node-signer-surface-slice.md)
- [369-process-smoke-user-node-signer-audit-slice.md](369-process-smoke-user-node-signer-audit-slice.md)
- [370-user-node-approval-doc-realignment-slice.md](370-user-node-approval-doc-realignment-slice.md)
- [371-host-smoke-script-lint-coverage-slice.md](371-host-smoke-script-lint-coverage-slice.md)
- [372-openai-compatible-fake-provider-fixture-slice.md](372-openai-compatible-fake-provider-fixture-slice.md)
- [373-mounted-file-runtime-identity-slice.md](373-mounted-file-runtime-identity-slice.md)
- [374-handoff-aware-working-context-memory-slice.md](374-handoff-aware-working-context-memory-slice.md)
- [375-deterministic-openai-provider-dev-server-slice.md](375-deterministic-openai-provider-dev-server-slice.md)
- [376-conversation-aware-working-context-memory-slice.md](376-conversation-aware-working-context-memory-slice.md)
- [377-fake-provider-smoke-slice.md](377-fake-provider-smoke-slice.md)
- [378-active-product-naming-guardrail-slice.md](378-active-product-naming-guardrail-slice.md)

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
- the same process proof now validates assignment timeline projection for real
  runner acceptance, lifecycle receipts, and assignment-scoped runtime command
  receipts;
- the same process proof now requests runner-owned wiki publication through
  Host-signed `runtime.wiki.publish`, observes the projected git
  `artifact.ref`, verifies the primary git backend branch head, then requests
  explicit non-primary wiki target publication and verifies the sibling git
  backend branch head;
- the same process proof now also requests explicit non-primary
  source-history target publication after automatic primary publication,
  observes the projected target-qualified git artifact, and verifies the
  sibling source repository branch head;
- shared CLI/Studio source-history presentation now exposes per-target
  publication count, target labels, and artifact ids while keeping the latest
  publication summary fields intact;
- Host API and host-client can request runner-owned artifact restore through a
  Host-signed `runtime.artifact.restore` command for the accepted assignment,
  and the runner records observed retrieval success or failure without Host
  filesystem access;
- CLI exposes the same request as `host runtimes artifact-restore`, and Studio
  exposes it from selected artifact detail while showing request
  acknowledgement separate from later observation evidence;
- the process proof now requests runner-owned artifact restore for the
  runner-published source-history artifact and verifies projected `retrieved`
  evidence from the real joined runner path;
- Host API, host-client, control-plane transport, joined runner dispatch, and
  `RunnerService` now support runner-owned artifact source-change proposal
  commands that create `pending_review` candidates instead of direct Host-side
  promotion;
- the process proof now requests a source-change proposal from the real
  runner-published report artifact and verifies projected candidate evidence;
- CLI exposes the same source-change proposal request as
  `host runtimes artifact-source-proposal`, and Studio exposes it from
  selected artifact detail while keeping proposal completion as projected
  source-change candidate evidence;
- the running User Client exposes the same request from visible artifact cards
  through a conversation-scoped Human Interface Runtime JSON route and fallback
  HTML form, forwarding to Host with `requestedBy` set to the User Node id;
- Host-generated artifact source-change proposal ids now derive from the
  command id when omitted by callers and are returned in the response
  acknowledgement as the runner candidate id to follow;
- artifact source-change proposal completion now returns as a projected signed
  `runtime.command.receipt` correlated to the Host command id, effective
  proposal id, and resulting source-change candidate id, and the process proof
  waits for that receipt after candidate projection;
- artifact restore, targeted source-history publication, source-history replay
  unit coverage, and wiki publication now emit the same signed command receipt
  model; the process proof waits for completed restore, targeted
  source-history publication, and wiki publication receipts in addition to
  domain artifact/source/wiki evidence;
- lifecycle stop/start/restart and session cancellation now emit command
  receipts; the process proof waits for completed stop/start/restart command
  receipt projection in addition to assignment lifecycle receipts;
- semantic artifact validation now allows file-backed git proof targets
  without git transport principals while retaining principal requirements for
  SSH and HTTPS targets;
- Host public deep runtime read paths now ignore Host-local runtime files for
  accepted federated assignments, keeping the process proof on projected
  runner evidence even when a semantic Host context exists;
- Host can resolve projected git artifact history/diff through a backend cache
  when artifact locators include git service, namespace, repository, commit,
  and path metadata;
- the process proof now checks that the same backend-resolved history/diff path
  is available for the source-history artifact published by the real joined
  runner;
- Host status exposes derived artifact backend cache availability, repository
  count, and size for operator diagnostics;
- Host API and CLI can dry-run or clear the derived artifact backend cache
  without touching authoritative artifact, projection, runner, or git backend
  state;
- Studio displays the artifact backend cache summary in the Host Status panel;
- the running User Client can load artifact history/diff evidence through
  runtime-local JSON routes backed by Host artifact read APIs;
- those User Client artifact routes require conversation context and verify the
  artifact ref is visible in that User Node conversation before proxying to
  Host;
- the process proof now delivers the real builder-published source-history git
  artifact to the User Node and verifies User Client artifact history/diff
  through the running Human Interface Runtime;
- User Client source-change diff and review routes require conversation
  context and verify matching approval-resource or projected session evidence
  before returning diff evidence or publishing review messages;
- the process proof now verifies the running User Client source-change diff
  route before submitting signed source-candidate review;
- the running User Client can load source-change file preview evidence through
  the same selected-conversation source-change visibility gate;
- the process proof now verifies the running User Client source-change file
  preview route before submitting signed source-candidate review;
- optional model-guided memory synthesis now consumes bounded source-change
  evidence from the completed runner turn record, giving each agent node's wiki
  durable code-change context without copying raw diffs or full file previews
  into memory;
- the durable `working-context.md` page now includes a runner-owned
  source-change context section with candidate ids, totals, changed-file
  summaries, file-preview metadata, and diff availability, so future turns do
  not depend only on model prose to remember code-change evidence;
- the durable `working-context.md` page now also includes a runner-owned
  handoff context section with emitted handoff message ids, so nodes retain
  bounded delegation evidence without copying peer conversations into memory;
- the durable `working-context.md` page now includes a runner-owned
  conversation routes section with active conversation ids and bounded
  peer/status/response-policy/follow-up/artifact metadata, so delegated
  sessions resume from deterministic coordination context;
- runtime approval records now carry optional signed-message lineage fields for
  request event id, request signer, response event id, response signer, and
  source message id, and the runner stamps those fields for engine gates,
  inbound approval requests, and applied approval responses where available;
- runners now enforce the approval record's configured approver node set before
  applying inbound approval responses, leaving unauthorized matching responses
  from other nodes unable to approve, reject, close, or fail the gated session;
- runner A2A envelopes now carry signer pubkeys when available, Nostr A2A
  delivery verifies the NIP-59 seal signer and rejects seal/rumor/fromPubkey
  mismatches, service handling rejects mismatched signer envelopes before
  runtime state mutation, and approval request/response lineage uses the
  envelope signer when available;
- User Node inbox message records now preserve signer pubkeys for inbound and
  outbound messages when available, and Host rejects inbound User Node message
  records whose signer differs from the payload `fromPubkey`;
- CLI compact User Node publish/message summaries and User Client timeline
  headers now expose signer audit state when available;
- the process proof now verifies signer preservation across User Node publish
  responses, Host inbox records, User Client conversation records,
  source-change review, approval response, synthetic inbound agent messages,
  and the second User Node path;
- active User Node/operator-surface specs now describe direct Host
  approval/review mutation removal as complete and keep participant approval
  behavior on signed User Node messages;
- `@entangle/host` lint now covers TypeScript host smoke scripts, including
  the process-runner smoke that carries the fastest federated proof;
- `@entangle/agent-engine` now tests the OpenAI-compatible HTTP provider
  boundary against a deterministic local API fixture rather than only through
  injected client factories;
- `pnpm ops:fake-openai-provider` exposes the same no-credential provider
  boundary as an operator-started development server for manual integration
  checks;
- `pnpm ops:smoke-fake-openai-provider` verifies the deterministic provider
  harness without live credentials;
- `pnpm ops:check-product-naming` verifies active product surfaces do not
  reintroduce obsolete local product/profile labels;
- runtime-context runner startup and the Human Interface Runtime now support
  mounted-file identity secret delivery as well as env-var delivery, matching
  generic runner join behavior;
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
