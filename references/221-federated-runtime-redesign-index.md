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
- Docker runners mount shared Host and secret volumes;
- Host can publish signed assignment control payloads and project
  runner-signed runtime status observations, but node runtime start/stop still
  has a Docker launcher path that must be demoted to an adapter;
- Host still reconstructs some sessions, approvals, source history, and wiki
  details by reading runner-owned runtime paths;
- Host session launch now signs `task.request` with stable User Node identity
  material, and User Nodes are assignable to `human_interface` runners;
- joined runners can start a minimal Human Interface Runtime for assigned User
  Nodes, and Host projection can expose the runtime's `clientUrl`;
- user nodes have stable identities, a User Node-specific inbox API, projected
  conversation surfaces, and a first usable runner-served User Client with
  thread selection, inbound/outbound message history, approval response
  controls, approval resource rendering, signed approval-response context,
  source-change projection summary cards, source-change diff preview,
  Host-mediated source-candidate accept/reject controls stamped with the
  running User Node id, artifact-ref rendering, projected bounded artifact
  preview with runtime fallback, delivery labels, local conversation read
  state, projected wiki-ref rendering, projected wiki preview rendering,
  wiki-scoped approval context rendering, signed read receipts,
  parent-message links, delivery retry state, runtime status, live state
  refresh, and message publishing, but a separate
  bundled User Client app and richer object-backend review still remain
  incomplete;
- joined agent runners now emit `artifact.ref`, `source_change.ref`, and
  `wiki.ref` observations during normal turn execution, so Host's observed
  artifact/source/wiki projection reducers are fed by real runner behavior
  instead of only by direct Host tests;
- OpenCode-backed runner turns now preserve bounded generic tool evidence,
  including tool titles, redacted input summaries, output summaries, and
  durations, while keeping OpenCode-specific event payloads behind the engine
  adapter boundary;
- `source_change.ref` observations and Host projection records now carry the
  runner's bounded `sourceChangeSummary`, so source candidates can be listed
  and triaged from projection without reading runner-local detail files;
- the User Client source-change review page now renders projected
  `diffExcerpt` evidence from matching `source_change.ref` records before
  falling back to the runtime-local diff endpoint;
- older Studio/CLI approval controls still include Host mutation paths even
  though signed User Node reply/approve/reject commands now exist, and CLI
  signed approval responses can now carry scoped operation/resource/reason
  context or derive it from recorded inbound approval-request messages;
- Studio's federation overview now joins User Node identity, runtime
  projection, User Client URL, and conversation projection into read-only
  operator summaries for Human Interface Runtimes;
- Host now exposes direct recorded User Node message lookup by event id, and
  CLI `approve/reject --from-message` uses that read model instead of scanning
  conversations;
- runner A2A transport exists, Host startup subscribes to control/observe relay
  paths, and joined runners can now start node runtime services from
  materialized assignment context paths;
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
  reports signed runtime status through the relay, starts a second joined
  runner process for the graph User Node, assigns it as a `human_interface`
  runtime, verifies its projected User Client endpoint and health route,
  publishes a signed User Node message to the assigned agent node, verifies
  runner-owned session/conversation intake, and verifies Host projection of the
  User Node conversation without requiring a live model-provider call;
- the same process smoke now proves two distinct User Nodes assigned to two
  distinct `human_interface` runner processes, with two User Client state
  checks, two signed publishes with distinct User Node pubkeys, and two Host
  projected conversations;
- the process runner smoke now preflights the configured Nostr relay and fails
  with an actionable relay prerequisite message before starting Host or runner
  processes when the relay is unavailable;
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
   projected source-change diff excerpts, source-change diff preview fallback,
   artifact-ref rendering, projected bounded artifact preview with runtime
   fallback, delivery labels, local conversation read state, projected wiki-ref
   rendering, projected wiki preview rendering, wiki-scoped approval context
   rendering, signed read receipts, parent-message links, delivery retry state,
   runtime status, live state refresh, Host-mediated source-candidate
   accept/reject controls, and wiki publication retry actions are implemented;
   complete projection-backed source/wiki review remains open.
10. Signed user-node task, reply, approval, and rejection messages. CLI
    approval and rejection commands now preserve optional signed approval
    operation/resource/reason context.
11. Artifact/source/wiki reference publication through observation and git
    refs. Runner emission of observed artifact/source/wiki refs is implemented;
    source-change summaries and bounded artifact previews now project through
    observed refs; complete source/wiki review remains open.
12. Studio and CLI operator/user-node federation surfaces.
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
The User Client now includes the first Host-mediated source-candidate review
action. The next blocking implementation areas are richer projection-backed
source/wiki review services, replacing remaining deep filesystem-backed runtime
inspection paths with projection-backed source/wiki services and object-backed
artifact services, and turning the process smoke into the full multi-machine
distributed proof.
