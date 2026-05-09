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
- [411-distributed-proof-tool-ci-smoke-slice.md](411-distributed-proof-tool-ci-smoke-slice.md)
- [412-user-client-wiki-publication-slice.md](412-user-client-wiki-publication-slice.md)
- [413-user-client-wiki-publication-process-smoke-slice.md](413-user-client-wiki-publication-process-smoke-slice.md)
- [414-user-client-artifact-restore-slice.md](414-user-client-artifact-restore-slice.md)
- [415-user-client-source-history-publication-slice.md](415-user-client-source-history-publication-slice.md)
- [416-user-client-source-history-target-visibility-slice.md](416-user-client-source-history-target-visibility-slice.md)
- [417-user-client-wiki-target-visibility-slice.md](417-user-client-wiki-target-visibility-slice.md)
- [418-user-client-wiki-target-process-proof-slice.md](418-user-client-wiki-target-process-proof-slice.md)
- [419-distributed-proof-runtime-state-verifier-slice.md](419-distributed-proof-runtime-state-verifier-slice.md)
- [420-root-runner-test-pool-alignment-slice.md](420-root-runner-test-pool-alignment-slice.md)
- [421-distributed-proof-user-client-distinctness-slice.md](421-distributed-proof-user-client-distinctness-slice.md)
- [422-distributed-proof-runtime-kind-capability-slice.md](422-distributed-proof-runtime-kind-capability-slice.md)
- [423-distributed-proof-agent-engine-capability-slice.md](423-distributed-proof-agent-engine-capability-slice.md)
- [424-distributed-proof-agent-engine-selection-slice.md](424-distributed-proof-agent-engine-selection-slice.md)
- [425-distributed-proof-kit-agent-engine-selection-slice.md](425-distributed-proof-kit-agent-engine-selection-slice.md)
- [426-distributed-proof-kit-verifier-profile-slice.md](426-distributed-proof-kit-verifier-profile-slice.md)
- [427-distributed-proof-profile-manifest-slice.md](427-distributed-proof-profile-manifest-slice.md)
- [428-distributed-proof-artifact-evidence-verifier-slice.md](428-distributed-proof-artifact-evidence-verifier-slice.md)
- [429-distributed-proof-relay-health-verifier-slice.md](429-distributed-proof-relay-health-verifier-slice.md)
- [430-distributed-proof-git-backend-health-verifier-slice.md](430-distributed-proof-git-backend-health-verifier-slice.md)
- [431-bootstrap-viewer-operator-authorization-slice.md](431-bootstrap-viewer-operator-authorization-slice.md)
- [432-operator-audit-event-presentation-slice.md](432-operator-audit-event-presentation-slice.md)
- [433-distributed-proof-profile-contract-slice.md](433-distributed-proof-profile-contract-slice.md)
- [434-distributed-proof-kit-relay-health-profile-slice.md](434-distributed-proof-kit-relay-health-profile-slice.md)
- [435-distributed-proof-kit-post-work-verifier-slice.md](435-distributed-proof-kit-post-work-verifier-slice.md)
- [436-root-test-gate-single-fork-worker-slice.md](436-root-test-gate-single-fork-worker-slice.md)
- [437-distributed-proof-verifier-assignment-profile-slice.md](437-distributed-proof-verifier-assignment-profile-slice.md)
- [438-studio-assignment-related-navigation-slice.md](438-studio-assignment-related-navigation-slice.md)
- [439-distributed-proof-profile-conversation-health-slice.md](439-distributed-proof-profile-conversation-health-slice.md)
- [440-distributed-proof-published-git-evidence-slice.md](440-distributed-proof-published-git-evidence-slice.md)
- [441-distributed-proof-published-git-ref-check-slice.md](441-distributed-proof-published-git-ref-check-slice.md)
- [442-bootstrap-multi-operator-auth-slice.md](442-bootstrap-multi-operator-auth-slice.md)
- [443-host-event-server-filtering-slice.md](443-host-event-server-filtering-slice.md)
- [444-hashed-bootstrap-operator-token-slice.md](444-hashed-bootstrap-operator-token-slice.md)
- [445-bootstrap-operator-permissions-slice.md](445-bootstrap-operator-permissions-slice.md)
- [446-runner-test-gate-fork-stability-slice.md](446-runner-test-gate-fork-stability-slice.md)
- [447-runner-owned-wiki-page-upsert-slice.md](447-runner-owned-wiki-page-upsert-slice.md)
- [448-user-client-wiki-page-upsert-slice.md](448-user-client-wiki-page-upsert-slice.md)
- [449-studio-wiki-page-upsert-slice.md](449-studio-wiki-page-upsert-slice.md)
- [450-source-history-reconcile-control-slice.md](450-source-history-reconcile-control-slice.md)
- [451-user-client-source-history-reconcile-slice.md](451-user-client-source-history-reconcile-slice.md)
- [452-human-interface-runtime-basic-auth-slice.md](452-human-interface-runtime-basic-auth-slice.md)
- [453-wiki-page-optimistic-concurrency-slice.md](453-wiki-page-optimistic-concurrency-slice.md)
- [454-wiki-page-patch-mode-slice.md](454-wiki-page-patch-mode-slice.md)
- [455-user-client-wiki-page-patch-process-smoke-slice.md](455-user-client-wiki-page-patch-process-smoke-slice.md)
- [456-opencode-session-continuity-slice.md](456-opencode-session-continuity-slice.md)
- [457-opencode-session-continuity-process-smoke-slice.md](457-opencode-session-continuity-process-smoke-slice.md)
- [458-host-cors-studio-dev-slice.md](458-host-cors-studio-dev-slice.md)
- [459-opencode-permission-mode-slice.md](459-opencode-permission-mode-slice.md)
- [460-agent-runtime-permission-mode-visibility-slice.md](460-agent-runtime-permission-mode-visibility-slice.md)
- [461-studio-user-launch-boundary-slice.md](461-studio-user-launch-boundary-slice.md)
- [462-user-node-inbox-outbox-projection-audit.md](462-user-node-inbox-outbox-projection-audit.md)
- [463-opencode-permission-bridge-slice.md](463-opencode-permission-bridge-slice.md)
- [464-fake-opencode-server-harness-slice.md](464-fake-opencode-server-harness-slice.md)
- [465-cli-agent-engine-profile-upsert-slice.md](465-cli-agent-engine-profile-upsert-slice.md)
- [466-cli-agent-engine-profile-inspection-slice.md](466-cli-agent-engine-profile-inspection-slice.md)
- [467-studio-agent-engine-profile-visibility-slice.md](467-studio-agent-engine-profile-visibility-slice.md)
- [468-studio-agent-engine-profile-editor-slice.md](468-studio-agent-engine-profile-editor-slice.md)
- [469-host-agent-engine-profile-upsert-api-slice.md](469-host-agent-engine-profile-upsert-api-slice.md)
- [470-fake-opencode-server-workspace-write-slice.md](470-fake-opencode-server-workspace-write-slice.md)
- [471-process-smoke-attached-fake-opencode-slice.md](471-process-smoke-attached-fake-opencode-slice.md)
- [472-process-smoke-user-client-source-history-reconcile-slice.md](472-process-smoke-user-client-source-history-reconcile-slice.md)
- [473-fake-opencode-demo-command-slice.md](473-fake-opencode-demo-command-slice.md)
- [474-federated-pivot-remaining-gap-audit.md](474-federated-pivot-remaining-gap-audit.md)
- [475-distributed-proof-kit-fake-opencode-slice.md](475-distributed-proof-kit-fake-opencode-slice.md)
- [476-external-process-agent-engine-adapter-slice.md](476-external-process-agent-engine-adapter-slice.md)
- [477-external-http-agent-engine-adapter-slice.md](477-external-http-agent-engine-adapter-slice.md)
- [478-active-agent-engine-kind-contract-slice.md](478-active-agent-engine-kind-contract-slice.md)
- [479-legacy-product-name-residue-cleanup-slice.md](479-legacy-product-name-residue-cleanup-slice.md)
- [480-distributed-proof-custom-agent-engine-setup-slice.md](480-distributed-proof-custom-agent-engine-setup-slice.md)
- [481-fake-external-http-agent-engine-harness-slice.md](481-fake-external-http-agent-engine-harness-slice.md)
- [482-federated-process-smoke-fake-external-http-slice.md](482-federated-process-smoke-fake-external-http-slice.md)
- [483-docker-runner-join-default-slice.md](483-docker-runner-join-default-slice.md)
- [484-runner-startup-explicit-mode-slice.md](484-runner-startup-explicit-mode-slice.md)
- [485-user-client-approval-turn-correlation-slice.md](485-user-client-approval-turn-correlation-slice.md)
- [486-host-test-pool-stability-slice.md](486-host-test-pool-stability-slice.md)
- [487-session-cancellation-federated-only-slice.md](487-session-cancellation-federated-only-slice.md)
- [488-studio-user-client-boundary-audit.md](488-studio-user-client-boundary-audit.md)
- [489-deployment-repair-missing-host-state-directories-slice.md](489-deployment-repair-missing-host-state-directories-slice.md)
- [490-host-event-hash-chain-slice.md](490-host-event-hash-chain-slice.md)
- [491-host-event-integrity-inspection-slice.md](491-host-event-integrity-inspection-slice.md)
- [492-studio-host-event-integrity-slice.md](492-studio-host-event-integrity-slice.md)
- [493-signed-host-event-integrity-report-slice.md](493-signed-host-event-integrity-report-slice.md)
- [494-owner-aware-session-memory-slice.md](494-owner-aware-session-memory-slice.md)
- [495-host-event-audit-bundle-slice.md](495-host-event-audit-bundle-slice.md)
- [496-deployment-diagnostics-audit-bundle-slice.md](496-deployment-diagnostics-audit-bundle-slice.md)
- [497-deployment-diagnostics-audit-bundle-skip-slice.md](497-deployment-diagnostics-audit-bundle-skip-slice.md)
- [498-focused-register-transition-history-wiki-slice.md](498-focused-register-transition-history-wiki-slice.md)
- [499-host-event-audit-bundle-cli-retention-slice.md](499-host-event-audit-bundle-cli-retention-slice.md)
- [500-user-client-command-receipt-visibility-slice.md](500-user-client-command-receipt-visibility-slice.md)
- [501-user-node-cli-command-receipts-slice.md](501-user-node-cli-command-receipts-slice.md)
- [502-user-node-command-receipts-host-api-slice.md](502-user-node-command-receipts-host-api-slice.md)
- [503-user-client-runtime-status-projection-slice.md](503-user-client-runtime-status-projection-slice.md)
- [504-user-node-client-workload-summary-slice.md](504-user-node-client-workload-summary-slice.md)
- [505-studio-user-node-workload-summary-slice.md](505-studio-user-node-workload-summary-slice.md)
- [506-canonical-user-node-surface-spec-repair.md](506-canonical-user-node-surface-spec-repair.md)
- [507-user-node-runtime-reassignment-surface-slice.md](507-user-node-runtime-reassignment-surface-slice.md)
- [508-user-client-command-receipt-detail-slice.md](508-user-client-command-receipt-detail-slice.md)
- [509-user-client-wiki-draft-prefill-slice.md](509-user-client-wiki-draft-prefill-slice.md)
- [510-distributed-proof-external-user-client-url-slice.md](510-distributed-proof-external-user-client-url-slice.md)
- [511-distributed-proof-user-client-basic-auth-slice.md](511-distributed-proof-user-client-basic-auth-slice.md)
- [512-cli-user-client-health-check-slice.md](512-cli-user-client-health-check-slice.md)
- [513-inbound-message-working-context-memory-slice.md](513-inbound-message-working-context-memory-slice.md)
- [514-agent-engine-inbound-routing-context-slice.md](514-agent-engine-inbound-routing-context-slice.md)
- [515-distributed-proof-cli-user-client-health-command-slice.md](515-distributed-proof-cli-user-client-health-command-slice.md)
- [516-cli-user-client-health-timeout-slice.md](516-cli-user-client-health-timeout-slice.md)
- [517-agent-engine-memory-brief-slice.md](517-agent-engine-memory-brief-slice.md)
- [518-release-naming-guardrail-slice.md](518-release-naming-guardrail-slice.md)
- [519-reference-wiki-naming-guardrail-slice.md](519-reference-wiki-naming-guardrail-slice.md)
- [520-agentic-dev-runtime-smoke-wrapper-slice.md](520-agentic-dev-runtime-smoke-wrapper-slice.md)
- [521-user-client-workload-summary-slice.md](521-user-client-workload-summary-slice.md)
- [522-user-client-fallback-workload-summary-slice.md](522-user-client-fallback-workload-summary-slice.md)
- [523-opencode-permission-cancellation-slice.md](523-opencode-permission-cancellation-slice.md)
- [524-host-event-audit-bundle-offline-verify-slice.md](524-host-event-audit-bundle-offline-verify-slice.md)
- [525-host-event-audit-bundle-signature-verify-slice.md](525-host-event-audit-bundle-signature-verify-slice.md)
- [526-user-client-wiki-draft-stale-hash-slice.md](526-user-client-wiki-draft-stale-hash-slice.md)
- [527-user-client-wiki-draft-diff-preview-slice.md](527-user-client-wiki-draft-diff-preview-slice.md)
- [528-distributed-proof-verifier-junit-slice.md](528-distributed-proof-verifier-junit-slice.md)
- [529-distributed-proof-kit-junit-script-slice.md](529-distributed-proof-kit-junit-script-slice.md)
- [530-bootstrap-operator-token-expiry-slice.md](530-bootstrap-operator-token-expiry-slice.md)
- [531-user-client-wiki-conflict-receipts-slice.md](531-user-client-wiki-conflict-receipts-slice.md)
- [532-cli-wiki-conflict-receipts-slice.md](532-cli-wiki-conflict-receipts-slice.md)
- [533-human-runtime-wiki-conflict-receipts-slice.md](533-human-runtime-wiki-conflict-receipts-slice.md)
- [534-distributed-proof-external-host-url-slice.md](534-distributed-proof-external-host-url-slice.md)
- [535-deployment-backup-external-volume-inventory-slice.md](535-deployment-backup-external-volume-inventory-slice.md)
- [536-deployment-backup-external-volume-summary-slice.md](536-deployment-backup-external-volume-summary-slice.md)
- [537-bootstrap-operator-config-validation-slice.md](537-bootstrap-operator-config-validation-slice.md)
- [538-root-test-gate-package-level-slice.md](538-root-test-gate-package-level-slice.md)
- [539-federated-dev-explicit-service-volumes-slice.md](539-federated-dev-explicit-service-volumes-slice.md)
- [540-distributed-proof-runner-compose-slice.md](540-distributed-proof-runner-compose-slice.md)
- [541-runtime-wiki-page-batch-request-slice.md](541-runtime-wiki-page-batch-request-slice.md)
- [542-coordination-map-memory-slice.md](542-coordination-map-memory-slice.md)
- [543-deployment-repair-previous-service-volume-slice.md](543-deployment-repair-previous-service-volume-slice.md)
- [544-runtime-wiki-patch-set-slice.md](544-runtime-wiki-patch-set-slice.md)
- [545-user-client-wiki-patch-set-slice.md](545-user-client-wiki-patch-set-slice.md)
- [546-process-smoke-user-client-wiki-patch-set-slice.md](546-process-smoke-user-client-wiki-patch-set-slice.md)
- [547-user-client-wiki-patch-set-ui-slice.md](547-user-client-wiki-patch-set-ui-slice.md)
- [548-source-change-task-memory-slice.md](548-source-change-task-memory-slice.md)
- [549-source-change-ledger-memory-slice.md](549-source-change-ledger-memory-slice.md)
- [550-human-runtime-fallback-wiki-controls-slice.md](550-human-runtime-fallback-wiki-controls-slice.md)
- [551-delegation-ledger-memory-slice.md](551-delegation-ledger-memory-slice.md)
- [552-user-client-wiki-conflict-recovery-slice.md](552-user-client-wiki-conflict-recovery-slice.md)
- [553-source-history-git-attribution-slice.md](553-source-history-git-attribution-slice.md)
- [554-demo-studio-launch-slice.md](554-demo-studio-launch-slice.md)
- [555-demo-tooling-smoke-slice.md](555-demo-tooling-smoke-slice.md)
- [556-distributed-proof-kit-external-host-generation-guard-slice.md](556-distributed-proof-kit-external-host-generation-guard-slice.md)
- [557-distributed-proof-external-relay-url-slice.md](557-distributed-proof-external-relay-url-slice.md)
- [558-cli-user-node-client-filter-slice.md](558-cli-user-node-client-filter-slice.md)
- [559-cli-inbox-filter-slice.md](559-cli-inbox-filter-slice.md)
- [560-cli-inbox-message-filter-slice.md](560-cli-inbox-message-filter-slice.md)
- [561-cli-inbox-approval-requests-slice.md](561-cli-inbox-approval-requests-slice.md)
- [562-cli-inbox-source-review-requests-slice.md](562-cli-inbox-source-review-requests-slice.md)
- [563-cli-user-node-assignment-roster-slice.md](563-cli-user-node-assignment-roster-slice.md)
- [564-approval-ledger-memory-slice.md](564-approval-ledger-memory-slice.md)
- [565-cli-user-node-runner-candidates-slice.md](565-cli-user-node-runner-candidates-slice.md)

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
- Studio app, approval, graph, event refresh, runtime
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
- Docker direct runtime-context startup remains explicit compatibility/debug
  behavior, while the Docker launcher adapter now defaults to generic join
  bootstrap and the federated dev profile no longer advertises shared
  Host/runner state or secret mount env defaults for managed join-mode
  containers; the runner process also fails fast when started without `join`,
  join-config env, or an explicit runtime-context path;
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
  source-candidate review, wiki preview cards, wiki page draft prefill from
  complete projected previews, and automatic thread read-state convergence,
  but richer object-backend review remains incomplete;
- Host now supports an explicit `ENTANGLE_HOST_CORS_ORIGINS` allow-list so
  browser-based Studio development can call Host across ports while actual Host
  API requests still use operator bearer auth; the process-runner demo prints
  a ready Studio command in keep-running mode;
- joined agent runners now emit `artifact.ref`, `source_change.ref`, and
  `wiki.ref` observations during normal turn execution, so Host's observed
  artifact/source/wiki projection reducers are fed by real runner behavior
  instead of only by direct Host tests;
- OpenCode-backed runner turns now preserve bounded generic tool evidence,
  including tool titles, redacted input summaries, output summaries, and
  durations, while keeping OpenCode-specific event payloads behind the engine
  adapter boundary;
- OpenCode-backed runner turns now keep adapter-local session continuity by
  mapping Entangle session ids to observed OpenCode session ids under the node
  engine-state workspace and passing `--session` on later turns; the
  process-runner smoke now proves this through a second same-session User Node
  task and Host-projected engine outcome;
- OpenCode engine profiles now support an explicit `permissionMode`; the
  adapter keeps conservative `auto_reject` behavior by default and passes
  `--dangerously-skip-permissions` only for opt-in `auto_approve` profiles;
- attached OpenCode server profiles can now use `entangle_approval` mode, where
  Entangle consumes OpenCode permission SSE events, sends signed
  `approval.request` messages to the requesting User Node, waits for signed
  approval responses, and replies to OpenCode's permission endpoint;
- Host runtime inspection now projects the resolved engine permission mode, and
  shared host-client, CLI, and Studio runtime views display it with the
  selected engine profile;
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
- operators can now start a deterministic fake OpenCode server through
  `pnpm ops:fake-opencode-server`; it exposes the attached OpenCode
  server routes Entangle consumes and emits deterministic SSE permission and
  completion events without live model-provider credentials;
- `pnpm ops:smoke-fake-opencode-server` now verifies that fake OpenCode
  harness end to end, including Basic-authenticated health, session creation,
  permission SSE delivery, permission reply, deterministic assistant output,
  and idle status;
- runner OpenCode adapter tests now also start that fake server as a real child
  process and drive an attached-server turn through actual HTTP/SSE traffic;
- the fake OpenCode server can now optionally write deterministic content into
  the OpenCode workspace declared by `x-opencode-directory`, and the attached
  server adapter test verifies permission bridging, action-block parsing, and
  workspace mutation through that real fake-server process;
- `pnpm ops:smoke-federated-process-runner` can now run with
  `--use-fake-opencode-server` to start that deterministic fake attached
  OpenCode server, configure it as the default `opencode_server` profile,
  approve real OpenCode permission requests through the running User Client as
  the assigned User Node, verify workspace mutation, and prove attached-server
  session continuity without live model credentials;
- the process-runner smoke now also proves the running User Client can request
  source-history reconcile for a visible plain `source_history` resource and
  observe a completed runner-signed `runtime.source_history.reconcile` command
  receipt through Host projection;
- CLI can now upsert active catalog agent engine profiles through
  `host catalog agent-engine upsert`, including attached OpenCode base URLs,
  permission mode, state scope, default-agent notes, default-profile selection,
  dry-run payloads, and compact summaries;
- CLI can now list and inspect those profiles through
  `host catalog agent-engine list|get`, with deterministic ordering and compact
  summaries that mark the current default profile;
- Studio's graph admin surface now lists active catalog agent engine profiles
  with default marker, engine kind, state scope, permission mode, endpoint or
  executable, default agent, and version note before node assignment editing;
- Studio can now create/update active catalog agent engine profiles through
  Host's focused profile upsert route, including attached OpenCode base URLs,
  executable, permission mode, state scope, default-agent/version notes, and
  default-profile selection;
- Host now exposes `PUT /v1/catalog/agent-engine-profiles/:profileId` as the
  focused agent-engine profile mutation path, and CLI/Studio use it for real
  profile saves instead of applying a client-mutated full catalog document;
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
  Docker join bootstrap is now also the launcher default when
  `ENTANGLE_DOCKER_RUNNER_BOOTSTRAP` is unset;
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
  command with assignment, node, runner, command type, status, requester, and
  limit filters over the same Host projection. Runtime command receipts now
  also preserve optional `requestedBy` attribution for participant-originated
  commands. Host now exposes `GET /v1/user-nodes/:nodeId/command-receipts`,
  so the running User Client and headless User Node CLI can list only the
  receipts requested by one User Node without consuming the full operator
  projection. The running User Client state also includes the Host-projected
  status of its own `human_interface` runtime: assignment, runner, desired and
  observed state, last seen, projected client URL, restart generation, and
  status message. The headless User Node client roster now also joins runtime
  placement with conversation counts, unread counts, pending approval counts,
  latest message timestamp, participant-requested command receipt counts, and
  failed receipt counts. Studio's User Node roster now reports the same
  participant-requested command receipt and failed receipt counts alongside its
  existing conversation and Human Interface Runtime placement summary. Studio
  can fetch the same Host assignment
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
  access. Operators can also request bounded wiki page replacement or append
  through the Host-signed `runtime.wiki.upsert_page` command; the assigned
  runner validates the page path inside its own `memory/wiki` root,
  synchronizes its wiki repository, emits `wiki.ref` evidence, and reports
  `runtime.command.receipt` records correlated by `wikiPagePath`;
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
- joined agent runners can now execute `external_process` engine profiles by
  spawning the configured executable, sending the shared turn request as JSON
  on stdin, and validating a shared turn result JSON object from stdout, while
  shared catalog validation now requires those profiles to declare an
  executable;
- joined agent runners can now execute `external_http` engine profiles by
  POSTing the shared turn request and bounded runtime metadata to the
  configured endpoint and validating a shared turn result JSON object from the
  response body;
- operators can now start a deterministic fake external HTTP agent engine with
  `pnpm ops:fake-agent-engine-http`, point an `external_http` profile at its
  `/turn` endpoint, and use `pnpm ops:smoke-fake-agent-engine-http` to verify
  no-credential health, shared turn execution, optional workspace mutation, and
  debug-state plumbing;
- `pnpm ops:smoke-federated-process-runner:fake-external-http` now proves that
  same fake `external_http` engine through the full federated process path:
  Host default profile selection, runner capability advertisement, real
  assignment, source workspace mutation, User Node review/approval, projected
  source-history/artifact/wiki evidence, and multi-user Human Interface
  Runtime behavior;
- the active agent engine kind contract now exposes only runner-executable
  kinds: `opencode_server`, `external_process`, and `external_http`;
- the distributed proof kit can now generate Host operator setup for
  `external_process` and `external_http` profiles, infer the matching runner
  capability when omitted, and bind the agent node before assignment;
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
Post-turn memory maintenance now also rebuilds a deterministic
`source-change-ledger.md` page from source-change-bearing task pages and feeds
that page into future memory refs and bounded memory briefs.
Post-turn memory maintenance now also rebuilds a deterministic
`approval-ledger.md` page from approval-request-bearing task pages and feeds
that page into future memory refs and bounded memory briefs.

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
    synthetic inbound agent messages, and the second User Node path. User
    Client approval responses now preserve the originating turn id from the
    inbound approval request, and the process-runner smoke verifies both the
    publish response and Host inbox record retain that correlation.
    Active User Node and operator-surface specs have been realigned so direct
    Host approval/review mutation removal is treated as complete, not as an
    open gap.
    Host TypeScript smoke scripts are now part of the `@entangle/host` lint
    gate, and the process-runner smoke passes type-aware ESLint coverage.
    Host package tests now use Vitest's fork pool with one worker so the root
    verification gate does not hang in the thread pool.
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
    repositories, explicit wiki publication can target a resolved git
    repository selector from the runner's artifact context, and the first
    runner-owned wiki page upsert command now replaces/appends markdown pages
    without Host filesystem writes; the User Client can request that page
    upsert path for visible `wiki_page` resources in the selected User Node
    conversation; runner-enforced stale-edit guards and single-page wiki patch
    mode are implemented; and the User Client can request visible
    source-history reconcile through the Human Interface Runtime. User Client
    approval responses now keep turn-level correlation with the agent request
    they answer. A signed multi-page wiki patch-set command now covers related
    page mutations with runner-side validation before writes. Richer
    collaborative wiki merge UI, repository lifecycle behavior,
    replicated/fallback artifact behavior, and richer memory promotion remain
    open.
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
Runner-owned wiki page upsert now has Host API, host-client, and CLI request
surfaces over `runtime.wiki.upsert_page`; the runner writes only inside its
own wiki root, updates the wiki index, synchronizes the wiki git repository,
and emits `wiki.ref` plus command-receipt projection evidence.
The running User Client can now request that same page upsert path for visible
`wiki_page` resources in the selected User Node conversation; the Human
Interface Runtime normalizes the page path, forwards through Host with
`requestedBy` set to the User Node id, and the process-runner smoke validates
the projected receipt plus page `wiki.ref`. The running User Client state now
also exposes a participant-scoped command receipt list from Host's
`/v1/user-nodes/:nodeId/command-receipts` route, which filters receipts whose
`requestedBy` matches the current User Node id.
Studio's Runtime Memory panel now exposes the same Host/runner control path
for operators through `host-client.upsertRuntimeWikiPage`.
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
history/diff through the running User Client JSON routes. The running User
Client can now request runner-owned source-history publication for visible
source-history resources in the selected conversation, including
target-specific `source_history_publication` resources whose encoded git target
must match the requested target. The process proof waits for the completed
projected `runtime.source_history.publish` command receipt from that
participant path. The running User Client can now also require target-specific
wiki publication requests to match visible `wiki_repository_publication`
resources before forwarding `runtime.wiki.publish` through Host, and the
process proof verifies the projected target-specific artifact plus the target
git branch head for that participant path. User Client
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
without copying peer transcripts. It now also carries a deterministic
`Inbound Message Context` section with the triggering A2A event id, received
time, message type, from/to nodes, conversation, optional parent, signer,
response policy, approval-before-action flag, and attached-artifact count,
preserving bounded coordination provenance without copying peer transcripts.
Agent engine turn requests now also widen the bounded `Inbound controls`
prompt with conversation id, turn id, parent message id, and from/to node ids,
so the coding engine inside each node receives the message-routing context it
needs while Entangle still owns routing, policy, signing, and side effects.
Engine turn requests now also include a bounded `Memory brief:` prompt part
when focused node-memory summaries exist, while preserving `memoryRefs` as the
complete source pages. The runner records whether that memory brief was present
in `engineRequestSummary` for trace and presentation surfaces.
Release-control packets are now covered by the active product naming guardrail,
and released packet text no longer preserves retired runtime-profile literals
or obsolete readiness milestone wording as public claims.
Host status now also exposes the active bootstrap operator security mode
without exposing secrets: tokenless deployments report `none`, while
token-protected deployments report normalized bootstrap operator attribution
and role. Token-protected deployments now also enforce the bootstrap `viewer`
role as read-only and include `operatorRole` in protected mutation audit
events. Shared host-client/CLI event summaries now render those audit events
with operator id, role, method, path, status, and auth mode instead of a
generic event-type label. Protected Hosts can now also opt into multiple
bootstrap operator bearer tokens through `ENTANGLE_HOST_OPERATOR_TOKENS_JSON`;
each token resolves to a distinct operator id and role for authorization,
status, and request-audit attribution while preserving the existing
single-token environment contract. Those records can use `tokenSha256` hashes
instead of raw token values for process-configuration hardening. Bootstrap
tokens can now also opt into explicit route-level Host permissions; scoped
tokens must carry `host.admin` or the route-specific permission after role
checks, while unscoped tokens keep compatibility behavior. Bootstrap token
records can now also carry expiration timestamps; expired tokens no longer
authorize Host API or WebSocket operator requests, and Host status reports
non-secret expiry metadata. Explicit bootstrap operator ids and roles now fail
fast when malformed, while omitted fields still use the bootstrap defaults.
This remains bootstrap authorization, not final production RBAC. Host event
listing now also applies category, node,
operator, status-code, and type-prefix filters before limit slicing, so CLI and
host-client audit inspection do not lose older matching events behind unrelated
recent trace records.
`pnpm ops:smoke-distributed-proof-tools` now gives CI a
deterministic no-infrastructure smoke for proof-kit dry-runs and verifier
self-test JSON, including default rejection of non-running runtime
observations, duplicate User Client URLs, and wrong runner runtime-kind
or agent-engine capabilities. The proof kit and verifier can now be
parameterized with the same runner ids, graph node ids, and expected agent
engine kind through a generated proof profile manifest, while keeping OpenCode
as the default. The verifier can also write an optional JUnit XML report for CI
retention of distributed proof check results. Generated proof kits can also
write topology and post-work JUnit verifier reports when
`ENTANGLE_PROOF_JUNIT_DIR` is set. Generated proof kits can also configure a
deterministic attached fake OpenCode profile and agent-node binding for
no-credential
distributed checks, while still requiring the agent runner to advertise
`opencode_server`. The verifier can optionally require projected
artifact/source/wiki
evidence from the agent node after work is produced or relay WebSocket
reachability for configured proof relays. The verifier can also optionally
check Host catalog git services for distributed-proof suitability by rejecting
missing or file-backed git services and probing the configured public git
service base URL from the operator machine. Studio assignment drilldowns now
also provide related navigation to the Host-backed runtime inspector, runner
registry, source-history panel, and runtime command receipt list for the
selected assignment. Generated distributed proof profiles now also carry the
conversation and User Client health requirements that generated verifier
scripts already enforced, so profile-only verification does not silently weaken
the proof. Generated proof kits now also write a separate post-work profile
that requires both projected work evidence and a published git artifact or
source-history publication from the agent node, tightening the proof that
runner-owned work handoff reached a git-backed substrate. The verifier can now
also optionally run `git ls-remote` from the operator machine against projected
published git artifact locators to prove the advertised branch contains the
projected commit. Generated proof profiles and verifier commands can now also
require projected User Client URLs to be non-loopback and non-wildcard, giving
physical multi-machine proofs an explicit check that human-node clients are not
advertised only as local-machine endpoints. Generated proof profiles and
verifier commands can now also require the Host API URL to be non-loopback and
non-wildcard, keeping physical proof runs from accepting a local-only Host
endpoint. Proof kits can now also generate
required User Client Basic Auth placeholders for User Node runner env files and
fail fast in generated `start.sh` when those placeholders were not replaced,
while leaving same-machine demos unchanged unless the operator opts in. CLI
operators can now also add `--check-health` to `entangle user-nodes clients`
to probe Host-projected User Client `/health` endpoints from the operator
machine without mutating Host or runner state; each probe is bounded by a
configurable `--health-timeout-ms` timeout and timeout failures are serialized
into `clientHealth`. The same command now accepts `--node <nodeId>` to narrow
endpoint inspection and optional health probing to one human participant.
The headless `entangle inbox list` participant surface now also supports
unread, peer-node, and limit filters over Host-projected User Node
conversations.
Generated distributed proof operator commands now run that same CLI health
probe before sending the scripted User Node task, and proof-kit dry-run output
names the command so CI can keep it present. Host
session cancellation no
longer falls back to writing
request records into runner runtime roots; it requires an accepted federated
assignment and active control-plane publication. The current Studio/User Client
boundary is now documented explicitly: Studio is the operator/admin console,
while participant chat, task launch, approvals, and review actions live in the
running User Client or CLI User Node surfaces. Deployment repair can now safely
restore missing standard `.entangle/host` state directories for compatible
existing deployments without mutating authoritative state files, while
unreadable or unsupported state layouts remain blocked for manual inspection.
Deployment backup manifests now also carry a machine-readable inventory of
known excluded external service volumes for Gitea, strfry, and Host secret
state, and restore warnings print that inventory so non-disposable service
state is explicit. Backup command summaries also include
`externalVolumeCount` so operators can see that inventory exists without
opening the manifest.
New Host events now carry optional audit hash-chain fields, and Host serializes
event appends so concurrent operator requests do not fork the local audit
sequence. Host now also exposes `GET /v1/events/integrity`, host-client
support, and `entangle host events integrity` to classify the persisted trace
as valid, broken, or partially unverifiable because of older un-hashed records.
Studio's Host Status panel now renders the same Host-owned event-integrity
summary for operator visibility. Host can also export the same integrity result
as a Host Authority-signed report through `GET /v1/events/integrity/signed`
and `entangle host events integrity --signed`. This is tamper evidence and
signed provenance for the Host trace, not final production retention or durable
operator identity. Host can now also export a typed event audit bundle through
`GET /v1/events/audit-bundle`, host-client, and
`entangle host events audit-bundle`, including typed events, a canonical event
JSONL hash, the signed integrity report, and a bundle hash. Deployment
diagnostics now embeds that audit bundle when available while keeping
collection failure non-fatal, and operators can pass `--no-audit-bundle` when a
smaller live support bundle is required. The dedicated CLI audit-bundle command
now also supports `--output <file>` and `--summary`, giving operators a
repeatable external-retention handoff for the full signed bundle while keeping
terminal output compact. The CLI can also verify a saved audit bundle offline
with `entangle host events audit-bundle-verify <file>` by recomputing event
count, canonical event JSONL hash, signed report content/hash consistency, and
outer bundle hash before support handoff or archival; that offline verifier now
also reconstructs and verifies the embedded Nostr signed report event, including
event id, signature, and Host Authority signer match. Runner-owned session
memory now also
carries owner, originating-node, entrypoint-node, last-message, and active-route
metadata in both the model-guided memory prompt and deterministic
working-context wiki page, giving delegated sessions a stronger owner-aware
continuation basis. The User Client now computes the SHA-256 of projected wiki
page previews when loading them into editable drafts, so participant page
updates carry stale-edit protection by default; it also renders a local line
diff for replace/append wiki drafts before sending the runner-owned mutation
request. Failed stale-edit wiki page receipts now render as explicit User
Client conflict blocks over the projected expected/current page hashes instead
of only generic command receipt lines, and CLI summary output now includes the
same structured `wikiConflict` object on both global projection and User Node
command receipt summaries. The Human Interface Runtime fallback HTML client
now renders the same conflict block inside participant command receipt cards.
Focused-register lifecycle transition history now also has a runner-owned
indexed wiki page at
`wiki/summaries/focused-register-transition-history.md`, so closure,
completion, replacement, consolidation, and exact-overlap retirements flow into
future memory refs and projected wiki evidence instead of remaining only in
runtime-local carry state. The canonical entity, User Node/Human Interface
Runtime, and Studio/CLI surface specs have been repaired so they no longer list
implemented Host Authority, runner registry, User Node identity, scoped command
receipt, workload, and own-runtime status behavior as missing baseline work.
User Node runtime placement now also has a focused CLI assignment command and
Studio roster actions that prepare the Host assignment form or open the current
assignment timeline while preserving Host as the only assignment authority.
User Client command receipt cards now also expose bounded participant command
closure details, including target ids and shortened wiki hash transitions, in
both the bundled React app and fallback HTML.
Operator wiki maintenance now has a bounded multi-page batch request surface:
Host API, host-client, and CLI can accept one manifest and emit multiple
existing signed `runtime.wiki.upsert_page` commands to the accepted runner
assignment. This improves headless wiki repair and memory maintenance without
claiming atomic patch-set semantics.
Each successful model-guided runner memory synthesis now also writes a
`summaries/coordination-map.md` page that carries local node relation,
session owner/origin/entrypoint, inbound message provenance, active peer
routes, approval gates, handoff obligations, and bounded durable coordination
insights into future node turns.
Deployment repair now also converts doctor evidence about previous
Compose-prefixed Gitea or strfry service volumes into explicit manual repair
actions. This keeps service-owned data migration visible in the operator repair
plan without letting `--apply-safe` copy or mutate service data.
Runtime wiki maintenance now also has a signed `runtime.wiki.patch_set`
command: Host, host-client, CLI, runner join, and runner service can request
multiple page mutations as one patch-set, the runner validates all paths,
base hashes, duplicate paths, and patch hunks before writing, syncs the wiki
repository once, and projects page-count receipts plus per-page wiki refs.
The running User Client can now request the same patch-set command through its
Human Interface Runtime JSON API when every page is visible in the selected User
Node conversation; the runtime derives base hashes from projected page previews
when needed and forwards the request with the stable User Node id.
The process-runner smoke now proves that participant path end to end by
requesting a User Client wiki patch-set, observing the completed
`runtime.wiki.patch_set` receipt, and checking the projected wiki preview
content.
The React User Client now also exposes that capability from the wiki resource
panel with a small queued patch-set draft list, per-entry removal, and a
request action over the same Human Interface Runtime boundary.
The Human Interface Runtime fallback HTML client now exposes visible wiki page
update and single-page patch-set forms over the same participant-scoped Host
control path, deriving expected base hashes from visible projected previews
when the form leaves them blank.
The React User Client now also places matching stale-edit wiki conflict
receipts beside the visible page editor and can load the current projected page
as a retry draft with the current hash prefilled as the next
`expectedCurrentSha256` guard.
Source-history commits and published source-history artifact commits now use
the node's resolved primary git principal attribution, matching wiki repository
commit behavior and keeping git-facing contribution metadata aligned with the
configured per-node profile.
The interactive User Node runtime demo can now start Studio automatically with
`pnpm ops:demo-user-node-runtime:studio` or `--with-studio`, waiting for the
keep-running smoke to print the ephemeral Host URL and operator token before
launching the separate operator surface.
`pnpm ops:smoke-demo-tools` now verifies the demo command surface without
starting infrastructure, covering syntax, help, base dry-run, Studio dry-run,
fake OpenCode dry-run, and fake `external_http` dry-run assembly.
The distributed proof kit generator now also fails fast when
`--require-external-host-url` is paired with a loopback, wildcard, malformed,
or non-HTTP(S) Host URL, preventing physical-proof kits that the verifier would
reject later.
Distributed proof profiles, generated verifier commands, and proof kit
generation can now also require relay WebSocket URLs to be non-loopback and
non-wildcard with `--require-external-relay-urls`, keeping physical proof
topology checks from silently accepting local-only relay coordinates.
CLI inbox detail can now filter Host-recorded User Node conversation messages
by direction, exact message type, and bounded result count, matching the
participant-oriented inbox list filters while preserving Host as the projection
source.
CLI inbox approvals now expose inbound approval-request discovery across
Host-recorded User Node conversations, including scoped approval metadata and
event ids for the existing signed approve/reject response commands.
CLI inbox source-reviews now expose the same discovery path narrowed to
source-change candidate approval resources, aligning headless participant
inspection with signed source-review decisions.
CLI User Node assignment rosters now expose all or current assignment records
for one human participant before reassignment, reducing the need to infer
placement from generic assignment lists.
CLI User Node runner candidates now expose trust, liveness, operational state,
capacity, current placement, capacity after explicit User Node revocation, and
bounded exclusion reasons before a headless operator offers a reassignment.
Deterministic runner task memory now also preserves bounded source-change
candidate ids, status, totals, diff availability, and changed-file summaries
from the live turn record, and the derived recent-work summary surfaces the
same code-change memory for future turns.
Post-turn memory maintenance now also rebuilds
`summaries/source-change-ledger.md` from source-change-bearing task pages,
links it from the node wiki index, and exposes it through future turn
`memoryRefs` and bounded memory briefs.
Post-turn memory maintenance now also preserves bounded approval-request
directives in task pages, rebuilds `summaries/approval-ledger.md`, links it
from the node wiki index, and exposes it through future turn `memoryRefs` and
bounded memory briefs.
Deterministic task memory now also preserves bounded handoff evidence and
rebuilds `summaries/delegation-ledger.md` from handoff-bearing task pages.
Successful non-blocked turns write memory after outbound handoff publication,
so the ledger can carry emitted Nostr event ids as well as requested target,
edge, response-policy, artifact-inclusion, intent, and summary metadata.
The highest-value remaining implementation areas are richer model-guided
memory maintenance, deeper delegated-session semantics beyond the current
controlled handoff path and deterministic owner/coordination/delegation memory
projection, Studio-side participant runtime reassignment UX beyond the current
read-only User Client runtime status projection and CLI candidate preflight,
collaborative wiki merge UI on top of the participant-scoped
page upsert and patch-set commands,
repository lifecycle and replicated/fallback artifact behavior,
infrastructure-backed multi-machine proof execution, non-disposable upgrade
behavior, external audit retention, and deeper production identity and
authorization beyond the scoped and expiry-aware bootstrap-token boundary.
