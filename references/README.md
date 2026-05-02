# References

This directory is the canonical design corpus for Entangle.

## Federated runtime pivot pack

The current forward-looking architecture pack is
[221-federated-runtime-redesign-index.md](221-federated-runtime-redesign-index.md).
It supersedes the Local-only product framing for future implementation work and
links the coordinated audit, target model, migration, and implementation
planning files from `222-current-state-codebase-audit.md` through
`231-implementation-slices-and-verification-plan.md`.

Federated implementation records start at
[232-federated-contracts-slice.md](232-federated-contracts-slice.md), followed by
[233-host-authority-store-slice.md](233-host-authority-store-slice.md) and
[234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md),
then [235-runner-registry-slice.md](235-runner-registry-slice.md) and
[236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md), then
[237-generic-runner-bootstrap-slice.md](237-generic-runner-bootstrap-slice.md)
and [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md),
then [239-host-projection-snapshot-slice.md](239-host-projection-snapshot-slice.md)
and [240-user-node-identity-slice.md](240-user-node-identity-slice.md), then
[241-signed-user-node-messages-slice.md](241-signed-user-node-messages-slice.md)
and
[242-observed-artifact-source-wiki-refs-slice.md](242-observed-artifact-source-wiki-refs-slice.md),
then
[243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)
and
[244-product-naming-migration-slice.md](244-product-naming-migration-slice.md),
then
[245-host-control-observation-bridge-slice.md](245-host-control-observation-bridge-slice.md)
through
[249-runtime-status-observation-projection-slice.md](249-runtime-status-observation-projection-slice.md),
then
[250-federated-dev-deployment-naming-cleanup-slice.md](250-federated-dev-deployment-naming-cleanup-slice.md)
and
[251-runner-assignment-runtime-start-slice.md](251-runner-assignment-runtime-start-slice.md),
then
[252-federated-runtime-projection-surface-slice.md](252-federated-runtime-projection-surface-slice.md)
and
[253-live-relay-federated-smoke-slice.md](253-live-relay-federated-smoke-slice.md),
with later implementation records through
[437-distributed-proof-verifier-assignment-profile-slice.md](437-distributed-proof-verifier-assignment-profile-slice.md)
covering process-runner smoke, portable runtime bootstrap, User Node Human
Interface Runtime/User Client work, runner-emitted artifact/source/wiki
observed refs, projection-backed read surfaces, federated runtime lifecycle,
operator receipt/transport visibility, runner-owned source history, and removal
of direct Host source/wiki/artifact filesystem mutation paths plus federated
session-cancellation, source-history-publication, source-history-replay control
delivery, distributed proof tooling, root verification gate hardening,
proof-profile assignment verification, matching Studio replay request
controls, projected source-history
replay outcome read models, per-assignment timeline read models, process smoke
coverage for assignment timelines, User Client JSON read-state convergence,
runner-owned wiki publication control, and Studio wiki publication request
controls over the federated Host boundary, plus process-boundary proof that
wiki publication produces projected artifact evidence and a matching primary git
branch, and process-boundary proof that runner-owned artifact restore produces
projected retrieval evidence through the real joined runner path. Host public
deep runtime reads now ignore Host-local runtime files
for accepted federated assignments. Projected git artifact history/diff can now
be computed through a Host-owned backend cache when the locator is resolvable
through semantic artifact context, and the process-runner smoke verifies that
path against a real runner-published source-history artifact. Host status now
exposes bounded availability, repository count, and size metadata for that
derived artifact backend cache without exposing Host filesystem paths, and Host
API/CLI operators can dry-run, clear, age-prune, or max-size-prune that derived
cache, optionally scoped to a git service/namespace/repository target, without
deleting authoritative artifact or projection state. Host status also exposes
the active bootstrap operator security posture without exposing bearer-token
material, and token-protected Hosts now enforce the bootstrap `viewer` role as
read-only while recording `operatorRole` in protected mutation audit events.
Shared host-client and CLI event summaries now render those audit events with
operator id, role, method, path, status, and auth mode. Protected Hosts can now
also distinguish multiple configured bootstrap operator bearer tokens through
`ENTANGLE_HOST_OPERATOR_TOKENS_JSON`, exposing only tokenless operator ids and
roles/permissions in Host status, allowing hash-only `tokenSha256` records,
and enforcing explicit route-level Host permissions when scoped tokens opt in.
Host event list APIs now apply category, node, operator, status-code, and
type-prefix filters before limit slicing so audit inspection does not depend
only on client-side filtering of the newest event tail.
Runner-owned wiki publication now also has a sibling runner-owned wiki page
mutation command:
[447-runner-owned-wiki-page-upsert-slice.md](447-runner-owned-wiki-page-upsert-slice.md)
adds Host-signed `runtime.wiki.upsert_page`, runner-local path validation,
wiki repository sync, `wiki.ref` evidence, command receipts correlated by
`wikiPagePath`, host-client support, and the first CLI operator command for
protocol-backed wiki page mutation without Host filesystem writes.
[448-user-client-wiki-page-upsert-slice.md](448-user-client-wiki-page-upsert-slice.md)
extends that path to running User Nodes: the User Client now sends
conversation-scoped wiki page mutation requests through the Human Interface
Runtime, which requires a visible `wiki_page` resource and forwards to Host
with `requestedBy` set to the User Node id.
[449-studio-wiki-page-upsert-slice.md](449-studio-wiki-page-upsert-slice.md)
adds the matching Studio operator form over `host-client.upsertRuntimeWikiPage`,
keeping admin page mutation on the same Host control boundary as CLI and User
Client workflows.
Generated distributed proof profiles are now covered by a package-level
contract and script-side validation, so malformed schema versions or
assignment/runtime-kind mismatches fail before Host inspection.
The proof kit can also generate relay-health verifier commands and profile
settings when explicit relay URLs are supplied.
Generated proof kits now include repeatable topology and post-work
artifact-evidence verifier scripts.
Studio's Host Status panel renders the same path-free cache summary
and the same bootstrap security summary for admin visibility, and
the running User
Client can load bounded artifact history/diff evidence through its Human
Interface Runtime while scoped to artifact refs visible in the selected User
Node conversation. The process-runner smoke now verifies that visible-artifact
history/diff path through the running User Client using a real
builder-published source-history git artifact. User Client source-change diff
and review routes are now scoped to conversations containing matching
approval-resource or projected session evidence, and the process-runner smoke
verifies that running User Client source-diff route before submitting
source-candidate review. The running User Client can now also load changed-file
preview evidence through the same selected-conversation source-change boundary,
and the process-runner smoke proves that route against the smoke source file.
Model-guided runner memory synthesis now receives bounded source-change
evidence from the completed turn record, so a node wiki can retain durable
code-change context without copying raw diffs or full file previews into
long-lived memory. The generated `working-context.md` page now also includes a
runner-owned source-change context section with bounded metadata, giving future
turns deterministic code-change memory even when the model summary is sparse.
The generated working context also carries bounded emitted handoff message ids,
so nodes retain deterministic delegation evidence without copying peer
conversations into memory. The same working context now carries active
conversation ids and bounded peer/status/response-policy/follow-up/artifact
metadata from the runner-owned session snapshot, so delegated sessions can
resume from deterministic coordination context.
Runtime approval records now preserve optional signed-message lineage for
request event id, request signer, response event id, response signer, and
source message id, closing the first audit gap between signed User Node
approval messages and the durable approval read model. Runners now enforce the
approval record's approver node set before applying inbound approval responses,
so matching responses from non-approver nodes do not transition the gate.
Runner A2A envelopes now carry signer pubkeys when available, the Nostr A2A
transport verifies the NIP-59 seal signer and drops seal/rumor/fromPubkey
mismatches, and service handling rejects mismatched signer envelopes before
state mutation. User Node inbox records now
preserve signer pubkeys for inbound and outbound messages when available, and
Host rejects inbound User Node message records whose signer differs from the
payload `fromPubkey`. CLI compact User Node message summaries and User Client
timeline headers now expose signer audit state when available. The
process-runner smoke now verifies signer preservation across User Node publish
responses, Host inbox records, User Client conversation records, source review,
approval response, synthetic inbound agent messages, and the second User Node
path. Active User Node/operator-surface specs now also treat direct Host
approval/review mutation removal as complete and keep participant approval
behavior on signed User Node messages. The `@entangle/host` lint gate now
covers TypeScript host smoke scripts, including the process-runner federated
proof. `@entangle/agent-engine` now also has a deterministic local
OpenAI-compatible HTTP provider fixture that exercises the real `fetch` path
for chat completions, tool-loop continuation, and provider error mapping
without live model credentials. A root `pnpm ops:fake-openai-provider` command
now starts a deterministic OpenAI-compatible HTTP development server for manual
catalog/auth/adapter wiring tests without live model credentials, and
`pnpm ops:smoke-fake-openai-provider` verifies that harness end to end. A root
`pnpm ops:fake-opencode-server` command now starts a deterministic fake
OpenCode attached server for manual no-credential route and permission-bridge
plumbing checks, and `pnpm ops:smoke-fake-opencode-server` verifies that
server's health, session, SSE permission, permission reply, completion, and
idle flow end to end. The runner OpenCode adapter tests also start that fake
server as a child process and execute an attached-server turn over real
HTTP/SSE traffic. CLI can now upsert active catalog agent engine profiles with
`host catalog agent-engine upsert`, so an attached OpenCode profile can be
created, made default, and assigned to a graph node without manual catalog JSON
editing.
`pnpm ops:check-product-naming` now guards active product surfaces against old
local product/profile labels. Runner-owned source-history publication commands
can now carry an approval id plus explicit git target selectors, allowing
policy-gated publication to non-primary repositories while keeping the git push
inside the assigned runner boundary. Runner-owned wiki publication commands can
now carry the same generic git target selector, allowing operator-requested
publication to resolved non-primary repositories without giving Host runner
filesystem access. The process-runner smoke now verifies targeted wiki
publication over a live relay with a real joined runner and sibling git
repository.
Runtime-context runner startup and the Human Interface Runtime now also support
mounted-file identity secret delivery, matching the shared secret-delivery
contract and generic runner join path.
The process-runner smoke now also requests runner-owned artifact restore for
the real source-history artifact published by the joined agent runner and
verifies projected `retrieved` evidence through Host runtime artifact
inspection. The artifact-ref validator now treats file-backed git targets as
credentialless local proof backends while preserving git principal requirements
for SSH and HTTPS targets.
Artifact-to-source work now returns as runner-owned proposal behavior instead
of Host-side promotion: Host publishes
`runtime.artifact.propose_source_change`, the assigned runner retrieves the
artifact, copies bounded safe content into its source workspace, harvests a
pending source-change candidate, and emits signed `source_change.ref`
evidence. The process-runner smoke proves that path against the real
runner-published report artifact. CLI and Studio can now request that same
runner-owned proposal path from artifact inspection surfaces without adding a
Host-side source mutation shortcut. The running User Client can now also
request the same proposal path for artifacts visible in the selected User Node
conversation, with the Human Interface Runtime enforcing conversation
visibility and setting `requestedBy` to the User Node id. The running User
Client can also request runner-owned artifact restore for visible artifacts
through the same conversation-scoped boundary; the process-runner smoke proves
that path through the running User Client and a completed projected restore
command receipt. The running User Client can now request runner-owned
source-history publication for visible source-history resources through the
same participant boundary, and the process-runner smoke proves that path with
a signed builder approval request and a completed projected
`runtime.source_history.publish` command receipt. Target-specific participant
requests now require the selected conversation to contain a matching
`source_history_publication` resource. The running User Client can now also
request source-history reconcile for visible plain `source_history` resources;
publication-target resources are intentionally not accepted for reconcile
because reconcile can mutate the runner-owned source workspace. Host now
returns an effective proposal id even when callers omit one, and sends that
same id in the runner control payload so acknowledgements can be followed to
the projected candidate. The running User Client can now also request
runner-owned wiki publication for wiki resources visible in the selected User
Node conversation, with the Human Interface Runtime enforcing conversation
visibility and setting `requestedBy` to the User Node id; the process-runner smoke now proves that
path through a signed builder wiki approval request, the running User Client
JSON route, and a completed projected `runtime.wiki.publish` command receipt.
Target-specific participant wiki publication requests now require the selected
conversation to contain a matching `wiki_repository_publication` resource, and
the process-runner smoke now verifies the target-specific projected artifact
and git branch head for that participant path.
Human Interface Runtime HTTP surfaces can now require optional runtime-local
Basic Auth through `ENTANGLE_HUMAN_INTERFACE_BASIC_AUTH`, while keeping
`/health` public for liveness checks and the Host bearer token server-side.
CLI can also inspect runtime command receipts directly from Host projection
with assignment, node, runner, command type, status, and limit filters. Studio
can now open assignment-scoped
timelines through the same Host assignment timeline endpoint.
`pnpm ops:demo-user-node-runtime` now wraps the fastest interactive User Node
runtime proof by building the dedicated User Client app, starting the
development relay, and running the federated
process-runner smoke in `--keep-running` mode.
`pnpm ops:distributed-proof-kit` now generates a copyable three-runner proof
kit for a reachable Host/relay/git topology, with Host-derived runner join
configs, runner-local env/start scripts, and operator trust/assignment/User
Node message commands for machines that do not share Host filesystem state.
`pnpm ops:distributed-proof-verify` now checks that running topology through
Host HTTP APIs and optional User Client health endpoints, covering Host
Authority, runner trust/liveness/runtime-kind and agent-engine capabilities,
assignments, projection, User Client URLs, optional conversation evidence,
default `running` runtime observations, and distinct multi-user User Client
URLs without reading Host or runner files; custom proof profiles can override
runner ids, graph node ids, and the expected agent engine kind in both the
verifier and generated proof kit through a proof profile manifest while
OpenCode remains the default, and operators can optionally require projected
artifact/source/wiki evidence from the agent node after work is produced or
relay WebSocket health for configured proof relays. The verifier can also
optionally check the Host catalog's selected git services for distributed-proof
suitability by rejecting missing or file-backed git services and probing the
public service base URL from the operator machine.
`pnpm ops:smoke-distributed-proof-tools` now gives CI a deterministic
no-infrastructure smoke over proof-kit help/dry-run paths and verifier
self-test JSON, including non-running runtime rejection and duplicate User
Client URL rejection plus wrong-runtime-kind and wrong-agent-engine rejection,
plus custom proof-kit and verifier agent-engine/profile manifest paths and
required-artifact-evidence success/failure paths, before an operator attempts
the real distributed proof. It also proves relay-health success and missing
relay failure paths plus git-backend-health success, file-backed-git rejection,
and missing-git-service rejection.
The root `pnpm test` gate and the runner package script now run the runner
suite with `--pool=forks --maxWorkers=1`, after the previous threads setting
reproduced a no-output hang while the single-fork command passed directly.
Studio can now also trust or revoke projected runners from the Federation panel
through the same Host runner registry boundary used by the CLI, and enriches
those rows with full Host runner registry liveness, heartbeat, runtime-kind,
engine-kind, and capacity summaries when available.
Studio assignment timeline drilldowns now also render runtime state, runner
liveness/heartbeat, source-history counts, replay counts, and command receipt
counts for the selected assignment.

The file numbers `221` and `222` now appear twice because the federated pivot
handoff required exact filenames after the Local-era
`221-source-history-replay-slice.md` and
`222-wiki-repository-publication-slice.md` had already been created. Both sets
remain intentional: the older files are Local implementation records; the new
files are the active federated redesign pack.

## Reading order

1. [00-executive-summary.md](00-executive-summary.md)
2. [01-vision-and-philosophy.md](01-vision-and-philosophy.md)
3. [02-product-definition.md](02-product-definition.md)
4. [03-system-architecture.md](03-system-architecture.md)
5. [04-agent-model.md](04-agent-model.md)
6. [05-graph-model.md](05-graph-model.md)
7. [06-communication-and-protocol.md](06-communication-and-protocol.md)
8. [07-storage-memory-and-artifacts.md](07-storage-memory-and-artifacts.md)
9. [08-runner-and-execution-model.md](08-runner-and-execution-model.md)
10. [09-hackathon-scope-and-deliverables.md](09-hackathon-scope-and-deliverables.md)
11. [10-post-hackathon-roadmap.md](10-post-hackathon-roadmap.md)
12. [11-open-questions-and-design-tradeoffs.md](11-open-questions-and-design-tradeoffs.md)
13. [12-canonical-type-system.md](12-canonical-type-system.md)
14. [13-runner-lifecycle-spec.md](13-runner-lifecycle-spec.md)
15. [14-entangle-a2a-v1.md](14-entangle-a2a-v1.md)
16. [15-implementation-strategy.md](15-implementation-strategy.md)
17. [16-stack-and-infrastructure-recommendation.md](16-stack-and-infrastructure-recommendation.md)
18. [17-repository-audit-and-maintenance.md](17-repository-audit-and-maintenance.md)
19. [18-specification-and-decision-workflow.md](18-specification-and-decision-workflow.md)
20. [19-core-contract-invariants.md](19-core-contract-invariants.md)
21. [20-normalization-and-validation-rules.md](20-normalization-and-validation-rules.md)
22. [21-state-machines-and-runtime-transitions.md](21-state-machines-and-runtime-transitions.md)
23. [22-agent-package-filesystem-and-binding-spec.md](22-agent-package-filesystem-and-binding-spec.md)
24. [23-edge-semantics-and-policy-matrix.md](23-edge-semantics-and-policy-matrix.md)
25. [24-artifact-backend-specification.md](24-artifact-backend-specification.md)
26. [25-control-plane-and-graph-mutation.md](25-control-plane-and-graph-mutation.md)
27. [26-versioning-migrations-and-compatibility.md](26-versioning-migrations-and-compatibility.md)
28. [27-observability-and-trace-spec.md](27-observability-and-trace-spec.md)
29. [28-studio-and-user-surface-spec.md](28-studio-and-user-surface-spec.md)
30. [29-hackathon-runtime-profile.md](29-hackathon-runtime-profile.md)
31. [30-quality-gates-and-acceptance-criteria.md](30-quality-gates-and-acceptance-criteria.md)
32. [31-host-control-plane-and-runtime-orchestration.md](31-host-control-plane-and-runtime-orchestration.md)
33. [32-client-surfaces-and-headless-operation.md](32-client-surfaces-and-headless-operation.md)
34. [33-repository-and-package-topology.md](33-repository-and-package-topology.md)
35. [34-identity-credentials-and-signing-boundaries.md](34-identity-credentials-and-signing-boundaries.md)
36. [35-external-resource-catalog-and-bindings.md](35-external-resource-catalog-and-bindings.md)
37. [36-host-api-and-reconciliation-spec.md](36-host-api-and-reconciliation-spec.md)
38. [37-effective-bindings-and-runtime-context-spec.md](37-effective-bindings-and-runtime-context-spec.md)
39. [38-engine-adapter-and-model-execution-spec.md](38-engine-adapter-and-model-execution-spec.md)
40. [39-local-deployment-topology-and-compose-spec.md](39-local-deployment-topology-and-compose-spec.md)
41. [40-pre-implementation-audit.md](40-pre-implementation-audit.md) (historical first audit)
42. [41-agent-engine-boundary-and-reuse-policy.md](41-agent-engine-boundary-and-reuse-policy.md)
43. [42-host-state-layout-and-persistence-spec.md](42-host-state-layout-and-persistence-spec.md)
44. [43-hackathon-cli-and-package-scaffold-profile.md](43-hackathon-cli-and-package-scaffold-profile.md)
45. [44-schema-ownership-and-contract-generation-spec.md](44-schema-ownership-and-contract-generation-spec.md)
46. [45-quality-engineering-and-ci-baseline.md](45-quality-engineering-and-ci-baseline.md)
47. [46-runtime-materialization-and-runner-bootstrap-slice.md](46-runtime-materialization-and-runner-bootstrap-slice.md)
48. [47-runtime-backend-and-reconciliation-slice.md](47-runtime-backend-and-reconciliation-slice.md)
49. [48-docker-engine-api-runtime-backend-refinement.md](48-docker-engine-api-runtime-backend-refinement.md)
50. [49-typescript-build-graph-and-project-references-refinement.md](49-typescript-build-graph-and-project-references-refinement.md)
51. [50-immutable-package-store-refinement.md](50-immutable-package-store-refinement.md)
52. [51-machine-readable-a2a-and-runner-state-contracts.md](51-machine-readable-a2a-and-runner-state-contracts.md)
53. [52-runtime-identity-materialization-and-secret-boundaries.md](52-runtime-identity-materialization-and-secret-boundaries.md)
54. [53-runner-transport-and-long-lived-intake-slice.md](53-runner-transport-and-long-lived-intake-slice.md)
55. [54-live-nostr-transport-and-relay-profile-slice.md](54-live-nostr-transport-and-relay-profile-slice.md)
56. [55-docker-image-build-topology-slice.md](55-docker-image-build-topology-slice.md)
57. [56-git-artifact-materialization-and-host-surface-slice.md](56-git-artifact-materialization-and-host-surface-slice.md)
58. [57-artifact-reference-portability-refinement.md](57-artifact-reference-portability-refinement.md)
59. [58-external-principal-bindings-slice.md](58-external-principal-bindings-slice.md)
60. [59-implementation-state-and-delivery-audit.md](59-implementation-state-and-delivery-audit.md)
61. [60-runtime-secret-delivery-and-git-principal-binding-slice.md](60-runtime-secret-delivery-and-git-principal-binding-slice.md)
62. [61-git-remote-selection-and-provisioning-policy-slice.md](61-git-remote-selection-and-provisioning-policy-slice.md)
63. [62-artifact-publication-state-contract-slice.md](62-artifact-publication-state-contract-slice.md)
64. [63-remote-git-publication-preexisting-repository-slice.md](63-remote-git-publication-preexisting-repository-slice.md)
65. [64-primary-target-git-retrieval-and-handoff-validation-slice.md](64-primary-target-git-retrieval-and-handoff-validation-slice.md)
66. [65-host-owned-gitea-primary-target-provisioning-slice.md](65-host-owned-gitea-primary-target-provisioning-slice.md)
67. [66-locator-specific-git-handoff-widening-slice.md](66-locator-specific-git-handoff-widening-slice.md)
68. [67-first-real-anthropic-agent-engine-slice.md](67-first-real-anthropic-agent-engine-slice.md)
69. [68-package-tool-catalog-contract-slice.md](68-package-tool-catalog-contract-slice.md)
70. [69-builtin-tool-executor-and-bounded-anthropic-tool-loop-slice.md](69-builtin-tool-executor-and-bounded-anthropic-tool-loop-slice.md)
71. [70-deterministic-post-turn-memory-update-slice.md](70-deterministic-post-turn-memory-update-slice.md)
72. [71-host-event-surface-slice.md](71-host-event-surface-slice.md)
73. [72-graph-revision-history-inspection-slice.md](72-graph-revision-history-inspection-slice.md)
74. [73-applied-node-inspection-slice.md](73-applied-node-inspection-slice.md)
75. [74-managed-node-mutation-slice.md](74-managed-node-mutation-slice.md)
76. [75-edge-resource-mutation-slice.md](75-edge-resource-mutation-slice.md)
77. [76-runtime-restart-slice.md](76-runtime-restart-slice.md)
78. [77-reconciliation-and-degraded-state-slice.md](77-reconciliation-and-degraded-state-slice.md)
79. [78-session-inspection-slice.md](78-session-inspection-slice.md)
80. [79-session-and-runner-activity-event-slice.md](79-session-and-runner-activity-event-slice.md)
81. [80-runtime-recovery-history-slice.md](80-runtime-recovery-history-slice.md)
82. [81-runtime-recovery-policy-slice.md](81-runtime-recovery-policy-slice.md)
83. [82-runtime-recovery-event-surface-slice.md](82-runtime-recovery-event-surface-slice.md)
84. [83-studio-and-cli-runtime-recovery-inspection-slice.md](83-studio-and-cli-runtime-recovery-inspection-slice.md)
85. [84-conversation-approval-artifact-host-event-slice.md](84-conversation-approval-artifact-host-event-slice.md)
86. [85-studio-runtime-trace-inspection-slice.md](85-studio-runtime-trace-inspection-slice.md)
87. [86-studio-runtime-lifecycle-mutation-slice.md](86-studio-runtime-lifecycle-mutation-slice.md)
88. [87-studio-runtime-artifact-inspection-slice.md](87-studio-runtime-artifact-inspection-slice.md)
89. [88-studio-runtime-session-inspection-slice.md](88-studio-runtime-session-inspection-slice.md)
90. [89-studio-graph-edge-mutation-slice.md](89-studio-graph-edge-mutation-slice.md)
91. [90-studio-managed-node-mutation-slice.md](90-studio-managed-node-mutation-slice.md)
92. [91-studio-package-admission-slice.md](91-studio-package-admission-slice.md)
93. [92-studio-live-refresh-slice.md](92-studio-live-refresh-slice.md)
94. [93-cli-package-source-parity-slice.md](93-cli-package-source-parity-slice.md)
95. [94-cli-runtime-artifact-inspection-slice.md](94-cli-runtime-artifact-inspection-slice.md)
96. [95-studio-session-drilldown-slice.md](95-studio-session-drilldown-slice.md)
97. [96-cli-mutation-dry-run-slice.md](96-cli-mutation-dry-run-slice.md)
98. [97-builtin-memory-ref-tool-slice.md](97-builtin-memory-ref-tool-slice.md)
99. [98-recent-work-memory-summary-slice.md](98-recent-work-memory-summary-slice.md)
100. [99-model-guided-working-context-memory-slice.md](99-model-guided-working-context-memory-slice.md)
101. [100-engine-turn-observability-slice.md](100-engine-turn-observability-slice.md)
102. [101-runtime-trace-client-consumption-slice.md](101-runtime-trace-client-consumption-slice.md)
103. [102-engine-provider-metadata-and-failure-reporting-slice.md](102-engine-provider-metadata-and-failure-reporting-slice.md)
104. [103-builtin-session-state-tool-slice.md](103-builtin-session-state-tool-slice.md)
105. [104-session-aware-working-context-synthesis-slice.md](104-session-aware-working-context-synthesis-slice.md)
106. [105-artifact-aware-working-context-synthesis-slice.md](105-artifact-aware-working-context-synthesis-slice.md)
107. [106-artifact-context-carry-forward-slice.md](106-artifact-context-carry-forward-slice.md)
108. [107-engine-outcome-aware-working-context-slice.md](107-engine-outcome-aware-working-context-slice.md)
109. [108-execution-insight-carry-forward-slice.md](108-execution-insight-carry-forward-slice.md)
110. [109-execution-aware-deterministic-memory-baseline-slice.md](109-execution-aware-deterministic-memory-baseline-slice.md)
111. [110-final-state-session-context-memory-synthesis-slice.md](110-final-state-session-context-memory-synthesis-slice.md)
112. [111-memory-synthesis-observability-slice.md](111-memory-synthesis-observability-slice.md)
113. [112-focused-memory-summary-registers-slice.md](112-focused-memory-summary-registers-slice.md)
114. [113-decision-register-memory-slice.md](113-decision-register-memory-slice.md)
115. [114-next-actions-register-memory-slice.md](114-next-actions-register-memory-slice.md)
116. [115-resolutions-register-memory-slice.md](115-resolutions-register-memory-slice.md)
117. [116-focused-register-lifecycle-discipline-slice.md](116-focused-register-lifecycle-discipline-slice.md)
118. [117-focused-register-aging-signals-slice.md](117-focused-register-aging-signals-slice.md)
119. [118-explicit-closure-reference-memory-slice.md](118-explicit-closure-reference-memory-slice.md)
120. [119-stale-item-disappearance-discipline-slice.md](119-stale-item-disappearance-discipline-slice.md)
121. [120-explicit-stale-item-replacement-slice.md](120-explicit-stale-item-replacement-slice.md)
122. [121-explicit-stale-item-consolidation-slice.md](121-explicit-stale-item-consolidation-slice.md)
123. [122-focused-register-transition-history-slice.md](122-focused-register-transition-history-slice.md)
124. [123-host-socketless-verification-slice.md](123-host-socketless-verification-slice.md)
125. [124-bootstrap-host-operator-token-auth-slice.md](124-bootstrap-host-operator-token-auth-slice.md)
126. [125-bootstrap-operator-request-audit-slice.md](125-bootstrap-operator-request-audit-slice.md)
127. [126-runtime-artifact-detail-inspection-slice.md](126-runtime-artifact-detail-inspection-slice.md)
128. [127-studio-runtime-artifact-detail-slice.md](127-studio-runtime-artifact-detail-slice.md)
129. [128-local-archive-package-source-admission-slice.md](128-local-archive-package-source-admission-slice.md)
130. [129-package-source-deletion-slice.md](129-package-source-deletion-slice.md)
131. [130-studio-package-source-deletion-slice.md](130-studio-package-source-deletion-slice.md)
132. [131-runner-git-https-token-transport-slice.md](131-runner-git-https-token-transport-slice.md)
133. [132-openai-compatible-agent-engine-slice.md](132-openai-compatible-agent-engine-slice.md)
134. [133-external-principal-deletion-slice.md](133-external-principal-deletion-slice.md)
135. [134-studio-external-principal-lifecycle-slice.md](134-studio-external-principal-lifecycle-slice.md)
136. [135-package-scaffold-safety-and-cli-options-slice.md](135-package-scaffold-safety-and-cli-options-slice.md)
137. [136-runtime-turn-inspection-slice.md](136-runtime-turn-inspection-slice.md)
138. [137-studio-runtime-turn-detail-slice.md](137-studio-runtime-turn-detail-slice.md)
139. [138-studio-recovery-policy-mutation-slice.md](138-studio-recovery-policy-mutation-slice.md)
140. [139-studio-graph-revision-history-slice.md](139-studio-graph-revision-history-slice.md)
141. [140-local-operator-profile-preflight-slice.md](140-local-operator-profile-preflight-slice.md)
142. [141-local-operator-profile-active-smoke-slice.md](141-local-operator-profile-active-smoke-slice.md)
143. [142-tool-execution-diagnostics-slice.md](142-tool-execution-diagnostics-slice.md)
144. [143-shared-runtime-turn-presentation-slice.md](143-shared-runtime-turn-presentation-slice.md)
145. [144-disposable-local-profile-smoke-slice.md](144-disposable-local-profile-smoke-slice.md)
146. [145-runtime-lifecycle-smoke-slice.md](145-runtime-lifecycle-smoke-slice.md)
147. [146-runner-multi-node-git-handoff-slice.md](146-runner-multi-node-git-handoff-slice.md)
148. [147-docker-gitea-multi-node-handoff-smoke-slice.md](147-docker-gitea-multi-node-handoff-smoke-slice.md)
149. [148-peer-runtime-route-identity-slice.md](148-peer-runtime-route-identity-slice.md)
150. [149-runner-autonomous-handoff-slice.md](149-runner-autonomous-handoff-slice.md)
151. [150-runner-session-active-conversation-reconciliation-slice.md](150-runner-session-active-conversation-reconciliation-slice.md)
152. [151-host-session-activity-detail-slice.md](151-host-session-activity-detail-slice.md)
153. [152-host-session-summary-active-work-slice.md](152-host-session-summary-active-work-slice.md)
154. [153-shared-session-presentation-slice.md](153-shared-session-presentation-slice.md)
155. [154-shared-artifact-presentation-slice.md](154-shared-artifact-presentation-slice.md)
156. [155-shared-recovery-presentation-slice.md](155-shared-recovery-presentation-slice.md)
157. [156-shared-graph-presentation-slice.md](156-shared-graph-presentation-slice.md)
158. [157-shared-resource-inventory-presentation-slice.md](157-shared-resource-inventory-presentation-slice.md)
159. [158-shared-runtime-inspection-presentation-slice.md](158-shared-runtime-inspection-presentation-slice.md)
160. [159-shared-host-status-presentation-slice.md](159-shared-host-status-presentation-slice.md)
161. [160-session-diagnostics-observability-slice.md](160-session-diagnostics-observability-slice.md)
162. [161-runner-session-active-work-repair-slice.md](161-runner-session-active-work-repair-slice.md)
163. [162-session-level-consistency-diagnostics-slice.md](162-session-level-consistency-diagnostics-slice.md)
164. [163-runner-drained-session-startup-completion-slice.md](163-runner-drained-session-startup-completion-slice.md)
165. [164-runner-approval-gated-session-repair-slice.md](164-runner-approval-gated-session-repair-slice.md)
166. [165-host-session-approval-status-counts-slice.md](165-host-session-approval-status-counts-slice.md)
167. [166-session-event-approval-status-counts-slice.md](166-session-event-approval-status-counts-slice.md)
168. [167-runtime-approval-inspection-slice.md](167-runtime-approval-inspection-slice.md)
169. [168-session-approval-consistency-diagnostics-slice.md](168-session-approval-consistency-diagnostics-slice.md)
170. [169-runner-approved-approval-gate-repair-slice.md](169-runner-approved-approval-gate-repair-slice.md)
171. [170-session-snapshot-approval-context-slice.md](170-session-snapshot-approval-context-slice.md)
172. [171-working-context-approval-gate-carry-forward-slice.md](171-working-context-approval-gate-carry-forward-slice.md)
173. [172-runner-approval-message-handling-slice.md](172-runner-approval-message-handling-slice.md)
174. [173-approval-metadata-validation-slice.md](173-approval-metadata-validation-slice.md)
175. [174-definitive-production-delivery-roadmap.md](174-definitive-production-delivery-roadmap.md)
176. [175-runner-orphan-approval-response-guard-slice.md](175-runner-orphan-approval-response-guard-slice.md)
177. [176-approval-response-policy-validation-slice.md](176-approval-response-policy-validation-slice.md)
178. [177-r1-local-operator-release-ledger.md](177-r1-local-operator-release-ledger.md)
179. [178-product-line-roadmap-readiness-audit.md](178-product-line-roadmap-readiness-audit.md)
180. [179-monorepo-profile-release-organization-slice.md](179-monorepo-profile-release-organization-slice.md)
181. [180-local-ga-product-truth-audit.md](180-local-ga-product-truth-audit.md)
182. [181-studio-session-launch-slice.md](181-studio-session-launch-slice.md)
183. [182-studio-graph-revision-diff-slice.md](182-studio-graph-revision-diff-slice.md)
184. [183-cli-graph-template-export-slice.md](183-cli-graph-template-export-slice.md)
185. [184-local-artifact-preview-slice.md](184-local-artifact-preview-slice.md)
186. [185-studio-graph-validation-slice.md](185-studio-graph-validation-slice.md)
187. [186-cli-graph-import-export-slice.md](186-cli-graph-import-export-slice.md)
188. [187-cli-session-launch-wait-slice.md](187-cli-session-launch-wait-slice.md)
189. [188-local-memory-workbench-slice.md](188-local-memory-workbench-slice.md)
190. [189-entangle-completion-plan.md](189-entangle-completion-plan.md)
191. [190-local-runtime-profile-rename-slice.md](190-local-runtime-profile-rename-slice.md)
192. [191-opencode-runtime-state-isolation-slice.md](191-opencode-runtime-state-isolation-slice.md)
193. [192-agent-runtime-inspection-status-slice.md](192-agent-runtime-inspection-status-slice.md)
194. [193-opencode-version-probe-timeout-slice.md](193-opencode-version-probe-timeout-slice.md)
195. [194-opencode-permission-observability-slice.md](194-opencode-permission-observability-slice.md)
196. [195-node-workspace-health-slice.md](195-node-workspace-health-slice.md)
197. [196-source-workspace-change-harvesting-slice.md](196-source-workspace-change-harvesting-slice.md)
198. [197-source-change-candidates-slice.md](197-source-change-candidates-slice.md)
199. [198-source-change-candidate-diff-slice.md](198-source-change-candidate-diff-slice.md)
200. [199-source-change-candidate-file-preview-slice.md](199-source-change-candidate-file-preview-slice.md)
201. [200-source-change-candidate-review-slice.md](200-source-change-candidate-review-slice.md)
202. [201-source-history-application-slice.md](201-source-history-application-slice.md)
203. [202-source-history-publication-slice.md](202-source-history-publication-slice.md)
204. [203-artifact-history-diff-slice.md](203-artifact-history-diff-slice.md)
205. [204-source-history-publication-controls-slice.md](204-source-history-publication-controls-slice.md)
206. [205-source-mutation-policy-gates-slice.md](205-source-mutation-policy-gates-slice.md)
207. [206-operation-resource-scoped-approvals-slice.md](206-operation-resource-scoped-approvals-slice.md)
208. [207-local-doctor-foundation-slice.md](207-local-doctor-foundation-slice.md)
209. [208-operator-scoped-approval-decisions-slice.md](208-operator-scoped-approval-decisions-slice.md)
210. [209-agent-runtime-node-configuration-slice.md](209-agent-runtime-node-configuration-slice.md)
211. [210-wiki-repository-sync-slice.md](210-wiki-repository-sync-slice.md)
212. [211-local-doctor-wiki-repository-health-slice.md](211-local-doctor-wiki-repository-health-slice.md)
213. [212-engine-request-summary-slice.md](212-engine-request-summary-slice.md)
214. [213-engine-prompt-policy-workspace-context-slice.md](213-engine-prompt-policy-workspace-context-slice.md)
215. [214-opencode-action-directive-bridge-slice.md](214-opencode-action-directive-bridge-slice.md)
216. [215-runtime-artifact-restore-slice.md](215-runtime-artifact-restore-slice.md)
217. [216-studio-artifact-restore-slice.md](216-studio-artifact-restore-slice.md)
218. [217-runtime-artifact-restore-history-slice.md](217-runtime-artifact-restore-history-slice.md)
219. [218-non-primary-publication-provisioning-slice.md](218-non-primary-publication-provisioning-slice.md)
220. [219-artifact-promotion-slice.md](219-artifact-promotion-slice.md)
221. [220-external-session-cancellation-slice.md](220-external-session-cancellation-slice.md)
222. [221-source-history-replay-slice.md](221-source-history-replay-slice.md)
223. [222-wiki-repository-publication-slice.md](222-wiki-repository-publication-slice.md)
224. [223-federated-product-vision.md](223-federated-product-vision.md)
225. [224-entity-model-and-authority-boundaries.md](224-entity-model-and-authority-boundaries.md)
226. [225-host-runner-federation-spec.md](225-host-runner-federation-spec.md)
227. [226-user-node-and-human-interface-runtime-spec.md](226-user-node-and-human-interface-runtime-spec.md)
228. [227-nostr-event-fabric-spec.md](227-nostr-event-fabric-spec.md)
229. [228-distributed-state-projection-spec.md](228-distributed-state-projection-spec.md)
230. [229-studio-cli-operator-and-user-surfaces-spec.md](229-studio-cli-operator-and-user-surfaces-spec.md)
231. [230-migration-from-local-assumptions-plan.md](230-migration-from-local-assumptions-plan.md)
232. [231-implementation-slices-and-verification-plan.md](231-implementation-slices-and-verification-plan.md)
233. [232-federated-contracts-slice.md](232-federated-contracts-slice.md)
234. [233-host-authority-store-slice.md](233-host-authority-store-slice.md)
235. [234-nostr-control-observe-transport-slice.md](234-nostr-control-observe-transport-slice.md)
236. [235-runner-registry-slice.md](235-runner-registry-slice.md)
237. [236-assignment-lifecycle-slice.md](236-assignment-lifecycle-slice.md)
238. [237-generic-runner-bootstrap-slice.md](237-generic-runner-bootstrap-slice.md)
239. [238-local-launcher-join-adapter-slice.md](238-local-launcher-join-adapter-slice.md)
240. [239-host-projection-snapshot-slice.md](239-host-projection-snapshot-slice.md)
241. [240-user-node-identity-slice.md](240-user-node-identity-slice.md)
242. [241-signed-user-node-messages-slice.md](241-signed-user-node-messages-slice.md)
243. [242-observed-artifact-source-wiki-refs-slice.md](242-observed-artifact-source-wiki-refs-slice.md)
244. [243-studio-cli-federation-surfaces-slice.md](243-studio-cli-federation-surfaces-slice.md)
245. [244-product-naming-migration-slice.md](244-product-naming-migration-slice.md)
246. [245-host-control-observation-bridge-slice.md](245-host-control-observation-bridge-slice.md)
247. [246-federated-control-plane-smoke-slice.md](246-federated-control-plane-smoke-slice.md)
248. [247-host-startup-control-plane-wiring-slice.md](247-host-startup-control-plane-wiring-slice.md)
249. [248-runner-default-assignment-materializer-slice.md](248-runner-default-assignment-materializer-slice.md)
250. [249-runtime-status-observation-projection-slice.md](249-runtime-status-observation-projection-slice.md)
251. [250-federated-dev-deployment-naming-cleanup-slice.md](250-federated-dev-deployment-naming-cleanup-slice.md)
252. [251-runner-assignment-runtime-start-slice.md](251-runner-assignment-runtime-start-slice.md)
253. [252-federated-runtime-projection-surface-slice.md](252-federated-runtime-projection-surface-slice.md)
254. [253-live-relay-federated-smoke-slice.md](253-live-relay-federated-smoke-slice.md)
255. [254-process-runner-federated-smoke-slice.md](254-process-runner-federated-smoke-slice.md)
256. [255-public-runtime-api-path-boundary-slice.md](255-public-runtime-api-path-boundary-slice.md)
257. [256-portable-runtime-bootstrap-bundle-slice.md](256-portable-runtime-bootstrap-bundle-slice.md)
258. [257-federated-session-conversation-observations-slice.md](257-federated-session-conversation-observations-slice.md)
259. [258-human-interface-runtime-realignment-plan.md](258-human-interface-runtime-realignment-plan.md)
260. [259-user-node-inbox-client-slice.md](259-user-node-inbox-client-slice.md)
261. [260-multi-user-human-runtime-smoke-slice.md](260-multi-user-human-runtime-smoke-slice.md)
262. [261-user-node-message-history-slice.md](261-user-node-message-history-slice.md)
263. [262-user-node-inbound-message-intake-slice.md](262-user-node-inbound-message-intake-slice.md)
264. [263-user-node-approval-controls-slice.md](263-user-node-approval-controls-slice.md)
265. [264-user-node-artifact-ref-rendering-slice.md](264-user-node-artifact-ref-rendering-slice.md)
266. [265-user-node-artifact-preview-slice.md](265-user-node-artifact-preview-slice.md)
267. [266-user-node-source-change-diff-preview-slice.md](266-user-node-source-change-diff-preview-slice.md)
268. [267-user-node-approval-response-context-slice.md](267-user-node-approval-response-context-slice.md)
269. [268-user-client-message-delivery-state-slice.md](268-user-client-message-delivery-state-slice.md)
270. [269-runner-observed-ref-emission-slice.md](269-runner-observed-ref-emission-slice.md)
271. [270-source-change-ref-summary-projection-slice.md](270-source-change-ref-summary-projection-slice.md)
272. [271-user-client-source-summary-projection-slice.md](271-user-client-source-summary-projection-slice.md)
273. [272-cli-user-node-approval-context-slice.md](272-cli-user-node-approval-context-slice.md)
274. [273-user-client-projected-source-diff-excerpt-slice.md](273-user-client-projected-source-diff-excerpt-slice.md)
275. [274-studio-user-node-runtime-summary-slice.md](274-studio-user-node-runtime-summary-slice.md)
276. [275-cli-user-node-approval-from-message-slice.md](275-cli-user-node-approval-from-message-slice.md)
277. [276-user-node-message-lookup-slice.md](276-user-node-message-lookup-slice.md)
278. [277-projected-artifact-preview-slice.md](277-projected-artifact-preview-slice.md)
279. [278-user-node-local-read-state-slice.md](278-user-node-local-read-state-slice.md)
280. [279-user-client-wiki-ref-projection-slice.md](279-user-client-wiki-ref-projection-slice.md)
281. [280-user-node-read-receipt-slice.md](280-user-node-read-receipt-slice.md)
282. [281-projected-wiki-preview-slice.md](281-projected-wiki-preview-slice.md)
283. [282-process-runner-smoke-relay-preflight-slice.md](282-process-runner-smoke-relay-preflight-slice.md)
284. [283-user-node-parent-message-read-model-slice.md](283-user-node-parent-message-read-model-slice.md)
285. [284-user-node-delivery-retry-state-slice.md](284-user-node-delivery-retry-state-slice.md)
286. [285-studio-wiki-publication-retry-slice.md](285-studio-wiki-publication-retry-slice.md)
287. [286-opencode-tool-evidence-slice.md](286-opencode-tool-evidence-slice.md)
288. [287-user-client-runtime-status-live-refresh-slice.md](287-user-client-runtime-status-live-refresh-slice.md)
289. [288-user-client-source-candidate-review-slice.md](288-user-client-source-candidate-review-slice.md)
290. [289-opencode-server-health-probe-slice.md](289-opencode-server-health-probe-slice.md)
291. [290-human-interface-json-api-slice.md](290-human-interface-json-api-slice.md)
292. [291-human-interface-json-api-smoke-slice.md](291-human-interface-json-api-smoke-slice.md)
293. [292-dedicated-user-client-app-slice.md](292-dedicated-user-client-app-slice.md)
294. [293-runtime-served-user-client-assets-slice.md](293-runtime-served-user-client-assets-slice.md)
295. [294-docker-user-client-packaging-slice.md](294-docker-user-client-packaging-slice.md)
296. [295-user-client-review-json-actions-slice.md](295-user-client-review-json-actions-slice.md)
297. [296-process-smoke-dedicated-user-client-assets-slice.md](296-process-smoke-dedicated-user-client-assets-slice.md)
298. [297-cli-user-client-endpoints-slice.md](297-cli-user-client-endpoints-slice.md)
299. [298-studio-runtime-assignment-control-slice.md](298-studio-runtime-assignment-control-slice.md)
300. [299-studio-runtime-assignment-revocation-slice.md](299-studio-runtime-assignment-revocation-slice.md)
301. [300-host-transport-health-slice.md](300-host-transport-health-slice.md)
302. [301-runner-join-config-cli-slice.md](301-runner-join-config-cli-slice.md)
303. [302-runner-heartbeat-loop-slice.md](302-runner-heartbeat-loop-slice.md)
304. [303-runner-heartbeat-config-smoke-slice.md](303-runner-heartbeat-config-smoke-slice.md)
305. [304-deployment-index-profile-cleanup-slice.md](304-deployment-index-profile-cleanup-slice.md)
306. [305-observed-session-projection-pruning-slice.md](305-observed-session-projection-pruning-slice.md)
307. [306-projected-session-inspection-slice.md](306-projected-session-inspection-slice.md)
308. [307-approval-observation-projection-slice.md](307-approval-observation-projection-slice.md)
309. [308-projected-approval-read-api-slice.md](308-projected-approval-read-api-slice.md)
310. [309-projected-turn-read-api-slice.md](309-projected-turn-read-api-slice.md)
311. [310-process-smoke-opencode-projection-read-api-slice.md](310-process-smoke-opencode-projection-read-api-slice.md)
312. [311-runner-lifecycle-observation-completeness-slice.md](311-runner-lifecycle-observation-completeness-slice.md)
313. [312-projected-artifact-read-api-slice.md](312-projected-artifact-read-api-slice.md)
314. [313-projected-source-candidate-read-api-slice.md](313-projected-source-candidate-read-api-slice.md)
315. [314-projected-artifact-preview-api-slice.md](314-projected-artifact-preview-api-slice.md)
316. [315-projected-source-candidate-diff-api-slice.md](315-projected-source-candidate-diff-api-slice.md)
317. [316-process-smoke-projected-source-candidate-slice.md](316-process-smoke-projected-source-candidate-slice.md)
318. [317-docker-join-config-env-slice.md](317-docker-join-config-env-slice.md)
319. [318-projected-source-candidate-file-preview-slice.md](318-projected-source-candidate-file-preview-slice.md)
320. [319-projected-memory-wiki-read-api-slice.md](319-projected-memory-wiki-read-api-slice.md)
321. [320-projected-artifact-history-diff-read-api-slice.md](320-projected-artifact-history-diff-read-api-slice.md)
322. [321-signed-source-candidate-review-slice.md](321-signed-source-candidate-review-slice.md)
323. [322-public-direct-mutation-surface-quarantine-slice.md](322-public-direct-mutation-surface-quarantine-slice.md)
324. [323-direct-host-approval-review-api-removal-slice.md](323-direct-host-approval-review-api-removal-slice.md)
325. [324-federated-runtime-lifecycle-control-slice.md](324-federated-runtime-lifecycle-control-slice.md)
326. [325-federated-lifecycle-process-smoke-slice.md](325-federated-lifecycle-process-smoke-slice.md)
327. [326-assignment-receipt-audit-trail-slice.md](326-assignment-receipt-audit-trail-slice.md)
328. [327-assignment-receipt-projection-slice.md](327-assignment-receipt-projection-slice.md)
329. [328-assignment-receipt-operator-surfaces-slice.md](328-assignment-receipt-operator-surfaces-slice.md)
330. [329-per-relay-transport-diagnostics-slice.md](329-per-relay-transport-diagnostics-slice.md)
331. [330-runner-owned-source-history-application-slice.md](330-runner-owned-source-history-application-slice.md)
332. [331-projected-source-history-ref-slice.md](331-projected-source-history-ref-slice.md)
333. [332-runner-owned-source-history-publication-slice.md](332-runner-owned-source-history-publication-slice.md)
334. [333-host-source-history-publication-removal-slice.md](333-host-source-history-publication-removal-slice.md)
335. [334-host-source-application-replay-removal-slice.md](334-host-source-application-replay-removal-slice.md)
336. [335-host-wiki-publication-removal-slice.md](335-host-wiki-publication-removal-slice.md)
337. [336-host-artifact-restore-promotion-removal-slice.md](336-host-artifact-restore-promotion-removal-slice.md)
338. [337-federated-session-cancellation-control-slice.md](337-federated-session-cancellation-control-slice.md)
339. [338-user-node-runtime-projection-retention-slice.md](338-user-node-runtime-projection-retention-slice.md)
340. [339-federated-source-history-publication-control-slice.md](339-federated-source-history-publication-control-slice.md)
341. [340-federated-source-history-replay-control-slice.md](340-federated-source-history-replay-control-slice.md)
342. [341-studio-source-history-replay-control-slice.md](341-studio-source-history-replay-control-slice.md)
343. [342-projected-source-history-replay-read-model-slice.md](342-projected-source-history-replay-read-model-slice.md)
344. [343-assignment-timeline-read-model-slice.md](343-assignment-timeline-read-model-slice.md)
345. [344-process-smoke-assignment-timeline-slice.md](344-process-smoke-assignment-timeline-slice.md)
346. [345-user-client-json-read-state-slice.md](345-user-client-json-read-state-slice.md)
347. [346-runner-owned-wiki-publication-control-slice.md](346-runner-owned-wiki-publication-control-slice.md)
348. [347-studio-wiki-publication-control-slice.md](347-studio-wiki-publication-control-slice.md)
349. [348-process-smoke-wiki-publication-control-slice.md](348-process-smoke-wiki-publication-control-slice.md)
350. [349-federated-runtime-filesystem-read-quarantine-slice.md](349-federated-runtime-filesystem-read-quarantine-slice.md)
351. [350-federated-artifact-backend-history-diff-slice.md](350-federated-artifact-backend-history-diff-slice.md)
352. [351-process-smoke-artifact-backend-history-diff-slice.md](351-process-smoke-artifact-backend-history-diff-slice.md)
353. [352-artifact-backend-cache-status-slice.md](352-artifact-backend-cache-status-slice.md)
354. [353-artifact-backend-cache-clear-slice.md](353-artifact-backend-cache-clear-slice.md)
355. [354-studio-artifact-cache-status-slice.md](354-studio-artifact-cache-status-slice.md)
356. [355-user-client-artifact-history-diff-slice.md](355-user-client-artifact-history-diff-slice.md)
357. [356-user-client-artifact-visibility-boundary-slice.md](356-user-client-artifact-visibility-boundary-slice.md)
358. [357-process-smoke-user-client-artifact-history-diff-slice.md](357-process-smoke-user-client-artifact-history-diff-slice.md)
359. [358-user-client-source-change-visibility-boundary-slice.md](358-user-client-source-change-visibility-boundary-slice.md)
360. [359-process-smoke-user-client-source-diff-slice.md](359-process-smoke-user-client-source-diff-slice.md)
361. [360-user-client-source-file-preview-slice.md](360-user-client-source-file-preview-slice.md)
362. [361-source-change-aware-memory-synthesis-slice.md](361-source-change-aware-memory-synthesis-slice.md)
363. [362-source-change-memory-carry-forward-slice.md](362-source-change-memory-carry-forward-slice.md)
364. [363-approval-message-lineage-slice.md](363-approval-message-lineage-slice.md)
365. [364-approval-approver-enforcement-slice.md](364-approval-approver-enforcement-slice.md)
366. [365-runner-a2a-signer-hardening-slice.md](365-runner-a2a-signer-hardening-slice.md)
367. [366-user-node-inbox-signer-audit-slice.md](366-user-node-inbox-signer-audit-slice.md)
368. [367-nip59-seal-signer-verification-slice.md](367-nip59-seal-signer-verification-slice.md)
369. [368-user-node-signer-surface-slice.md](368-user-node-signer-surface-slice.md)
370. [369-process-smoke-user-node-signer-audit-slice.md](369-process-smoke-user-node-signer-audit-slice.md)
371. [370-user-node-approval-doc-realignment-slice.md](370-user-node-approval-doc-realignment-slice.md)
372. [371-host-smoke-script-lint-coverage-slice.md](371-host-smoke-script-lint-coverage-slice.md)
373. [372-openai-compatible-fake-provider-fixture-slice.md](372-openai-compatible-fake-provider-fixture-slice.md)
374. [373-mounted-file-runtime-identity-slice.md](373-mounted-file-runtime-identity-slice.md)
375. [374-handoff-aware-working-context-memory-slice.md](374-handoff-aware-working-context-memory-slice.md)
376. [375-deterministic-openai-provider-dev-server-slice.md](375-deterministic-openai-provider-dev-server-slice.md)
377. [376-conversation-aware-working-context-memory-slice.md](376-conversation-aware-working-context-memory-slice.md)
378. [377-fake-provider-smoke-slice.md](377-fake-provider-smoke-slice.md)
379. [378-active-product-naming-guardrail-slice.md](378-active-product-naming-guardrail-slice.md)
380. [379-runner-owned-source-history-target-publication-slice.md](379-runner-owned-source-history-target-publication-slice.md)
381. [380-runner-owned-wiki-target-publication-slice.md](380-runner-owned-wiki-target-publication-slice.md)
382. [381-process-smoke-wiki-target-publication-slice.md](381-process-smoke-wiki-target-publication-slice.md)
383. [382-source-history-multi-target-publication-slice.md](382-source-history-multi-target-publication-slice.md)
384. [383-source-history-publication-presentation-slice.md](383-source-history-publication-presentation-slice.md)
385. [384-runner-owned-artifact-restore-control-slice.md](384-runner-owned-artifact-restore-control-slice.md)
386. [385-artifact-restore-operator-surfaces-slice.md](385-artifact-restore-operator-surfaces-slice.md)
387. [386-process-smoke-artifact-restore-slice.md](386-process-smoke-artifact-restore-slice.md)
388. [387-runner-owned-artifact-source-proposal-slice.md](387-runner-owned-artifact-source-proposal-slice.md)
389. [388-artifact-source-proposal-operator-surfaces-slice.md](388-artifact-source-proposal-operator-surfaces-slice.md)
390. [389-user-client-artifact-source-proposal-slice.md](389-user-client-artifact-source-proposal-slice.md)
391. [390-artifact-proposal-correlation-slice.md](390-artifact-proposal-correlation-slice.md)
392. [391-runtime-command-receipt-projection-slice.md](391-runtime-command-receipt-projection-slice.md)
393. [392-runner-owned-command-receipt-adoption-slice.md](392-runner-owned-command-receipt-adoption-slice.md)
394. [393-lifecycle-session-command-receipts-slice.md](393-lifecycle-session-command-receipts-slice.md)
395. [394-assignment-command-receipt-timeline-slice.md](394-assignment-command-receipt-timeline-slice.md)
396. [395-studio-command-receipt-operator-visibility-slice.md](395-studio-command-receipt-operator-visibility-slice.md)
397. [396-projection-empty-memory-read-model-slice.md](396-projection-empty-memory-read-model-slice.md)
398. [397-cli-projection-command-receipt-summary-slice.md](397-cli-projection-command-receipt-summary-slice.md)
399. [398-cli-command-receipt-list-slice.md](398-cli-command-receipt-list-slice.md)
400. [399-studio-assignment-timeline-drilldown-slice.md](399-studio-assignment-timeline-drilldown-slice.md)
401. [400-artifact-backend-cache-prune-policy-slice.md](400-artifact-backend-cache-prune-policy-slice.md)
402. [401-root-test-gate-reliability-slice.md](401-root-test-gate-reliability-slice.md)
403. [402-user-node-runtime-demo-command-slice.md](402-user-node-runtime-demo-command-slice.md)
404. [403-studio-runner-trust-controls-slice.md](403-studio-runner-trust-controls-slice.md)
405. [404-studio-runner-registry-detail-slice.md](404-studio-runner-registry-detail-slice.md)
406. [405-studio-assignment-operational-detail-slice.md](405-studio-assignment-operational-detail-slice.md)
407. [406-artifact-backend-cache-size-policy-slice.md](406-artifact-backend-cache-size-policy-slice.md)
408. [407-distributed-proof-kit-slice.md](407-distributed-proof-kit-slice.md)
409. [408-distributed-proof-verifier-slice.md](408-distributed-proof-verifier-slice.md)
410. [409-artifact-backend-cache-target-policy-slice.md](409-artifact-backend-cache-target-policy-slice.md)
411. [410-bootstrap-operator-security-status-slice.md](410-bootstrap-operator-security-status-slice.md)
412. [411-distributed-proof-tool-ci-smoke-slice.md](411-distributed-proof-tool-ci-smoke-slice.md)
413. [412-user-client-wiki-publication-slice.md](412-user-client-wiki-publication-slice.md)
414. [413-user-client-wiki-publication-process-smoke-slice.md](413-user-client-wiki-publication-process-smoke-slice.md)
415. [414-user-client-artifact-restore-slice.md](414-user-client-artifact-restore-slice.md)
416. [415-user-client-source-history-publication-slice.md](415-user-client-source-history-publication-slice.md)
417. [416-user-client-source-history-target-visibility-slice.md](416-user-client-source-history-target-visibility-slice.md)
418. [417-user-client-wiki-target-visibility-slice.md](417-user-client-wiki-target-visibility-slice.md)
419. [418-user-client-wiki-target-process-proof-slice.md](418-user-client-wiki-target-process-proof-slice.md)
420. [419-distributed-proof-runtime-state-verifier-slice.md](419-distributed-proof-runtime-state-verifier-slice.md)
421. [420-root-runner-test-pool-alignment-slice.md](420-root-runner-test-pool-alignment-slice.md)
422. [421-distributed-proof-user-client-distinctness-slice.md](421-distributed-proof-user-client-distinctness-slice.md)
423. [422-distributed-proof-runtime-kind-capability-slice.md](422-distributed-proof-runtime-kind-capability-slice.md)
424. [423-distributed-proof-agent-engine-capability-slice.md](423-distributed-proof-agent-engine-capability-slice.md)
425. [424-distributed-proof-agent-engine-selection-slice.md](424-distributed-proof-agent-engine-selection-slice.md)
426. [425-distributed-proof-kit-agent-engine-selection-slice.md](425-distributed-proof-kit-agent-engine-selection-slice.md)
427. [426-distributed-proof-kit-verifier-profile-slice.md](426-distributed-proof-kit-verifier-profile-slice.md)
428. [427-distributed-proof-profile-manifest-slice.md](427-distributed-proof-profile-manifest-slice.md)
429. [428-distributed-proof-artifact-evidence-verifier-slice.md](428-distributed-proof-artifact-evidence-verifier-slice.md)
430. [429-distributed-proof-relay-health-verifier-slice.md](429-distributed-proof-relay-health-verifier-slice.md)
431. [430-distributed-proof-git-backend-health-verifier-slice.md](430-distributed-proof-git-backend-health-verifier-slice.md)
432. [431-bootstrap-viewer-operator-authorization-slice.md](431-bootstrap-viewer-operator-authorization-slice.md)
433. [432-operator-audit-event-presentation-slice.md](432-operator-audit-event-presentation-slice.md)
434. [433-distributed-proof-profile-contract-slice.md](433-distributed-proof-profile-contract-slice.md)
435. [434-distributed-proof-kit-relay-health-profile-slice.md](434-distributed-proof-kit-relay-health-profile-slice.md)
436. [435-distributed-proof-kit-post-work-verifier-slice.md](435-distributed-proof-kit-post-work-verifier-slice.md)
437. [436-root-test-gate-single-fork-worker-slice.md](436-root-test-gate-single-fork-worker-slice.md)
438. [437-distributed-proof-verifier-assignment-profile-slice.md](437-distributed-proof-verifier-assignment-profile-slice.md)
439. [438-studio-assignment-related-navigation-slice.md](438-studio-assignment-related-navigation-slice.md)
440. [439-distributed-proof-profile-conversation-health-slice.md](439-distributed-proof-profile-conversation-health-slice.md)
441. [440-distributed-proof-published-git-evidence-slice.md](440-distributed-proof-published-git-evidence-slice.md)
442. [441-distributed-proof-published-git-ref-check-slice.md](441-distributed-proof-published-git-ref-check-slice.md)
443. [442-bootstrap-multi-operator-auth-slice.md](442-bootstrap-multi-operator-auth-slice.md)
444. [443-host-event-server-filtering-slice.md](443-host-event-server-filtering-slice.md)
445. [444-hashed-bootstrap-operator-token-slice.md](444-hashed-bootstrap-operator-token-slice.md)
446. [445-bootstrap-operator-permissions-slice.md](445-bootstrap-operator-permissions-slice.md)
447. [446-runner-test-gate-fork-stability-slice.md](446-runner-test-gate-fork-stability-slice.md)
448. [447-runner-owned-wiki-page-upsert-slice.md](447-runner-owned-wiki-page-upsert-slice.md)
449. [448-user-client-wiki-page-upsert-slice.md](448-user-client-wiki-page-upsert-slice.md)
450. [449-studio-wiki-page-upsert-slice.md](449-studio-wiki-page-upsert-slice.md)
451. [450-source-history-reconcile-control-slice.md](450-source-history-reconcile-control-slice.md)
452. [451-user-client-source-history-reconcile-slice.md](451-user-client-source-history-reconcile-slice.md)
453. [452-human-interface-runtime-basic-auth-slice.md](452-human-interface-runtime-basic-auth-slice.md)
454. [453-wiki-page-optimistic-concurrency-slice.md](453-wiki-page-optimistic-concurrency-slice.md)
455. [454-wiki-page-patch-mode-slice.md](454-wiki-page-patch-mode-slice.md)
456. [455-user-client-wiki-page-patch-process-smoke-slice.md](455-user-client-wiki-page-patch-process-smoke-slice.md)
457. [456-opencode-session-continuity-slice.md](456-opencode-session-continuity-slice.md)
458. [457-opencode-session-continuity-process-smoke-slice.md](457-opencode-session-continuity-process-smoke-slice.md)
459. [458-host-cors-studio-dev-slice.md](458-host-cors-studio-dev-slice.md)
460. [459-opencode-permission-mode-slice.md](459-opencode-permission-mode-slice.md)
461. [460-agent-runtime-permission-mode-visibility-slice.md](460-agent-runtime-permission-mode-visibility-slice.md)
462. [461-studio-user-launch-boundary-slice.md](461-studio-user-launch-boundary-slice.md)
463. [462-user-node-inbox-outbox-projection-audit.md](462-user-node-inbox-outbox-projection-audit.md)
464. [463-opencode-permission-bridge-slice.md](463-opencode-permission-bridge-slice.md)
465. [464-fake-opencode-server-harness-slice.md](464-fake-opencode-server-harness-slice.md)
466. [465-cli-agent-engine-profile-upsert-slice.md](465-cli-agent-engine-profile-upsert-slice.md)

## Role of this corpus

These documents are intended to serve as:

- the project's architectural baseline;
- the source of truth for early deployment scoping decisions;
- the initial specification set for future implementation work;
- the maintenance baseline that keeps the repository coherent across long-running design and implementation sessions.
