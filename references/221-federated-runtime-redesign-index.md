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
- [335-host-wiki-publication-removal-slice.md](335-host-wiki-publication-removal-slice.md)
- [336-host-artifact-restore-promotion-removal-slice.md](336-host-artifact-restore-promotion-removal-slice.md)
- [337-federated-session-cancellation-control-slice.md](337-federated-session-cancellation-control-slice.md)
- [338-user-node-runtime-projection-retention-slice.md](338-user-node-runtime-projection-retention-slice.md)
- [339-federated-source-history-publication-control-slice.md](339-federated-source-history-publication-control-slice.md)
- [340-federated-source-history-replay-control-slice.md](340-federated-source-history-replay-control-slice.md)
- [341-studio-source-history-replay-control-slice.md](341-studio-source-history-replay-control-slice.md)
- [342-projected-source-history-replay-read-model-slice.md](342-projected-source-history-replay-read-model-slice.md)
- [343-assignment-timeline-read-model-slice.md](343-assignment-timeline-read-model-slice.md)
- [344-process-smoke-assignment-timeline-slice.md](344-process-smoke-assignment-timeline-slice.md)
- [345-user-client-json-read-state-slice.md](345-user-client-json-read-state-slice.md)
- [346-runner-owned-wiki-publication-control-slice.md](346-runner-owned-wiki-publication-control-slice.md)
- [347-studio-wiki-publication-control-slice.md](347-studio-wiki-publication-control-slice.md)
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
- [400-artifact-backend-cache-prune-policy-slice.md](400-artifact-backend-cache-prune-policy-slice.md)
- [401-root-test-gate-reliability-slice.md](401-root-test-gate-reliability-slice.md)
- [402-user-node-runtime-demo-command-slice.md](402-user-node-runtime-demo-command-slice.md)
- [403-studio-runner-trust-controls-slice.md](403-studio-runner-trust-controls-slice.md)
- [404-studio-runner-registry-detail-slice.md](404-studio-runner-registry-detail-slice.md)
- [405-studio-assignment-operational-detail-slice.md](405-studio-assignment-operational-detail-slice.md)
- [406-artifact-backend-cache-size-policy-slice.md](406-artifact-backend-cache-size-policy-slice.md)
- [407-distributed-proof-kit-slice.md](407-distributed-proof-kit-slice.md)
- [408-distributed-proof-verifier-slice.md](408-distributed-proof-verifier-slice.md)
- [409-artifact-backend-cache-target-policy-slice.md](409-artifact-backend-cache-target-policy-slice.md)
- [410-bootstrap-operator-security-status-slice.md](410-bootstrap-operator-security-status-slice.md)

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
- Host still has some local adapter/debug read fallbacks, but direct public
  source and wiki mutation/publication routes that depended on Host-readable
  runner paths have been removed; source-history list/detail and wiki memory
  reads can use runner-observed projection;
- Host session launch now signs `task.request` with stable User Node identity
  material, and User Nodes are assignable to `human_interface` runners;
- joined runners can start a minimal Human Interface Runtime for assigned User
  Nodes, and Host projection can expose and retain the runtime's `clientUrl`
  across later Host runtime synchronization passes;
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
  refresh, message publishing, local JSON APIs for conversation detail,
  conversation read state, and message publishing, a first dedicated
  `apps/user-client` app, and optional runtime static serving for that app; the
  federated dev runner image now
  bundles the built app and the Docker launcher adapter can publish a
  browser-openable User Client port for User Node runtime contexts; the
  dedicated app now exposes JSON-backed artifact preview, source diff,
  source-candidate review, wiki preview cards, and automatic thread read-state
  convergence, but richer object-backend review remains incomplete;
- joined agent runners now emit `artifact.ref`, `source_change.ref`, and
  `wiki.ref` observations during normal turn execution, so Host's observed
  artifact/source/wiki projection reducers are fed by real runner behavior
  instead of only by direct Host tests;
- OpenCode-backed runner turns now preserve bounded generic tool evidence,
  including tool titles, redacted input summaries, output summaries, and
  durations, while keeping OpenCode-specific event payloads behind the engine
  adapter boundary;
- the OpenAI-compatible internal `agent-engine` adapter now has deterministic
  local HTTP fixture coverage for the real `fetch` provider path, including
  bearer-token auth, plain chat completion, tool-loop continuation, and 429
  error classification without live model-provider credentials;
- operators can now start a deterministic OpenAI-compatible development
  provider through `pnpm ops:fake-openai-provider`; it validates bearer tokens
  and serves models, chat-completions, and Responses API routes for manual
  catalog/auth/adapter wiring tests without live credentials;
- `pnpm ops:smoke-fake-openai-provider` now verifies that deterministic
  provider harness end to end, including streaming chat-completions and
  Responses API frames;
- `pnpm ops:check-product-naming` now guards active product surfaces against
  obsolete local product/profile labels;
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
- runtime-context runner startup and the Human Interface Runtime now support
  mounted-file Nostr identity secret delivery in addition to environment
  variables, matching the shared secret-delivery contract and generic join
  path;
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
  conversation without requiring a live model-provider call. The same smoke now
  verifies the per-assignment timeline read model includes real assignment
  acceptance, runner `started` receipt evidence, and completed runtime command
  receipt entries;
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
  content; memory list now also returns an empty projection-backed memory view
  for active graph nodes with no Host-readable runner memory root and no wiki
  refs yet;
- Host runtime artifact history/diff GET routes now prefer local git
  materialization for non-federated adapters, can resolve projected git
  artifact locators through a Host-owned backend cache, and fall back to
  explicit unavailable reasons when no backend-resolved repository is
  reachable;
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
  operator inspection without scanning the general event stream. Host now also
  exposes a per-assignment timeline read model that joins assignment lifecycle
  state with runner receipt projection and assignment-scoped runtime command
  receipt projection, CLI can inspect it, and Studio groups lifecycle and
  command receipt summaries under projected assignment rows while Studio and
  CLI compact projection summaries list recent command receipts from Host
  projection. CLI also exposes a dedicated `entangle host command-receipts`
  command with assignment, node, runner, command type, status, and limit filters
  over the same Host projection. Studio can fetch the same Host assignment
  timeline endpoint per projected assignment and render lifecycle, assignment
  receipt, and runtime command receipt entries without direct runner access;
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
  resulting `artifact.ref` plus updated `source_history.ref`. Operators can
  also request publication or explicit failed-publication retry through the
  Host-signed `runtime.source_history.publish` control command, which the
  assigned runner handles from runner-owned source-history state. Operators can
  request source-history replay through the Host-signed
  `runtime.source_history.replay` control command; the assigned runner enforces
  source-application approval policy, replays only from expected source trees,
  persists replay records locally, and emits `source_history.replayed`
  observations. Host projection now stores those replay outcomes as typed
  `sourceHistoryReplays`, and Host API, host-client, CLI, and Studio summary
  surfaces can inspect replay outcomes without reading runner-local files.
  Studio selected-runtime source-history detail now exposes the same replay
  request path without restoring direct Host workspace mutation. Operators can
  also request explicit wiki repository publication through the Host-signed
  `runtime.wiki.publish` control command; the assigned runner syncs and
  publishes its runner-owned wiki repository to the primary git target by
  default or to an explicit resolved git target selector, persists the artifact
  record, and emits `artifact.ref` projection evidence without Host filesystem
  access;
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
Runner-owned memory synthesis now also has bounded current-turn source-change
evidence from the completed `RunnerTurnRecord`, so a node can remember durable
code-change context without storing raw diffs or full file previews in its
wiki. The generated `working-context.md` page now preserves that same bounded
source-change context deterministically, so future turns can consume it even if
the model summary omits the details. It also carries active conversation ids
and bounded peer/status/response-policy/follow-up/artifact metadata from the
runner-owned session snapshot, preserving deterministic coordination context
for delegated sessions without copying transcripts.

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
   runtime status, live state refresh, local JSON conversation/read/message
   APIs, a first dedicated User Client app, signed source-candidate
   accept/reject messages handled by the owning runner, removal of Host-mediated wiki
   publication controls, and CLI User Client endpoint discovery are
   implemented; complete projection-backed source/wiki review remains open.
10. Signed user-node task, reply, approval, and rejection messages. CLI
    approval and rejection commands now preserve optional signed approval
    operation/resource/reason context, and runtime approval records now carry
    request/response event ids, signer pubkeys, and source message ids when
    available. Runners now enforce the approval record's approver node set
    before applying inbound approval responses. Runner A2A envelopes now carry
    signer pubkeys when available, Nostr A2A delivery verifies the NIP-59 seal
    signer and drops seal/rumor/fromPubkey mismatches, and service handling
    rejects mismatched signer envelopes before state mutation. User Node
    inbound/outbound inbox records now preserve
    signer pubkeys when available, and Host rejects inbound User Node message
    records whose signer differs from the payload `fromPubkey`. CLI compact
    User Node message summaries and User Client timeline headers now surface
    signer audit state when available. The process-runner smoke now verifies
    signer preservation across User Node publish responses, Host inbox records,
    User Client conversation records, source reviews, approval responses,
    synthetic inbound agent messages, and the second User Node path.
    Active User Node and operator-surface specs have been realigned so direct
    Host approval/review mutation removal is treated as complete, not as an
    open gap.
    Host TypeScript smoke scripts are now part of the `@entangle/host` lint
    gate, and the process-runner smoke passes type-aware ESLint coverage.
    `@entangle/agent-engine` now also exercises the OpenAI-compatible HTTP
    provider boundary through a deterministic local API fixture; live provider
    credentials remain manual/operator validation.
11. Artifact/source/wiki reference publication through observation and git
    refs. Runner emission of observed artifact/source/wiki refs is implemented;
    source-change summaries, bounded source file previews, bounded artifact
    previews, projected memory/wiki read previews, and empty projected memory
    list states now project through observed refs or active graph membership;
    source-history publish/replay and wiki publication requests
    now use Host-signed runner-executed control commands; explicit
    source-history publication can target policy-gated non-primary git
    repositories, and explicit wiki publication can target a resolved git
    repository selector from the runner's artifact context. Complete
    source/wiki mutation services and richer memory promotion remain open.
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
- Host runtime synchronization does not prune valid observed User Node
  `human_interface` runtime projection records.
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
host-client. Direct Host-mediated wiki repository publication and artifact
restore/promotion have also been removed from Host/CLI/Studio/host-client.
Artifact restore has returned as the Host-signed
`runtime.artifact.restore` control command: Host resolves a projected artifact
ref, the accepted runner retrieves it through runner-owned artifact backend
state, and the runner emits `artifact.ref` observation evidence with retrieval
state. CLI can request that command with
`host runtimes artifact-restore`, and Studio exposes the same request from
selected artifact detail. The process-runner smoke now requests that command
for the runner-published source-history artifact and verifies projected
`retrieved` evidence from the real joined runner path. File-backed git proof
profiles are valid without git transport principals, while non-file git
targets still require deterministic principal bindings. Artifact-to-source
work now returns as runner-owned source-change proposal behavior:
`runtime.artifact.propose_source_change` asks the assigned runner to retrieve a
visible artifact, copy bounded regular files into its source workspace, harvest
a `pending_review` source-change candidate, and emit signed `source_change.ref`
evidence. Direct artifact promotion remains intentionally absent. Explicit wiki
repository publication has
returned as the Host-signed
`runtime.wiki.publish` control command: the owning runner syncs and publishes
its wiki repository to the primary git target by default or to an explicit
resolved git target selector, persists the artifact record, and emits
`artifact.ref` evidence. Session cancellation now uses signed
`runtime.session.cancel` control commands for accepted federated assignments,
with local cancellation files retained only as fallback compatibility.
Source-history publication retry now has a Host-signed
`runtime.source_history.publish` control command for accepted federated
assignments. That command can now carry an approval id and explicit git target
selectors, letting the assigned runner publish to policy-gated non-primary
repositories while Host remains outside the git push. A single source-history
entry can now retain multiple per-target publication records while preserving
the latest publication field for existing read paths, and the process-runner
smoke verifies explicit non-primary source-history target publication over the
same live relay and joined runner path. CLI and Studio source-history detail
presentation now exposes those per-target publication records through shared
host-client helpers while retaining latest-publication compatibility fields.
Source-history replay now has a Host-signed
`runtime.source_history.replay` control command for accepted federated
assignments, and Studio can request that command from selected source-history
details. Runner-observed replay outcomes now project into typed
`sourceHistoryReplays` with Host API, host-client, CLI, and Studio summary
surfaces. Explicit wiki publication now has Host API, host-client, CLI, and
Studio request surfaces over the same control boundary, including optional git
target selectors for non-primary repositories. The process-runner smoke now
verifies both default primary wiki publication and explicit non-primary wiki
target publication over the live relay and real joined runner path.
Per-assignment
timelines now group assignment lifecycle state and
runner receipts for Host API, CLI, and Studio summary inspection. Public deep
runtime reads now avoid Host-local runtime files for accepted federated
assignments and rely on projection evidence instead. Projected git artifact
history/diff can now be computed through a Host-owned backend cache when the
locator is resolvable through the semantic artifact context, and the
process-runner smoke now proves that path against a runner-published
source-history artifact. Host status now exposes bounded operational metadata
for that derived artifact backend cache without exposing paths or treating it
as protocol truth, and operators can dry-run, clear, or age-prune that derived
cache through the Host API/CLI without mutating authoritative artifact or
projection state.
Studio's Host Status panel now renders the same path-free artifact cache
summary for admin visibility. The running User Client can now request bounded
artifact history and diff evidence through its Human Interface Runtime, using
the Host read boundary without turning the user surface into an operator
control plane. Those User Client artifact routes now require conversation
context and verify that the artifact ref is visible in that User Node
conversation before proxying to Host. The process-runner smoke now delivers
the real builder-published source-history artifact to the User Node and verifies
history/diff through the running User Client JSON routes. User Client
source-change diff and review routes now require conversation context and verify
that the selected conversation contains matching approval-resource or projected
session evidence before returning diff evidence, returning file preview
evidence, or publishing review messages. The process-runner smoke now proves
the running User Client source-change diff and source file preview routes
before submitting the signed User Node source-candidate review.
Optional model-guided memory synthesis now receives bounded source-change
evidence from the completed turn record, including candidate ids, totals,
changed-file summaries, preview metadata, and diff availability, while the
prompt explicitly forbids copying raw diffs or full file previews into durable
memory. The durable `working-context.md` summary now also carries a
runner-owned `Source Change Context` section with the same bounded metadata,
without raw diff excerpts or full file-preview contents.
It now also carries a runner-owned `Handoff Context` section with emitted
handoff message ids from the completed turn, preserving bounded delegation
evidence without copying peer conversations or logs into memory.
It now carries a runner-owned `Conversation Routes` section with active
conversation ids and bounded peer/status/response-policy/follow-up/artifact
metadata, preserving deterministic delegated-session coordination context
without copying peer transcripts.
Host status now also exposes the active bootstrap operator security mode
without exposing secrets: tokenless deployments report `none`, while
token-protected deployments report normalized bootstrap operator attribution
and role. This remains operator-visible bootstrap posture, not final
production RBAC. The next blocking implementation areas are richer
projection-backed source/wiki review services, CI-grade orchestration around
the distributed proof verifier, and deeper production identity/authorization.
