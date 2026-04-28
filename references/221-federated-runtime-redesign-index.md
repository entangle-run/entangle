# Federated Runtime Redesign Index

## Status

Plan status: ready for implementation after the documentation audit loop recorded
in this pack.

This pack supersedes the local-only delivery framing in
`180-local-ga-product-truth-audit.md` and
`189-entangle-completion-plan.md` for future architecture work. It does
not delete those files because they remain useful history for the implemented
local adapter.

The file numbers `221` and `222` are intentionally reused by this pivot pack
because the handoff required these exact filenames. The existing
`221-source-history-replay-slice.md` and
`222-wiki-repository-publication-slice.md` remain valid earlier
same-machine slice records.

## Pack

- [222-current-state-codebase-audit.md](222-current-state-codebase-audit.md)
- [223-federated-product-vision.md](223-federated-product-vision.md)
- [224-entity-model-and-authority-boundaries.md](224-entity-model-and-authority-boundaries.md)
- [225-host-runner-federation-spec.md](225-host-runner-federation-spec.md)
- [226-user-node-and-human-interface-runtime-spec.md](226-user-node-and-human-interface-runtime-spec.md)
- [227-nostr-event-fabric-spec.md](227-nostr-event-fabric-spec.md)
- [228-distributed-state-projection-spec.md](228-distributed-state-projection-spec.md)
- [229-studio-cli-operator-and-user-surfaces-spec.md](229-studio-cli-operator-and-user-surfaces-spec.md)
- [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md)
- [231-implementation-slices-and-verification-plan.md](231-implementation-slices-and-verification-plan.md)

## Implementation Records

- [232-federated-contracts-slice.md](232-federated-contracts-slice.md)
- [233-host-authority-store-slice.md](233-host-authority-store-slice.md)
- [234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md)
- [235-runner-registry-slice.md](235-runner-registry-slice.md)
- [236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md)
- [237-generic-runner-bootstrap-slice.md](237-generic-runner-bootstrap-slice.md)
- [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md)
- [239-host-projection-snapshot-slice.md](239-host-projection-snapshot-slice.md)
- [240-user-node-identity-slice.md](240-user-node-identity-slice.md)
- [241-signed-user-node-messages-slice.md](241-signed-user-node-messages-slice.md)
- [242-observed-artifact-source-wiki-refs-slice.md](242-observed-artifact-source-wiki-refs-slice.md)
- [243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)
- [244-product-naming-migration-slice.md](244-product-naming-migration-slice.md)
- [245-host-control-observation-bridge-slice.md](245-host-control-observation-bridge-slice.md)
- [246-federated-control-plane-smoke-slice.md](246-federated-control-plane-smoke-slice.md)
- [247-host-startup-control-plane-wiring-slice.md](247-host-startup-control-plane-wiring-slice.md)
- [248-runner-default-assignment-materializer-slice.md](248-runner-default-assignment-materializer-slice.md)
- [249-runtime-status-observation-projection-slice.md](249-runtime-status-observation-projection-slice.md)
- [250-federated-dev-deployment-naming-cleanup-slice.md](250-federated-dev-deployment-naming-cleanup-slice.md)
- [251-runner-assignment-runtime-start-slice.md](251-runner-assignment-runtime-start-slice.md)
- [252-federated-runtime-projection-surface-slice.md](252-federated-runtime-projection-surface-slice.md)
- [253-live-relay-federated-smoke-slice.md](253-live-relay-federated-smoke-slice.md)
- [254-process-runner-federated-smoke-slice.md](254-process-runner-federated-smoke-slice.md)
- [255-public-runtime-api-path-boundary-slice.md](255-public-runtime-api-path-boundary-slice.md)
- [256-portable-runtime-bootstrap-bundle-slice.md](256-portable-runtime-bootstrap-bundle-slice.md)
- [257-federated-session-conversation-observations-slice.md](257-federated-session-conversation-observations-slice.md)
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
- [269-runner-observed-ref-emission-slice.md](269-runner-observed-ref-emission-slice.md)
- [270-source-change-ref-summary-projection-slice.md](270-source-change-ref-summary-projection-slice.md)
- [271-user-client-source-summary-projection-slice.md](271-user-client-source-summary-projection-slice.md)
- [272-cli-user-node-approval-context-slice.md](272-cli-user-node-approval-context-slice.md)
- [273-user-client-projected-source-diff-excerpt-slice.md](273-user-client-projected-source-diff-excerpt-slice.md)
- [274-studio-user-node-runtime-summary-slice.md](274-studio-user-node-runtime-summary-slice.md)
- [275-cli-user-node-approval-from-message-slice.md](275-cli-user-node-approval-from-message-slice.md)
- [276-user-node-message-lookup-slice.md](276-user-node-message-lookup-slice.md)
- [277-projected-artifact-preview-slice.md](277-projected-artifact-preview-slice.md)
- [278-user-node-local-read-state-slice.md](278-user-node-local-read-state-slice.md)
- [279-user-client-wiki-ref-projection-slice.md](279-user-client-wiki-ref-projection-slice.md)
- [280-user-node-read-receipt-slice.md](280-user-node-read-receipt-slice.md)
- [281-projected-wiki-preview-slice.md](281-projected-wiki-preview-slice.md)
- [282-process-runner-smoke-relay-preflight-slice.md](282-process-runner-smoke-relay-preflight-slice.md)
- [283-user-node-parent-message-read-model-slice.md](283-user-node-parent-message-read-model-slice.md)
- [284-user-node-delivery-retry-state-slice.md](284-user-node-delivery-retry-state-slice.md)
- [285-studio-wiki-publication-retry-slice.md](285-studio-wiki-publication-retry-slice.md)
- [286-opencode-tool-evidence-slice.md](286-opencode-tool-evidence-slice.md)
- [287-user-client-runtime-status-live-refresh-slice.md](287-user-client-runtime-status-live-refresh-slice.md)
- [288-user-client-source-candidate-review-slice.md](288-user-client-source-candidate-review-slice.md)
- [289-opencode-server-health-probe-slice.md](289-opencode-server-health-probe-slice.md)
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
- [300-host-transport-health-slice.md](300-host-transport-health-slice.md)
- [301-runner-join-config-cli-slice.md](301-runner-join-config-cli-slice.md)
- [302-runner-heartbeat-loop-slice.md](302-runner-heartbeat-loop-slice.md)
- [303-runner-heartbeat-config-smoke-slice.md](303-runner-heartbeat-config-smoke-slice.md)
- [304-deployment-index-profile-cleanup-slice.md](304-deployment-index-profile-cleanup-slice.md)
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
- [317-docker-join-config-env-slice.md](317-docker-join-config-env-slice.md)
- [318-projected-source-candidate-file-preview-slice.md](318-projected-source-candidate-file-preview-slice.md)
- [319-projected-memory-wiki-read-api-slice.md](319-projected-memory-wiki-read-api-slice.md)
- [320-projected-artifact-history-diff-read-api-slice.md](320-projected-artifact-history-diff-read-api-slice.md)
- [321-signed-source-candidate-review-slice.md](321-signed-source-candidate-review-slice.md)
- [322-public-direct-mutation-surface-quarantine-slice.md](322-public-direct-mutation-surface-quarantine-slice.md)
- [323-direct-host-approval-review-api-removal-slice.md](323-direct-host-approval-review-api-removal-slice.md)
- [324-federated-runtime-lifecycle-control-slice.md](324-federated-runtime-lifecycle-control-slice.md)
- [325-federated-lifecycle-process-smoke-slice.md](325-federated-lifecycle-process-smoke-slice.md)
- [326-assignment-receipt-audit-trail-slice.md](326-assignment-receipt-audit-trail-slice.md)
- [327-assignment-receipt-projection-slice.md](327-assignment-receipt-projection-slice.md)
- [328-assignment-receipt-operator-surfaces-slice.md](328-assignment-receipt-operator-surfaces-slice.md)
- [329-per-relay-transport-diagnostics-slice.md](329-per-relay-transport-diagnostics-slice.md)
- [330-runner-owned-source-history-application-slice.md](330-runner-owned-source-history-application-slice.md)
- [331-projected-source-history-ref-slice.md](331-projected-source-history-ref-slice.md)
- [332-runner-owned-source-history-publication-slice.md](332-runner-owned-source-history-publication-slice.md)
- [333-host-source-history-publication-removal-slice.md](333-host-source-history-publication-removal-slice.md)
- [334-host-source-application-replay-removal-slice.md](334-host-source-application-replay-removal-slice.md)

## Audited Scope

Current audit read or searched:

- `README.md`, `resources/README.md`, `wiki/overview.md`,
  `wiki/index.md`, and `wiki/log.md`;
- canonical reference docs from `00` through `45`, with deeper passes over
  graph, protocol, runner, state-machine, Host, client, identity, runtime
  context, engine, deployment, quality, and agent-engine boundary specs;
- same-machine implementation slice docs from runtime materialization through wiki
  repository publication, especially `180`, `189`, `193`, `194`, `209`,
  `210`, `214`, `220`, `221`, and `222`;
- package contracts in `packages/types`, including graph, resources, runtime
  context, runtime identity, runtime state, A2A, Nostr transport, Host status,
  runtime, sessions, and host API contracts;
- semantic validation in `packages/validator`;
- Host state, API, session launch, runtime backend, Docker client, and tests in
  `services/host`;
- runner bootstrap, Nostr transport, OpenCode adapter, service loop, state
  store, artifact, source, memory, wiki, and tests in `services/runner`;
- shared Host client methods in `packages/host-client`;
- CLI command surface and tests in `apps/cli`;
- Studio app, session launch, approval, graph, event refresh, runtime
  inspection, and tests in `apps/studio`;
- federated dev deployment material under `deploy/` and operational smokes under
  `scripts/`;
- checked-out OpenCode reference code under
  `/Users/vincenzo/Documents/GitHub/VincenzoImp/entangle/resources/opencode`,
  including CLI `run`, `serve`, server routes, session, permissions, agent
  config, task subagent tool, and security notes.

## Known Repo Truth

The repository already has a serious graph-native base: `GraphSpec`,
`NodeInstance`-like bindings, edges, resource catalogs, Nostr A2A messages,
artifact references, git-backed handoff, same-machine runner services,
OpenCode-first engine profiles, Host API, Studio, CLI, tests, and Docker
deployment adapter material.

The repository is not fully federated:

- `runtimeProfileSchema` now uses `"federated"`;
- Host state layout declares product `"entangle"`;
- Host still materializes launcher-owned workspaces and writes
  `effective-runtime-context.json`;
- Docker direct runtime-context runners can still mount shared Host and secret
  volumes, but Docker join mode now supports inline JSON join config delivery
  without mounting those Host volumes into the managed runner container;
- Host can publish signed assignment control payloads, signed runtime
  start/stop/restart commands for accepted assignments, and project
  runner-signed runtime status observations; node runtime lifecycle now uses
  the federated path when a runner assignment owns the node, while Docker/memory
  reconciliation remains the unassigned local adapter path;
- Host still reconstructs some deep wiki/source mutation and publication
  details by reading runner-owned runtime paths, though source-history list and
  detail reads can now use runner-observed projection;
- Host session launch now signs `task.request` with stable User Node identity
  material, and User Nodes are assignable to `human_interface` runners;
- joined runners can start a minimal Human Interface Runtime for assigned User
  Nodes, and Host projection can expose the runtime's `clientUrl`;
- user nodes have stable identities, a User Node-specific inbox API, projected
  conversation surfaces, and a first usable runner-served User Client with
  thread selection, inbound/outbound message history, approval response
  controls, approval resource rendering, signed approval-response context,
  source-change projection summary cards, source-change diff preview,
  signed source-candidate accept/reject messages handled by the owning runner,
  artifact-ref rendering, projected bounded artifact preview with runtime
  fallback, delivery labels, local conversation read state, projected wiki-ref
  rendering, projected wiki preview rendering, wiki-scoped approval context
  rendering, signed read receipts,
  parent-message links, delivery retry state, runtime status, live state
  refresh, message publishing, local JSON APIs for conversation detail and
  message publishing, a first dedicated `apps/user-client` app, and optional
  runtime static serving for that app; the federated dev runner image now
  bundles the built app and the Docker launcher adapter can publish a
  browser-openable User Client port for User Node runtime contexts; the
  dedicated app now exposes JSON-backed artifact preview, source diff,
  source-candidate review, and wiki preview cards, but richer object-backend
  review remains incomplete;
- joined agent runners now emit `artifact.ref`, `source_change.ref`, and
  `wiki.ref` observations during normal turn execution, so Host's observed
  artifact/source/wiki projection reducers are fed by real runner behavior
  instead of only by direct Host tests;
- OpenCode-backed runner turns now preserve bounded generic tool evidence,
  including tool titles, redacted input summaries, output summaries, and
  durations, while keeping OpenCode-specific event payloads behind the engine
  adapter boundary;
- OpenCode-backed runner turns now probe `/global/health` before attaching to
  a configured OpenCode server, include Basic auth from runner environment
  when configured, and record combined CLI/server version evidence while still
  executing through the generic adapter boundary;
- `source_change.ref` observations and Host projection records now carry the
  runner's bounded `sourceChangeSummary`, so source candidates can be listed
  and triaged from projection without reading runner-local detail files;
- the User Client source-change review page now renders projected
  `diffExcerpt` evidence from matching `source_change.ref` records before
  falling back to the runtime-local diff endpoint;
- public Studio/CLI approval controls now use signed User Node message paths
  instead of Host approval-review mutations, and CLI signed approval responses
  can carry scoped operation/resource/reason context or derive it from recorded
  inbound approval-request messages;
- Studio's federation overview now joins User Node identity, runtime
  projection, User Client URL, and conversation projection into read-only
  operator summaries for Human Interface Runtimes;
- Host now exposes direct recorded User Node message lookup by event id, and
  CLI `approve/reject --from-message` uses that read model instead of scanning
  conversations;
- runner A2A transport exists, Host startup subscribes to control/observe relay
  paths, and joined runners can now start node runtime services from
  materialized assignment context paths;
- generic joined runners now emit periodic signed `runner.heartbeat`
  observations with accepted assignment ids and capacity-derived operational
  state, and their join configs can optionally tune `heartbeatIntervalMs`;
- Host projection now exposes runtime projection records from observed runtime
  state, intents, and assignment records without invoking backend
  reconciliation;
- Host public runtime inspection responses no longer expose `contextPath`;
  Host keeps that path only as private process state for the remaining
  filesystem-backed detail readers;
- joined runners now fetch authenticated portable bootstrap bundles with
  sanitized workspace paths and package/memory file snapshots instead of
  materializing directly from Host-local context paths;
- `ops:smoke-federated-live-relay` now proves the federated control/observe path
  against a real relay and projects a git-backed artifact ref;
- `ops:smoke-federated-process-runner` now starts a real joined runner process,
  has it fetch authenticated runtime bootstrap context from Host API,
  materializes runner-owned workspace paths, starts the assigned node runtime,
  reports signed runtime status through the relay, exercises signed federated
  runtime stop/start/restart control commands through the live runner process,
  starts a second joined runner process for the graph User Node, assigns it as
  a `human_interface` runtime, verifies its projected User Client endpoint,
  health route, state API, JSON publish API, and conversation-detail API,
  publishes a signed User Node message to the assigned agent node through the
  running User Client, exercises a deterministic OpenCode-adapter task turn,
  verifies projected turn/approval/session read APIs, verifies runner-owned
  session/conversation intake, and verifies Host projection of the User Node
  conversation without requiring a live model-provider call;
- the same process smoke now proves two distinct User Nodes assigned to two
  distinct `human_interface` runner processes, with two User Client state
  checks, two signed publishes with distinct User Node pubkeys, and two Host
  projected conversations;
- CLI now exposes `entangle user-nodes clients` to join active User Node
  identities with Host-projected Human Interface Runtime placement and User
  Client URLs;
- Studio now includes a Federation panel assignment control that offers graph
  nodes, including User Nodes, to trusted runners through the Host assignment
  API;
- Studio now also lists projected runtime assignments and can revoke active,
  accepted, offered, or revoking assignments through the Host assignment API;
- Host status now includes bounded federated control/observe transport health
  with configured relay URLs, subscribed/degraded/stopped lifecycle state, and
  last startup failure metadata; CLI summaries and Studio Host Status render
  the same Host-owned status read model;
- CLI can now write validated Host-derived generic runner join configs through
  `entangle runners join-config`, and the runner package exposes an
  `entangle-runner` bin for `join --config` startup;
- generic joined runners now keep Host projection live through periodic signed
  `runner.heartbeat` observations after startup;
- Docker-managed joined runners can now receive inline join config JSON through
  environment, and the federated dev Compose profile selects Docker join mode
  with Host API bundle retrieval instead of path-mounted join config delivery;
- the process-runner smoke now validates Host-projected heartbeats from the
  agent runner and both User Node runners by writing a short interval into the
  temporary join configs;
- observed activity records now distinguish `observation_event` from
  `runtime_filesystem`, local runtime synchronization preserves signed
  observation-event activity records, and the high-level Host session list can
  surface projected remote sessions that have no Host-readable runner
  filesystem record;
- the Host session detail route now also falls back to bounded projection-backed
  inspection for observed remote sessions when local runtime filesystem detail
  is unavailable;
- runner-owned approval lifecycle changes now publish `approval.updated`
  observations with bounded approval records, and Host reduces those signed
  events into approval activity projection and typed approval trace events;
- Host runtime approval list/detail GET routes now merge projected approval
  records with local compatibility files, while keeping direct approval mutation
  local-context backed;
- Host runtime turn list/detail GET routes now merge projected turn records
  with local compatibility files;
- Host runtime artifact list/detail GET routes now merge projected
  `artifact.ref` records with local compatibility files and no longer require a
  Host-readable runtime context for projected remote artifacts;
- Host runtime artifact preview GET routes now prefer local previews when
  present and fall back to bounded projected `artifact.ref` preview content
  without fabricating runner-local `sourcePath`;
- joined runners now include the full bounded `SourceChangeCandidateRecord`
  when publishing `source_change.ref` observations, and Host runtime
  source-change candidate list/detail GET routes can merge those projected
  candidate records with local compatibility files;
- Host runtime source-change candidate diff GET routes now prefer local
  shadow-git diffs and fall back to projected `diffExcerpt` evidence from
  observed source-change candidate records;
- Host runtime source-change candidate file preview GET routes now prefer local
  shadow-git file content and fall back to bounded projected file previews from
  observed source-change candidate records;
- Host runtime memory list/page GET routes now prefer local memory files and
  fall back to observed `wiki.ref` projection records with bounded preview
  content, so remote node wiki memory remains inspectable without Host-readable
  runner memory roots;
- Host runtime artifact history/diff GET routes now prefer local git
  materialization and fall back to projected artifact records with explicit
  unavailable reasons when no backend-resolved repository checkout is attached
  to Host;
- Host runtime synchronization no longer reconciles nodes with active/offered
  federated assignments through the local backend; assigned runtime inspection
  reports `backendKind: "federated"` and waits for signed runner observation;
- Host runtime lifecycle routes now publish signed `runtime.start`,
  `runtime.stop`, and `runtime.restart` commands to accepted/active assigned
  runners, and joined runners handle those commands by starting/stopping their
  runner-local runtime handles and emitting receipts/status observations;
- Host now records signed `assignment.receipt` observations as typed
  `runtime.assignment.receipt` Host audit events, and the process-runner smoke
  verifies received/started/stopped receipt events from the real lifecycle path;
- Host projection now includes bounded `assignmentReceipts` derived from typed
  receipt events, and Studio/CLI now expose compact receipt summaries for
  operator inspection without scanning the general event stream;
- User Client source-candidate accept/reject now publishes signed
  `source_change.review` A2A messages, and the owning runner applies the review
  to runner-local candidate state before emitting a new `source_change.ref`
  observation. Accepted reviews now also cause the owning runner to record a
  runner-local source-history application when the shadow git snapshot and
  source workspace are still compatible, then emit a signed
  `source_history.ref` observation carrying the concrete `SourceHistoryRecord`
  for Host projection and read-only source-history inspection. When the node has
  a primary git repository target and source publication does not require extra
  approval, the runner also publishes a git commit artifact and emits the
  resulting `artifact.ref` plus updated `source_history.ref`;
- Studio and CLI public operator surfaces no longer expose direct Host approval
  decisions or source-candidate review mutations. CLI now exposes signed User
  Node source review through `entangle review-source-candidate` and generic
  `entangle user-nodes message --message-type source_change.review`;
- Host and `packages/host-client` no longer expose direct approval-decision or
  source-candidate review mutation APIs. Approval responses and source reviews
  must use signed User Node A2A messages, and review projection is carried by
  runner-observed `source_change.ref`;
- the process-runner smoke now injects a temporary fake OpenCode executable
  into the agent runner PATH, sends a signed User Node `task.request`, and
  verifies Host runtime turn, source-change candidate list/detail/diff/file,
  signed source-candidate review, approval, and session read APIs against signed
  observations from the real joined runner process without requiring live model
  credentials;
- joined runners now publish session/conversation observations after outbound
  handoff writes, coordination close/result transitions, approval request and
  response transitions, session completion, and failure/cancellation paths, so
  Host projection can follow lifecycle state without runner filesystem access;
- the process runner smoke now preflights the configured Nostr relay and fails
  with an actionable relay prerequisite message before starting Host or runner
  processes when the relay is unavailable;
- the active deployment index now points at `deploy/federated-dev` rather than
  a stale local profile path;
- `RuntimeBackend` is currently the main runtime abstraction, but it is really
  a Docker launcher adapter.

## Target Model

Entangle is the product. Same-machine deployment is one topology, not a
separate product or runtime profile.

Host is an authoritative control plane with a Host Authority key. Runners start
generic, register through signed Nostr events, receive assignments, execute
assigned nodes, and emit signed observations. User nodes have stable identities
and participate as graph actors through a Human Interface Runtime that exposes
a User Client. Studio is the admin/operator control room. CLI remains a
headless/admin and development gateway, not the primary participant UI.

Nostr carries signed messages, control events, observations, approvals,
heartbeats, receipts, and artifact references. It does not carry private keys,
large artifacts, workspaces, full logs, Host databases, or model caches.

OpenCode remains the default per-node coding engine behind an adapter. Entangle
must not become a fork of OpenCode; it should operate OpenCode or another
engine as a replaceable node-local execution brain while Entangle owns graph
identity, policy, assignment, artifact, memory, projection, and user surfaces.

## Planned Implementation Slices

1. Federated contracts and validators.
2. Host Authority key store, import/export, and status.
3. Nostr control and observation event fabric.
4. Runner registry with hello, trust, revoke, heartbeat, and stale status.
5. Runtime assignment lifecycle with leases and receipts.
6. Generic runner bootstrap without preloaded graph context.
7. Docker launcher adapter rebased onto the same assignment path.
8. ProjectionStore built from signed observations instead of runtime filesystem
   reads.
9. User Node identity records, assignable Human Interface Runtime, and User
   Client. The first assignable/minimal-client slice and inbound/outbound
   message history, approval controls, approval resource rendering, signed
   approval-response context, source-change projection summaries,
   projected source-change diff excerpts, source-change diff/file preview
   fallback, artifact-ref rendering, projected bounded artifact preview with runtime
   fallback, delivery labels, local conversation read state, projected wiki-ref
   rendering, projected wiki preview rendering, wiki-scoped approval context
   rendering, signed read receipts, parent-message links, delivery retry state,
   runtime status, live state refresh, local JSON conversation/message APIs,
   a first dedicated User Client app, signed source-candidate accept/reject
   messages handled by the owning runner, wiki publication retry actions, and CLI User Client
   endpoint discovery are implemented; complete projection-backed source/wiki
   review remains open.
10. Signed user-node task, reply, approval, and rejection messages. CLI
    approval and rejection commands now preserve optional signed approval
    operation/resource/reason context.
11. Artifact/source/wiki reference publication through observation and git
    refs. Runner emission of observed artifact/source/wiki refs is implemented;
    source-change summaries, bounded source file previews, bounded artifact
    previews, and projected memory/wiki read previews now project through
    observed refs; complete source/wiki mutation and publication workflows
    remain open.
12. Studio and CLI operator/user-node federation surfaces. CLI and Studio now
    both expose first-pass assignment offer and revoke operations through
    Host-owned APIs.
13. Product naming migration with no local-product compatibility marker.
14. Distributed smoke test.

## Acceptance Criteria

- A runner can start without graph assignment.
- Host can trust a runner and assign a node through signed Nostr control.
- Host and runner do not share filesystem in the federated smoke.
- Multiple user nodes can exist in one graph and can be assigned to distinct
  `human_interface` runners on different machines or networks.
- A running User Node exposes a User Client endpoint through Host projection.
- User-node replies and approvals are signed by stable user-node identity.
- Agent nodes and human nodes communicate through the same A2A model.
- Host observes runtime state through signed events, not runner-local files.
- Artifacts, source changes, and wiki memory are passed by refs/hashes.
- Docker same-machine launch remains an adapter, not the privileged architecture.
- Studio and CLI reflect the same Host projection.
- Public docs say Entangle as product identity.
- New contracts have schema and validator tests.
- Each implementation slice updates docs, tests, audit records, and an atomic
  commit.

## Remaining Uncertainty

No uncertainty blocks the first implementation slice. The plan assumes:

- v1 supports one active Host Authority instance to avoid split brain;
- breaking changes are acceptable because the project is pre-release;
- pre-release Entangle state can be regenerated instead of preserving old
  local-product markers;
- Host may provision development key material initially, but Host must not be the
  conceptual signer for user-node messages;
- remote OpenCode server integration is preferred over only one-shot CLI for
  permission and long-running turn parity.

## Audit Loop Record

The plan was checked against the actual repo after writing:

- local-only assumptions are listed in
  [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md);
- implementation slices reference the modules that currently own each behavior;
- duplicate `221` and `222` references are intentionally documented;
- no code implementation is included in this documentation slice.

Plan readiness: Slices 1 through 14 plus startup/materialization/process-smoke
follow-up slices, the public runtime API path boundary, portable runtime
bootstrap bundles, the first split agent/User Node process smoke, and the first
User Node-specific inbox/User Client surface are implemented in this branch.
The User Client now emits signed source-candidate review messages to the owning
runner, CLI can publish signed source-candidate review messages as a User Node,
public Studio/CLI operator approval-review mutations are quarantined, the
underlying Host/client direct approval-review APIs are removed, CLI can list
projected User Client endpoints per User Node, Host status exposes first
control/observe transport health to CLI and Studio, operators can generate
generic runner join configs from Host status, Host publishes signed federated
runtime lifecycle commands for accepted assignments, joined runners apply
start/stop/restart commands locally and emit signed receipts/status, and Host
runtime inspection no longer overwrites assigned federated runtime ownership
through the local backend adapter. The process-runner smoke now proves that
same lifecycle path end-to-end through a live relay and real joined runner
process, Studio/CLI now expose compact projected assignment receipt evidence
for operator inspection, Host status now carries per-relay control/observe
diagnostics for operator surfaces, and accepted signed source-candidate reviews
now produce projected runner-owned source-history application and primary git
publication evidence, with the old direct Host publication, source-candidate
apply, and source-history replay mutations removed from Host, CLI, Studio, and
host-client. The next blocking implementation areas are explicit runner-owned
publication retry/non-primary target commands, runner-owned source replay,
richer
projection-backed source/wiki review services, assignment detail UI for grouped
receipt timelines, replacing remaining deep filesystem-backed runtime
inspection paths with projection-backed source/wiki services and object-backed
artifact services, and turning the process smoke into the full multi-machine
distributed proof.
