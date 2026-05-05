# Implementation Slices And Verification Plan

## Current Repo Truth

The repo already follows a slice discipline: each implemented runtime
capability has a reference record, tests, wiki log entry, and usually a
coherent commit. The root `pnpm verify` gate runs lint, typecheck, and tests.
Root `pnpm test` now runs one direct aggregate Vitest command with
`vitest.aggregate.config.ts`, because Turbo test execution, long shell
`pnpm --filter ... && ...` chains, nested package test execution, repeated
Vitest child processes, and a Node wrapper around Vitest reproduced no-output
hangs in this environment. The aggregate config covers workspace
`src/**/*.test.ts` files under `apps` and `packages`, while Host and Runner
service tests run through their package-level scripts so service-local
fixtures keep isolated process boundaries. The aggregate segment uses a single
fork worker for predictable local completion.
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
  and command receipt summaries under assignment rows while Studio and CLI
  compact projection summaries list recent command receipts from Host
  projection. CLI can also list runtime command receipts directly with
  assignment, node, runner, command type, status, requester, and limit filters.
  Host now exposes `GET /v1/user-nodes/:nodeId/command-receipts` for
  participant-scoped command receipt inspection by User Client and CLI without
  requiring the full operator projection. Studio can fetch and render the same
  Host assignment timeline read model per projected assignment row.
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
- `pnpm ops:fake-opencode-server` now starts a deterministic fake attached
  OpenCode server for no-credential route and permission-bridge plumbing
  checks. It can also optionally write deterministic content into the workspace
  declared by `x-opencode-directory`, which lets attached-server tests verify
  source workspace mutation without live model credentials.
- `pnpm ops:smoke-fake-opencode-server` now starts that fake OpenCode server
  on an ephemeral port and verifies Basic-authenticated health, session
  creation, SSE permission delivery, permission reply, deterministic assistant
  output, and idle status.
- `pnpm ops:fake-agent-engine-http` now starts a deterministic external HTTP
  agent-engine fixture that implements the shared turn contract, and
  `pnpm ops:smoke-fake-agent-engine-http` verifies health, turn execution,
  response shape, optional workspace mutation, and debug state without live
  model credentials.
- `pnpm ops:smoke-federated-process-runner:fake-external-http` now runs that
  fake endpoint through the full joined-runner process proof, with the builder
  runner advertising `external_http`, Host selecting that engine profile,
  runner-owned workspace mutation, User Node source review/approval, projected
  source-history/artifact/wiki evidence, and the two-User-Node path.
- `pnpm ops:smoke-federated-process-runner` can now run with
  `--use-fake-opencode-server` to configure the builder node with that attached
  fake OpenCode server, approve OpenCode permission requests through the
  running User Client as the assigned User Node, verify source workspace
  mutation, and prove attached-server session continuity without live model
  credentials.
- `pnpm ops:smoke-federated-process-runner:fake-opencode` now exposes that
  attached fake OpenCode process proof as a shorter root command, and
  `pnpm ops:demo-user-node-runtime:fake-opencode` runs the keep-running
  interactive User Node demo against the same attached fake OpenCode profile.
- The process-runner smoke now also requests source-history reconcile through
  the running User Client for a visible plain `source_history` resource and
  verifies the completed Host-projected `runtime.source_history.reconcile`
  command receipt.
- CLI can now configure active catalog agent engine profiles with
  `host catalog agent-engine upsert`, so an attached OpenCode or fake OpenCode
  profile can be created, made default, and then assigned to a node without
  manual catalog JSON editing.
- CLI can now inspect those profiles with `host catalog agent-engine list|get`
  and optional compact summaries, including the current default marker.
- Studio now renders active catalog agent engine profiles in the graph editor
  with default marker and compact engine detail before node assignment editing.
- Studio can now create or update active catalog agent engine profiles through
  Host's focused profile upsert route while keeping node-level profile
  assignment explicit.
- Host now exposes a focused agent-engine profile upsert route, and CLI/Studio
  use that route for real profile saves instead of submitting client-mutated
  full catalog documents.
- `pnpm ops:check-product-naming` now checks active product surfaces for old
  local product/profile labels.
- Docker managed runners can now receive inline join config JSON and the
  federated dev Compose profile selects Docker join mode with Host API bundle
  retrieval, avoiding Host state/secret volume mounts in managed join-mode
  runner containers. Docker join bootstrap is now the launcher default when
  `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP` is unset; direct runtime-context startup
  remains explicit compatibility/debug behavior.

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
- [396-projection-empty-memory-read-model-slice.md](396-projection-empty-memory-read-model-slice.md)
- [397-cli-projection-command-receipt-summary-slice.md](397-cli-projection-command-receipt-summary-slice.md)
- [398-cli-command-receipt-list-slice.md](398-cli-command-receipt-list-slice.md)
- [399-studio-assignment-timeline-drilldown-slice.md](399-studio-assignment-timeline-drilldown-slice.md)
- [500-user-client-command-receipt-visibility-slice.md](500-user-client-command-receipt-visibility-slice.md)
- [501-user-node-cli-command-receipts-slice.md](501-user-node-cli-command-receipts-slice.md)
- [502-user-node-command-receipts-host-api-slice.md](502-user-node-command-receipts-host-api-slice.md)
- [503-user-client-runtime-status-projection-slice.md](503-user-client-runtime-status-projection-slice.md)
- [504-user-node-client-workload-summary-slice.md](504-user-node-client-workload-summary-slice.md)
- [505-studio-user-node-workload-summary-slice.md](505-studio-user-node-workload-summary-slice.md)
- [401-root-test-gate-reliability-slice.md](401-root-test-gate-reliability-slice.md)
- [446-runner-test-gate-fork-stability-slice.md](446-runner-test-gate-fork-stability-slice.md)
- [447-runner-owned-wiki-page-upsert-slice.md](447-runner-owned-wiki-page-upsert-slice.md)
- [448-user-client-wiki-page-upsert-slice.md](448-user-client-wiki-page-upsert-slice.md)
- [449-studio-wiki-page-upsert-slice.md](449-studio-wiki-page-upsert-slice.md)
- [455-user-client-wiki-page-patch-process-smoke-slice.md](455-user-client-wiki-page-patch-process-smoke-slice.md)

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
  unavailable, and memory list now returns an empty projection-backed view for
  active graph nodes that have no local context and no wiki refs yet;
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
- explicit source-history reconcile now uses a separate Host-signed
  `runtime.source_history.reconcile` control command to the accepted runner
  assignment; it keeps the same source-application approval policy as replay
  but, for diverged workspaces, attempts a Git three-way tree merge between
  the recorded `baseTree`, the current workspace tree, and the source-history
  `headTree`, recording clean integrations as `merged` replay records with
  `mergedTree` evidence and conflicts as `unavailable`;
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
- Host API, host-client, and CLI can now dry-run, clear, age-prune, or
  max-size-prune the derived artifact backend cache, optionally scoped to a git
  service/namespace/repository target, without deleting authoritative
  artifact/projection state;
- Studio's Host Status panel renders the same path-free artifact backend cache
  summary for admin visibility;
- Host status now reports the active bootstrap operator security posture,
  including tokenless mode or normalized bootstrap operator id and role for
  token-protected deployments, without exposing bearer-token material; protected
  Hosts can now also opt into multiple bootstrap operator tokens through
  `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, with each token resolving to a distinct
  operator id and role for status, authorization, and request-audit
  attribution; multi-token records can use `tokenSha256` hashes instead of raw
  token values; bootstrap tokens can now also declare explicit Host
  permissions so non-viewer operators can be narrowed by route category while
  unscoped tokens remain compatible;
- token-protected Hosts now enforce the bootstrap `viewer` role as read-only
  while keeping `operator`, `admin`, and `owner` compatible with existing Host
  mutation behavior, and protected mutation audit events now include
  `operatorRole`;
- shared host-client/CLI host event summaries now present
  `host.operator_request.completed` audit events with operator id, role,
  method, path, status, and auth mode instead of a generic event-type label;
- Host event list APIs now apply category, node id, operator id, HTTP status
  code, and repeated type-prefix filters before limit slicing, so audit and
  runtime inspection surfaces can retrieve bounded matching traces without
  relying only on client-side filtering of the newest event tail;
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
- the running User Client can now request runner-owned wiki publication for
  wiki resources visible in the selected User Node conversation, with the Human
  Interface Runtime enforcing the conversation/wiki-resource boundary and
  forwarding `requestedBy` as the User Node id;
- the running User Client can now request runner-owned source-history
  publication for `source_history` or `source_history_publication` resources
  visible in the selected User Node conversation, with the Human Interface
  Runtime checking matching projected `sourceHistoryRefs` before forwarding to
  Host with `requestedBy` set to the User Node id; target-specific requests now
  require a matching visible `source_history_publication` resource instead of
  granting arbitrary target publication from a generic source-history resource;
- the running User Client can now request runner-owned source-history reconcile
  for visible plain `source_history` resources, forwarding the visible
  `approvalId` when present and deliberately rejecting
  `source_history_publication` resources for reconcile so publication approval
  cannot authorize source workspace mutation; the process-runner smoke now
  proves the policy-permissive participant reconcile path through a completed
  runner command receipt;
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
- runner-owned wiki page replacement/append now travels through Host-signed
  `runtime.wiki.upsert_page` commands to the accepted runner assignment, with
  path validation inside the runner wiki root, wiki repository sync, `wiki.ref`
  evidence, and command receipts correlated by `wikiPagePath`;
- the running User Client can now request the same wiki page replacement/append
  path from visible `wiki_page` resources in the selected conversation; the
  Human Interface Runtime normalizes the page path, forwards through Host with
  `requestedBy` set to the User Node id, and the process-runner smoke waits for
  the projected command receipt and page `wiki.ref`;
- Studio now exposes the same runner-owned wiki page upsert path from the
  Runtime Memory panel through `host-client.upsertRuntimeWikiPage`, keeping
  operator page mutation aligned with CLI and User Client control boundaries;
- wiki page upsert requests now support optional `expectedCurrentSha256`;
  Host validates and signs the digest, the assigned runner compares it against
  current runner-owned page content before writing, conflict receipts carry
  expected/previous hashes, successful receipts can carry previous/next hashes,
  and the Human Interface Runtime derives an expected digest from visible
  complete projected wiki previews when available;
- wiki page upsert also supports `mode: "patch"`; the same Host-signed control
  command can carry a single-page unified diff, and the runner applies it only
  when context/removal lines match current runner-owned content;
- the process-runner smoke now proves the participant path for wiki page patch
  mode through the running User Client JSON API, runner-signed command receipt
  hashes, and projected patched `wiki.ref` preview content;
- lifecycle start/stop/restart and session cancellation commands now also emit
  signed `runtime.command.receipt` observations, with session cancellation
  receipts carrying cancellation/session correlation ids;
- CLI can list runtime command receipts directly from Host projection using
  assignment, node, runner, command type, status, requester, and limit filters;
- Studio can inspect per-assignment timeline entries through the Host
  assignment timeline endpoint, keeping operator drilldown aligned with CLI;
- richer collaborative wiki merge UI and multi-page patch-set behavior still
  need protocol-backed replacement on top of the first participant-scoped wiki
  page upsert command, runner-enforced stale-edit guard, and single-page patch
  mode.

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
- the Human Interface Runtime can require optional Basic Auth for all
  non-health User Client routes through
  `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH=username:password`, keeping `/health`
  public and keeping Host API bearer tokens inside the runtime process;
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
- [450-source-history-reconcile-control-slice.md](450-source-history-reconcile-control-slice.md)
- [472-process-smoke-user-client-source-history-reconcile-slice.md](472-process-smoke-user-client-source-history-reconcile-slice.md)
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

Keep OpenCode default. The first attached-server path now moves permissioned
turns beyond one-shot `opencode run` by using OpenCode server APIs for
sessions, permission events, and permission replies. Remaining hardening is
focused on live OpenCode/provider validation, abort coverage, and richer
long-running state. Preserve Entangle policy and projection ownership.

Implementation record:

- [286-opencode-tool-evidence-slice.md](286-opencode-tool-evidence-slice.md)
  adds bounded generic tool evidence from OpenCode JSON events while preserving
  the adapter boundary.
- [289-opencode-server-health-probe-slice.md](289-opencode-server-health-probe-slice.md)
  verifies attached OpenCode server health and version before launching
  `opencode run --attach`.
- [456-opencode-session-continuity-slice.md](456-opencode-session-continuity-slice.md)
  maps Entangle session ids to adapter-local OpenCode session ids and passes
  `--session` on later turns so node-local coding context carries forward.
- [457-opencode-session-continuity-process-smoke-slice.md](457-opencode-session-continuity-process-smoke-slice.md)
  proves the same behavior through the federated process-runner smoke using a
  second User Node task and Host-projected engine outcome.
- [458-host-cors-studio-dev-slice.md](458-host-cors-studio-dev-slice.md)
  makes browser-based Studio development viable across ports through explicit
  Host CORS allow-list support and keep-running demo instructions.
- [459-opencode-permission-mode-slice.md](459-opencode-permission-mode-slice.md)
  adds typed OpenCode permission-mode configuration and maps opt-in
  `auto_approve` profiles to `--dangerously-skip-permissions`.
- [460-agent-runtime-permission-mode-visibility-slice.md](460-agent-runtime-permission-mode-visibility-slice.md)
  exposes the resolved engine permission mode through Host runtime inspection,
  shared host-client formatting, CLI summaries, and Studio's runtime inspector.
- [463-opencode-permission-bridge-slice.md](463-opencode-permission-bridge-slice.md)
  adds the first real attached-server OpenCode permission bridge: Entangle can
  consume OpenCode `permission.asked` SSE events, route them through the
  runner's approval callback, publish signed `approval.request` messages to the
  requesting User Node, wait for the signed approval response, and then reply to
  OpenCode's `/permission/:requestID/reply` endpoint.
- [464-fake-opencode-server-harness-slice.md](464-fake-opencode-server-harness-slice.md)
  adds a deterministic OpenCode-like HTTP/SSE server plus smoke, narrowing the
  gap between mocked adapter tests and manual live OpenCode/provider
  validation; the runner adapter test also starts that fake server as a real
  process and drives the attached OpenCode bridge through real HTTP/SSE
  traffic.
- [470-fake-opencode-server-workspace-write-slice.md](470-fake-opencode-server-workspace-write-slice.md)
  extends the fake attached server with safe workspace writes and verifies
  action-block parsing plus source workspace mutation through the real
  fake-server process.
- [471-process-smoke-attached-fake-opencode-slice.md](471-process-smoke-attached-fake-opencode-slice.md)
  adds an opt-in federated process-runner smoke mode that starts the fake
  attached OpenCode server, configures it as Host's default `opencode_server`
  profile, approves OpenCode permission requests through the running User
  Client, and carries the normal source/artifact/wiki smoke flow forward.
- [473-fake-opencode-demo-command-slice.md](473-fake-opencode-demo-command-slice.md)
  adds shorter root smoke and interactive demo commands for the attached fake
  OpenCode path while keeping the fake server as a deterministic fixture over
  the normal federated runtime path.
- [476-external-process-agent-engine-adapter-slice.md](476-external-process-agent-engine-adapter-slice.md)
  adds a minimal runner adapter for `external_process` profiles: the runner
  spawns the configured executable, sends the shared turn request JSON on
  stdin, validates the shared turn result JSON from stdout, and tightens shared
  catalog validation so external-process profiles require an executable.
- [477-external-http-agent-engine-adapter-slice.md](477-external-http-agent-engine-adapter-slice.md)
  adds a minimal runner adapter for `external_http` profiles: the runner POSTs
  the shared turn request JSON to the configured endpoint and validates the
  shared turn result JSON response.
- [478-active-agent-engine-kind-contract-slice.md](478-active-agent-engine-kind-contract-slice.md)
  removes the non-executable `claude_agent_sdk` placeholder from active profile
  kind validation, CLI help, Host default selection, and distributed proof
  profiles until a native runner adapter exists.
- [480-distributed-proof-custom-agent-engine-setup-slice.md](480-distributed-proof-custom-agent-engine-setup-slice.md)
  teaches the distributed proof kit to upsert and bind `external_process` and
  `external_http` profiles through generated Host operator commands.
- [481-fake-external-http-agent-engine-harness-slice.md](481-fake-external-http-agent-engine-harness-slice.md)
  adds a deterministic no-credential HTTP endpoint plus smoke coverage for
  custom `external_http` agent-engine plumbing.
- [482-federated-process-smoke-fake-external-http-slice.md](482-federated-process-smoke-fake-external-http-slice.md)
  runs the fake external HTTP engine through the full federated process smoke
  and interactive User Node demo shortcut.
- [483-docker-runner-join-default-slice.md](483-docker-runner-join-default-slice.md)
  makes Docker managed runners default to generic join bootstrap and keeps
  direct runtime-context startup explicit.
- [484-runner-startup-explicit-mode-slice.md](484-runner-startup-explicit-mode-slice.md)
  makes unconfigured runner process startup fail fast instead of guessing an
  injected context file.
- [485-user-client-approval-turn-correlation-slice.md](485-user-client-approval-turn-correlation-slice.md)
  preserves the inbound approval request turn id when the User Client publishes
  a signed approval response.
- [486-host-test-pool-stability-slice.md](486-host-test-pool-stability-slice.md)
  moves Host package tests to a serial forked Vitest pool so `pnpm verify`
  remains deterministic.
- [487-session-cancellation-federated-only-slice.md](487-session-cancellation-federated-only-slice.md)
  removes the Host runtime-root session cancellation fallback; cancellation now
  requires an accepted federated assignment and active control-plane
  publication.
- [488-studio-user-client-boundary-audit.md](488-studio-user-client-boundary-audit.md)
  realigns the current-state audit with the implemented product boundary:
  Studio is the operator/admin console, while participant chat and review live
  in the running User Client or CLI User Node surfaces.
- [465-cli-agent-engine-profile-upsert-slice.md](465-cli-agent-engine-profile-upsert-slice.md)
  adds a Host-backed CLI catalog command for creating and updating typed agent
  engine profiles, including attached OpenCode profiles, permission mode,
  state scope, default-profile selection, dry-run request payloads, and compact
  operator summaries.
- [466-cli-agent-engine-profile-inspection-slice.md](466-cli-agent-engine-profile-inspection-slice.md)
  adds focused `list` and `get` commands for active catalog agent engine
  profiles with deterministic ordering and compact default-aware summaries.
- [467-studio-agent-engine-profile-visibility-slice.md](467-studio-agent-engine-profile-visibility-slice.md)
  adds a read-only Studio graph-editor subpanel for active catalog agent engine
  profiles, including default marker and compact kind/scope/permission/endpoint
  detail.
- [468-studio-agent-engine-profile-editor-slice.md](468-studio-agent-engine-profile-editor-slice.md)
  adds Studio catalog profile editing through Host's focused upsert route, with
  typed draft helpers and validation tests for attached OpenCode profiles.
- [469-host-agent-engine-profile-upsert-api-slice.md](469-host-agent-engine-profile-upsert-api-slice.md)
  adds Host-owned profile-level catalog mutation and moves CLI/Studio real
  saves onto that focused route.

Verification:

- OpenCode adapter tests using mocked server/SDK;
- session continuity mapping tests;
- federated process smoke for same-session OpenCode continuation;
- Host CORS/preflight tests for Studio development origins;
- OpenCode permission-mode schema and adapter tests;
- runtime inspection permission-mode contract and presentation tests;
- permission bridge tests;
- attached OpenCode SSE/permission-reply bridge tests;
- fake OpenCode attached-server HTTP/SSE smoke;
- runner adapter test against the fake OpenCode child-process server;
- federated process smoke with attached fake OpenCode server, User Node-signed
  permission approvals, workspace mutation, and session continuity;
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
- [403-studio-runner-trust-controls-slice.md](403-studio-runner-trust-controls-slice.md)
- [404-studio-runner-registry-detail-slice.md](404-studio-runner-registry-detail-slice.md)
- [405-studio-assignment-operational-detail-slice.md](405-studio-assignment-operational-detail-slice.md)
- [438-studio-assignment-related-navigation-slice.md](438-studio-assignment-related-navigation-slice.md)
- [461-studio-user-launch-boundary-slice.md](461-studio-user-launch-boundary-slice.md)
  removes Studio's selected-runtime session-launch card so participant task
  launch stays in User Client/CLI signed User Node surfaces.
- [462-user-node-inbox-outbox-projection-audit.md](462-user-node-inbox-outbox-projection-audit.md)
  records that durable User Node inbox/outbox projection is already implemented
  through Host message records, projected conversations, User Client, and CLI
  surfaces.

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
revoke actions. Studio can now also trust pending/revoked runners and revoke
pending/trusted runners from the Federation panel through the same Host runner
registry boundary as the CLI, and it enriches projected runner rows with full
Host runner registry liveness, heartbeat, runtime-kind, engine-kind, and
capacity summaries when available. Studio assignment timeline drilldowns now
also include runtime state, runner liveness/heartbeat, source-history counts,
replay counts, and command receipt counts for the selected assignment, plus
direct related navigation to the runtime inspector, runner registry,
source-history panel, and command receipt list. CLI
approve/reject can now derive signed response context from directly looked-up
recorded approval-request messages. Host status now exposes
first federated control/observe transport health and both CLI and Studio render
that Host-owned read model. Host status now also includes per-relay
control/observe diagnostic rows, and Studio renders those rows in the Host
Status panel. Old public direct Host approval/review mutation paths have already been
removed by the direct API removal cleanup.

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
under projected assignment rows. CLI can now list command receipts directly
from Host projection when operators need filtered command closure without
reading the full projection JSON. Studio can now open a selected assignment
timeline in the Federation panel through the same Host endpoint and render a
compact operational summary for that assignment with related navigation to the
runtime, runner, source-history, and command receipt panels.

Shared runtime inspection now also displays the selected agent engine
permission mode in host-client detail lines, CLI runtime summaries, and
Studio's selected-runtime inspector.

Studio no longer exposes a selected-runtime session/task launch card. It keeps
session trace, cancellation, and inspection surfaces, while participant task
publication remains in User Client/CLI signed User Node paths.

The previously listed durable User Node inbox/outbox projection gap is closed
in the current implementation. The running User Client now also exposes its own
Host-projected `human_interface` runtime assignment, runner, desired/observed
state, last-seen timestamp, client URL, restart generation, and status message.
The headless `entangle user-nodes clients` roster now joins those endpoint and
runtime fields with participant workload counts from Host projection:
conversation count, unread count, pending approval count, latest message time,
participant-requested command receipt count, and failed command receipt count.
Studio's User Node roster now reports the same participant-requested command
receipt and failed receipt counts alongside the existing conversation and
runtime placement summary.
User Node reassignment now has an explicit CLI operator wrapper over the Host
assignment API, including optional revocation of current offered/accepted/active
assignments, and Studio User Node runtime rows can prepare the Host assignment
form and open the current assignment timeline. Remaining reassignment work is
now focused on richer participant-aware workflow guidance without violating
Host authority and participant-side source/wiki review depth.
The React User Client and fallback HTML now render detailed participant command
receipt evidence for assignment, artifact/source/wiki ids, target paths,
replay/restore/proposal ids, session ids, and shortened wiki hash transitions.
The canonical surface and authority specs were repaired in
[506-canonical-user-node-surface-spec-repair.md](506-canonical-user-node-surface-spec-repair.md)
so they classify these shipped behaviors as current baseline rather than open
gaps.

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
- [400-artifact-backend-cache-prune-policy-slice.md](400-artifact-backend-cache-prune-policy-slice.md)
- [406-artifact-backend-cache-size-policy-slice.md](406-artifact-backend-cache-size-policy-slice.md)
- [409-artifact-backend-cache-target-policy-slice.md](409-artifact-backend-cache-target-policy-slice.md)
- [410-bootstrap-operator-security-status-slice.md](410-bootstrap-operator-security-status-slice.md)
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
- [402-user-node-runtime-demo-command-slice.md](402-user-node-runtime-demo-command-slice.md)
- [407-distributed-proof-kit-slice.md](407-distributed-proof-kit-slice.md)
- [408-distributed-proof-verifier-slice.md](408-distributed-proof-verifier-slice.md)
- [411-distributed-proof-tool-ci-smoke-slice.md](411-distributed-proof-tool-ci-smoke-slice.md)
- [425-distributed-proof-kit-agent-engine-selection-slice.md](425-distributed-proof-kit-agent-engine-selection-slice.md)
- [426-distributed-proof-kit-verifier-profile-slice.md](426-distributed-proof-kit-verifier-profile-slice.md)
- [427-distributed-proof-profile-manifest-slice.md](427-distributed-proof-profile-manifest-slice.md)
- [428-distributed-proof-artifact-evidence-verifier-slice.md](428-distributed-proof-artifact-evidence-verifier-slice.md)
- [429-distributed-proof-relay-health-verifier-slice.md](429-distributed-proof-relay-health-verifier-slice.md)
- [475-distributed-proof-kit-fake-opencode-slice.md](475-distributed-proof-kit-fake-opencode-slice.md)
- [455-user-client-wiki-page-patch-process-smoke-slice.md](455-user-client-wiki-page-patch-process-smoke-slice.md)

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
- the running User Client can now request runner-owned artifact restore for
  artifacts visible in the selected User Node conversation, forwarding to Host
  with `requestedBy` set to the User Node id and preserving runner-owned
  restore execution;
- the running User Client exposes wiki publication from visible wiki approval
  cards through a conversation-scoped Human Interface Runtime JSON route,
  forwarding to Host with `requestedBy` set to the User Node id;
- the process proof now calls the running User Client artifact restore JSON
  route for a visible source-history artifact and waits for the completed
  projected `runtime.artifact.restore` command receipt;
- the process proof now publishes a signed builder-to-User-Node wiki approval
  request, calls the running User Client wiki publication JSON route, and waits
  for the completed projected `runtime.wiki.publish` command receipt;
- User Client wiki publication requests that include a git target now require
  a matching visible `wiki_repository_publication` resource in the selected
  User Node conversation;
- the process proof now also verifies the projected target-specific git
  artifact and requested git repository branch head for User Client wiki
  publication;
- the process proof now publishes a signed builder-to-User-Node source-history
  approval request, calls the running User Client source-history publication
  JSON route with the target encoded by the visible
  `source_history_publication` resource, and waits for the completed projected
  `runtime.source_history.publish` command receipt;
- User Client source-history reconcile is now covered by the full process proof
  in the policy-permissive graph path: it publishes a visible
  `source_history` resource, calls the running User Client reconcile JSON
  route, and waits for the completed projected
  `runtime.source_history.reconcile` command receipt;
- runtime command receipt observations, Host events, and Host projection
  records now preserve optional `requestedBy` attribution. The running User
  Client and headless User Node CLI now read the Host-scoped
  `/v1/user-nodes/:nodeId/command-receipts` route for receipts requested by
  one User Node, and Studio plus operator CLI keep access to the full Host
  projection.
- Host-generated artifact source-change proposal ids now derive from the
  command id when omitted by callers and are returned in the response
  acknowledgement as the runner candidate id to follow;
- artifact source-change proposal completion now returns as a projected signed
  `runtime.command.receipt` correlated to the Host command id, effective
  proposal id, and resulting source-change candidate id, and the process proof
  waits for that receipt after candidate projection;
- artifact restore, targeted source-history publication, User Client
  source-history publication, source-history replay unit coverage, and wiki
  publication now emit the same signed command receipt
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
- Host API and CLI can dry-run, clear, age-prune, or max-size-prune the
  derived artifact backend cache, optionally scoped to a git
  service/namespace/repository target, without touching authoritative
  artifact, projection, runner, or git backend state;
- Studio displays the artifact backend cache summary in the Host Status panel;
- Host status exposes bootstrap operator security mode and normalized
  bootstrap attribution; token-protected Hosts now enforce `viewer` as a
  read-only bootstrap role, can distinguish multiple configured bootstrap
  operator tokens, can compare hash-only token records, can enforce explicit
  route-level bootstrap permissions when configured, and record matched
  operator identity/role/permissions on protected mutation audit events while
  keeping production identity/authorization as an
  explicit remaining hardening track; host-client and CLI summary output now
  presents those audit events with operator id, role, method, path, status, and
  auth mode;
- Host API, host-client, and CLI event-list surfaces now support server-side
  filters for category, node id, operator id, status code, and repeated type
  prefixes while preserving existing unfiltered limit behavior;
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
- User Client approval responses now preserve the originating approval request
  turn id so human-node decisions stay correlated with the agent turn they
  answer;
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
- `pnpm ops:demo-user-node-runtime` now wraps the fastest interactive User
  Node runtime proof by building the dedicated User Client app, starting the
  development relay, and running the process-runner smoke in `--keep-running`
  mode so operators can open both projected User Client URLs;
- `pnpm ops:demo-user-node-runtime:fake-opencode` now wraps that same
  keep-running User Node runtime proof with the attached fake OpenCode server
  profile, and `pnpm ops:smoke-federated-process-runner:fake-opencode`
  exposes the non-interactive attached fake OpenCode proof without requiring
  operators to remember the underlying smoke flags;
- `pnpm ops:distributed-proof-kit` now generates a three-runner proof kit for
  a reachable Host/relay/git topology, including Host-derived runner join
  configs, runner-local env/start scripts, and operator trust/assignment/User
  Node message commands intended to be copied onto separate machines; the kit
  defaults the agent runner to `opencode_server`, accepts
  `--agent-engine-kind <kind>` for custom proof profiles, and writes an
  `operator/proof-profile.json` manifest plus an operator verifier command that
  reads the same runner ids, graph node ids, and expected engine kind; generated
  kits can also prepare a deterministic attached fake OpenCode profile with
  `--fake-opencode-server-url <url>`, Host catalog upsert/node-binding operator
  commands, and optional runner Basic-auth env for no-credential distributed
  checks;
- `pnpm ops:distributed-proof-verify` now checks an already-running
  distributed proof through Host HTTP APIs and optional User Client health
  endpoints, covering Host Authority, runner trust/liveness, assignment
  convergence, expected runner runtime-kind and agent-engine capabilities,
  projection, `running` runtime observations, User Client URLs, distinct
  multi-user User Client URLs, and optional conversation evidence without
  reading Host or runner files; custom proof profiles can override the expected
  agent engine kind while OpenCode remains the default, and operators can
  optionally require projected artifact/source/wiki evidence from the agent
  node after work is produced plus relay WebSocket health for configured proof
  relays and Host catalog git backend health for selected or default git
  services; generated proof profiles now also carry the primary User Node
  conversation and projected User Client health requirements so invoking the
  verifier with only `--profile` keeps the generated proof strength;
- `pnpm ops:smoke-distributed-proof-tools` now runs a deterministic
  no-infrastructure smoke for proof-kit syntax/help/dry-run paths and verifier
  self-test JSON, including stopped-runtime rejection and the explicit
  diagnostic override plus duplicate User Client URL and wrong-runtime-kind
  or agent-engine rejection, making the distributed proof tooling CI-checkable
  before the real multi-machine proof is attempted; the same smoke also proves
  a non-default expected agent engine can pass when the registry fixture
  advertises it and that the proof kit can generate a matching custom-engine
  runner profile plus a matching custom verifier profile, and that the verifier
  can consume a generated-style proof profile manifest; the profile manifest is
  now also a typed package contract and script-validated ops contract, and the
  smoke proves invalid schema versions and inconsistent assignment runtime
  kinds fail before Host inspection; the proof kit can now also generate relay
  health profile/command settings when explicit relay URLs are supplied; it
  now writes repeatable topology and post-work artifact-evidence verifier
  scripts for generated proof kits; it also proves that missing artifact
  evidence, missing relay URLs, file-backed git services, and missing git
  service refs fail when explicitly required; the verifier now honors explicit
  proof-profile assignment ids instead of always deriving them from runner ids,
  and the smoke covers custom assignment ids plus profile-driven conversation
  and User Client health requirements. Generated proof kits now also write a
  separate post-work proof profile requiring projected work evidence plus a
  published git artifact or source-history publication from the agent node, and
  the proof-tool smoke covers the passing and missing published-git-evidence
  paths. When generated with `--check-published-git-ref`, proof kits now also
  encode a post-work verifier check that runs `git ls-remote` from the operator
  machine against projected published git artifact locators and checks the
  advertised branch commit;
- runtime-context runner startup and the Human Interface Runtime now support
  mounted-file identity secret delivery as well as env-var delivery, matching
  generic runner join behavior;
- runner process startup now requires explicit `join`, join-config env, or an
  explicit runtime-context path instead of guessing a default injected context;
- Host package tests now run in a serial forked Vitest pool, matching the
  stability posture already used by runner tests;
- Host session cancellation no longer writes request records into runner
  runtime roots as a fallback; it now requires accepted federated assignment
  control and active relay publication;
- the Studio/User Client boundary is now documented as operator/admin Studio
  plus participant User Client and headless CLI, matching the current code;
- `entangle deployment repair` now recreates missing standard `.entangle/host`
  skeleton directories for compatible existing deployments while leaving
  unreadable or unsupported layouts blocked for manual inspection;
- Host event records now include optional audit hash-chain fields, Host event
  appends are serialized to preserve chain order, and CLI runtime-trace
  summaries expose the hashes when present; Host, host-client, and CLI now
  expose an event-integrity inspection surface that reports valid, broken, or
  partially unverifiable event chains, and Studio renders the same Host-owned
  event-integrity summary in Host Status; Host and CLI can also export a Host
  Authority-signed integrity report for compact audit provenance; Host,
  host-client, and CLI now also export a typed event audit bundle containing
  typed events, a canonical event JSONL hash, the signed integrity report, and
  a bundle hash, and deployment diagnostics now embeds that audit bundle when
  available while preserving non-fatal support-bundle collection and allowing
  operators to pass `--no-audit-bundle` when a smaller live diagnostics bundle
  is required; `entangle host events audit-bundle` can now also write the full
  signed bundle with `--output <file>` while printing a compact hash/provenance
  summary;
- runner-owned session memory now carries owner, originating-node,
  entrypoint-node, last-message, and active-route metadata in both the bounded
  synthesis prompt and deterministic working-context wiki page, giving
  delegated sessions owner-aware continuation context;
- focused-register lifecycle transition history now writes an indexed wiki
  summary page and future memory ref, so closures, completions, replacements,
  consolidations, and exact-overlap retirements are visible through the node
  memory substrate without adding a Host filesystem read path;
- canonical User Node, entity, and Studio/CLI specs now match the implemented
  Host Authority, runner registry, User Node signing, scoped command-receipt,
  workload, and own-runtime status baseline;
- CLI and Studio now expose User Node-focused assignment/reassignment entry
  points on top of the same Host assignment API instead of requiring operators
  to discover the generic graph-node assignment surface;
- User Client command receipt cards now expose bounded command closure evidence
  beyond command id/status, including wiki hash transitions and operation
  target ids;
- User Client wiki page cards can now load complete projected previews into
  the participant page-update form as replacement drafts, so a running User
  Node can review and edit visible wiki memory without copying content out of
  projection cards;
- distributed proof profiles and generated verifier commands can now require
  projected User Client URLs to be non-loopback and non-wildcard, giving
  physical multi-machine proof runs an opt-in check that human-node clients are
  reachable beyond the node's own machine;
- generated proof kits can now require User Client Basic Auth placeholders and
  fail-fast start checks for User Node runner machines, keeping credentials out
  of the kit command line while hardening physical proof endpoints;
- the remaining distributed proof hardening is infrastructure-backed
  orchestration that can provision multiple machines or VM/container boundaries
  around the verifier.

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
