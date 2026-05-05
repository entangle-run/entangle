import {
  access,
  chmod,
  cp,
  lstat,
  mkdir,
  open,
  readFile,
  readlink,
  readdir,
  rename,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";
import {
  activeGraphRevisionRecordSchema,
  artifactRecordSchema,
  approvalLifecycleStateSchema,
  approvalRecordSchema,
  approvalStatusCountsSchema,
  conversationLifecycleStateSchema,
  conversationRecordSchema,
  conversationStatusCountsSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  graphRevisionRecordSchema,
  hostEventAuditBundleResponseSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostSessionConsistencyFindingSchema,
  hostSessionSummarySchema,
  currentStateLayoutVersion,
  entangleNostrRumorKind,
  entangleSignedEnvelopeSchema,
  type EntangleProtocolDomain,
  type EntangleSignedEnvelope,
  hostProjectionSnapshotSchema,
  type HostProjectionSnapshot,
  assignmentReceiptProjectionRecordSchema,
  type AssignmentReceiptProjectionRecord,
  runtimeCommandReceiptProjectionRecordSchema,
  observedApprovalActivityRecordSchema,
  observedArtifactActivityRecordSchema,
  observedConversationActivityRecordSchema,
  observedRunnerTurnActivityRecordSchema,
  observedSessionActivityRecordSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  type ActiveGraphRevisionRecord,
  type EffectiveNodeBinding,
  type HostEventListQuery,
  type HostEventListResponse,
  type HostEventAuditBundleResponse,
  type HostEventIntegrityResponse,
  type HostEventIntegritySignedReportResponse,
  type HostEventRecord,
  hostEventIntegrityResponseSchema,
  hostEventIntegritySignedReportResponseSchema,
  hostAuthorityExportResponseSchema,
  type HostAuthorityExportResponse,
  hostAuthorityImportRequestSchema,
  hostAuthorityImportResponseSchema,
  type HostAuthorityImportResponse,
  type HostAuthorityInspectionResponse,
  hostAuthorityInspectionResponseSchema,
  type HostAuthorityRecord,
  hostAuthorityRecordSchema,
  type HostTransportPlaneHealth,
  type HostTransportPlaneStatus,
  type HostTransportRelayHealth,
  gitRepositoryProvisioningRecordSchema,
  type AgentPackageManifest,
  agentPackageManifestSchema,
  buildValidationReport,
  type CatalogInspectionResponse,
  type AgentEngineProfile,
  type AgentEngineProfileUpsertRequest,
  type DeploymentResourceCatalog,
  deploymentResourceCatalogSchema,
  type EffectiveRuntimeContext,
  effectiveRuntimeContextSchema,
  effectiveNodeBindingSchema,
  externalPrincipalInspectionResponseSchema,
  externalPrincipalDeletionResponseSchema,
  externalPrincipalListResponseSchema,
  type ExternalPrincipalDeletionResponse,
  type ExternalPrincipalInspectionResponse,
  type ExternalPrincipalListResponse,
  type ExternalPrincipalRecord,
  externalPrincipalRecordSchema,
  type Edge,
  type EdgeCreateRequest,
  type EdgeDeletionResponse,
  type EdgeListResponse,
  type EdgeMutationResponse,
  type EdgeReplacementRequest,
  type GraphInspectionResponse,
  type GraphRevisionInspectionResponse,
  type GraphRevisionListResponse,
  type GraphSpec,
  type GraphMutationResponse,
  graphSpecSchema,
  defaultNodeSourceMutationPolicy,
  intersectIdentifiers,
  type NodeBinding,
  nodeBindingSchema,
  type NodeCreateRequest,
  type NodeDeletionResponse,
  type NodeInspectionResponse,
  type NodeListResponse,
  type NodeMutationResponse,
  type NodeReplacementRequest,
  packageSourceRecordSchema,
  type PackageSourceAdmissionRequest,
  type PackageSourceDeletionResponse,
  type PackageSourceInspectionResponse,
  type PackageSourceRecord,
  type PackageSourceListResponse,
  resolveEffectiveAgentEngineProfile,
  resolveEffectiveAgentRuntime,
  resolveEffectiveGitDefaultNamespace,
  resolveEffectiveExternalPrincipals,
  resolveEffectiveExternalPrincipalRefs,
  resolveEffectiveGitServices,
  resolveEffectivePrimaryGitPrincipalRef,
  resolveEffectiveModelEndpointProfile,
  resolveEffectiveModelEndpointProfileRef,
  resolveEffectivePrimaryGitServiceRef,
  resolveGitPrincipalBindingForService,
  resolveGitRepositoryTargetForArtifactLocator,
  resolvePrimaryGitRepositoryTarget,
  resolveEffectivePrimaryRelayProfileRef,
  resolveEffectiveRelayProfiles,
  resolveEffectiveRelayProfileRefs,
  type GitRepositoryProvisioningRecord,
  type GitRepositoryTarget,
  type RuntimeDesiredState,
  nostrSecretKeySchema,
  assignmentAcceptedObservationPayloadSchema,
  assignmentReceiptPayloadSchema,
  assignmentRejectedObservationPayloadSchema,
  runtimeCommandReceiptPayloadSchema,
  type RuntimeCommandReceiptProjectionRecord,
  approvalUpdatedObservationPayloadSchema,
  artifactRefObservationPayloadSchema,
  artifactRefProjectionRecordSchema,
  type ArtifactRefProjectionRecord,
  conversationUpdatedObservationPayloadSchema,
  runtimeProjectionRecordSchema,
  type RuntimeProjectionRecord,
  runtimeIdentityContextSchema,
  runtimeAssignmentInspectionResponseSchema,
  type RuntimeAssignmentInspectionResponse,
  runtimeAssignmentListResponseSchema,
  type RuntimeAssignmentListResponse,
  runtimeAssignmentTimelineResponseSchema,
  type RuntimeAssignmentTimelineEntry,
  type RuntimeAssignmentTimelineResponse,
  runtimeAssignmentOfferRequestSchema,
  runtimeAssignmentOfferResponseSchema,
  type RuntimeAssignmentOfferResponse,
  runtimeAssignmentRecordSchema,
  type RuntimeAssignmentRecord,
  runtimeAssignmentRevokeRequestSchema,
  type RuntimeAssignmentRevokeRequest,
  runtimeAssignmentRevokeResponseSchema,
  type RuntimeAssignmentRevokeResponse,
  runtimeStatusObservationPayloadSchema,
  runnerJoinConfigSchema,
  type RuntimeNodeKind,
  sourceChangeRefObservationPayloadSchema,
  sourceChangeRefProjectionRecordSchema,
  type SourceChangeRefProjectionRecord,
  sourceHistoryRefObservationPayloadSchema,
  sourceHistoryReplayedObservationPayloadSchema,
  sourceHistoryRefProjectionRecordSchema,
  type SourceHistoryRefProjectionRecord,
  sourceHistoryReplayProjectionRecordSchema,
  type SourceHistoryReplayProjectionRecord,
  sessionUpdatedObservationPayloadSchema,
  turnUpdatedObservationPayloadSchema,
  entangleA2AApprovalRequestMetadataSchema,
  entangleA2AApprovalResponseMetadataSchema,
  entangleA2ASourceChangeReviewMetadataSchema,
  type ParsedUserNodeMessagePublishRequest,
  type UserNodeConversationReadRecord,
  type UserNodeConversationReadResponse,
  type UserNodeConversationResponse,
  type UserNodeInboundMessageRecordRequest,
  userNodeConversationReadRecordSchema,
  userNodeConversationReadResponseSchema,
  userNodeConversationResponseSchema,
  userNodeMessageInspectionResponseSchema,
  userNodeIdentityInspectionResponseSchema,
  type UserNodeIdentityInspectionResponse,
  userNodeIdentityListResponseSchema,
  type UserNodeIdentityListResponse,
  userNodeIdentityRecordSchema,
  userNodeMessageRecordSchema,
  userConversationProjectionRecordSchema,
  type UserConversationProjectionRecord,
  type UserNodeIdentityRecord,
  type UserNodeMessagePublishResponse,
  type UserNodeMessageInspectionResponse,
  type UserNodeMessageRecord,
  wikiRefObservationPayloadSchema,
  wikiRefProjectionRecordSchema,
  type WikiRefProjectionRecord,
  secretRefSchema,
  sessionCancellationRequestRecordSchema,
  sessionCancellationMutationRequestSchema,
  sessionInspectionResponseSchema,
  sessionListResponseSchema,
  sessionRecordSchema,
  sourceChangeCandidateRecordSchema,
  sourceHistoryRecordSchema,
  type SourceHistoryReplayRecord,
  runtimeAgentRuntimeInspectionSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  type RuntimeIdentityRecord,
  runtimeIdentityRecordSchema,
  runtimeArtifactListResponseSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeBootstrapDirectorySnapshotSchema,
  runtimeInspectionResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryRecordSchema,
  runtimeRecoveryControllerRecordSchema,
  runtimeRecoveryPolicyRecordSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryReplayInspectionResponseSchema,
  runtimeSourceHistoryReplayListResponseSchema,
  type RuntimeRecoveryControllerRecord,
  type RuntimeRecoveryPolicy,
  type RuntimeRecoveryPolicyRecord,
  type RuntimeAgentRuntimeInspection,
  type RuntimeInspectionResponse,
  type RuntimeIdentitySecretResponse,
  type RuntimeWorkspaceHealth,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryResponseSchema,
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeIntentRecordSchema,
  type RuntimeApprovalInspectionResponse,
  type RuntimeApprovalListResponse,
  type RuntimeArtifactInspectionResponse,
  type RuntimeArtifactListResponse,
  type RuntimeBootstrapBundleResponse,
  type RuntimeBootstrapDirectorySnapshot,
  type RuntimeArtifactDiffResponse,
  type RuntimeArtifactHistoryResponse,
  type RuntimeArtifactPreviewResponse,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  type RuntimeMemoryInspectionResponse,
  type RuntimeMemoryPageInspectionResponse,
  type RuntimeMemoryPageKind,
  type RuntimeMemoryPageSummary,
  type RuntimeSourceChangeCandidateDiffResponse,
  type RuntimeSourceChangeCandidateFilePreviewResponse,
  type RuntimeSourceChangeCandidateInspectionResponse,
  type RuntimeSourceChangeCandidateListResponse,
  type RuntimeSourceHistoryInspectionResponse,
  type RuntimeSourceHistoryListResponse,
  type RuntimeSourceHistoryReplayInspectionResponse,
  type RuntimeSourceHistoryReplayListResponse,
  type RuntimeTurnInspectionResponse,
  type RuntimeTurnListResponse,
  stateLayoutInspectionSchema,
  stateLayoutRecordSchema,
  type StateLayoutInspection,
  type StateLayoutRecord,
  minimumSupportedStateLayoutVersion,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runtimeListResponseSchema,
  runnerHeartbeatIngestRequestSchema,
  type RunnerHeartbeatSnapshot,
  runnerHeartbeatSnapshotSchema,
  runnerHelloIngestRequestSchema,
  type RunnerLivenessState,
  type RunnerRegistryEntry,
  runnerRegistryEntrySchema,
  runnerRegistryInspectionResponseSchema,
  type RunnerRegistryInspectionResponse,
  runnerRegistryListResponseSchema,
  type RunnerRegistryListResponse,
  type RunnerRegistrationRecord,
  runnerRegistrationRecordSchema,
  runnerRevokeMutationRequestSchema,
  type RunnerRevokeMutationRequest,
  runnerRevokeMutationResponseSchema,
  type RunnerRevokeMutationResponse,
  runnerTrustMutationRequestSchema,
  type RunnerTrustMutationRequest,
  runnerTrustMutationResponseSchema,
  type RunnerTrustMutationResponse,
  runnerTurnRecordSchema,
  type ApprovalRecord,
  type ApprovalStatusCounts,
  type ArtifactRecord,
  type ConversationRecord,
  type ConversationStatusCounts,
  type HostSessionConsistencyFinding,
  type HostSessionConsistencyFindingCode,
  type HostSessionSummary,
  type SessionInspectionResponse,
  type SessionCancellationMutationRequest,
  type SessionCancellationRequestRecord,
  type SessionListResponse,
  type SessionRecord,
  type RunnerTurnRecord,
  type SourceChangeCandidateRecord,
  type SourceHistoryRecord,
  type RuntimeListResponse,
  type RuntimeRecoveryInspectionResponse,
  type RuntimeRecoveryRecord,
  type RuntimeObservedState,
  type RuntimeIntentRecord,
  type ObservedRunnerTurnActivityRecord,
  type ObservedApprovalActivityRecord,
  type ObservedArtifactActivityRecord,
  type ObservedConversationActivityRecord,
  type ObservedSessionActivityRecord,
  type ObservedRuntimeRecord,
  observedRuntimeRecordSchema,
  reconciliationSnapshotSchema,
  type ReconciliationSnapshot,
  type ValidationReport,
} from "@entangle/types";
import { buildHostOperatorSecurityStatusFromEnv } from "./operator-auth.js";
import {
  validateDeploymentResourceCatalogDocument,
  validateGraphDocument,
  validatePackageDirectory
} from "@entangle/validator";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  type EventTemplate,
  type NostrEvent
} from "nostr-tools";
import { GiteaApiClient } from "./gitea-api-client.js";
import {
  createRuntimeBackend,
  type RuntimeBackend
} from "./runtime-backend.js";

const hostStateRoot = path.join(
  path.resolve(process.env.ENTANGLE_HOME ?? path.resolve(process.cwd(), ".entangle")),
  "host"
);
const secretStateRoot = path.resolve(
  process.env.ENTANGLE_SECRETS_HOME ??
    path.join(path.dirname(path.dirname(hostStateRoot)), ".entangle-secrets")
);

const desiredRoot = path.join(hostStateRoot, "desired");
const observedRoot = path.join(hostStateRoot, "observed");
const tracesRoot = path.join(hostStateRoot, "traces");
const importsRoot = path.join(hostStateRoot, "imports");
const workspacesRoot = path.join(hostStateRoot, "workspaces");
const cacheRoot = path.join(hostStateRoot, "cache");
const packageStoreRoot = path.join(importsRoot, "packages", "store");
const reservedPackageSourceIds = new Set(["store"]);

const stateLayoutRecordPath = path.join(hostStateRoot, "state-layout.json");
const catalogPath = path.join(desiredRoot, "catalog.json");
const externalPrincipalsRoot = path.join(desiredRoot, "external-principals");
const hostAuthorityRoot = path.join(desiredRoot, "authority");
const hostAuthorityRecordPath = path.join(
  hostAuthorityRoot,
  "host-authority.json"
);
const runnerRegistryRoot = path.join(desiredRoot, "runner-registry");
const runtimeAssignmentsRoot = path.join(desiredRoot, "runtime-assignments");
const userNodeIdentitiesRoot = path.join(desiredRoot, "user-node-identities");
const packageSourcesRoot = path.join(desiredRoot, "package-sources");
const graphRoot = path.join(desiredRoot, "graph");
const currentGraphPath = path.join(graphRoot, "current.json");
const activeGraphRevisionPath = path.join(graphRoot, "active-revision.json");
const graphRevisionsRoot = path.join(graphRoot, "revisions");
const nodeBindingsRoot = path.join(desiredRoot, "node-bindings");
const runtimeIntentsRoot = path.join(desiredRoot, "runtime-intents");
const observedRuntimesRoot = path.join(observedRoot, "runtimes");
const observedArtifactRefsRoot = path.join(observedRoot, "artifact-refs");
const observedSourceChangeRefsRoot = path.join(
  observedRoot,
  "source-change-refs"
);
const observedSourceHistoryRefsRoot = path.join(
  observedRoot,
  "source-history-refs"
);
const observedSourceHistoryReplaysRoot = path.join(
  observedRoot,
  "source-history-replays"
);
const observedWikiRefsRoot = path.join(observedRoot, "wiki-refs");
const runtimeRecoveryPoliciesRoot = path.join(
  desiredRoot,
  "runtime-recovery-policies"
);
const runtimeRecoveryHistoryRoot = path.join(observedRoot, "runtime-recovery");
const runtimeRecoveryControllersRoot = path.join(
  observedRoot,
  "runtime-recovery-controllers"
);
const gitRepositoryTargetsRoot = path.join(observedRoot, "git-repository-targets");
const observedApprovalActivityRoot = path.join(observedRoot, "approval-activity");
const observedArtifactActivityRoot = path.join(observedRoot, "artifact-activity");
const observedConversationActivityRoot = path.join(
  observedRoot,
  "conversation-activity"
);
const observedUserNodeMessagesRoot = path.join(
  observedRoot,
  "user-node-messages"
);
const observedUserNodeConversationReadsRoot = path.join(
  observedRoot,
  "user-node-conversation-reads"
);
const observedRunnerTurnActivityRoot = path.join(
  observedRoot,
  "runner-turn-activity"
);
const observedRunnerHeartbeatRoot = path.join(
  observedRoot,
  "runner-heartbeats"
);
const observedSessionActivityRoot = path.join(observedRoot, "session-activity");
const reconciliationRoot = path.join(observedRoot, "reconciliation");
const latestReconciliationPath = path.join(reconciliationRoot, "latest.json");
const reconciliationHistoryRoot = path.join(reconciliationRoot, "history");
const controlPlaneTraceRoot = path.join(tracesRoot, "control-plane");
const runtimeIdentitiesRoot = path.join(secretStateRoot, "runtime-identities");
const secretRefsRoot = path.join(secretStateRoot, "refs");
let runtimeStatusObservationQueue: Promise<void> = Promise.resolve();
const defaultHostAuthorityKeyRef = "secret://host-authority/main";
const runtimeContextFileName = "effective-runtime-context.json";
const runnerJoinConfigFileName = "runner-join.json";
const artifactPreviewMaxBytes = 16 * 1024;
const artifactDiffMaxBytes = 64 * 1024;
const artifactGitResolverCacheRoot = path.join(
  cacheRoot,
  "artifact-git-repositories"
);
const hostGitAskPassRoot = path.join(cacheRoot, "git-askpass");
const runnerStaleAfterMs = 60_000;
const runnerOfflineAfterMs = 300_000;
const memoryPreviewMaxBytes = 16 * 1024;
const sourceCandidateDiffMaxBytes = 64 * 1024;
const sourceCandidateFilePreviewMaxBytes = 16 * 1024;
const focusedMemoryRegisterPaths = new Set([
  "wiki/summaries/working-context.md",
  "wiki/summaries/decisions.md",
  "wiki/summaries/stable-facts.md",
  "wiki/summaries/open-questions.md",
  "wiki/summaries/next-actions.md",
  "wiki/summaries/resolutions.md",
  "wiki/summaries/recent-work.md"
]);
const packageStoreMetadataFileName = ".package-store.json";
const gunzipAsync = promisify(gunzip);

type LocalPathPackageSourceRecord = Extract<
  PackageSourceRecord,
  { sourceKind: "local_path" }
>;

type RuntimeResolution = {
  binding: EffectiveNodeBinding;
  context: EffectiveRuntimeContext | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  inspection: RuntimeInspectionInternal;
};

type RuntimeInspectionInternal = RuntimeInspectionResponse & {
  contextPath?: string;
};

let runtimeBackendOverride:
  | (() => RuntimeBackend)
  | undefined;
let runtimeBackendSingleton: RuntimeBackend | undefined;
const hostEventSubscribers = new Set<(event: HostEventRecord) => void>();
let hostFederatedControlObserveTransportHealth:
  | HostTransportPlaneHealth
  | undefined;

type CurrentGraphRuntimeSynchronizationResult = {
  nodes: NodeInspectionResponse[];
  runtimes: RuntimeInspectionInternal[];
  snapshot: ReturnType<typeof reconciliationSnapshotSchema.parse>;
};

let currentGraphRuntimeSynchronizationPromise:
  | Promise<CurrentGraphRuntimeSynchronizationResult>
  | undefined;

function getRuntimeBackend(): RuntimeBackend {
  if (!runtimeBackendSingleton) {
    runtimeBackendSingleton = runtimeBackendOverride
      ? runtimeBackendOverride()
      : createRuntimeBackend(hostStateRoot, secretStateRoot);
  }

  return runtimeBackendSingleton;
}

export function configureRuntimeBackendForProcess(
  factory: (() => RuntimeBackend) | undefined
): void {
  runtimeBackendOverride = factory;
  runtimeBackendSingleton = undefined;
}

function buildHostTransportRelayHealth(input: {
  lastFailureAt?: string | undefined;
  lastFailureMessage?: string | undefined;
  relayUrls: string[];
  status: HostTransportPlaneStatus;
  subscribedAt?: string | undefined;
  updatedAt: string;
}): HostTransportRelayHealth[] {
  const relayStatus: HostTransportRelayHealth["status"] =
    input.status === "subscribed"
      ? "subscribed"
      : input.status === "degraded"
        ? "degraded"
        : input.status === "disabled"
          ? "disabled"
          : input.status === "stopped"
            ? "stopped"
            : "configured";

  return input.relayUrls.map((relayUrl) => ({
    ...(input.lastFailureAt && relayStatus === "degraded"
      ? { lastFailureAt: input.lastFailureAt }
      : {}),
    ...(input.lastFailureMessage && relayStatus === "degraded"
      ? { lastFailureMessage: input.lastFailureMessage }
      : {}),
    relayUrl,
    status: relayStatus,
    ...(input.subscribedAt && relayStatus === "subscribed"
      ? { subscribedAt: input.subscribedAt }
      : {}),
    updatedAt: input.updatedAt
  }));
}

export function recordHostFederatedControlObserveTransportHealth(input: {
  lastFailureAt?: string;
  lastFailureMessage?: string;
  relayUrls?: string[];
  status: HostTransportPlaneStatus;
  subscribedAt?: string;
  updatedAt?: string;
}): HostTransportPlaneHealth {
  const relayUrls = [...new Set(input.relayUrls ?? [])].sort((left, right) =>
    left.localeCompare(right)
  );
  const updatedAt = input.updatedAt ?? nowIsoString();
  const health: HostTransportPlaneHealth = {
    configuredRelayCount: relayUrls.length,
    ...(input.lastFailureAt ? { lastFailureAt: input.lastFailureAt } : {}),
    ...(input.lastFailureMessage
      ? { lastFailureMessage: input.lastFailureMessage }
      : {}),
    relayUrls,
    relays: buildHostTransportRelayHealth({
      lastFailureAt: input.lastFailureAt,
      lastFailureMessage: input.lastFailureMessage,
      relayUrls,
      status: input.status,
      subscribedAt: input.subscribedAt,
      updatedAt
    }),
    status: input.status,
    ...(input.subscribedAt ? { subscribedAt: input.subscribedAt } : {}),
    updatedAt
  };

  hostFederatedControlObserveTransportHealth = health;

  return health;
}

export function clearHostFederatedControlObserveTransportHealth(): void {
  hostFederatedControlObserveTransportHealth = undefined;
}

type CatalogUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "catalog.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type PackageSourceAdmittedEventInput = Omit<
  Extract<HostEventRecord, { type: "package_source.admitted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type PackageSourceDeletedEventInput = Omit<
  Extract<HostEventRecord, { type: "package_source.deleted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ExternalPrincipalUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "external_principal.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ExternalPrincipalDeletedEventInput = Omit<
  Extract<HostEventRecord, { type: "external_principal.deleted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type GraphRevisionAppliedEventInput = Omit<
  Extract<HostEventRecord, { type: "graph.revision.applied" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type NodeBindingUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "node.binding.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type EdgeUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "edge.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeDesiredStateChangedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.desired_state.changed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRestartRequestedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.restart.requested" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryPolicyUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery_policy.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryAttemptedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.attempted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryExhaustedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.exhausted" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryRecordedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery.recorded" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeRecoveryControllerUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.recovery_controller.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeObservedStateChangedEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.observed_state.changed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeAssignmentReceiptEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.assignment.receipt" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RuntimeCommandReceiptEventInput = Omit<
  Extract<HostEventRecord, { type: "runtime.command.receipt" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type SourceHistoryReplayedEventInput = Omit<
  Extract<HostEventRecord, { type: "source_history.replayed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type SessionUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "session.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type SessionCancellationRequestedEventInput = Omit<
  Extract<HostEventRecord, { type: "session.cancellation.requested" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type RunnerTurnUpdatedEventInput = Omit<
  Extract<HostEventRecord, { type: "runner.turn.updated" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ConversationTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "conversation.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ApprovalTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "approval.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type ArtifactTraceEventInput = Omit<
  Extract<HostEventRecord, { type: "artifact.trace.event" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type HostReconciliationCompletedEventInput = Omit<
  Extract<HostEventRecord, { type: "host.reconciliation.completed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;
type HostOperatorRequestCompletedEventInput = Omit<
  Extract<HostEventRecord, { type: "host.operator_request.completed" }>,
  "eventId" | "schemaVersion" | "timestamp"
>;

type ManagedNodeMutationConflict =
  | {
      kind: "graph_missing";
      message: string;
    }
  | {
      kind: "node_exists";
      nodeId: string;
    }
  | {
      kind: "node_has_edges";
      edgeIds: string[];
      nodeId: string;
    }
  | {
      kind: "node_not_found";
      nodeId: string;
    };

type ManagedNodeMutationResult<T> =
  | {
      ok: true;
      response: T;
    }
  | {
      conflict: ManagedNodeMutationConflict;
      ok: false;
    };

type EdgeMutationConflict =
  | {
      kind: "graph_missing";
      message: string;
    }
  | {
      edgeId: string;
      kind: "edge_exists";
    }
  | {
      edgeId: string;
      kind: "edge_not_found";
    };

type EdgeMutationResult<T> =
  | {
      ok: true;
      response: T;
    }
  | {
      conflict: EdgeMutationConflict;
      ok: false;
    };

type PackageSourceDeletionConflict =
  | {
      kind: "package_source_in_use";
      nodeIds: string[];
      packageSourceId: string;
    }
  | {
      kind: "package_source_not_found";
      packageSourceId: string;
    };

type PackageSourceDeletionResult =
  | {
      ok: true;
      response: PackageSourceDeletionResponse;
    }
  | {
      conflict: PackageSourceDeletionConflict;
      ok: false;
    };

type ExternalPrincipalDeletionConflict =
  | {
      kind: "external_principal_in_use";
      nodeIds: string[];
      principalId: string;
    }
  | {
      kind: "external_principal_not_found";
      principalId: string;
    };

type ExternalPrincipalDeletionResult =
  | {
      ok: true;
      response: ExternalPrincipalDeletionResponse;
    }
  | {
      conflict: ExternalPrincipalDeletionConflict;
      ok: false;
    };

function nowIsoString(): string {
  return new Date().toISOString();
}

function dateStamp(): string {
  return nowIsoString().slice(0, 10);
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Unknown host runtime error.";
}

function sanitizeIdentifier(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized.length > 0 ? normalized : `id-${randomUUID()}`;
}

async function ensureDirectory(directoryPath: string): Promise<void> {
  await mkdir(directoryPath, { recursive: true });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function encodeJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeTextFileAtomically(
  filePath: string,
  contents: string
): Promise<void> {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`
  );

  await ensureDirectory(directory);

  try {
    await writeFile(temporaryPath, contents, "utf8");
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFileAtomically(filePath, encodeJsonFile(value));
}

async function writeSecretFile(filePath: string, value: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, value, {
    encoding: "utf8",
    mode: 0o600
  });
}

async function writeJsonFileIfChanged(
  filePath: string,
  value: unknown
): Promise<boolean> {
  const encoded = encodeJsonFile(value);

  if ((await pathExists(filePath)) && (await readFile(filePath, "utf8")) === encoded) {
    return false;
  }

  await writeTextFileAtomically(filePath, encoded);
  return true;
}

function buildStateLayoutRecord(timestamp: string) {
  return stateLayoutRecordSchema.parse({
    createdAt: timestamp,
    layoutVersion: currentStateLayoutVersion,
    product: "entangle",
    schemaVersion: "1",
    updatedAt: timestamp
  });
}

function classifyStateLayoutVersion(
  layoutVersion: number
): StateLayoutInspection["status"] {
  if (layoutVersion > currentStateLayoutVersion) {
    return "unsupported_future";
  }

  if (layoutVersion < minimumSupportedStateLayoutVersion) {
    return "unsupported_legacy";
  }

  if (layoutVersion < currentStateLayoutVersion) {
    return "upgrade_available";
  }

  return "current";
}

function describeStateLayoutStatus(
  inspection: StateLayoutInspection
): string | undefined {
  if (inspection.status === "current") {
    return undefined;
  }

  if (inspection.status === "missing") {
    return "Entangle state layout record is missing.";
  }

  if (inspection.status === "upgrade_available") {
    return `Entangle state layout ${inspection.recordedLayoutVersion} can be upgraded to ${inspection.currentLayoutVersion}.`;
  }

  if (inspection.status === "unsupported_legacy") {
    return `Entangle state layout ${inspection.recordedLayoutVersion} is older than the minimum supported layout ${inspection.minimumSupportedLayoutVersion}.`;
  }

  if (inspection.status === "unsupported_future") {
    return `Entangle state layout ${inspection.recordedLayoutVersion} is newer than the supported layout ${inspection.currentLayoutVersion}.`;
  }

  return inspection.detail ?? "Entangle state layout record could not be read.";
}

async function inspectStateLayout(input: {
  materializeIfMissing: boolean;
}): Promise<StateLayoutInspection> {
  const checkedAt = nowIsoString();

  if (!(await pathExists(stateLayoutRecordPath))) {
    if (input.materializeIfMissing) {
      const record = buildStateLayoutRecord(checkedAt);
      await writeJsonFile(stateLayoutRecordPath, record);

      return stateLayoutInspectionSchema.parse({
        checkedAt,
        currentLayoutVersion: currentStateLayoutVersion,
        minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
        recordedAt: record.updatedAt,
        recordedLayoutVersion: record.layoutVersion,
        status: "current"
      });
    }

    return stateLayoutInspectionSchema.parse({
      checkedAt,
      currentLayoutVersion: currentStateLayoutVersion,
      detail: "Entangle state layout record is missing.",
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      status: "missing"
    });
  }

  let record: StateLayoutRecord;
  try {
    record = stateLayoutRecordSchema.parse(
      await readJsonFile(stateLayoutRecordPath)
    );
  } catch (error) {
    return stateLayoutInspectionSchema.parse({
      checkedAt,
      currentLayoutVersion: currentStateLayoutVersion,
      detail: `Entangle state layout record is unreadable: ${formatUnknownError(error)}`,
      minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
      status: "unreadable"
    });
  }

  const status = classifyStateLayoutVersion(record.layoutVersion);
  const inspection = stateLayoutInspectionSchema.parse({
    checkedAt,
    currentLayoutVersion: currentStateLayoutVersion,
    minimumSupportedLayoutVersion: minimumSupportedStateLayoutVersion,
    recordedAt: record.updatedAt,
    recordedLayoutVersion: record.layoutVersion,
    status
  });
  const detail = describeStateLayoutStatus(inspection);

  return stateLayoutInspectionSchema.parse({
    ...inspection,
    ...(detail ? { detail } : {})
  });
}

async function ensureStateLayoutCompatible(): Promise<void> {
  const inspection = await inspectStateLayout({
    materializeIfMissing: true
  });

  if (
    inspection.status === "unsupported_future" ||
    inspection.status === "unsupported_legacy" ||
    inspection.status === "unreadable"
  ) {
    throw new Error(
      describeStateLayoutStatus(inspection) ??
        "Entangle state layout is not compatible with this Entangle host."
    );
  }
}

function buildDefaultCatalog(): DeploymentResourceCatalog {
  const relayId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_RELAY_ID ?? "preview-relay"
  );
  const gitServiceId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_GIT_SERVICE_ID ?? "gitea"
  );
  const catalogId = sanitizeIdentifier(
    process.env.ENTANGLE_CATALOG_ID ?? "default-catalog"
  );
  const relayReadUrl =
    process.env.ENTANGLE_DEFAULT_RELAY_READ_URL ?? "ws://strfry:7777";
  const relayWriteUrl =
    process.env.ENTANGLE_DEFAULT_RELAY_WRITE_URL ?? relayReadUrl;
  const gitBaseUrl =
    process.env.ENTANGLE_DEFAULT_GIT_SERVICE_BASE_URL ?? "http://gitea:3000";
  const gitTransport =
    process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT === "file"
      ? "file"
      : process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT === "https"
        ? "https"
        : "ssh";
  const gitRemoteBase =
    process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE ??
    (gitTransport === "https"
      ? gitBaseUrl
      : gitTransport === "file"
        ? "file:///var/lib/entangle/git"
        : "ssh://git@gitea:22");
  const agentEngineBaseUrl =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_BASE_URL?.trim();
  const requestedAgentEngineKind =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_KIND?.trim();
  const agentEngineKind =
    requestedAgentEngineKind === "opencode_server" ||
    requestedAgentEngineKind === "external_process" ||
    (requestedAgentEngineKind === "external_http" && agentEngineBaseUrl)
      ? requestedAgentEngineKind
      : "opencode_server";
  const agentEngineId = sanitizeIdentifier(
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_ID ??
      (agentEngineKind === "opencode_server"
        ? "opencode-default"
        : `default-${agentEngineKind}`)
  );
  const configuredAgentEngineExecutable =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_EXECUTABLE?.trim();
  const agentEngineExecutable =
    configuredAgentEngineExecutable ||
    (agentEngineKind === "opencode_server"
      ? "opencode"
      : agentEngineKind === "external_process"
        ? "agent-engine"
        : undefined);
  const agentEnginePermissionMode =
    process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE ===
    "entangle_approval"
      ? "entangle_approval"
      : process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE === "auto_approve"
      ? "auto_approve"
      : process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_PERMISSION_MODE ===
          "auto_reject"
        ? "auto_reject"
        : agentEngineKind === "opencode_server"
          ? "auto_reject"
          : undefined;

  const modelEndpointId = process.env.ENTANGLE_DEFAULT_MODEL_ENDPOINT_ID?.trim();
  const modelBaseUrl = process.env.ENTANGLE_DEFAULT_MODEL_BASE_URL?.trim();
  const modelSecretRef = process.env.ENTANGLE_DEFAULT_MODEL_SECRET_REF?.trim();
  const modelDefaultModel =
    process.env.ENTANGLE_DEFAULT_MODEL_DEFAULT_MODEL?.trim();
  const modelAdapterKind =
    process.env.ENTANGLE_DEFAULT_MODEL_ADAPTER_KIND === "openai_compatible"
      ? "openai_compatible"
      : "anthropic";
  const modelAuthMode =
    process.env.ENTANGLE_DEFAULT_MODEL_AUTH_MODE === "api_key_bearer"
      ? "api_key_bearer"
      : process.env.ENTANGLE_DEFAULT_MODEL_AUTH_MODE === "header_secret"
        ? "header_secret"
        : modelAdapterKind === "anthropic"
          ? "header_secret"
          : "api_key_bearer";

  const modelEndpoints =
    modelEndpointId && modelBaseUrl && modelSecretRef
      ? [
          {
            id: sanitizeIdentifier(modelEndpointId),
            displayName:
              process.env.ENTANGLE_DEFAULT_MODEL_DISPLAY_NAME ??
              "Shared Model Endpoint",
            adapterKind: modelAdapterKind,
            baseUrl: modelBaseUrl,
            authMode: modelAuthMode,
            secretRef: modelSecretRef,
            defaultModel: modelDefaultModel || undefined
          }
        ]
      : [];

  return deploymentResourceCatalogSchema.parse({
    schemaVersion: "1",
    catalogId,
    relays: [
      {
        id: relayId,
        displayName: process.env.ENTANGLE_DEFAULT_RELAY_DISPLAY_NAME ?? "Preview Relay",
        readUrls: [relayReadUrl],
        writeUrls: [relayWriteUrl],
        authMode: "none"
      }
    ],
    gitServices: [
      {
        id: gitServiceId,
        displayName:
          process.env.ENTANGLE_DEFAULT_GIT_SERVICE_DISPLAY_NAME ?? "Gitea",
        baseUrl: gitBaseUrl,
        remoteBase: gitRemoteBase,
        transportKind: gitTransport,
        authMode:
          process.env.ENTANGLE_DEFAULT_GIT_AUTH_MODE === "https_token"
            ? "https_token"
            : process.env.ENTANGLE_DEFAULT_GIT_AUTH_MODE === "http_signature"
              ? "http_signature"
              : "ssh_key",
        defaultNamespace:
          process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE?.trim() || undefined
      }
    ],
    modelEndpoints,
    agentEngineProfiles: [
      {
        id: agentEngineId,
        displayName:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_DISPLAY_NAME ??
          (agentEngineKind === "opencode_server"
            ? "OpenCode"
            : "Agent Engine"),
        kind: agentEngineKind,
        executable: agentEngineExecutable,
        baseUrl: agentEngineBaseUrl || undefined,
        defaultAgent:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_AGENT?.trim() || undefined,
        ...(agentEnginePermissionMode
          ? { permissionMode: agentEnginePermissionMode }
          : {}),
        version:
          process.env.ENTANGLE_DEFAULT_AGENT_ENGINE_VERSION?.trim() || undefined
      }
    ],
    defaults: {
      relayProfileRefs: [relayId],
      gitServiceRef: gitServiceId,
      modelEndpointRef: modelEndpoints[0]?.id,
      agentEngineProfileRef: agentEngineId
    }
  });
}

function buildPackageSourceId(
  requestedId: string | undefined,
  manifestPackageId: string,
  existingIds: string[]
): string {
  const unavailableIds = new Set([
    ...existingIds,
    ...reservedPackageSourceIds
  ]);
  const preferredId = sanitizeIdentifier(
    requestedId ?? `${manifestPackageId}-source`
  );

  if (!unavailableIds.has(preferredId)) {
    return preferredId;
  }

  let suffix = 2;

  while (unavailableIds.has(`${preferredId}-${suffix}`)) {
    suffix += 1;
  }

  return `${preferredId}-${suffix}`;
}

function packageSourceRecordPath(packageSourceId: string): string {
  return path.join(packageSourcesRoot, `${packageSourceId}.json`);
}

function packageSourceImportRoot(packageSourceId: string): string {
  return path.join(importsRoot, "packages", packageSourceId);
}

function buildGraphRevisionId(graphId: string): string {
  const timestamp = nowIsoString()
    .toLowerCase()
    .replace(/[-:.]/g, "")
    .replace("z", "z");

  return sanitizeIdentifier(`${graphId}-${timestamp}`);
}

function buildPackageStoreKey(contentDigest: string): string {
  return sanitizeIdentifier(contentDigest.replace(":", "-"));
}

function buildPackageStoreLayout(contentDigest: string) {
  const packageStoreKey = buildPackageStoreKey(contentDigest);
  const root = path.join(packageStoreRoot, packageStoreKey);

  return {
    metadataPath: path.join(root, packageStoreMetadataFileName),
    packageRoot: path.join(root, "package"),
    packageStoreKey,
    root
  };
}

function buildRuntimeIdentityRecordId(graphId: string, nodeId: string): string {
  return sanitizeIdentifier(`${graphId}-${nodeId}`);
}

function buildRuntimeIdentityRecordPath(graphId: string, nodeId: string): string {
  return path.join(
    runtimeIdentitiesRoot,
    `${buildRuntimeIdentityRecordId(graphId, nodeId)}.json`
  );
}

async function ensureRuntimeIdentity(input: {
  graphId: string;
  nodeId: string;
}): Promise<RuntimeIdentityRecord> {
  const recordPath = buildRuntimeIdentityRecordPath(input.graphId, input.nodeId);

  if (await pathExists(recordPath)) {
    const record = runtimeIdentityRecordSchema.parse(
      await readJsonFile<RuntimeIdentityRecord>(recordPath)
    );

    if (await pathExists(record.secretStoragePath)) {
      return record;
    }
  }

  const secretKey = generateSecretKey();
  const secretHex = Buffer.from(secretKey).toString("hex");
  const publicKey = getPublicKey(secretKey);
  const secretStoragePath = path.join(
    runtimeIdentitiesRoot,
    `${buildRuntimeIdentityRecordId(input.graphId, input.nodeId)}.nostr-secret`
  );
  const now = nowIsoString();
  const record = runtimeIdentityRecordSchema.parse({
    algorithm: "nostr_secp256k1",
    createdAt: now,
    graphId: input.graphId,
    nodeId: input.nodeId,
    publicKey,
    schemaVersion: "1",
    secretStoragePath,
    updatedAt: now
  });

  await writeSecretFile(secretStoragePath, `${secretHex}\n`);
  await writeJsonFile(recordPath, record);
  return record;
}

export async function getRuntimeIdentitySecret(input: {
  nodeId: string;
}): Promise<RuntimeIdentitySecretResponse | null> {
  await initializeHostState();

  const activeGraph = await readActiveGraphState();

  if (!activeGraph.graph || !activeGraph.activeRevisionId) {
    return null;
  }

  const node = activeGraph.graph.nodes.find(
    (candidate) => candidate.nodeId === input.nodeId
  );

  if (!node) {
    return null;
  }

  const identitySecret =
    node.nodeKind === "user"
      ? await getUserNodeSigningMaterial({
          graph: activeGraph.graph,
          nodeId: input.nodeId
        }).then((material) => ({
          publicKey: material.identity.publicKey,
          secretKey: Buffer.from(material.secretKey).toString("hex")
        }))
      : await ensureRuntimeIdentity({
          graphId: activeGraph.graph.graphId,
          nodeId: input.nodeId
        }).then(async (identity) => ({
          publicKey: identity.publicKey,
          secretKey: await readFile(identity.secretStoragePath, "utf8")
        }));
  const normalizedSecretKey = identitySecret.secretKey.trim();

  if (!normalizedSecretKey) {
    return null;
  }

  const secretKeyBytes = parseNostrSecretKeyBytes(normalizedSecretKey);
  const publicKey = getPublicKey(secretKeyBytes);

  if (publicKey !== identitySecret.publicKey) {
    throw new Error(
      `Runtime identity secret for node '${input.nodeId}' does not match its public key.`
    );
  }

  return runtimeIdentitySecretResponseSchema.parse({
    graphId: activeGraph.graph.graphId,
    graphRevisionId: activeGraph.activeRevisionId,
    nodeId: input.nodeId,
    publicKey: identitySecret.publicKey,
    schemaVersion: "1",
    secretDelivery: {
      envVar: "ENTANGLE_NOSTR_SECRET_KEY",
      mode: "env_var"
    },
    secretKey: normalizedSecretKey
  });
}

function buildUserNodeIdentityRecordId(graphId: string, nodeId: string): string {
  return sanitizeIdentifier(`${graphId}-${nodeId}`);
}

function buildUserNodeIdentityRecordPath(graphId: string, nodeId: string): string {
  return path.join(
    userNodeIdentitiesRoot,
    `${buildUserNodeIdentityRecordId(graphId, nodeId)}.json`
  );
}

function buildUserNodeIdentityKeyRef(graphId: string, nodeId: string): string {
  return `secret://user-nodes/${buildUserNodeIdentityRecordId(graphId, nodeId)}`;
}

async function readUserNodeIdentityRecord(
  graphId: string,
  nodeId: string
): Promise<UserNodeIdentityRecord | undefined> {
  const recordPath = buildUserNodeIdentityRecordPath(graphId, nodeId);

  if (!(await pathExists(recordPath))) {
    return undefined;
  }

  return userNodeIdentityRecordSchema.parse(await readJsonFile(recordPath));
}

async function resolveUserNodeSecretPublicKey(
  keyRef: string | undefined
): Promise<string | undefined> {
  if (!keyRef) {
    return undefined;
  }

  const secretKey = await readSecretRefValue(keyRef);

  if (!secretKey) {
    return undefined;
  }

  try {
    return getPublicKey(parseNostrSecretKeyBytes(secretKey));
  } catch {
    return undefined;
  }
}

async function ensureUserNodeIdentity(input: {
  graphId: string;
  hostAuthorityPubkey: string;
  node: NodeBinding;
}): Promise<UserNodeIdentityRecord> {
  const existing = await readUserNodeIdentityRecord(
    input.graphId,
    input.node.nodeId
  );
  const keyRef =
    existing?.keyRef ??
    buildUserNodeIdentityKeyRef(input.graphId, input.node.nodeId);
  let publicKey = await resolveUserNodeSecretPublicKey(keyRef);

  if (!publicKey) {
    const secretKey = generateSecretKey();
    const secretKeyHex = Buffer.from(secretKey).toString("hex");
    publicKey = getPublicKey(secretKey);
    await writeSecretRefValue(keyRef, secretKeyHex);
  }

  const timestamp = nowIsoString();
  const record = userNodeIdentityRecordSchema.parse({
    createdAt: existing?.createdAt ?? timestamp,
    displayName: input.node.displayName,
    gatewayIds: existing?.gatewayIds ?? [],
    graphId: input.graphId,
    hostAuthorityPubkey: input.hostAuthorityPubkey,
    keyAlgorithm: existing?.keyAlgorithm ?? "nostr_secp256k1",
    keyRef,
    nodeId: input.node.nodeId,
    publicKey,
    ...(existing?.revocationReason
      ? { revocationReason: existing.revocationReason }
      : {}),
    ...(existing?.revokedAt ? { revokedAt: existing.revokedAt } : {}),
    schemaVersion: "1",
    status: existing?.status ?? "active",
    updatedAt: timestamp
  });

  await writeJsonFile(
    buildUserNodeIdentityRecordPath(input.graphId, input.node.nodeId),
    record
  );
  return record;
}

async function ensureUserNodeIdentitiesForGraph(
  graph: GraphSpec
): Promise<UserNodeIdentityRecord[]> {
  const authority = await ensureHostAuthorityMaterialized();
  const userNodes = graph.nodes.filter((node) => node.nodeKind === "user");

  return Promise.all(
    userNodes.map((node) =>
      ensureUserNodeIdentity({
        graphId: graph.graphId,
        hostAuthorityPubkey: authority.publicKey,
        node
      })
    )
  );
}

export type UserNodeSigningMaterial = {
  identity: UserNodeIdentityRecord;
  secretKey: Uint8Array;
};

export async function getUserNodeSigningMaterial(input: {
  graph: GraphSpec;
  nodeId?: string;
}): Promise<UserNodeSigningMaterial> {
  await initializeHostState();

  const userNode = input.nodeId
    ? input.graph.nodes.find((node) => node.nodeId === input.nodeId)
    : input.graph.nodes.find((node) => node.nodeKind === "user");

  if (!userNode || userNode.nodeKind !== "user") {
    throw new Error(
      input.nodeId
        ? `Node '${input.nodeId}' is not a User Node in graph '${input.graph.graphId}'.`
        : `Graph '${input.graph.graphId}' does not contain a User Node.`
    );
  }

  const authority = await ensureHostAuthorityMaterialized();
  const identity = await ensureUserNodeIdentity({
    graphId: input.graph.graphId,
    hostAuthorityPubkey: authority.publicKey,
    node: userNode
  });

  if (!identity.keyRef) {
    throw new Error(
      `User Node '${identity.nodeId}' does not reference managed key material.`
    );
  }

  const secretKey = await readSecretRefValue(identity.keyRef);

  if (!secretKey) {
    throw new Error(
      `User Node '${identity.nodeId}' does not have available key material.`
    );
  }

  const secretKeyBytes = parseNostrSecretKeyBytes(secretKey);
  const publicKey = getPublicKey(secretKeyBytes);

  if (publicKey !== identity.publicKey) {
    throw new Error(
      `User Node '${identity.nodeId}' key material does not match its public key.`
    );
  }

  return {
    identity,
    secretKey: secretKeyBytes
  };
}

function resolveSecretRefStoragePath(secretRef: string): string | undefined {
  const parsedSecretRef = secretRefSchema.safeParse(secretRef);

  if (!parsedSecretRef.success) {
    return undefined;
  }

  const parsed = new URL(parsedSecretRef.data);

  const segments = [parsed.hostname, ...parsed.pathname.split("/").filter(Boolean)];

  if (segments.length === 0) {
    return undefined;
  }

  return path.join(secretRefsRoot, ...segments);
}

async function writeSecretRefValue(
  secretRef: string,
  value: string
): Promise<string> {
  const storagePath = resolveSecretRefStoragePath(secretRef);

  if (!storagePath) {
    throw new Error(`Secret reference '${secretRef}' is not valid.`);
  }

  await writeSecretFile(storagePath, `${value.trim()}\n`);
  return storagePath;
}

function parseNostrSecretKeyBytes(secretKey: string): Uint8Array {
  const parsedSecretKey = nostrSecretKeySchema.parse(secretKey.trim());
  return Uint8Array.from(Buffer.from(parsedSecretKey, "hex"));
}

function buildDefaultHostAuthorityRecord(input: {
  publicKey: string;
  timestamp: string;
}): HostAuthorityRecord {
  return hostAuthorityRecordSchema.parse({
    authorityId: sanitizeIdentifier(
      `host-authority-${input.publicKey.slice(0, 12)}`
    ),
    createdAt: input.timestamp,
    displayName: "Default Host Authority",
    keyRef: defaultHostAuthorityKeyRef,
    publicKey: input.publicKey,
    schemaVersion: "1",
    status: "active",
    updatedAt: input.timestamp
  });
}

async function readHostAuthorityRecordFile(): Promise<
  HostAuthorityRecord | undefined
> {
  if (!(await pathExists(hostAuthorityRecordPath))) {
    return undefined;
  }

  return hostAuthorityRecordSchema.parse(await readJsonFile(hostAuthorityRecordPath));
}

async function readHostAuthoritySecretKey(
  authority: HostAuthorityRecord
): Promise<string | undefined> {
  if (!authority.keyRef) {
    return undefined;
  }

  return readSecretRefValue(authority.keyRef);
}

async function inspectHostAuthoritySecret(
  authority: HostAuthorityRecord
): Promise<HostAuthorityInspectionResponse["secret"]> {
  const secretKey = await readHostAuthoritySecretKey(authority);

  if (!secretKey) {
    return {
      ...(authority.keyRef ? { keyRef: authority.keyRef } : {}),
      status: "missing"
    };
  }

  try {
    const publicKey = getPublicKey(parseNostrSecretKeyBytes(secretKey));

    return {
      ...(authority.keyRef ? { keyRef: authority.keyRef } : {}),
      status: publicKey === authority.publicKey ? "available" : "mismatched"
    };
  } catch {
    return {
      ...(authority.keyRef ? { keyRef: authority.keyRef } : {}),
      status: "mismatched"
    };
  }
}

async function ensureHostAuthorityMaterialized(): Promise<HostAuthorityRecord> {
  const existingAuthority = await readHostAuthorityRecordFile();

  if (existingAuthority) {
    return existingAuthority;
  }

  const secretKey = generateSecretKey();
  const secretKeyHex = Buffer.from(secretKey).toString("hex");
  const publicKey = getPublicKey(secretKey);
  const timestamp = nowIsoString();
  const authority = buildDefaultHostAuthorityRecord({
    publicKey,
    timestamp
  });

  await writeSecretRefValue(authority.keyRef ?? defaultHostAuthorityKeyRef, secretKeyHex);
  await writeJsonFile(hostAuthorityRecordPath, authority);
  return authority;
}

async function readAvailableHostAuthoritySecret(): Promise<{
  authority: HostAuthorityRecord;
  secretKey: string;
}> {
  const authority = await ensureHostAuthorityMaterialized();
  const secret = await inspectHostAuthoritySecret(authority);
  const secretKey = await readHostAuthoritySecretKey(authority);

  if (secret.status !== "available" || !secretKey) {
    throw new Error(
      `Host Authority '${authority.authorityId}' does not have an available matching secret.`
    );
  }

  return {
    authority,
    secretKey
  };
}

async function resolveSecretBinding(secretRef: string): Promise<{
  delivery?: {
    filePath: string;
    mode: "mounted_file";
  };
  secretRef: string;
  status: "available" | "missing";
}> {
  const storagePath = resolveSecretRefStoragePath(secretRef);

  if (!storagePath || !(await pathExists(storagePath))) {
    return {
      secretRef,
      status: "missing"
    };
  }

  return {
    delivery: {
      filePath: storagePath,
      mode: "mounted_file"
    },
    secretRef,
    status: "available"
  };
}

async function readSecretRefValue(secretRef: string): Promise<string | undefined> {
  const storagePath = resolveSecretRefStoragePath(secretRef);

  if (!storagePath || !(await pathExists(storagePath))) {
    return undefined;
  }

  const secretValue = (await readFile(storagePath, "utf8")).trim();
  return secretValue.length > 0 ? secretValue : undefined;
}

export async function getHostAuthorityInspection(): Promise<HostAuthorityInspectionResponse> {
  await initializeHostState();

  const authority = await ensureHostAuthorityMaterialized();
  const secret = await inspectHostAuthoritySecret(authority);

  return hostAuthorityInspectionResponseSchema.parse({
    authority,
    checkedAt: nowIsoString(),
    secret
  });
}

export async function exportHostAuthority(): Promise<HostAuthorityExportResponse> {
  await initializeHostState();

  const { authority, secretKey } = await readAvailableHostAuthoritySecret();

  return hostAuthorityExportResponseSchema.parse({
    authority,
    exportedAt: nowIsoString(),
    secretKey
  });
}

export async function importHostAuthority(
  input: unknown
): Promise<HostAuthorityImportResponse> {
  await initializeHostState();

  const request = hostAuthorityImportRequestSchema.parse(input);
  const secretKeyBytes = parseNostrSecretKeyBytes(request.secretKey);
  const publicKey = getPublicKey(secretKeyBytes);

  if (publicKey !== request.authority.publicKey) {
    throw new Error(
      "Imported Host Authority secret key does not match authority.publicKey."
    );
  }

  const importedAt = nowIsoString();
  const authority = hostAuthorityRecordSchema.parse({
    ...request.authority,
    keyRef: request.authority.keyRef ?? defaultHostAuthorityKeyRef,
    updatedAt: importedAt
  });

  await writeSecretRefValue(
    authority.keyRef ?? defaultHostAuthorityKeyRef,
    request.secretKey
  );
  await writeJsonFile(hostAuthorityRecordPath, authority);

  return hostAuthorityImportResponseSchema.parse({
    authority,
    importedAt
  });
}

export async function signHostAuthorityEventTemplate(
  eventTemplate: EventTemplate
): Promise<NostrEvent> {
  const { secretKey } = await readAvailableHostAuthoritySecret();

  return finalizeEvent(eventTemplate, parseNostrSecretKeyBytes(secretKey));
}

export async function signHostAuthorityPayloadEnvelope(input: {
  causationEventId?: string;
  correlationId?: string;
  payload: unknown;
  protocol: EntangleProtocolDomain;
  recipientPubkey?: string;
}): Promise<EntangleSignedEnvelope> {
  const payloadJson = JSON.stringify(input.payload);
  const payloadHash = createHash("sha256").update(payloadJson).digest("hex");
  const tags = [
    ["protocol", input.protocol],
    ["payload_hash", payloadHash]
  ];

  if (input.recipientPubkey) {
    tags.push(["p", input.recipientPubkey]);
  }

  const createdAt = nowIsoString();
  const signedEvent = await signHostAuthorityEventTemplate({
    content: payloadJson,
    created_at: Math.floor(new Date(createdAt).getTime() / 1000),
    kind: entangleNostrRumorKind,
    tags
  });

  return entangleSignedEnvelopeSchema.parse({
    ...(input.causationEventId
      ? { causationEventId: input.causationEventId }
      : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    createdAt,
    eventId: signedEvent.id,
    payloadHash,
    protocol: input.protocol,
    ...(input.recipientPubkey ? { recipientPubkey: input.recipientPubkey } : {}),
    schemaVersion: "1",
    signature: signedEvent.sig,
    signerPubkey: signedEvent.pubkey
  });
}

function runnerRegistrationRecordPath(runnerId: string): string {
  return path.join(runnerRegistryRoot, `${runnerId}.json`);
}

function runnerHeartbeatSnapshotPath(runnerId: string): string {
  return path.join(observedRunnerHeartbeatRoot, `${runnerId}.json`);
}

async function assertCurrentHostAuthorityPubkey(pubkey: string): Promise<void> {
  const authority = await ensureHostAuthorityMaterialized();

  if (authority.publicKey !== pubkey) {
    throw new Error(
      `Runner event targets Host Authority '${pubkey}', but this Host Authority is '${authority.publicKey}'.`
    );
  }
}

async function readRunnerRegistrationRecord(
  runnerId: string
): Promise<RunnerRegistrationRecord | undefined> {
  const recordPath = runnerRegistrationRecordPath(runnerId);

  if (!(await pathExists(recordPath))) {
    return undefined;
  }

  return runnerRegistrationRecordSchema.parse(await readJsonFile(recordPath));
}

async function writeRunnerRegistrationRecord(
  record: RunnerRegistrationRecord
): Promise<void> {
  await writeJsonFile(runnerRegistrationRecordPath(record.runnerId), record);
}

async function readRunnerHeartbeatSnapshot(
  runnerId: string
): Promise<RunnerHeartbeatSnapshot | undefined> {
  const snapshotPath = runnerHeartbeatSnapshotPath(runnerId);

  if (!(await pathExists(snapshotPath))) {
    return undefined;
  }

  return runnerHeartbeatSnapshotSchema.parse(await readJsonFile(snapshotPath));
}

async function writeRunnerHeartbeatSnapshot(
  snapshot: RunnerHeartbeatSnapshot
): Promise<void> {
  await writeJsonFile(runnerHeartbeatSnapshotPath(snapshot.runnerId), snapshot);
}

async function listRunnerRegistrationRecords(): Promise<
  RunnerRegistrationRecord[]
> {
  if (!(await pathExists(runnerRegistryRoot))) {
    return [];
  }

  const entries = await readdir(runnerRegistryRoot);
  const records = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) =>
        readJsonFile(path.join(runnerRegistryRoot, entry)).then((record) =>
          runnerRegistrationRecordSchema.parse(record)
        )
      )
  );

  return records.sort((left, right) =>
    left.runnerId.localeCompare(right.runnerId)
  );
}

function classifyRunnerLiveness(input: {
  lastSeenAt?: string | undefined;
  now: number;
}): RunnerLivenessState {
  if (!input.lastSeenAt) {
    return "unknown";
  }

  const lastSeenMs = Date.parse(input.lastSeenAt);

  if (!Number.isFinite(lastSeenMs)) {
    return "unknown";
  }

  const ageMs = Math.max(0, input.now - lastSeenMs);

  if (ageMs <= runnerStaleAfterMs) {
    return "online";
  }

  if (ageMs <= runnerOfflineAfterMs) {
    return "stale";
  }

  return "offline";
}

async function buildRunnerRegistryEntry(
  registration: RunnerRegistrationRecord
): Promise<RunnerRegistryEntry> {
  const heartbeat = await readRunnerHeartbeatSnapshot(registration.runnerId);
  const projectedAt = nowIsoString();
  const lastSeenAt = heartbeat?.lastHeartbeatAt ?? registration.lastSeenAt;

  return runnerRegistryEntrySchema.parse({
    ...(heartbeat ? { heartbeat } : {}),
    liveness: classifyRunnerLiveness({
      lastSeenAt,
      now: Date.parse(projectedAt)
    }),
    offlineAfterSeconds: runnerOfflineAfterMs / 1000,
    projectedAt,
    registration,
    staleAfterSeconds: runnerStaleAfterMs / 1000
  });
}

async function requireRunnerRegistration(
  runnerId: string
): Promise<RunnerRegistrationRecord> {
  const registration = await readRunnerRegistrationRecord(runnerId);

  if (!registration) {
    throw new Error(`Runner '${runnerId}' is not registered.`);
  }

  return registration;
}

export async function recordRunnerHello(
  input: unknown
): Promise<RunnerRegistryInspectionResponse> {
  await initializeHostState();

  const hello = runnerHelloIngestRequestSchema.parse(input);
  await assertCurrentHostAuthorityPubkey(hello.hostAuthorityPubkey);

  const existing = await readRunnerRegistrationRecord(hello.runnerId);

  if (existing && existing.publicKey !== hello.runnerPubkey) {
    throw new Error(
      `Runner '${hello.runnerId}' is already registered with a different public key.`
    );
  }

  const registration = runnerRegistrationRecordSchema.parse({
    capabilities: hello.capabilities,
    firstSeenAt: existing?.firstSeenAt ?? hello.issuedAt,
    hostAuthorityPubkey: hello.hostAuthorityPubkey,
    lastSeenAt: hello.issuedAt,
    publicKey: hello.runnerPubkey,
    ...(existing?.revocationReason
      ? { revocationReason: existing.revocationReason }
      : {}),
    ...(existing?.revokedAt ? { revokedAt: existing.revokedAt } : {}),
    runnerId: hello.runnerId,
    schemaVersion: "1",
    trustState: existing?.trustState ?? "pending",
    updatedAt: hello.issuedAt
  });

  await writeRunnerRegistrationRecord(registration);

  return runnerRegistryInspectionResponseSchema.parse({
    runner: await buildRunnerRegistryEntry(registration)
  });
}

export async function recordRunnerHeartbeat(
  input: unknown
): Promise<RunnerRegistryInspectionResponse> {
  await initializeHostState();

  const heartbeat = runnerHeartbeatIngestRequestSchema.parse(input);
  await assertCurrentHostAuthorityPubkey(heartbeat.hostAuthorityPubkey);

  const registration = await requireRunnerRegistration(heartbeat.runnerId);

  if (registration.publicKey !== heartbeat.runnerPubkey) {
    throw new Error(
      `Runner '${heartbeat.runnerId}' heartbeat was signed by a different public key.`
    );
  }

  const updatedRegistration = runnerRegistrationRecordSchema.parse({
    ...registration,
    lastSeenAt: heartbeat.observedAt,
    updatedAt: heartbeat.observedAt
  });
  const snapshot = runnerHeartbeatSnapshotSchema.parse({
    assignmentIds: heartbeat.assignmentIds,
    hostAuthorityPubkey: heartbeat.hostAuthorityPubkey,
    lastHeartbeatAt: heartbeat.observedAt,
    operationalState: heartbeat.operationalState,
    runnerId: heartbeat.runnerId,
    runnerPubkey: heartbeat.runnerPubkey,
    schemaVersion: "1",
    ...(heartbeat.statusMessage
      ? { statusMessage: heartbeat.statusMessage }
      : {}),
    updatedAt: heartbeat.observedAt
  });

  await writeRunnerRegistrationRecord(updatedRegistration);
  await writeRunnerHeartbeatSnapshot(snapshot);

  return runnerRegistryInspectionResponseSchema.parse({
    runner: await buildRunnerRegistryEntry(updatedRegistration)
  });
}

export async function listRunnerRegistry(): Promise<RunnerRegistryListResponse> {
  await initializeHostState();

  const registrations = await listRunnerRegistrationRecords();
  const runners = await Promise.all(
    registrations.map((registration) => buildRunnerRegistryEntry(registration))
  );

  return runnerRegistryListResponseSchema.parse({
    generatedAt: nowIsoString(),
    runners
  });
}

export async function getRunnerRegistryEntry(
  runnerId: string
): Promise<RunnerRegistryInspectionResponse | undefined> {
  await initializeHostState();

  const registration = await readRunnerRegistrationRecord(runnerId);

  if (!registration) {
    return undefined;
  }

  return runnerRegistryInspectionResponseSchema.parse({
    runner: await buildRunnerRegistryEntry(registration)
  });
}

export async function trustRunnerRegistration(input: {
  request?: RunnerTrustMutationRequest;
  runnerId: string;
}): Promise<RunnerTrustMutationResponse> {
  await initializeHostState();

  runnerTrustMutationRequestSchema.parse(input.request ?? {});
  const registration = await requireRunnerRegistration(input.runnerId);
  const updatedAt = nowIsoString();
  const trustedCandidate: Record<string, unknown> = {
    ...registration,
    trustState: "trusted",
    updatedAt
  };
  delete trustedCandidate.revocationReason;
  delete trustedCandidate.revokedAt;
  const trusted = runnerRegistrationRecordSchema.parse(trustedCandidate);

  await writeRunnerRegistrationRecord(trusted);

  return runnerTrustMutationResponseSchema.parse({
    runner: await buildRunnerRegistryEntry(trusted)
  });
}

export async function revokeRunnerRegistration(input: {
  request?: RunnerRevokeMutationRequest;
  runnerId: string;
}): Promise<RunnerRevokeMutationResponse> {
  await initializeHostState();

  const request = runnerRevokeMutationRequestSchema.parse(input.request ?? {});
  const registration = await requireRunnerRegistration(input.runnerId);
  const revokedAt = nowIsoString();
  const revoked = runnerRegistrationRecordSchema.parse({
    ...registration,
    ...(request.reason ? { revocationReason: request.reason } : {}),
    revokedAt,
    trustState: "revoked",
    updatedAt: revokedAt
  });

  await writeRunnerRegistrationRecord(revoked);

  return runnerRevokeMutationResponseSchema.parse({
    runner: await buildRunnerRegistryEntry(revoked)
  });
}

function runtimeAssignmentRecordPath(assignmentId: string): string {
  return path.join(runtimeAssignmentsRoot, `${assignmentId}.json`);
}

async function readRuntimeAssignmentRecord(
  assignmentId: string
): Promise<RuntimeAssignmentRecord | undefined> {
  const recordPath = runtimeAssignmentRecordPath(assignmentId);

  if (!(await pathExists(recordPath))) {
    return undefined;
  }

  return runtimeAssignmentRecordSchema.parse(await readJsonFile(recordPath));
}

async function writeRuntimeAssignmentRecord(
  record: RuntimeAssignmentRecord
): Promise<void> {
  await writeJsonFile(runtimeAssignmentRecordPath(record.assignmentId), record);
}

async function listRuntimeAssignmentRecords(): Promise<RuntimeAssignmentRecord[]> {
  if (!(await pathExists(runtimeAssignmentsRoot))) {
    return [];
  }

  const entries = await readdir(runtimeAssignmentsRoot);
  const records = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) =>
        readJsonFile(path.join(runtimeAssignmentsRoot, entry)).then((record) =>
          runtimeAssignmentRecordSchema.parse(record)
        )
      )
  );

  return records.sort((left, right) =>
    left.assignmentId.localeCompare(right.assignmentId)
  );
}

async function requireRuntimeAssignmentRecord(
  assignmentId: string
): Promise<RuntimeAssignmentRecord> {
  const assignment = await readRuntimeAssignmentRecord(assignmentId);

  if (!assignment) {
    throw new Error(`Runtime assignment '${assignmentId}' was not found.`);
  }

  return assignment;
}

function inferRuntimeKindForNode(node: NodeBinding): RuntimeNodeKind {
  if (node.nodeKind === "user") {
    return "human_interface";
  }

  return node.nodeKind === "service" ? "service_runner" : "agent_runner";
}

function buildRunnerJoinRelayUrls(context: EffectiveRuntimeContext): string[] {
  return [
    ...new Set(
      context.relayContext.relayProfiles.flatMap((relayProfile) => [
        ...relayProfile.readUrls,
        ...relayProfile.writeUrls
      ])
    )
  ].sort((left, right) => left.localeCompare(right));
}

function buildRunnerJoinConfigForRuntimeContext(
  context: EffectiveRuntimeContext,
  hostAuthorityPubkey: string
) {
  const relayUrls = buildRunnerJoinRelayUrls(context);
  const hostApiBaseUrl =
    process.env.ENTANGLE_DOCKER_RUNNER_HOST_API_URL?.trim() ??
    process.env.ENTANGLE_RUNNER_HOST_API_URL?.trim();

  if (relayUrls.length === 0) {
    return undefined;
  }

  const runtimeKind = inferRuntimeKindForNode(context.binding.node);

  return runnerJoinConfigSchema.parse({
    capabilities: {
      agentEngineKinds:
        runtimeKind === "agent_runner"
          ? [context.agentRuntimeContext.engineProfile.kind]
          : [],
      labels: [context.binding.node.nodeKind],
      maxAssignments: 1,
      runtimeKinds: [runtimeKind],
      supportsLocalWorkspace: true,
      supportsNip59: true
    },
    hostAuthorityPubkey,
    ...(hostApiBaseUrl
      ? {
          hostApi: {
            ...(process.env.ENTANGLE_HOST_OPERATOR_TOKEN
              ? {
                  auth: {
                    envVar: "ENTANGLE_HOST_OPERATOR_TOKEN",
                    mode: "bearer_env"
                  }
                }
              : {}),
            baseUrl: hostApiBaseUrl,
            runtimeIdentitySecret: {
              mode: "host_api"
            }
          }
        }
      : {}),
    identity: {
      publicKey: context.identityContext.publicKey,
      secretDelivery: context.identityContext.secretDelivery
    },
    relayUrls,
    runnerId: context.binding.node.nodeId,
    schemaVersion: "1"
  });
}

function addSecondsIso(timestamp: string, seconds: number): string {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}

function buildAssignmentLease(input: {
  durationSeconds: number;
  issuedAt: string;
}) {
  const renewAfterSeconds = Math.max(1, Math.floor(input.durationSeconds * 0.8));

  return {
    expiresAt: addSecondsIso(input.issuedAt, input.durationSeconds),
    issuedAt: input.issuedAt,
    leaseId: sanitizeIdentifier(`lease-${randomUUID()}`),
    renewBy: addSecondsIso(input.issuedAt, renewAfterSeconds)
  };
}

export async function listRuntimeAssignments(): Promise<RuntimeAssignmentListResponse> {
  await initializeHostState();

  return runtimeAssignmentListResponseSchema.parse({
    assignments: await listRuntimeAssignmentRecords(),
    generatedAt: nowIsoString()
  });
}

export async function getRuntimeAssignment(
  assignmentId: string
): Promise<RuntimeAssignmentInspectionResponse | undefined> {
  await initializeHostState();

  const assignment = await readRuntimeAssignmentRecord(assignmentId);

  if (!assignment) {
    return undefined;
  }

  return runtimeAssignmentInspectionResponseSchema.parse({
    assignment
  });
}

function buildRuntimeAssignmentTimelineEntries(input: {
  assignment: RuntimeAssignmentRecord;
  commandReceipts: RuntimeCommandReceiptProjectionRecord[];
  receipts: AssignmentReceiptProjectionRecord[];
}): RuntimeAssignmentTimelineEntry[] {
  const { assignment, commandReceipts, receipts } = input;
  const entries: RuntimeAssignmentTimelineEntry[] = [
    {
      assignmentId: assignment.assignmentId,
      entryKind: "assignment.offered",
      message: "Assignment offered to runner.",
      nodeId: assignment.nodeId,
      runnerId: assignment.runnerId,
      status: "offered",
      timestamp: assignment.offeredAt
    }
  ];

  if (assignment.acceptedAt) {
    entries.push({
      assignmentId: assignment.assignmentId,
      entryKind: "assignment.accepted",
      message: "Runner accepted assignment.",
      nodeId: assignment.nodeId,
      runnerId: assignment.runnerId,
      status: "accepted",
      timestamp: assignment.acceptedAt
    });
  }

  if (assignment.rejectedAt) {
    entries.push({
      assignmentId: assignment.assignmentId,
      entryKind: "assignment.rejected",
      message: assignment.rejectionReason ?? "Runner rejected assignment.",
      nodeId: assignment.nodeId,
      runnerId: assignment.runnerId,
      status: "rejected",
      timestamp: assignment.rejectedAt
    });
  }

  if (assignment.revokedAt) {
    entries.push({
      assignmentId: assignment.assignmentId,
      entryKind: "assignment.revoked",
      message: assignment.revocationReason ?? "Assignment revoked.",
      nodeId: assignment.nodeId,
      runnerId: assignment.runnerId,
      status: "revoked",
      timestamp: assignment.revokedAt
    });
  }

  for (const receipt of receipts) {
    entries.push({
      assignmentId: receipt.assignmentId,
      entryKind: "assignment.receipt",
      ...(receipt.receiptMessage ? { message: receipt.receiptMessage } : {}),
      receiptKind: receipt.receiptKind,
      runnerId: receipt.runnerId,
      timestamp: receipt.observedAt
    });
  }

  for (const receipt of commandReceipts) {
    entries.push({
      assignmentId: assignment.assignmentId,
      commandEventType: receipt.commandEventType,
      commandId: receipt.commandId,
      entryKind: "runtime.command.receipt",
      receiptStatus: receipt.receiptStatus,
      runnerId: receipt.runnerId,
      timestamp: receipt.observedAt
    });
  }

  return entries.sort((left, right) => {
    const timeOrder = left.timestamp.localeCompare(right.timestamp);
    return timeOrder !== 0
      ? timeOrder
      : left.entryKind.localeCompare(right.entryKind);
  });
}

export async function getRuntimeAssignmentTimeline(
  assignmentId: string
): Promise<RuntimeAssignmentTimelineResponse | undefined> {
  await initializeHostState();

  const assignment = await readRuntimeAssignmentRecord(assignmentId);

  if (!assignment) {
    return undefined;
  }

  const receipts = (await listAssignmentReceiptProjectionRecords()).filter(
    (receipt) => receipt.assignmentId === assignment.assignmentId
  );
  const commandReceipts = (await listRuntimeCommandReceiptProjectionRecords()).filter(
    (receipt) => receipt.assignmentId === assignment.assignmentId
  );

  return runtimeAssignmentTimelineResponseSchema.parse({
    assignment,
    commandReceipts,
    generatedAt: nowIsoString(),
    receipts,
    timeline: buildRuntimeAssignmentTimelineEntries({
      assignment,
      commandReceipts,
      receipts
    })
  });
}

export async function offerRuntimeAssignment(
  input: unknown
): Promise<RuntimeAssignmentOfferResponse> {
  await initializeHostState();

  const request = runtimeAssignmentOfferRequestSchema.parse(input);
  const activeGraph = await readActiveGraphState();

  if (!activeGraph.graph || !activeGraph.activeRevisionId) {
    throw new Error("Cannot offer a runtime assignment without an active graph.");
  }

  const node = activeGraph.graph.nodes.find(
    (candidate) => candidate.nodeId === request.nodeId
  );

  if (!node) {
    throw new Error(`Node '${request.nodeId}' was not found in the active graph.`);
  }

  const runtimeKind = inferRuntimeKindForNode(node);
  const runner = await requireRunnerRegistration(request.runnerId);

  if (runner.trustState !== "trusted") {
    throw new Error(
      `Runner '${request.runnerId}' must be trusted before it can receive assignments.`
    );
  }

  if (!runner.capabilities.runtimeKinds.includes(runtimeKind)) {
    throw new Error(
      `Runner '${request.runnerId}' does not advertise runtime kind '${runtimeKind}'.`
    );
  }

  const authority = await ensureHostAuthorityMaterialized();

  if (runner.hostAuthorityPubkey !== authority.publicKey) {
    throw new Error(
      `Runner '${request.runnerId}' is registered for a different Host Authority.`
    );
  }

  const offeredAt = nowIsoString();
  const assignmentId =
    request.assignmentId ??
    sanitizeIdentifier(`assignment-${node.nodeId}-${runner.runnerId}-${randomUUID()}`);
  const assignment = runtimeAssignmentRecordSchema.parse({
    assignmentId,
    assignmentRevision: 0,
    graphId: activeGraph.graph.graphId,
    graphRevisionId: activeGraph.activeRevisionId,
    hostAuthorityPubkey: authority.publicKey,
    lease: buildAssignmentLease({
      durationSeconds: request.leaseDurationSeconds,
      issuedAt: offeredAt
    }),
    nodeId: node.nodeId,
    offeredAt,
    ...(request.policyRevisionId
      ? { policyRevisionId: request.policyRevisionId }
      : {}),
    runnerId: runner.runnerId,
    runnerPubkey: runner.publicKey,
    runtimeKind,
    schemaVersion: "1",
    status: "offered",
    updatedAt: offeredAt
  });

  await writeRuntimeAssignmentRecord(assignment);

  return runtimeAssignmentOfferResponseSchema.parse({
    assignment
  });
}

export async function recordRuntimeAssignmentAccepted(
  input: unknown
): Promise<RuntimeAssignmentInspectionResponse> {
  await initializeHostState();

  const accepted = assignmentAcceptedObservationPayloadSchema.parse(input);
  await assertCurrentHostAuthorityPubkey(accepted.hostAuthorityPubkey);

  const assignment = await requireRuntimeAssignmentRecord(accepted.assignmentId);

  if (
    assignment.runnerId !== accepted.runnerId ||
    assignment.runnerPubkey !== accepted.runnerPubkey
  ) {
    throw new Error(
      `Assignment '${accepted.assignmentId}' acceptance did not match the assigned runner.`
    );
  }

  const updated = runtimeAssignmentRecordSchema.parse({
    ...assignment,
    acceptedAt: accepted.acceptedAt,
    assignmentRevision: assignment.assignmentRevision + 1,
    ...(accepted.lease ? { lease: accepted.lease } : {}),
    status: "accepted",
    updatedAt: accepted.acceptedAt
  });

  await writeRuntimeAssignmentRecord(updated);

  return runtimeAssignmentInspectionResponseSchema.parse({
    assignment: updated
  });
}

export async function recordRuntimeAssignmentRejected(
  input: unknown
): Promise<RuntimeAssignmentInspectionResponse> {
  await initializeHostState();

  const rejected = assignmentRejectedObservationPayloadSchema.parse(input);
  await assertCurrentHostAuthorityPubkey(rejected.hostAuthorityPubkey);

  const assignment = await requireRuntimeAssignmentRecord(rejected.assignmentId);

  if (
    assignment.runnerId !== rejected.runnerId ||
    assignment.runnerPubkey !== rejected.runnerPubkey
  ) {
    throw new Error(
      `Assignment '${rejected.assignmentId}' rejection did not match the assigned runner.`
    );
  }

  const updated = runtimeAssignmentRecordSchema.parse({
    ...assignment,
    assignmentRevision: assignment.assignmentRevision + 1,
    rejectedAt: rejected.rejectedAt,
    rejectionReason: rejected.rejectionReason,
    status: "rejected",
    updatedAt: rejected.rejectedAt
  });

  await writeRuntimeAssignmentRecord(updated);

  return runtimeAssignmentInspectionResponseSchema.parse({
    assignment: updated
  });
}

export async function recordRuntimeAssignmentReceiptObservation(
  input: unknown
): Promise<HostEventRecord> {
  await initializeHostState();

  const receipt = assignmentReceiptPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(receipt);

  return appendHostEvent({
    assignmentId: receipt.assignmentId,
    category: "runtime",
    hostAuthorityPubkey: receipt.hostAuthorityPubkey,
    message:
      `Assignment '${receipt.assignmentId}' reported receipt ` +
      `'${receipt.receiptKind}' from runner '${receipt.runnerId}'.`,
    observedAt: receipt.observedAt,
    receiptKind: receipt.receiptKind,
    ...(receipt.message ? { receiptMessage: receipt.message } : {}),
    runnerId: receipt.runnerId,
    runnerPubkey: receipt.runnerPubkey,
    type: "runtime.assignment.receipt"
  } satisfies RuntimeAssignmentReceiptEventInput);
}

export async function recordRuntimeCommandReceiptObservation(
  input: unknown
): Promise<HostEventRecord> {
  await initializeHostState();

  const receipt = runtimeCommandReceiptPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(receipt);

  return appendHostEvent({
    ...(receipt.artifactId ? { artifactId: receipt.artifactId } : {}),
    ...(receipt.assignmentId ? { assignmentId: receipt.assignmentId } : {}),
    ...(receipt.cancellationId
      ? { cancellationId: receipt.cancellationId }
      : {}),
    ...(receipt.candidateId ? { candidateId: receipt.candidateId } : {}),
    category: "runtime",
    commandEventType: receipt.commandEventType,
    commandId: receipt.commandId,
    graphId: receipt.graphId,
    hostAuthorityPubkey: receipt.hostAuthorityPubkey,
    message:
      `Runtime command '${receipt.commandId}' reported ` +
      `'${receipt.status}' from runner '${receipt.runnerId}'.`,
    nodeId: receipt.nodeId,
    observedAt: receipt.observedAt,
    ...(receipt.proposalId ? { proposalId: receipt.proposalId } : {}),
    ...(receipt.message ? { receiptMessage: receipt.message } : {}),
    receiptStatus: receipt.status,
    ...(receipt.replayId ? { replayId: receipt.replayId } : {}),
    ...(receipt.restoreId ? { restoreId: receipt.restoreId } : {}),
    runnerId: receipt.runnerId,
    runnerPubkey: receipt.runnerPubkey,
    ...(receipt.sessionId ? { sessionId: receipt.sessionId } : {}),
    ...(receipt.sourceHistoryId
      ? { sourceHistoryId: receipt.sourceHistoryId }
      : {}),
    ...(receipt.targetPath ? { targetPath: receipt.targetPath } : {}),
    type: "runtime.command.receipt",
    ...(receipt.wikiArtifactId ? { wikiArtifactId: receipt.wikiArtifactId } : {}),
    ...(receipt.wikiPageExpectedSha256
      ? { wikiPageExpectedSha256: receipt.wikiPageExpectedSha256 }
      : {}),
    ...(receipt.wikiPageNextSha256
      ? { wikiPageNextSha256: receipt.wikiPageNextSha256 }
      : {}),
    ...(receipt.wikiPagePath ? { wikiPagePath: receipt.wikiPagePath } : {}),
    ...(receipt.wikiPagePreviousSha256
      ? { wikiPagePreviousSha256: receipt.wikiPagePreviousSha256 }
      : {})
  } satisfies RuntimeCommandReceiptEventInput);
}

async function assertRegisteredObservationRunner(input: {
  hostAuthorityPubkey: string;
  runnerId: string;
  runnerPubkey: string;
}): Promise<RunnerRegistrationRecord> {
  await assertCurrentHostAuthorityPubkey(input.hostAuthorityPubkey);
  const registration = await requireRunnerRegistration(input.runnerId);

  if (registration.publicKey !== input.runnerPubkey) {
    throw new Error(
      `Runner '${input.runnerId}' observation was signed by a different public key.`
    );
  }

  return registration;
}

function observedArtifactRefRecordPath(input: {
  artifactId: string;
  nodeId: string;
}): string {
  return path.join(
    observedArtifactRefsRoot,
    `${input.nodeId}--${input.artifactId}.json`
  );
}

function observedSourceChangeRefRecordPath(input: {
  candidateId: string;
  nodeId: string;
}): string {
  return path.join(
    observedSourceChangeRefsRoot,
    `${input.nodeId}--${input.candidateId}.json`
  );
}

function observedSourceHistoryRefRecordPath(input: {
  nodeId: string;
  sourceHistoryId: string;
}): string {
  return path.join(
    observedSourceHistoryRefsRoot,
    `${input.nodeId}--${input.sourceHistoryId}.json`
  );
}

function observedSourceHistoryReplayRecordPath(input: {
  nodeId: string;
  replayId: string;
}): string {
  return path.join(
    observedSourceHistoryReplaysRoot,
    `${input.nodeId}--${input.replayId}.json`
  );
}

function observedWikiRefRecordPath(input: {
  artifactId: string;
  nodeId: string;
}): string {
  return path.join(
    observedWikiRefsRoot,
    `${input.nodeId}--${input.artifactId}.json`
  );
}

function observedSessionActivityRecordPath(input: {
  nodeId: string;
  sessionId: string;
}): string {
  return path.join(
    observedSessionActivityRoot,
    `${input.nodeId}--${input.sessionId}.json`
  );
}

function observedConversationActivityRecordPath(input: {
  conversationId: string;
  nodeId: string;
}): string {
  return path.join(
    observedConversationActivityRoot,
    `${input.nodeId}--${input.conversationId}.json`
  );
}

function observedRunnerTurnActivityRecordPath(input: {
  nodeId: string;
  turnId: string;
}): string {
  return path.join(
    observedRunnerTurnActivityRoot,
    `${input.nodeId}--${input.turnId}.json`
  );
}

export async function recordSessionUpdatedObservation(
  input: unknown
): Promise<ObservedSessionActivityRecord | undefined> {
  await initializeHostState();

  const observation = sessionUpdatedObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const sessionRecord =
    observation.session ??
    sessionRecordSchema.parse({
      activeConversationIds: [],
      graphId: observation.graphId,
      ownerNodeId: observation.nodeId,
      rootArtifactIds: [],
      sessionId: observation.sessionId,
      status: observation.status,
      traceId: observation.sessionId,
      updatedAt: observation.updatedAt,
      openedAt: observation.updatedAt,
      waitingApprovalIds: []
    });
  const fingerprint = buildObservationFingerprint(sessionRecord);
  const existingRecord = await readObservedSessionActivityRecord(
    observation.nodeId,
    sessionRecord.sessionId
  );
  const record = observedSessionActivityRecordSchema.parse({
    activeConversationIds: sessionRecord.activeConversationIds,
    fingerprint,
    graphId: sessionRecord.graphId,
    ...(sessionRecord.lastMessageType
      ? { lastMessageType: sessionRecord.lastMessageType }
      : {}),
    nodeId: observation.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
    rootArtifactIds: sessionRecord.rootArtifactIds,
    schemaVersion: "1",
    session: sessionRecord,
    sessionId: sessionRecord.sessionId,
    source: "observation_event",
    status: sessionRecord.status,
    traceId: sessionRecord.traceId,
    updatedAt: sessionRecord.updatedAt
  });

  await writeJsonFileIfChanged(
    observedSessionActivityRecordPath({
      nodeId: record.nodeId,
      sessionId: record.sessionId
    }),
    record
  );

  if (existingRecord?.fingerprint === record.fingerprint) {
    return record;
  }

  await appendHostEvent({
    activeConversationIds: record.activeConversationIds,
    category: "session",
    graphId: record.graphId,
    ...(record.lastMessageType ? { lastMessageType: record.lastMessageType } : {}),
    message:
      `Session '${record.sessionId}' on node '${record.nodeId}' is now ` +
      `'${record.status}' with ${record.activeConversationIds.length} active ` +
      "conversation(s).",
    nodeId: record.nodeId,
    ownerNodeId: record.ownerNodeId,
    rootArtifactIds: record.rootArtifactIds,
    sessionId: record.sessionId,
    status: record.status,
    traceId: record.traceId,
    type: "session.updated",
    updatedAt: record.updatedAt
  } satisfies SessionUpdatedEventInput);

  return record;
}

export async function recordConversationUpdatedObservation(
  input: unknown
): Promise<ObservedConversationActivityRecord | undefined> {
  await initializeHostState();

  const observation = conversationUpdatedObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);

  if (!observation.conversation) {
    return undefined;
  }

  const conversationRecord = observation.conversation;
  const fingerprint = buildObservationFingerprint(conversationRecord);
  const existingRecord = await readObservedConversationActivityRecord(
    observation.nodeId,
    conversationRecord.conversationId
  );
  const record = observedConversationActivityRecordSchema.parse({
    artifactIds: conversationRecord.artifactIds,
    conversationId: conversationRecord.conversationId,
    fingerprint,
    followupCount: conversationRecord.followupCount,
    graphId: conversationRecord.graphId,
    initiator: conversationRecord.initiator,
    lastMessageType: conversationRecord.lastMessageType,
    nodeId: observation.nodeId,
    peerNodeId: conversationRecord.peerNodeId,
    schemaVersion: "1",
    sessionId: conversationRecord.sessionId,
    source: "observation_event",
    status: conversationRecord.status,
    updatedAt: conversationRecord.updatedAt
  });

  await writeJsonFileIfChanged(
    observedConversationActivityRecordPath({
      conversationId: record.conversationId,
      nodeId: record.nodeId
    }),
    record
  );

  if (existingRecord?.fingerprint === record.fingerprint) {
    return record;
  }

  await appendHostEvent({
    artifactIds: record.artifactIds,
    category: "session",
    conversationId: record.conversationId,
    followupCount: record.followupCount,
    graphId: record.graphId,
    initiator: record.initiator,
    lastMessageType: record.lastMessageType,
    message:
      `Conversation '${record.conversationId}' on node '${record.nodeId}' ` +
      `is now '${record.status}'.`,
    nodeId: record.nodeId,
    peerNodeId: record.peerNodeId,
    sessionId: record.sessionId,
    status: record.status,
    type: "conversation.trace.event",
    updatedAt: record.updatedAt
  } satisfies ConversationTraceEventInput);

  return record;
}

export async function recordTurnUpdatedObservation(
  input: unknown
): Promise<ObservedRunnerTurnActivityRecord | undefined> {
  await initializeHostState();

  const observation = turnUpdatedObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);

  if (!observation.turn) {
    return undefined;
  }

  const turnRecord = observation.turn;
  const fingerprint = buildObservationFingerprint(turnRecord);
  const existingRecord = await readObservedRunnerTurnActivityRecord(
    observation.nodeId,
    turnRecord.turnId
  );
  const record = observedRunnerTurnActivityRecordSchema.parse({
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
    ...(turnRecord.engineOutcome ? { engineOutcome: turnRecord.engineOutcome } : {}),
    ...(turnRecord.engineRequestSummary
      ? { engineRequestSummary: turnRecord.engineRequestSummary }
      : {}),
    emittedHandoffMessageIds: turnRecord.emittedHandoffMessageIds,
    fingerprint,
    graphId: turnRecord.graphId,
    ...(turnRecord.memoryRepositorySyncOutcome
      ? { memoryRepositorySyncOutcome: turnRecord.memoryRepositorySyncOutcome }
      : {}),
    ...(turnRecord.memorySynthesisOutcome
      ? { memorySynthesisOutcome: turnRecord.memorySynthesisOutcome }
      : {}),
    nodeId: observation.nodeId,
    phase: turnRecord.phase,
    producedArtifactIds: turnRecord.producedArtifactIds,
    schemaVersion: "1",
    sessionId: turnRecord.sessionId,
    source: "observation_event",
    sourceChangeCandidateIds: turnRecord.sourceChangeCandidateIds,
    ...(turnRecord.sourceChangeSummary
      ? { sourceChangeSummary: turnRecord.sourceChangeSummary }
      : {}),
    startedAt: turnRecord.startedAt,
    triggerKind: turnRecord.triggerKind,
    turn: turnRecord,
    turnId: turnRecord.turnId,
    updatedAt: turnRecord.updatedAt
  });

  await writeJsonFileIfChanged(
    observedRunnerTurnActivityRecordPath({
      nodeId: record.nodeId,
      turnId: record.turnId
    }),
    record
  );

  if (existingRecord?.fingerprint === record.fingerprint) {
    return record;
  }

  await appendHostEvent({
    category: "runner",
    consumedArtifactIds: record.consumedArtifactIds,
    conversationId: record.conversationId,
    ...(record.engineOutcome ? { engineOutcome: record.engineOutcome } : {}),
    ...(record.engineRequestSummary
      ? { engineRequestSummary: record.engineRequestSummary }
      : {}),
    emittedHandoffMessageIds: record.emittedHandoffMessageIds,
    graphId: record.graphId,
    message:
      `Runner turn '${record.turnId}' on node '${record.nodeId}' is now in phase ` +
      `'${record.phase}'.`,
    nodeId: record.nodeId,
    phase: record.phase,
    producedArtifactIds: record.producedArtifactIds,
    sessionId: record.sessionId,
    sourceChangeCandidateIds: record.sourceChangeCandidateIds,
    ...(record.sourceChangeSummary
      ? { sourceChangeSummary: record.sourceChangeSummary }
      : {}),
    startedAt: record.startedAt,
    triggerKind: record.triggerKind,
    turnId: record.turnId,
    type: "runner.turn.updated",
    updatedAt: record.updatedAt
  } satisfies RunnerTurnUpdatedEventInput);

  return record;
}

export async function recordApprovalUpdatedObservation(
  input: unknown
): Promise<ObservedApprovalActivityRecord | undefined> {
  await initializeHostState();

  const observation = approvalUpdatedObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);

  if (!observation.approval) {
    return undefined;
  }

  const approvalRecord = observation.approval;

  if (approvalRecord.graphId !== observation.graphId) {
    throw new Error(
      `Approval '${approvalRecord.approvalId}' belongs to graph '${approvalRecord.graphId}', not '${observation.graphId}'.`
    );
  }

  if (approvalRecord.requestedByNodeId !== observation.nodeId) {
    throw new Error(
      `Approval '${approvalRecord.approvalId}' was requested by node '${approvalRecord.requestedByNodeId}', not observed node '${observation.nodeId}'.`
    );
  }

  const fingerprint = buildObservationFingerprint(approvalRecord);
  const existingRecord = await readObservedApprovalActivityRecord(
    observation.nodeId,
    approvalRecord.approvalId
  );
  const record = observedApprovalActivityRecordSchema.parse({
    approval: approvalRecord,
    approvalId: approvalRecord.approvalId,
    approverNodeIds: approvalRecord.approverNodeIds,
    conversationId: approvalRecord.conversationId,
    fingerprint,
    graphId: approvalRecord.graphId,
    nodeId: observation.nodeId,
    ...(approvalRecord.operation ? { operation: approvalRecord.operation } : {}),
    ...(approvalRecord.resource ? { resource: approvalRecord.resource } : {}),
    requestedAt: approvalRecord.requestedAt,
    requestedByNodeId: approvalRecord.requestedByNodeId,
    schemaVersion: "1",
    sessionId: approvalRecord.sessionId,
    source: "observation_event",
    status: approvalRecord.status,
    updatedAt: approvalRecord.updatedAt
  });

  await writeJsonFileIfChanged(
    path.join(
      observedApprovalActivityRoot,
      `${record.nodeId}--${record.approvalId}.json`
    ),
    record
  );

  if (existingRecord?.fingerprint === record.fingerprint) {
    return record;
  }

  await appendHostEvent({
    approvalId: record.approvalId,
    approverNodeIds: record.approverNodeIds,
    category: "session",
    conversationId: record.conversationId,
    graphId: record.graphId,
    message:
      `Approval '${record.approvalId}' on node '${record.nodeId}' ` +
      `is now '${record.status}'.`,
    nodeId: record.nodeId,
    ...(record.operation ? { operation: record.operation } : {}),
    ...(record.resource ? { resource: record.resource } : {}),
    requestedAt: record.requestedAt,
    requestedByNodeId: record.requestedByNodeId,
    sessionId: record.sessionId,
    status: record.status,
    type: "approval.trace.event",
    updatedAt: record.updatedAt
  } satisfies ApprovalTraceEventInput);

  return record;
}

export async function recordArtifactRefObservation(
  input: unknown
): Promise<ArtifactRefProjectionRecord> {
  await initializeHostState();

  const observation = artifactRefObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const record = artifactRefProjectionRecordSchema.parse({
    artifactId: observation.artifactRef.artifactId,
    ...(observation.artifactRecord
      ? { artifactRecord: observation.artifactRecord }
      : {}),
    ...(observation.artifactPreview
      ? { artifactPreview: observation.artifactPreview }
      : {}),
    artifactRef: observation.artifactRef,
    graphId: observation.graphId,
    hostAuthorityPubkey: observation.hostAuthorityPubkey,
    nodeId: observation.nodeId,
    projection: {
      source: "observation_event",
      updatedAt: observation.observedAt
    },
    runnerId: observation.runnerId,
    runnerPubkey: observation.runnerPubkey
  });

  await writeJsonFileIfChanged(
    observedArtifactRefRecordPath({
      artifactId: record.artifactId,
      nodeId: record.nodeId
    }),
    record
  );
  return record;
}

export async function recordSourceChangeRefObservation(
  input: unknown
): Promise<SourceChangeRefProjectionRecord> {
  await initializeHostState();

  const observation = sourceChangeRefObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const sourceChangeSummary =
    observation.sourceChangeSummary ?? observation.candidate?.sourceChangeSummary;
  const record = sourceChangeRefProjectionRecordSchema.parse({
    artifactRefs: observation.artifactRefs,
    ...(observation.candidate ? { candidate: observation.candidate } : {}),
    candidateId: observation.candidateId,
    graphId: observation.graphId,
    hostAuthorityPubkey: observation.hostAuthorityPubkey,
    nodeId: observation.nodeId,
    projection: {
      source: "observation_event",
      updatedAt: observation.observedAt
    },
    runnerId: observation.runnerId,
    runnerPubkey: observation.runnerPubkey,
    ...(sourceChangeSummary ? { sourceChangeSummary } : {}),
    status: observation.status
  });

  await writeJsonFileIfChanged(
    observedSourceChangeRefRecordPath({
      candidateId: record.candidateId,
      nodeId: record.nodeId
    }),
    record
  );
  return record;
}

export async function recordSourceHistoryRefObservation(
  input: unknown
): Promise<SourceHistoryRefProjectionRecord> {
  await initializeHostState();

  const observation = sourceHistoryRefObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const record = sourceHistoryRefProjectionRecordSchema.parse({
    graphId: observation.graphId,
    history: observation.history,
    hostAuthorityPubkey: observation.hostAuthorityPubkey,
    nodeId: observation.nodeId,
    projection: {
      source: "observation_event",
      updatedAt: observation.observedAt
    },
    runnerId: observation.runnerId,
    runnerPubkey: observation.runnerPubkey,
    sourceHistoryId: observation.sourceHistoryId
  });

  await writeJsonFileIfChanged(
    observedSourceHistoryRefRecordPath({
      nodeId: record.nodeId,
      sourceHistoryId: record.sourceHistoryId
    }),
    record
  );
  return record;
}

export async function recordSourceHistoryReplayedObservation(
  input: unknown
): Promise<HostEventRecord> {
  await initializeHostState();

  const observation = sourceHistoryReplayedObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const { replay } = observation;
  const projection = sourceHistoryReplayProjectionRecordSchema.parse({
    graphId: observation.graphId,
    hostAuthorityPubkey: observation.hostAuthorityPubkey,
    nodeId: observation.nodeId,
    projection: {
      source: "observation_event",
      updatedAt: observation.observedAt
    },
    replay,
    replayId: observation.replayId,
    runnerId: observation.runnerId,
    runnerPubkey: observation.runnerPubkey,
    sourceHistoryId: observation.sourceHistoryId
  });

  await writeJsonFileIfChanged(
    observedSourceHistoryReplayRecordPath({
      nodeId: projection.nodeId,
      replayId: projection.replayId
    }),
    projection
  );

  return appendHostEvent({
    ...(replay.approvalId ? { approvalId: replay.approvalId } : {}),
    candidateId: replay.candidateId,
    category: "runtime",
    commit: replay.commit,
    graphId: replay.graphId,
    graphRevisionId: replay.graphRevisionId,
    historyId: replay.sourceHistoryId,
    message:
      `Source history '${replay.sourceHistoryId}' for runtime '${replay.nodeId}' ` +
      `replay '${replay.replayId}' completed with status '${replay.status}'.`,
    nodeId: replay.nodeId,
    replayId: replay.replayId,
    replayStatus: replay.status,
    turnId: replay.turnId,
    type: "source_history.replayed"
  } satisfies SourceHistoryReplayedEventInput);
}

export async function recordWikiRefObservation(
  input: unknown
): Promise<WikiRefProjectionRecord> {
  await initializeHostState();

  const observation = wikiRefObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const record = wikiRefProjectionRecordSchema.parse({
    artifactId: observation.artifactRef.artifactId,
    ...(observation.artifactPreview
      ? { artifactPreview: observation.artifactPreview }
      : {}),
    artifactRef: observation.artifactRef,
    graphId: observation.graphId,
    hostAuthorityPubkey: observation.hostAuthorityPubkey,
    nodeId: observation.nodeId,
    projection: {
      source: "observation_event",
      updatedAt: observation.observedAt
    },
    runnerId: observation.runnerId,
    runnerPubkey: observation.runnerPubkey
  });

  await writeJsonFileIfChanged(
    observedWikiRefRecordPath({
      artifactId: record.artifactId,
      nodeId: record.nodeId
    }),
    record
  );
  return record;
}

export async function recordRuntimeStatusObservation(
  input: unknown
): Promise<ObservedRuntimeRecord> {
  const queued = runtimeStatusObservationQueue.then(() =>
    recordRuntimeStatusObservationInner(input)
  );

  runtimeStatusObservationQueue = queued.then(
    () => undefined,
    () => undefined
  );

  return queued;
}

function shouldIgnoreRuntimeStatusObservation(input: {
  existing: ObservedRuntimeRecord;
  nextObservedAt: string;
  nextObservedState: RuntimeObservedState;
}): boolean {
  if (input.nextObservedAt < input.existing.lastSeenAt) {
    return true;
  }

  return (
    input.nextObservedAt === input.existing.lastSeenAt &&
    input.existing.observedState === "running" &&
    input.nextObservedState === "starting"
  );
}

async function recordRuntimeStatusObservationInner(
  input: unknown
): Promise<ObservedRuntimeRecord> {
  await initializeHostState();

  const observation = runtimeStatusObservationPayloadSchema.parse(input);
  await assertRegisteredObservationRunner(observation);
  const existingObservedRecord = await readObservedRuntimeRecord(
    observation.nodeId
  );

  if (
    existingObservedRecord &&
    shouldIgnoreRuntimeStatusObservation({
      existing: existingObservedRecord,
      nextObservedAt: observation.observedAt,
      nextObservedState: observation.observedState
    })
  ) {
    return existingObservedRecord;
  }

  const graphRevisionId =
    observation.graphRevisionId ?? existingObservedRecord?.graphRevisionId;

  if (!graphRevisionId) {
    throw new Error(
      `Runtime status observation for node '${observation.nodeId}' did not ` +
        "include graphRevisionId and no prior observed runtime record exists."
    );
  }

  const observedRecord = observedRuntimeRecordSchema.parse({
    ...(observation.assignmentId
      ? { assignmentId: observation.assignmentId }
      : {}),
    backendKind: "federated",
    ...(observation.clientUrl ? { clientUrl: observation.clientUrl } : {}),
    graphId: observation.graphId,
    graphRevisionId,
    lastSeenAt: observation.observedAt,
    nodeId: observation.nodeId,
    observedState: observation.observedState,
    runnerId: observation.runnerId,
    runtimeHandle:
      `federated:${observation.runnerId}:` +
      `${observation.assignmentId ?? observation.nodeId}`,
    schemaVersion: "1",
    ...(observation.statusMessage
      ? { statusMessage: observation.statusMessage }
      : {})
  });

  await writeJsonFileIfChanged(
    path.join(observedRuntimesRoot, `${observation.nodeId}.json`),
    observedRecord
  );

  if (didObservedRuntimeChange(existingObservedRecord, observedRecord)) {
    const intent = await readRuntimeIntentRecord(observation.nodeId);
    await appendHostEvent({
      backendKind: observedRecord.backendKind,
      category: "runtime",
      desiredState: intent?.desiredState ?? "running",
      graphId: observedRecord.graphId,
      graphRevisionId: observedRecord.graphRevisionId,
      message: `Runtime '${observation.nodeId}' observed state is now '${observedRecord.observedState}'.`,
      nodeId: observation.nodeId,
      observedState: observedRecord.observedState,
      previousObservedState: existingObservedRecord?.observedState,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      type: "runtime.observed_state.changed"
    } satisfies RuntimeObservedStateChangedEventInput);
  }

  return observedRecord;
}

export async function revokeRuntimeAssignment(input: {
  assignmentId: string;
  request?: RuntimeAssignmentRevokeRequest;
}): Promise<RuntimeAssignmentRevokeResponse> {
  await initializeHostState();

  const request = runtimeAssignmentRevokeRequestSchema.parse(input.request ?? {});
  const assignment = await requireRuntimeAssignmentRecord(input.assignmentId);
  const revokedAt = nowIsoString();
  const revoked = runtimeAssignmentRecordSchema.parse({
    ...assignment,
    assignmentRevision: assignment.assignmentRevision + 1,
    ...(request.reason ? { revocationReason: request.reason } : {}),
    revokedAt,
    status: "revoked",
    updatedAt: revokedAt
  });

  await writeRuntimeAssignmentRecord(revoked);

  return runtimeAssignmentRevokeResponseSchema.parse({
    assignment: revoked
  });
}

function assignmentProjectionSource(
  assignment: RuntimeAssignmentRecord
): "desired_state" | "observation_event" {
  return assignment.status === "accepted" || assignment.status === "rejected"
    ? "observation_event"
    : "desired_state";
}

const runtimeProjectionAssignmentStatuses = new Set<
  RuntimeAssignmentRecord["status"]
>(["active", "accepted", "offered", "revoking"]);

function selectRuntimeProjectionAssignment(input: {
  assignments: RuntimeAssignmentRecord[];
  nodeId: string;
}): RuntimeAssignmentRecord | undefined {
  return input.assignments
    .filter(
      (assignment) =>
        assignment.nodeId === input.nodeId &&
        runtimeProjectionAssignmentStatuses.has(assignment.status)
    )
    .sort((left, right) => {
      const statusPriority = (status: RuntimeAssignmentRecord["status"]) =>
        status === "active" || status === "accepted"
          ? 0
          : status === "offered"
            ? 1
            : 2;
      const priorityOrder =
        statusPriority(left.status) - statusPriority(right.status);

      if (priorityOrder !== 0) {
        return priorityOrder;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })[0];
}

async function listRuntimeProjectionRecords(input: {
  assignments: RuntimeAssignmentRecord[];
  hostAuthorityPubkey: string;
}): Promise<RuntimeProjectionRecord[]> {
  const { activeRevisionId, graph } = await readActiveGraphState();
  const runtimeNodeIds = new Set(
    graph?.nodes
      .filter((node) => node.nodeKind !== "user")
      .map((node) => node.nodeId) ?? []
  );

  for (const nodeId of await listObservedRuntimeNodeIds()) {
    runtimeNodeIds.add(nodeId);
  }

  for (const assignment of input.assignments) {
    if (runtimeProjectionAssignmentStatuses.has(assignment.status)) {
      runtimeNodeIds.add(assignment.nodeId);
    }
  }

  const records = await Promise.all(
    [...runtimeNodeIds].map(async (nodeId) => {
      const [intent, observed] = await Promise.all([
        readRuntimeIntentRecord(nodeId),
        readObservedRuntimeRecord(nodeId)
      ]);
      const assignment = selectRuntimeProjectionAssignment({
        assignments: input.assignments,
        nodeId
      });
      const graphId =
        observed?.graphId ?? intent?.graphId ?? assignment?.graphId ?? graph?.graphId;
      const graphRevisionId =
        observed?.graphRevisionId ??
        intent?.graphRevisionId ??
        assignment?.graphRevisionId ??
        activeRevisionId;
      const updatedAt =
        observed?.lastSeenAt ?? intent?.updatedAt ?? assignment?.updatedAt;

      if (!graphId || !graphRevisionId) {
        return undefined;
      }

      if (!updatedAt) {
        return runtimeProjectionRecordSchema.parse({
          backendKind: "federated",
          desiredState: "running",
          graphId,
          graphRevisionId,
          hostAuthorityPubkey: input.hostAuthorityPubkey,
          nodeId,
          observedState: "missing",
          projection: {
            source: "desired_state",
            updatedAt: nowIsoString()
          },
          restartGeneration: 0
        });
      }

      return runtimeProjectionRecordSchema.parse({
        ...(observed?.assignmentId ?? assignment?.assignmentId
          ? { assignmentId: observed?.assignmentId ?? assignment?.assignmentId }
          : {}),
        backendKind: observed?.backendKind ?? "federated",
        ...(observed?.clientUrl ? { clientUrl: observed.clientUrl } : {}),
        desiredState: intent?.desiredState ?? "running",
        graphId,
        graphRevisionId,
        hostAuthorityPubkey: input.hostAuthorityPubkey,
        ...(observed?.lastSeenAt ? { lastSeenAt: observed.lastSeenAt } : {}),
        nodeId,
        observedState: observed?.observedState ?? "missing",
        projection: {
          source: observed
            ? "observation_event"
            : assignment
              ? "control_event"
              : "desired_state",
          updatedAt
        },
        restartGeneration: intent?.restartGeneration ?? 0,
        ...(observed?.runnerId ?? assignment?.runnerId
          ? { runnerId: observed?.runnerId ?? assignment?.runnerId }
          : {}),
        ...(observed?.runtimeHandle
          ? { runtimeHandle: observed.runtimeHandle }
          : {}),
        ...(observed?.statusMessage
          ? { statusMessage: observed.statusMessage }
          : {})
      });
    })
  );

  return records
    .filter((record): record is RuntimeProjectionRecord => Boolean(record))
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));
}

async function listAssignmentReceiptProjectionRecords(): Promise<
  AssignmentReceiptProjectionRecord[]
> {
  const events = (await listHostEvents(500)).events;

  return events
    .filter((event) => event.type === "runtime.assignment.receipt")
    .map((event) =>
      assignmentReceiptProjectionRecordSchema.parse({
        assignmentId: event.assignmentId,
        hostAuthorityPubkey: event.hostAuthorityPubkey,
        observedAt: event.observedAt,
        projection: {
          source: "observation_event",
          updatedAt: event.timestamp
        },
        receiptKind: event.receiptKind,
        ...(event.receiptMessage
          ? { receiptMessage: event.receiptMessage }
          : {}),
        runnerId: event.runnerId,
        runnerPubkey: event.runnerPubkey
      })
    )
    .sort((left, right) => {
      const timeOrder = right.observedAt.localeCompare(left.observedAt);
      return timeOrder !== 0
        ? timeOrder
        : left.assignmentId.localeCompare(right.assignmentId);
    });
}

async function listRuntimeCommandReceiptProjectionRecords() {
  const events = (await listHostEvents(500)).events;

  return events
    .filter((event) => event.type === "runtime.command.receipt")
    .map((event) =>
      runtimeCommandReceiptProjectionRecordSchema.parse({
        ...(event.artifactId ? { artifactId: event.artifactId } : {}),
        ...(event.assignmentId ? { assignmentId: event.assignmentId } : {}),
        ...(event.cancellationId
          ? { cancellationId: event.cancellationId }
          : {}),
        ...(event.candidateId ? { candidateId: event.candidateId } : {}),
        commandEventType: event.commandEventType,
        commandId: event.commandId,
        graphId: event.graphId,
        hostAuthorityPubkey: event.hostAuthorityPubkey,
        nodeId: event.nodeId,
        observedAt: event.observedAt,
        projection: {
          source: "observation_event",
          updatedAt: event.timestamp
        },
        ...(event.proposalId ? { proposalId: event.proposalId } : {}),
        ...(event.receiptMessage
          ? { receiptMessage: event.receiptMessage }
          : {}),
        receiptStatus: event.receiptStatus,
        ...(event.replayId ? { replayId: event.replayId } : {}),
        ...(event.restoreId ? { restoreId: event.restoreId } : {}),
        runnerId: event.runnerId,
        runnerPubkey: event.runnerPubkey,
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
        ...(event.sourceHistoryId
          ? { sourceHistoryId: event.sourceHistoryId }
          : {}),
        ...(event.targetPath ? { targetPath: event.targetPath } : {}),
        ...(event.wikiArtifactId
          ? { wikiArtifactId: event.wikiArtifactId }
          : {}),
        ...(event.wikiPageExpectedSha256
          ? { wikiPageExpectedSha256: event.wikiPageExpectedSha256 }
          : {}),
        ...(event.wikiPageNextSha256
          ? { wikiPageNextSha256: event.wikiPageNextSha256 }
          : {}),
        ...(event.wikiPagePath ? { wikiPagePath: event.wikiPagePath } : {}),
        ...(event.wikiPagePreviousSha256
          ? { wikiPagePreviousSha256: event.wikiPagePreviousSha256 }
          : {})
      })
    )
    .sort((left, right) => {
      const timeOrder = right.observedAt.localeCompare(left.observedAt);
      return timeOrder !== 0
        ? timeOrder
        : left.commandId.localeCompare(right.commandId);
    });
}

async function listArtifactRefProjectionRecords(): Promise<
  ArtifactRefProjectionRecord[]
> {
  if (!(await pathExists(observedArtifactRefsRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedArtifactRefsRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        artifactRefProjectionRecordSchema.parse(
          await readJsonFile(path.join(observedArtifactRefsRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.artifactId}`.localeCompare(
      `${right.nodeId}--${right.artifactId}`
    )
  );
}

async function listSourceChangeRefProjectionRecords(): Promise<
  SourceChangeRefProjectionRecord[]
> {
  if (!(await pathExists(observedSourceChangeRefsRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedSourceChangeRefsRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        sourceChangeRefProjectionRecordSchema.parse(
          await readJsonFile(path.join(observedSourceChangeRefsRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.candidateId}`.localeCompare(
      `${right.nodeId}--${right.candidateId}`
    )
  );
}

async function listSourceHistoryRefProjectionRecords(): Promise<
  SourceHistoryRefProjectionRecord[]
> {
  if (!(await pathExists(observedSourceHistoryRefsRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedSourceHistoryRefsRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        sourceHistoryRefProjectionRecordSchema.parse(
          await readJsonFile(path.join(observedSourceHistoryRefsRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.sourceHistoryId}`.localeCompare(
      `${right.nodeId}--${right.sourceHistoryId}`
    )
  );
}

async function listSourceHistoryReplayProjectionRecords(): Promise<
  SourceHistoryReplayProjectionRecord[]
> {
  if (!(await pathExists(observedSourceHistoryReplaysRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedSourceHistoryReplaysRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        sourceHistoryReplayProjectionRecordSchema.parse(
          await readJsonFile(path.join(observedSourceHistoryReplaysRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.replay.updatedAt}--${left.replayId}`.localeCompare(
      `${right.nodeId}--${right.replay.updatedAt}--${right.replayId}`
    )
  );
}

async function listWikiRefProjectionRecords(): Promise<WikiRefProjectionRecord[]> {
  if (!(await pathExists(observedWikiRefsRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedWikiRefsRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        wikiRefProjectionRecordSchema.parse(
          await readJsonFile(path.join(observedWikiRefsRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.artifactId}`.localeCompare(
      `${right.nodeId}--${right.artifactId}`
    )
  );
}

function mergeProjectionArtifactIds(
  current: string[],
  nextRefs: UserNodeMessageRecord["artifactRefs"]
): string[] {
  return [
    ...new Set([
      ...current,
      ...nextRefs.map((artifactRef) => artifactRef.artifactId)
    ])
  ].sort((left, right) => left.localeCompare(right));
}

function inferUserConversationStatusFromMessage(
  record: UserNodeMessageRecord
): UserConversationProjectionRecord["status"] {
  switch (record.messageType) {
    case "approval.request":
      return "awaiting_approval";
    case "conversation.close":
      return "closed";
    case "task.result":
      return "resolved";
    default:
      return "opened";
  }
}

function resolveUserConversationStatusFromMessage(input: {
  existing?: UserConversationProjectionRecord | undefined;
  messageIsNewer: boolean;
  record: UserNodeMessageRecord;
}): UserConversationProjectionRecord["status"] {
  const inferredStatus = inferUserConversationStatusFromMessage(input.record);

  if (!input.existing) {
    return inferredStatus;
  }

  if (!input.messageIsNewer || inferredStatus === "opened") {
    return input.existing.status;
  }

  return inferredStatus;
}

function mergePendingApprovalIdsFromMessage(input: {
  existing?: string[] | undefined;
  record: UserNodeMessageRecord;
}): string[] {
  const existing = input.existing ?? [];
  const approvalId = input.record.approval?.approvalId;

  if (!approvalId) {
    return existing;
  }

  if (input.record.messageType === "approval.response") {
    return existing.filter((candidate) => candidate !== approvalId);
  }

  if (input.record.messageType !== "approval.request") {
    return existing;
  }

  return [...new Set([...existing, approvalId])].sort((left, right) =>
    left.localeCompare(right)
  );
}

async function listUserConversationProjectionRecords(): Promise<
  UserConversationProjectionRecord[]
> {
  const { graph } = await readActiveGraphState();
  const userNodeIds = new Set(
    graph?.nodes
      .filter((node) => node.nodeKind === "user")
      .map((node) => node.nodeId) ?? []
  );

  if (userNodeIds.size === 0 || !graph) {
    return [];
  }

  const records = (await pathExists(observedConversationActivityRoot))
    ? await Promise.all(
        (await readdir(observedConversationActivityRoot))
          .filter((entry) => entry.endsWith(".json"))
          .map(async (entry) =>
            observedConversationActivityRecordSchema.parse(
              await readJsonFile(path.join(observedConversationActivityRoot, entry))
            )
          )
      )
    : [];
  const messageRecords = (
    await Promise.all(
      [...userNodeIds].map((userNodeId) =>
        listUserNodeMessageRecords({
          userNodeId
        })
      )
    )
  ).flat();
  const readRecords = (
    await Promise.all(
      [...userNodeIds].map((userNodeId) =>
        listUserNodeConversationReadRecords({
          userNodeId
        })
      )
    )
  ).flat();
  const readRecordsByConversation = new Map(
    readRecords.map((record) => [
      `${record.userNodeId}--${record.conversationId}`,
      record
    ])
  );
  const projectedRecords = new Map<string, UserConversationProjectionRecord>();

  for (const record of records) {
    const userNodeId = userNodeIds.has(record.peerNodeId)
      ? record.peerNodeId
      : userNodeIds.has(record.nodeId)
        ? record.nodeId
        : undefined;

    if (!userNodeId) {
      continue;
    }

    const readRecord = readRecordsByConversation.get(
      `${userNodeId}--${record.conversationId}`
    );
    const projectionRecord = userConversationProjectionRecordSchema.parse({
      artifactIds: record.artifactIds,
      conversationId: record.conversationId,
      graphId: record.graphId,
      lastMessageAt: record.updatedAt,
      ...(readRecord?.readAt ? { lastReadAt: readRecord.readAt } : {}),
      ...(record.lastMessageType ? { lastMessageType: record.lastMessageType } : {}),
      peerNodeId: userNodeId === record.peerNodeId ? record.nodeId : record.peerNodeId,
      pendingApprovalIds: [],
      projection: {
        source: "observation_event",
        updatedAt: record.updatedAt
      },
      sessionId: record.sessionId,
      status: record.status,
      unreadCount: 0,
      userNodeId
    });
    projectedRecords.set(
      `${projectionRecord.userNodeId}--${projectionRecord.conversationId}`,
      projectionRecord
    );
  }

  for (const messageRecord of messageRecords) {
    const key = `${messageRecord.userNodeId}--${messageRecord.conversationId}`;
    const existing = projectedRecords.get(key);
    const readRecord = readRecordsByConversation.get(key);
    const existingLastMessageAt = existing?.lastMessageAt;
    const messageIsNewer =
      !existingLastMessageAt || messageRecord.createdAt >= existingLastMessageAt;
    const lastMessageAt = messageIsNewer
      ? messageRecord.createdAt
      : existingLastMessageAt;
    const lastMessageType = messageIsNewer
      ? messageRecord.messageType
      : existing.lastMessageType;

    projectedRecords.set(
      key,
      userConversationProjectionRecordSchema.parse({
        artifactIds: mergeProjectionArtifactIds(
          existing?.artifactIds ?? [],
          messageRecord.artifactRefs
        ),
        conversationId: messageRecord.conversationId,
        graphId: existing?.graphId ?? graph.graphId,
        lastMessageAt,
        ...(readRecord?.readAt ? { lastReadAt: readRecord.readAt } : {}),
        ...(lastMessageType ? { lastMessageType } : {}),
        peerNodeId: existing?.peerNodeId ?? messageRecord.peerNodeId,
        pendingApprovalIds: mergePendingApprovalIdsFromMessage({
          existing: existing?.pendingApprovalIds,
          record: messageRecord
        }),
        projection: {
          source: existing?.projection.source ?? "observation_event",
          updatedAt: lastMessageAt
        },
        sessionId: existing?.sessionId ?? messageRecord.sessionId,
        status: resolveUserConversationStatusFromMessage({
          ...(existing ? { existing } : {}),
          messageIsNewer,
          record: messageRecord
        }),
        unreadCount:
          (existing?.unreadCount ?? 0) +
          (messageRecord.direction === "inbound" &&
          (!readRecord || messageRecord.createdAt > readRecord.readAt)
            ? 1
            : 0),
        userNodeId: messageRecord.userNodeId
      })
    );
  }

  return [...projectedRecords.values()].sort((left, right) =>
    `${left.userNodeId}--${left.conversationId}`.localeCompare(
      `${right.userNodeId}--${right.conversationId}`
    )
  );
}

export async function getHostProjectionSnapshot(): Promise<HostProjectionSnapshot> {
  await initializeHostState();

  const authority = await ensureHostAuthorityMaterialized();
  const [
    runnerList,
    assignments,
    assignmentReceipts,
    runtimeCommandReceipts,
    artifactRefs,
    sourceChangeRefs,
    sourceHistoryRefs,
    sourceHistoryReplays,
    userConversations,
    wikiRefs
  ] = await Promise.all([
    listRunnerRegistry(),
    listRuntimeAssignmentRecords(),
    listAssignmentReceiptProjectionRecords(),
    listRuntimeCommandReceiptProjectionRecords(),
    listArtifactRefProjectionRecords(),
    listSourceChangeRefProjectionRecords(),
    listSourceHistoryRefProjectionRecords(),
    listSourceHistoryReplayProjectionRecords(),
    listUserConversationProjectionRecords(),
    listWikiRefProjectionRecords()
  ]);
  const runtimeProjections = await listRuntimeProjectionRecords({
    assignments,
    hostAuthorityPubkey: authority.publicKey
  });
  const hasStaleTrustedRunner = runnerList.runners.some(
    (runner) =>
      runner.registration.trustState === "trusted" &&
      (runner.liveness === "stale" || runner.liveness === "offline")
  );

  return hostProjectionSnapshotSchema.parse({
    artifactRefs,
    assignmentReceipts,
    assignments: assignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      graphId: assignment.graphId,
      graphRevisionId: assignment.graphRevisionId,
      hostAuthorityPubkey: assignment.hostAuthorityPubkey,
      ...(assignment.lease?.expiresAt
        ? { leaseExpiresAt: assignment.lease.expiresAt }
        : {}),
      nodeId: assignment.nodeId,
      projection: {
        source: assignmentProjectionSource(assignment),
        updatedAt: assignment.updatedAt
      },
      runnerId: assignment.runnerId,
      status: assignment.status
    })),
    freshness: hasStaleTrustedRunner ? "stale" : "current",
    generatedAt: nowIsoString(),
    hostAuthorityPubkey: authority.publicKey,
    runtimes: runtimeProjections,
    runtimeCommandReceipts,
    runners: runnerList.runners.map((runner) => ({
      assignmentIds: runner.heartbeat?.assignmentIds ?? [],
      hostAuthorityPubkey: runner.registration.hostAuthorityPubkey,
      ...(runner.registration.lastSeenAt ?? runner.heartbeat?.lastHeartbeatAt
        ? {
            lastSeenAt:
              runner.heartbeat?.lastHeartbeatAt ?? runner.registration.lastSeenAt
          }
        : {}),
      operationalState: runner.heartbeat?.operationalState ?? "unknown",
      projection: {
        source: "observation_event",
        updatedAt: runner.heartbeat?.updatedAt ?? runner.registration.updatedAt
      },
      publicKey: runner.registration.publicKey,
      runnerId: runner.registration.runnerId,
      trustState: runner.registration.trustState
    })),
    schemaVersion: "1",
    sourceChangeRefs,
    sourceHistoryRefs,
    sourceHistoryReplays,
    userConversations,
    wikiRefs
  });
}

async function listActiveGraphUserNodeIdentityRecords(): Promise<
  UserNodeIdentityRecord[]
> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const identities = await ensureUserNodeIdentitiesForGraph(graph);

  return identities.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
}

export async function listUserNodeIdentities(): Promise<UserNodeIdentityListResponse> {
  await initializeHostState();

  return userNodeIdentityListResponseSchema.parse({
    generatedAt: nowIsoString(),
    userNodes: await listActiveGraphUserNodeIdentityRecords()
  });
}

export async function getUserNodeIdentity(
  nodeId: string
): Promise<UserNodeIdentityInspectionResponse | undefined> {
  await initializeHostState();

  const identities = await listActiveGraphUserNodeIdentityRecords();
  const userNode = identities.find((identity) => identity.nodeId === nodeId);

  if (!userNode) {
    return undefined;
  }

  return userNodeIdentityInspectionResponseSchema.parse({
    gateways: [],
    userNode
  });
}

function observedUserNodeMessageRecordPath(input: {
  eventId: string;
  userNodeId: string;
}): string {
  return path.join(
    observedUserNodeMessagesRoot,
    `${input.userNodeId}--${input.eventId}.json`
  );
}

function observedUserNodeConversationReadRecordPath(input: {
  conversationId: string;
  userNodeId: string;
}): string {
  return path.join(
    observedUserNodeConversationReadsRoot,
    `${input.userNodeId}--${input.conversationId}.json`
  );
}

function extractUserNodeMessageApproval(
  message: UserNodeInboundMessageRecordRequest["message"]
): UserNodeMessageRecord["approval"] {
  if (message.messageType === "approval.request") {
    const metadata = entangleA2AApprovalRequestMetadataSchema.safeParse(
      message.work.metadata
    );

    return metadata.success ? metadata.data.approval : undefined;
  }

  if (message.messageType === "approval.response") {
    const metadata = entangleA2AApprovalResponseMetadataSchema.safeParse(
      message.work.metadata
    );

    return metadata.success
      ? {
          approvalId: metadata.data.approval.approvalId,
          approverNodeIds: [],
          decision: metadata.data.approval.decision,
          ...(metadata.data.approval.operation
            ? { operation: metadata.data.approval.operation }
            : {}),
          ...(metadata.data.approval.reason
            ? { reason: metadata.data.approval.reason }
            : {}),
          ...(metadata.data.approval.resource
            ? { resource: metadata.data.approval.resource }
            : {})
        }
      : undefined;
  }

  return undefined;
}

function extractUserNodeMessageSourceChangeReview(
  message: UserNodeInboundMessageRecordRequest["message"]
): UserNodeMessageRecord["sourceChangeReview"] {
  if (message.messageType !== "source_change.review") {
    return undefined;
  }

  const metadata = entangleA2ASourceChangeReviewMetadataSchema.safeParse(
    message.work.metadata
  );

  return metadata.success ? metadata.data.sourceChangeReview : undefined;
}

async function listUserNodeMessageRecords(input: {
  conversationId?: string;
  userNodeId: string;
}): Promise<UserNodeMessageRecord[]> {
  await initializeHostState();

  if (!(await pathExists(observedUserNodeMessagesRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedUserNodeMessagesRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        userNodeMessageRecordSchema.parse(
          await readJsonFile(path.join(observedUserNodeMessagesRoot, entry))
        )
      )
  );

  return records
    .filter(
      (record) =>
        record.userNodeId === input.userNodeId &&
        (!input.conversationId ||
          record.conversationId === input.conversationId)
    )
    .sort((left, right) => {
      const timeOrder = left.createdAt.localeCompare(right.createdAt);

      if (timeOrder !== 0) {
        return timeOrder;
      }

      return left.eventId.localeCompare(right.eventId);
    });
}

async function listUserNodeConversationReadRecords(input: {
  userNodeId: string;
}): Promise<UserNodeConversationReadRecord[]> {
  await initializeHostState();

  if (!(await pathExists(observedUserNodeConversationReadsRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedUserNodeConversationReadsRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        userNodeConversationReadRecordSchema.parse(
          await readJsonFile(
            path.join(observedUserNodeConversationReadsRoot, entry)
          )
        )
      )
  );

  return records
    .filter((record) => record.userNodeId === input.userNodeId)
    .sort((left, right) =>
      left.conversationId.localeCompare(right.conversationId)
    );
}

export async function recordUserNodePublishedMessage(input: {
  recordedAt?: string;
  request: ParsedUserNodeMessagePublishRequest;
  response: UserNodeMessagePublishResponse;
}): Promise<UserNodeMessageRecord> {
  await initializeHostState();

  const record = userNodeMessageRecordSchema.parse({
    ...(input.request.approval
      ? {
          approval: {
            approvalId: input.request.approval.approvalId,
            approverNodeIds: [],
            decision: input.request.approval.decision,
            ...(input.request.approval.operation
              ? { operation: input.request.approval.operation }
              : {}),
            ...(input.request.approval.reason
              ? { reason: input.request.approval.reason }
              : {}),
            ...(input.request.approval.resource
              ? { resource: input.request.approval.resource }
              : {})
          }
        }
      : {}),
    artifactRefs: input.request.artifactRefs,
    conversationId: input.response.conversationId,
    createdAt: input.recordedAt ?? nowIsoString(),
    direction: "outbound",
    deliveryErrors: input.response.deliveryErrors,
    deliveryStatus: input.response.deliveryStatus,
    eventId: input.response.eventId,
    fromNodeId: input.response.fromNodeId,
    fromPubkey: input.response.fromPubkey,
    messageType: input.response.messageType,
    ...(input.request.parentMessageId
      ? { parentMessageId: input.request.parentMessageId }
      : {}),
    peerNodeId: input.response.targetNodeId,
    publishedRelays: input.response.publishedRelays,
    relayUrls: input.response.relayUrls,
    schemaVersion: "1",
    sessionId: input.response.sessionId,
    signerPubkey: input.response.signerPubkey ?? input.response.fromPubkey,
    ...(input.request.sourceChangeReview
      ? { sourceChangeReview: input.request.sourceChangeReview }
      : {}),
    summary: input.request.summary,
    toNodeId: input.response.targetNodeId,
    toPubkey: input.response.toPubkey,
    turnId: input.response.turnId,
    userNodeId: input.response.fromNodeId
  });

  await writeJsonFileIfChanged(
    observedUserNodeMessageRecordPath({
      eventId: record.eventId,
      userNodeId: record.userNodeId
    }),
    record
  );

  return record;
}

export async function recordUserNodeInboundMessage(input: {
  request: UserNodeInboundMessageRecordRequest;
  userNodeId: string;
}): Promise<UserNodeMessageRecord> {
  await initializeHostState();

  const { message } = input.request;
  const approval = extractUserNodeMessageApproval(message);
  const sourceChangeReview = extractUserNodeMessageSourceChangeReview(message);
  const record = userNodeMessageRecordSchema.parse({
    ...(approval ? { approval } : {}),
    artifactRefs: message.work.artifactRefs,
    conversationId: message.conversationId,
    createdAt: input.request.receivedAt,
    direction: "inbound",
    deliveryErrors: [],
    deliveryStatus: "received",
    eventId: input.request.eventId,
    fromNodeId: message.fromNodeId,
    fromPubkey: message.fromPubkey,
    messageType: message.messageType,
    ...(message.parentMessageId
      ? { parentMessageId: message.parentMessageId }
      : {}),
    peerNodeId: message.fromNodeId,
    publishedRelays: [],
    relayUrls: [],
    schemaVersion: "1",
    sessionId: message.sessionId,
    signerPubkey: input.request.signerPubkey ?? message.fromPubkey,
    ...(sourceChangeReview ? { sourceChangeReview } : {}),
    summary: message.work.summary,
    toNodeId: message.toNodeId,
    toPubkey: message.toPubkey,
    turnId: message.turnId,
    userNodeId: input.userNodeId
  });

  await writeJsonFileIfChanged(
    observedUserNodeMessageRecordPath({
      eventId: record.eventId,
      userNodeId: record.userNodeId
    }),
    record
  );

  return record;
}

export async function getUserNodeConversation(
  nodeId: string,
  conversationId: string
): Promise<UserNodeConversationResponse | undefined> {
  await initializeHostState();

  const [inspection, projection, messages] = await Promise.all([
    getUserNodeIdentity(nodeId),
    getHostProjectionSnapshot(),
    listUserNodeMessageRecords({
      conversationId,
      userNodeId: nodeId
    })
  ]);

  if (!inspection) {
    return undefined;
  }

  const conversation = projection.userConversations.find(
    (candidate) =>
      candidate.userNodeId === nodeId &&
      candidate.conversationId === conversationId
  );

  return userNodeConversationResponseSchema.parse({
    ...(conversation ? { conversation } : {}),
    conversationId,
    generatedAt: nowIsoString(),
    messages,
    userNodeId: nodeId
  });
}

export async function markUserNodeConversationRead(input: {
  conversationId: string;
  readAt?: string;
  userNodeId: string;
}): Promise<UserNodeConversationReadResponse | undefined> {
  await initializeHostState();

  const inspection = await getUserNodeIdentity(input.userNodeId);

  if (!inspection) {
    return undefined;
  }

  const read = userNodeConversationReadRecordSchema.parse({
    conversationId: input.conversationId,
    readAt: input.readAt ?? nowIsoString(),
    userNodeId: input.userNodeId
  });

  await writeJsonFileIfChanged(
    observedUserNodeConversationReadRecordPath({
      conversationId: read.conversationId,
      userNodeId: read.userNodeId
    }),
    read
  );

  const projection = await getHostProjectionSnapshot();
  const conversation = projection.userConversations.find(
    (candidate) =>
      candidate.userNodeId === read.userNodeId &&
      candidate.conversationId === read.conversationId
  );

  return userNodeConversationReadResponseSchema.parse({
    ...(conversation ? { conversation } : {}),
    read
  });
}

export async function getUserNodeMessage(
  nodeId: string,
  eventId: string
): Promise<UserNodeMessageInspectionResponse | undefined> {
  await initializeHostState();

  const inspection = await getUserNodeIdentity(nodeId);

  if (!inspection) {
    return undefined;
  }

  const recordPath = observedUserNodeMessageRecordPath({
    eventId,
    userNodeId: nodeId
  });

  if (!(await pathExists(recordPath))) {
    return undefined;
  }

  return userNodeMessageInspectionResponseSchema.parse({
    generatedAt: nowIsoString(),
    message: userNodeMessageRecordSchema.parse(await readJsonFile(recordPath)),
    userNodeId: nodeId
  });
}

async function resolveGitPrincipalRuntimeBindings(
  principals: ExternalPrincipalRecord[]
): Promise<
  Array<{
    principal: ExternalPrincipalRecord;
    signing?: {
      delivery?: {
        filePath: string;
        mode: "mounted_file";
      };
      secretRef: string;
      status: "available" | "missing";
    };
    transport: {
      delivery?: {
        filePath: string;
        mode: "mounted_file";
      };
      secretRef: string;
      status: "available" | "missing";
    };
  }>
> {
  return Promise.all(
    principals.map(async (principal) => {
      const transport = await resolveSecretBinding(principal.secretRef);
      const signing =
        principal.signing?.mode === "ssh_key"
          ? await resolveSecretBinding(principal.signing.secretRef)
          : undefined;

      return {
        principal,
        ...(signing ? { signing } : {}),
        transport
      };
    })
  );
}

async function appendDirectoryDigest(
  directoryPath: string,
  relativeRoot: string,
  hash: ReturnType<typeof createHash>
): Promise<void> {
  const entries = (await readdir(directoryPath, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  for (const entry of entries) {
    const sourcePath = path.join(directoryPath, entry.name);
    const relativePath =
      relativeRoot.length > 0 ? `${relativeRoot}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      hash.update(`dir:${relativePath}\n`);
      await appendDirectoryDigest(sourcePath, relativePath, hash);
      continue;
    }

    if (entry.isSymbolicLink()) {
      hash.update(`symlink:${relativePath}\n`);
      hash.update(await readlink(sourcePath));
      hash.update("\n");
      continue;
    }

    hash.update(`file:${relativePath}\n`);
    hash.update(await readFile(sourcePath));
    hash.update("\n");
  }
}

async function computeDirectoryContentDigest(directoryPath: string): Promise<string> {
  const hash = createHash("sha256");
  await appendDirectoryDigest(directoryPath, "", hash);
  return `sha256:${hash.digest("hex")}`;
}

async function materializePackageStore(
  packageSourceId: string,
  packageRoot: string
): Promise<LocalPathPackageSourceRecord["materialization"]> {
  const contentDigest = await computeDirectoryContentDigest(packageRoot);
  const storeLayout = buildPackageStoreLayout(contentDigest);

  if (!(await pathExists(storeLayout.packageRoot))) {
    await syncDirectoryContents(packageRoot, storeLayout.packageRoot);
  }

  const materialization = {
    contentDigest,
    materializationKind: "immutable_store" as const,
    packageRoot: storeLayout.packageRoot,
    synchronizedAt: nowIsoString()
  };

  await writeJsonFile(storeLayout.metadataPath, {
    contentDigest,
    packageRoot: storeLayout.packageRoot,
    packageSourceId,
    synchronizedAt: materialization.synchronizedAt
  });

  return materialization;
}

function stripSupportedPackageArchiveExtension(archivePath: string): string {
  return path
    .basename(archivePath)
    .replace(/\.tar\.gz$/iu, "")
    .replace(/\.tgz$/iu, "")
    .replace(/\.tar$/iu, "");
}

function parseTarHeaderString(input: Buffer): string {
  const nulIndex = input.indexOf(0);
  const bytes = nulIndex === -1 ? input : input.subarray(0, nulIndex);
  return bytes.toString("utf8").trim();
}

function parseTarHeaderOctal(input: Buffer, fieldName: string): number {
  const value = parseTarHeaderString(input).replace(/\s+/gu, "");

  if (value.length === 0) {
    return 0;
  }

  if (!/^[0-7]+$/u.test(value)) {
    throw new Error(`Archive entry has an invalid ${fieldName} field.`);
  }

  return Number.parseInt(value, 8);
}

function isTarZeroBlock(input: Buffer, offset: number): boolean {
  for (let index = offset; index < offset + 512; index += 1) {
    if (input[index] !== 0) {
      return false;
    }
  }

  return true;
}

function computeTarHeaderChecksum(header: Buffer): number {
  let checksum = 0;

  for (let index = 0; index < 512; index += 1) {
    checksum += index >= 148 && index < 156 ? 0x20 : header[index] ?? 0;
  }

  return checksum;
}

function resolveArchiveOutputPath(input: {
  extractionRoot: string;
  relativePath: string;
}): string {
  if (input.relativePath.includes("\0")) {
    throw new Error("Archive entry paths may not contain NUL bytes.");
  }

  const normalizedRelativePath = path.posix.normalize(
    input.relativePath.replace(/\\/gu, "/")
  );

  if (
    normalizedRelativePath.length === 0 ||
    normalizedRelativePath === "." ||
    normalizedRelativePath === ".." ||
    normalizedRelativePath.startsWith("../") ||
    path.posix.isAbsolute(normalizedRelativePath)
  ) {
    throw new Error(
      `Archive entry path '${input.relativePath}' is not a safe relative path.`
    );
  }

  const extractionRoot = path.resolve(input.extractionRoot);
  const outputPath = path.resolve(
    extractionRoot,
    ...normalizedRelativePath.split("/")
  );

  if (
    outputPath !== extractionRoot &&
    !outputPath.startsWith(`${extractionRoot}${path.sep}`)
  ) {
    throw new Error(
      `Archive entry path '${input.relativePath}' would escape the extraction root.`
    );
  }

  return outputPath;
}

async function readTarArchivePayload(archivePath: string): Promise<Buffer> {
  const archive = await readFile(archivePath);
  const isGzipArchive =
    (archive[0] === 0x1f && archive[1] === 0x8b) ||
    /\.t(?:ar\.)?gz$/iu.test(archivePath);

  return isGzipArchive ? await gunzipAsync(archive) : archive;
}

async function extractPackageTarArchive(input: {
  archivePath: string;
  extractionRoot: string;
}): Promise<void> {
  const archiveStats = await stat(input.archivePath);

  if (!archiveStats.isFile()) {
    throw new Error(`Archive path '${input.archivePath}' is not a regular file.`);
  }

  const archive = await readTarArchivePayload(input.archivePath);
  let offset = 0;
  let extractedEntryCount = 0;

  while (offset + 512 <= archive.length) {
    if (isTarZeroBlock(archive, offset)) {
      break;
    }

    const header = archive.subarray(offset, offset + 512);
    const storedChecksum = parseTarHeaderOctal(
      header.subarray(148, 156),
      "checksum"
    );

    if (
      storedChecksum > 0 &&
      storedChecksum !== computeTarHeaderChecksum(header)
    ) {
      throw new Error("Archive entry checksum validation failed.");
    }

    const name = parseTarHeaderString(header.subarray(0, 100));
    const prefix = parseTarHeaderString(header.subarray(345, 500));
    const relativePath = prefix.length > 0 ? `${prefix}/${name}` : name;

    if (relativePath.length === 0) {
      throw new Error("Archive entry is missing a path.");
    }

    const typeFlagByte = header[156] ?? 0;
    const typeFlag =
      typeFlagByte === 0 ? "0" : String.fromCharCode(typeFlagByte);
    const size = parseTarHeaderOctal(header.subarray(124, 136), "size");
    const dataOffset = offset + 512;
    const nextOffset = dataOffset + Math.ceil(size / 512) * 512;

    if (nextOffset > archive.length) {
      throw new Error("Archive entry is truncated.");
    }

    if (typeFlag === "x" || typeFlag === "g") {
      offset = nextOffset;
      continue;
    }

    const outputPath = resolveArchiveOutputPath({
      extractionRoot: input.extractionRoot,
      relativePath
    });

    if (typeFlag === "5") {
      await ensureDirectory(outputPath);
      extractedEntryCount += 1;
      offset = nextOffset;
      continue;
    }

    if (typeFlag === "0") {
      await ensureDirectory(path.dirname(outputPath));
      await writeFile(outputPath, archive.subarray(dataOffset, dataOffset + size));
      extractedEntryCount += 1;
      offset = nextOffset;
      continue;
    }

    if (typeFlag === "1" || typeFlag === "2") {
      throw new Error("Package archives may not contain hard links or symlinks.");
    }

    throw new Error(`Package archive entry type '${typeFlag}' is not supported.`);
  }

  if (extractedEntryCount === 0) {
    throw new Error("Package archive did not contain any extractable entries.");
  }
}

async function resolveExtractedPackageRoot(
  extractionRoot: string
): Promise<string> {
  if (await pathExists(path.join(extractionRoot, "manifest.json"))) {
    return extractionRoot;
  }

  const topLevelDirectories = (await readdir(extractionRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (topLevelDirectories.length === 1) {
    const nestedPackageRoot = path.join(extractionRoot, topLevelDirectories[0]!);

    if (await pathExists(path.join(nestedPackageRoot, "manifest.json"))) {
      return nestedPackageRoot;
    }
  }

  return extractionRoot;
}

async function readPackageManifestFromRoot(
  packageRoot: string
): Promise<AgentPackageManifest | undefined> {
  const manifestPath = path.join(packageRoot, "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  try {
    const manifestDocument = await readJsonFile(manifestPath);
    const manifestParse = agentPackageManifestSchema.safeParse(manifestDocument);
    return manifestParse.success ? manifestParse.data : undefined;
  } catch {
    return undefined;
  }
}

async function validatePersistedPackageSource(
  record: PackageSourceRecord
): Promise<ValidationReport> {
  return record.sourceKind === "local_path"
    ? await validatePackageDirectory(record.absolutePath)
    : await validatePackageDirectory(packageSourcePackageRoot(record));
}

async function reconcileMaterializedPackageSourceRecord(
  record: PackageSourceRecord
): Promise<PackageSourceRecord> {
  if (record.sourceKind !== "local_path") {
    return record;
  }

  if (!(await pathExists(record.absolutePath))) {
    return record;
  }

  const materialization = await materializePackageStore(
    record.packageSourceId,
    record.absolutePath
  );
  const nextRecord = packageSourceRecordSchema.parse({
    ...record,
    materialization
  });

  if (JSON.stringify(nextRecord) !== JSON.stringify(record)) {
    await writeJsonFile(
      packageSourceRecordPath(record.packageSourceId),
      nextRecord
    );
  }

  return nextRecord;
}

function packageSourcePackageRoot(record: PackageSourceRecord): string {
  return (
    record.materialization?.packageRoot ??
    (record.sourceKind === "local_path"
      ? record.absolutePath
      : path.join(importsRoot, "packages", record.packageSourceId, "package"))
  );
}

async function resolveManifestForPackageSource(
  record: PackageSourceRecord
): Promise<PackageSourceInspectionResponse["manifest"]> {
  const manifestPath = path.join(packageSourcePackageRoot(record), "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  let manifestDocument: unknown;

  try {
    manifestDocument = await readJsonFile(manifestPath);
  } catch {
    return undefined;
  }

  const manifestParse = agentPackageManifestSchema.safeParse(manifestDocument);
  return manifestParse.success ? manifestParse.data : undefined;
}

function emitHostEvent(event: HostEventRecord): void {
  for (const subscriber of hostEventSubscribers) {
    subscriber(event);
  }
}

let hostEventAppendQueue: Promise<unknown> = Promise.resolve();

const hostEventAuditGenesisHash = createHash("sha256")
  .update("entangle.host.events.v1.genesis", "utf8")
  .digest("hex");

function canonicalizeForHash(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(canonicalizeForHash);
  }

  if (!input || typeof input !== "object") {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, canonicalizeForHash(value)])
  );
}

function computeHostEventAuditHash(event: HostEventRecord): string {
  const hashableEvent = { ...(event as Record<string, unknown>) };
  delete hashableEvent.auditRecordHash;
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeForHash(hashableEvent)), "utf8")
    .digest("hex");
}

async function readLatestHostEventAuditHash(): Promise<string> {
  if (!(await pathExists(controlPlaneTraceRoot))) {
    return hostEventAuditGenesisHash;
  }

  const fileNames = (await readdir(controlPlaneTraceRoot))
    .filter((fileName) => fileName.endsWith(".jsonl"))
    .sort()
    .reverse();

  for (const fileName of fileNames) {
    const fileContent = await readFile(
      path.join(controlPlaneTraceRoot, fileName),
      "utf8"
    );
    const lines = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .reverse();

    for (const line of lines) {
      const event = parsePersistedHostEvent(JSON.parse(line) as unknown);
      return event.auditRecordHash ?? computeHostEventAuditHash(event);
    }
  }

  return hostEventAuditGenesisHash;
}

async function appendHostEventNow(
  event: Record<string, unknown>
): Promise<HostEventRecord> {
  await ensureDirectory(controlPlaneTraceRoot);
  const logPath = path.join(controlPlaneTraceRoot, `${dateStamp()}.jsonl`);
  const baseRecord = hostEventRecordSchema.parse({
    ...event,
    auditPreviousEventHash: await readLatestHostEventAuditHash(),
    eventId: sanitizeIdentifier(`evt-${randomUUID()}`),
    schemaVersion: "1",
    timestamp: nowIsoString()
  });
  const record = hostEventRecordSchema.parse({
    ...baseRecord,
    auditRecordHash: computeHostEventAuditHash(baseRecord)
  });
  const encoded = `${JSON.stringify(record)}\n`;
  await writeFile(logPath, encoded, { encoding: "utf8", flag: "a" });
  emitHostEvent(record);
  return record;
}

async function appendHostEvent(
  event: Record<string, unknown>
): Promise<HostEventRecord> {
  const appendOperation = hostEventAppendQueue.then(() =>
    appendHostEventNow(event)
  );
  hostEventAppendQueue = appendOperation.catch(() => undefined);
  return appendOperation;
}

export async function recordHostOperatorRequestCompleted(
  event: HostOperatorRequestCompletedEventInput
): Promise<HostEventRecord> {
  return appendHostEvent(event);
}

function parsePersistedHostEvent(input: unknown): HostEventRecord {
  const parsedRecord = hostEventRecordSchema.safeParse(input);

  if (parsedRecord.success) {
    return parsedRecord.data;
  }

  if (!input || typeof input !== "object") {
    throw parsedRecord.error;
  }

  const legacyEvent = input as Record<string, unknown>;
  const legacyType =
    typeof legacyEvent.type === "string" ? legacyEvent.type : undefined;
  const legacyMessage =
    typeof legacyEvent.message === "string"
      ? legacyEvent.message
      : "Recovered legacy host event.";
  const legacyTimestamp =
    typeof legacyEvent.timestamp === "string"
      ? legacyEvent.timestamp
      : nowIsoString();
  const legacyEventId = sanitizeIdentifier(
    `evt-${createHash("sha1").update(JSON.stringify(input)).digest("hex").slice(0, 20)}`
  );

  switch (legacyType) {
    case "catalog_bootstrap":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        catalogId:
          typeof legacyEvent.catalogId === "string"
            ? legacyEvent.catalogId
            : "bootstrap-catalog",
        category: "control_plane",
        type: "catalog.updated",
        updateKind: "bootstrap"
      });
    case "catalog_apply":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        catalogId:
          typeof legacyEvent.catalogId === "string"
            ? legacyEvent.catalogId
            : "applied-catalog",
        category: "control_plane",
        type: "catalog.updated",
        updateKind: "apply"
      });
    case "package_source_admit":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        category: "control_plane",
        packageSourceId:
          typeof legacyEvent.packageSourceId === "string"
            ? legacyEvent.packageSourceId
            : "legacy-package-source",
        type: "package_source.admitted"
      });
    case "external_principal_upsert":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        category: "control_plane",
        principalId:
          typeof legacyEvent.principalId === "string"
            ? legacyEvent.principalId
            : "legacy-principal",
        type: "external_principal.updated"
      });
    case "graph_apply":
      return hostEventRecordSchema.parse({
        eventId: legacyEventId,
        message: legacyMessage,
        schemaVersion: "1",
        timestamp: legacyTimestamp,
        activeRevisionId:
          typeof legacyEvent.activeRevisionId === "string"
            ? legacyEvent.activeRevisionId
            : "legacy-graph-revision",
        category: "control_plane",
        graphId:
          typeof legacyEvent.graphId === "string"
            ? legacyEvent.graphId
            : "legacy-graph",
        type: "graph.revision.applied"
      });
    default:
      throw parsedRecord.error;
  }
}

export function subscribeToHostEvents(
  listener: (event: HostEventRecord) => void
): () => void {
  hostEventSubscribers.add(listener);
  return () => {
    hostEventSubscribers.delete(listener);
  };
}

function normalizeHostEventListQuery(
  queryOrLimit: HostEventListQuery | number = 100
): HostEventListQuery {
  return typeof queryOrLimit === "number"
    ? { limit: queryOrLimit }
    : queryOrLimit;
}

function getHostEventStringField(
  event: HostEventRecord,
  fieldName: "nodeId" | "operatorId"
): string | undefined {
  if (!(fieldName in event)) {
    return undefined;
  }

  const value = (event as Record<string, unknown>)[fieldName];
  return typeof value === "string" ? value : undefined;
}

function hostEventMatchesListQuery(
  event: HostEventRecord,
  query: HostEventListQuery
): boolean {
  if (query.category && event.category !== query.category) {
    return false;
  }

  if (
    query.nodeId &&
    getHostEventStringField(event, "nodeId") !== query.nodeId
  ) {
    return false;
  }

  if (
    query.operatorId &&
    getHostEventStringField(event, "operatorId") !== query.operatorId
  ) {
    return false;
  }

  if (
    query.statusCode !== undefined &&
    (!("statusCode" in event) || event.statusCode !== query.statusCode)
  ) {
    return false;
  }

  if (query.typePrefix && query.typePrefix.length > 0) {
    return query.typePrefix.some(
      (typePrefix) =>
        event.type === typePrefix || event.type.startsWith(typePrefix)
    );
  }

  return true;
}

async function readPersistedHostEvents(): Promise<HostEventRecord[]> {
  if (!(await pathExists(controlPlaneTraceRoot))) {
    return [];
  }

  const fileNames = (await readdir(controlPlaneTraceRoot))
    .filter((fileName) => fileName.endsWith(".jsonl"))
    .sort();
  const events: HostEventRecord[] = [];

  for (const fileName of fileNames) {
    const fileContent = await readFile(
      path.join(controlPlaneTraceRoot, fileName),
      "utf8"
    );
    const entries = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => parsePersistedHostEvent(JSON.parse(line) as unknown));

    events.push(...entries);
  }

  return events;
}

export async function listHostEvents(
  queryOrLimit: HostEventListQuery | number = 100
): Promise<HostEventListResponse> {
  await hostEventAppendQueue;
  await initializeHostState();
  const query = normalizeHostEventListQuery(queryOrLimit);
  const limit = query.limit ?? 100;
  const events = await readPersistedHostEvents();

  return hostEventListResponseSchema.parse({
    events: events
      .filter((event) => hostEventMatchesListQuery(event, query))
      .slice(-limit)
  });
}

function inspectHostEventIntegrityForEvents(
  events: HostEventRecord[]
): HostEventIntegrityResponse {
  let expectedPreviousHash = hostEventAuditGenesisHash;
  let lastAuditRecordHash: string | undefined;
  let lastEventId: string | undefined;
  let firstUnverifiableEvent:
    | HostEventIntegrityResponse["firstUnverifiableEvent"]
    | undefined;
  let unverifiableEventCount = 0;

  for (const event of events) {
    const computedRecordHash = computeHostEventAuditHash(event);
    lastEventId = event.eventId;

    if (!event.auditPreviousEventHash || !event.auditRecordHash) {
      unverifiableEventCount += 1;
      firstUnverifiableEvent ??= {
        eventId: event.eventId,
        eventType: event.type,
        reason: "missing_audit_hash",
        timestamp: event.timestamp
      };
      expectedPreviousHash = computedRecordHash;
      lastAuditRecordHash = computedRecordHash;
      continue;
    }

    if (event.auditPreviousEventHash !== expectedPreviousHash) {
      return hostEventIntegrityResponseSchema.parse({
        checkedEventCount: events.length,
        firstBrokenEvent: {
          actualHash: event.auditPreviousEventHash,
          eventId: event.eventId,
          eventType: event.type,
          expectedHash: expectedPreviousHash,
          reason: "previous_hash_mismatch",
          timestamp: event.timestamp
        },
        ...(firstUnverifiableEvent ? { firstUnverifiableEvent } : {}),
        genesisHash: hostEventAuditGenesisHash,
        ...(lastAuditRecordHash ? { lastAuditRecordHash } : {}),
        ...(lastEventId ? { lastEventId } : {}),
        schemaVersion: "1",
        status: "broken",
        unverifiableEventCount
      });
    }

    if (event.auditRecordHash !== computedRecordHash) {
      return hostEventIntegrityResponseSchema.parse({
        checkedEventCount: events.length,
        firstBrokenEvent: {
          actualHash: event.auditRecordHash,
          eventId: event.eventId,
          eventType: event.type,
          expectedHash: computedRecordHash,
          reason: "record_hash_mismatch",
          timestamp: event.timestamp
        },
        ...(firstUnverifiableEvent ? { firstUnverifiableEvent } : {}),
        genesisHash: hostEventAuditGenesisHash,
        ...(lastAuditRecordHash ? { lastAuditRecordHash } : {}),
        ...(lastEventId ? { lastEventId } : {}),
        schemaVersion: "1",
        status: "broken",
        unverifiableEventCount
      });
    }

    expectedPreviousHash = event.auditRecordHash;
    lastAuditRecordHash = event.auditRecordHash;
  }

  return hostEventIntegrityResponseSchema.parse({
    checkedEventCount: events.length,
    ...(firstUnverifiableEvent ? { firstUnverifiableEvent } : {}),
    genesisHash: hostEventAuditGenesisHash,
    ...(lastAuditRecordHash ? { lastAuditRecordHash } : {}),
    ...(lastEventId ? { lastEventId } : {}),
    schemaVersion: "1",
    status: unverifiableEventCount > 0 ? "unverifiable" : "valid",
    unverifiableEventCount
  });
}

export async function inspectHostEventIntegrity(): Promise<HostEventIntegrityResponse> {
  await hostEventAppendQueue;
  await initializeHostState();

  return inspectHostEventIntegrityForEvents(await readPersistedHostEvents());
}

async function signHostEventIntegrityReport(
  integrity: HostEventIntegrityResponse
): Promise<HostEventIntegritySignedReportResponse> {
  const { authority, secretKey } = await readAvailableHostAuthoritySecret();
  const generatedAt = nowIsoString();
  const reportPayload = {
    generatedAt,
    hostAuthorityPubkey: authority.publicKey,
    integrity,
    reportKind: "host_event_integrity",
    schemaVersion: "1"
  };
  const signedContent = JSON.stringify(canonicalizeForHash(reportPayload));
  const reportHash = createHash("sha256")
    .update(signedContent, "utf8")
    .digest("hex");
  const signedAt = nowIsoString();
  const createdAtUnix = Math.floor(new Date(signedAt).getTime() / 1000);
  const tags = [
    ["report", "host_event_integrity"],
    ["report_hash", reportHash]
  ];
  const signedEvent = finalizeEvent(
    {
      content: signedContent,
      created_at: createdAtUnix,
      kind: entangleNostrRumorKind,
      tags
    },
    parseNostrSecretKeyBytes(secretKey)
  );

  return hostEventIntegritySignedReportResponseSchema.parse({
    generatedAt,
    hostAuthorityPubkey: authority.publicKey,
    integrity,
    reportHash,
    reportKind: "host_event_integrity",
    schemaVersion: "1",
    signedContent,
    signedEvent: {
      createdAt: signedAt,
      createdAtUnix,
      eventId: signedEvent.id,
      kind: signedEvent.kind,
      signature: signedEvent.sig,
      signerPubkey: signedEvent.pubkey,
      tags: signedEvent.tags
    }
  });
}

export async function exportSignedHostEventIntegrityReport(): Promise<HostEventIntegritySignedReportResponse> {
  return signHostEventIntegrityReport(await inspectHostEventIntegrity());
}

function serializeHostEventsAsCanonicalJsonl(events: HostEventRecord[]): string {
  if (events.length === 0) {
    return "";
  }

  return `${events
    .map((event) => JSON.stringify(canonicalizeForHash(event)))
    .join("\n")}\n`;
}

export async function exportHostEventAuditBundle(): Promise<HostEventAuditBundleResponse> {
  await hostEventAppendQueue;
  await initializeHostState();

  const events = await readPersistedHostEvents();
  const signedIntegrityReport = await signHostEventIntegrityReport(
    inspectHostEventIntegrityForEvents(events)
  );
  const eventsJsonl = serializeHostEventsAsCanonicalJsonl(events);
  const eventsJsonlSha256 = createHash("sha256")
    .update(eventsJsonl, "utf8")
    .digest("hex");
  const generatedAt = nowIsoString();
  const bundlePayload = {
    bundleKind: "host_event_audit_bundle",
    eventCount: events.length,
    events,
    eventsJsonlSha256,
    generatedAt,
    schemaVersion: "1",
    signedIntegrityReport
  };
  const bundleHash = createHash("sha256")
    .update(JSON.stringify(canonicalizeForHash(bundlePayload)), "utf8")
    .digest("hex");

  return hostEventAuditBundleResponseSchema.parse({
    ...bundlePayload,
    bundleHash
  });
}

async function removeJsonFilesExcept(
  directoryPath: string,
  allowedBaseNames: Set<string>
): Promise<void> {
  if (!(await pathExists(directoryPath))) {
    return;
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .filter((entry) => !allowedBaseNames.has(entry.name.slice(0, -".json".length)))
      .map((entry) => rm(path.join(directoryPath, entry.name), { force: true }))
  );
}

async function removeRuntimeFilesystemObservedActivityFilesExcept(
  directoryPath: string,
  allowedBaseNames: Set<string>
): Promise<void> {
  if (!(await pathExists(directoryPath))) {
    return;
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .filter((entry) => !allowedBaseNames.has(entry.name.slice(0, -".json".length)))
      .map(async (entry) => {
        const filePath = path.join(directoryPath, entry.name);
        const persisted = await readJsonFile<unknown>(filePath).catch(() => undefined);

        if (
          persisted &&
          typeof persisted === "object" &&
          !Array.isArray(persisted) &&
          (persisted as { source?: unknown }).source === "observation_event"
        ) {
          return;
        }

        await rm(filePath, { force: true });
      })
  );
}

function buildGitRepositoryTargetRecordId(input: {
  gitServiceRef: string;
  namespace: string;
  repositoryName: string;
}): string {
  return sanitizeIdentifier(
    `${input.gitServiceRef}-${input.namespace}-${input.repositoryName}`
  );
}

function gitRepositoryProvisioningRecordPath(
  record: Pick<
    GitRepositoryProvisioningRecord["target"],
    "gitServiceRef" | "namespace" | "repositoryName"
  >
): string {
  return path.join(
    gitRepositoryTargetsRoot,
    `${buildGitRepositoryTargetRecordId(record)}.json`
  );
}

async function readGitRepositoryProvisioningRecord(input: {
  gitServiceRef: string;
  namespace: string;
  repositoryName: string;
}): Promise<GitRepositoryProvisioningRecord | undefined> {
  const filePath = gitRepositoryProvisioningRecordPath(input);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return gitRepositoryProvisioningRecordSchema.parse(await readJsonFile(filePath));
}

function buildGitRepositoryProvisioningRecord(input: {
  checkedAt?: string;
  created?: boolean;
  lastError?: string;
  state: GitRepositoryProvisioningRecord["state"];
  target: GitRepositoryProvisioningRecord["target"];
}): GitRepositoryProvisioningRecord {
  return gitRepositoryProvisioningRecordSchema.parse({
    checkedAt: input.checkedAt ?? nowIsoString(),
    ...(input.created !== undefined ? { created: input.created } : {}),
    ...(input.lastError ? { lastError: input.lastError } : {}),
    schemaVersion: "1",
    state: input.state,
    target: input.target
  });
}

async function ensureGitRepositoryTargetProvisioning(input: {
  target: NonNullable<EffectiveRuntimeContext["artifactContext"]["primaryGitRepositoryTarget"]>;
  gitServices: DeploymentResourceCatalog["gitServices"];
}): Promise<GitRepositoryProvisioningRecord> {
  const existingRecord = await readGitRepositoryProvisioningRecord(
    input.target
  );
  const service = input.gitServices.find(
    (candidate) => candidate.id === input.target.gitServiceRef
  );

  if (!service) {
    return buildGitRepositoryProvisioningRecord({
      lastError: `Git service '${input.target.gitServiceRef}' is not available in the effective runtime context.`,
      state: "failed",
      target: input.target
    });
  }

  if (service.provisioning.mode === "preexisting") {
    return buildGitRepositoryProvisioningRecord({
      state: "not_requested",
      target: input.target
    });
  }

  const provisioningToken = await readSecretRefValue(service.provisioning.secretRef);

  if (!provisioningToken) {
    return buildGitRepositoryProvisioningRecord({
      lastError:
        `Git service '${service.id}' requires provisioning secret '${service.provisioning.secretRef}', ` +
        "but no secret material is available in the host secret store.",
      state: "failed",
      target: input.target
    });
  }

  try {
    const client = new GiteaApiClient({
      apiBaseUrl: service.provisioning.apiBaseUrl,
      token: provisioningToken
    });
    const repositoryAlreadyExists = await client.repositoryExists({
      owner: input.target.namespace,
      repositoryName: input.target.repositoryName
    });

    if (repositoryAlreadyExists) {
      return buildGitRepositoryProvisioningRecord({
        created: existingRecord?.state === "ready" ? existingRecord.created ?? false : false,
        state: "ready",
        target: input.target
      });
    }

    const authenticatedUserLogin = await client.getAuthenticatedUserLogin();
    const creationResult =
      authenticatedUserLogin === input.target.namespace
        ? await client.createCurrentUserRepository({
            repositoryName: input.target.repositoryName
          })
        : await client.createOrganizationRepository({
            organization: input.target.namespace,
            repositoryName: input.target.repositoryName
          });

    if (creationResult === "conflict") {
      const repositoryExistsAfterConflict = await client.repositoryExists({
        owner: input.target.namespace,
        repositoryName: input.target.repositoryName
      });

      if (!repositoryExistsAfterConflict) {
        throw new Error(
          `Gitea reported a repository conflict for '${input.target.namespace}/${input.target.repositoryName}', ` +
          "but the repository is still not observable through the repository API."
        );
      }

      return buildGitRepositoryProvisioningRecord({
        created: existingRecord?.state === "ready" ? existingRecord.created ?? false : false,
        state: "ready",
        target: input.target
      });
    }

    return buildGitRepositoryProvisioningRecord({
      created: true,
      state: "ready",
      target: input.target
    });
  } catch (error) {
    return buildGitRepositoryProvisioningRecord({
      lastError: formatUnknownError(error),
      state: "failed",
      target: input.target
    });
  }
}

async function persistGitRepositoryProvisioningRecord(
  record: GitRepositoryProvisioningRecord
): Promise<GitRepositoryProvisioningRecord> {
  await writeJsonFileIfChanged(
    gitRepositoryProvisioningRecordPath(record.target),
    record
  );

  return record;
}

async function readCatalog(): Promise<DeploymentResourceCatalog> {
  await initializeHostState();
  return deploymentResourceCatalogSchema.parse(await readJsonFile(catalogPath));
}

async function readActiveGraphState(): Promise<{
  activeRevisionId: string | undefined;
  graph: GraphSpec | undefined;
}> {
  await initializeHostState();

  if (!(await pathExists(currentGraphPath))) {
    return {
      activeRevisionId: undefined,
      graph: undefined
    };
  }

  const graph = graphSpecSchema.parse(await readJsonFile(currentGraphPath));
  const revisionRecord = await readActiveGraphRevisionRecord();

  return {
    graph,
    activeRevisionId: revisionRecord?.activeRevisionId
  };
}

async function readActiveGraphRevisionRecord(): Promise<
  ActiveGraphRevisionRecord | undefined
> {
  await initializeHostState();

  if (!(await pathExists(activeGraphRevisionPath))) {
    return undefined;
  }

  return activeGraphRevisionRecordSchema.parse(
    await readJsonFile(activeGraphRevisionPath)
  );
}

async function readGraphRevisionInspection(
  revisionId: string,
  activeRevisionRecord?: ActiveGraphRevisionRecord
): Promise<GraphRevisionInspectionResponse | undefined> {
  const filePath = path.join(graphRevisionsRoot, `${revisionId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  const persisted = await readJsonFile(filePath);
  const parsedRecord = graphRevisionRecordSchema.safeParse(persisted);
  const resolvedRecord = parsedRecord.success
    ? parsedRecord.data
    : graphRevisionRecordSchema.parse({
        appliedAt:
          activeRevisionRecord?.activeRevisionId === revisionId
            ? activeRevisionRecord.appliedAt
            : (await stat(filePath)).mtime.toISOString(),
        graph: graphSpecSchema.parse(persisted),
        revisionId
      });

  return graphRevisionInspectionResponseSchema.parse({
    graph: resolvedRecord.graph,
    revision: {
      appliedAt: resolvedRecord.appliedAt,
      graphId: resolvedRecord.graph.graphId,
      isActive: activeRevisionRecord?.activeRevisionId === revisionId,
      revisionId: resolvedRecord.revisionId
    }
  });
}

export async function listGraphRevisions(): Promise<GraphRevisionListResponse> {
  await initializeHostState();

  if (!(await pathExists(graphRevisionsRoot))) {
    return graphRevisionListResponseSchema.parse({
      revisions: []
    });
  }

  const activeRevisionRecord = await readActiveGraphRevisionRecord();
  const revisionIds = (await readdir(graphRevisionsRoot))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length));
  const revisions = (
    await Promise.all(
      revisionIds.map((revisionId) =>
        readGraphRevisionInspection(revisionId, activeRevisionRecord)
      )
    )
  )
    .filter((revision): revision is GraphRevisionInspectionResponse =>
      revision !== undefined
    )
    .map((revision) => revision.revision)
    .sort((left, right) => {
      const appliedAtOrdering = right.appliedAt.localeCompare(left.appliedAt);

      if (appliedAtOrdering !== 0) {
        return appliedAtOrdering;
      }

      return right.revisionId.localeCompare(left.revisionId);
    });

  return graphRevisionListResponseSchema.parse({
    revisions
  });
}

export async function getGraphRevision(
  revisionId: string
): Promise<GraphRevisionInspectionResponse | undefined> {
  await initializeHostState();
  return readGraphRevisionInspection(
    revisionId,
    await readActiveGraphRevisionRecord()
  );
}

async function listPackageSourceRecords(): Promise<PackageSourceRecord[]> {
  await initializeHostState();
  const entries = (await readdir(packageSourcesRoot)).filter((entry) =>
    entry.endsWith(".json")
  );
  const records: PackageSourceRecord[] = [];

  for (const entry of entries) {
    const parsedRecord = packageSourceRecordSchema.parse(
      await readJsonFile(path.join(packageSourcesRoot, entry))
    );
    records.push(await reconcileMaterializedPackageSourceRecord(parsedRecord));
  }

  records.sort((left, right) =>
    left.packageSourceId.localeCompare(right.packageSourceId)
  );

  return records;
}

async function listPackageSourceRecordMap(): Promise<
  Map<string, PackageSourceRecord>
> {
  const records = await listPackageSourceRecords();
  return new Map(records.map((record) => [record.packageSourceId, record]));
}

async function syncFileIfChanged(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const sourceContents = await readFile(sourcePath);

  if (await pathExists(targetPath)) {
    const targetContents = await readFile(targetPath);

    if (sourceContents.equals(targetContents)) {
      return;
    }
  }

  await ensureDirectory(path.dirname(targetPath));
  await writeFile(targetPath, sourceContents);
}

async function syncDirectoryContents(
  sourceDirectory: string,
  targetDirectory: string
): Promise<void> {
  await ensureDirectory(targetDirectory);

  const [sourceEntries, targetEntries] = await Promise.all([
    readdir(sourceDirectory, { withFileTypes: true }),
    readdir(targetDirectory, { withFileTypes: true })
  ]);
  const sourceEntryNames = new Set(sourceEntries.map((entry) => entry.name));

  await Promise.all(
    targetEntries
      .filter((entry) => !sourceEntryNames.has(entry.name))
      .map((entry) =>
        rm(path.join(targetDirectory, entry.name), {
          force: true,
          recursive: true
        })
      )
  );

  for (const entry of sourceEntries) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);
    const sourceStats = await stat(sourcePath);

    if (sourceStats.isDirectory()) {
      if ((await pathExists(targetPath)) && !(await stat(targetPath)).isDirectory()) {
        await rm(targetPath, { force: true, recursive: true });
      }

      await syncDirectoryContents(sourcePath, targetPath);
      continue;
    }

    if (await pathExists(targetPath)) {
      const targetStats = await stat(targetPath);

      if (targetStats.isDirectory()) {
        await rm(targetPath, { force: true, recursive: true });
      }
    }

    await syncFileIfChanged(sourcePath, targetPath);
  }
}

async function syncWorkspacePackageLink(
  sourcePackageRoot: string,
  workspacePackageRoot: string
): Promise<void> {
  const expectedTarget = path.relative(
    path.dirname(workspacePackageRoot),
    sourcePackageRoot
  );

  if (await pathExists(workspacePackageRoot)) {
    const workspaceEntry = await lstat(workspacePackageRoot);

    if (workspaceEntry.isSymbolicLink()) {
      const currentTarget = await readlink(workspacePackageRoot);

      if (currentTarget === expectedTarget) {
        return;
      }
    }

    await rm(workspacePackageRoot, { force: true, recursive: true });
  }

  await ensureDirectory(path.dirname(workspacePackageRoot));
  await symlink(expectedTarget, workspacePackageRoot, "dir");
}

async function readPackageManifest(
  packageRoot: string
): Promise<AgentPackageManifest | undefined> {
  const manifestPath = path.join(packageRoot, "manifest.json");

  if (!(await pathExists(manifestPath))) {
    return undefined;
  }

  try {
    return agentPackageManifestSchema.parse(await readJsonFile(manifestPath));
  } catch {
    return undefined;
  }
}

async function copyFileIfMissing(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  if (!(await pathExists(sourcePath)) || (await pathExists(targetPath))) {
    return;
  }

  await ensureDirectory(path.dirname(targetPath));
  await writeFile(targetPath, await readFile(sourcePath, "utf8"), "utf8");
}

async function initializeWorkspaceMemory(
  memoryRoot: string,
  packageRoot: string,
  manifest: AgentPackageManifest
): Promise<void> {
  const wikiSeedSource = path.join(packageRoot, manifest.memoryProfile.wikiSeedPath);
  const wikiTarget = path.join(memoryRoot, "wiki");
  const schemaSource = path.join(packageRoot, manifest.memoryProfile.schemaPath);
  const schemaTarget = path.join(memoryRoot, "schema", path.basename(schemaSource));

  if ((await pathExists(wikiSeedSource)) && !(await pathExists(wikiTarget))) {
    await ensureDirectory(path.dirname(wikiTarget));
    await cp(wikiSeedSource, wikiTarget, { recursive: true });
  }

  await copyFileIfMissing(schemaSource, schemaTarget);
}

function buildWorkspaceLayout(nodeId: string) {
  const root = path.join(workspacesRoot, nodeId);
  return {
    artifactWorkspaceRoot: path.join(root, "workspace"),
    engineStateRoot: path.join(root, "engine-state"),
    injectedRoot: path.join(root, "injected"),
    memoryRoot: path.join(root, "memory"),
    packageRoot: path.join(root, "package"),
    retrievalRoot: path.join(root, "retrieval"),
    root,
    runtimeRoot: path.join(root, "runtime"),
    sourceWorkspaceRoot: path.join(root, "source"),
    wikiRepositoryRoot: path.join(root, "wiki-repository")
  };
}

const runtimeWorkspaceLayoutVersion = "entangle-workspace-v1";

type RuntimeWorkspaceSurfaceHealth =
  RuntimeWorkspaceHealth["surfaces"][number];
type RuntimeWorkspaceAccessMode = RuntimeWorkspaceSurfaceHealth["access"][number];
type RuntimeWorkspaceSurfaceKind = RuntimeWorkspaceSurfaceHealth["surface"];

type RuntimeWorkspaceSurfaceExpectation = {
  access: RuntimeWorkspaceAccessMode[];
  path: string | undefined;
  required: boolean;
  surface: RuntimeWorkspaceSurfaceKind;
};

function buildRuntimeWorkspaceSurfaceExpectations(
  workspace: EffectiveRuntimeContext["workspace"]
): RuntimeWorkspaceSurfaceExpectation[] {
  return [
    {
      access: ["read", "write"],
      path: workspace.root,
      required: true,
      surface: "root"
    },
    {
      access: ["read"],
      path: workspace.packageRoot,
      required: true,
      surface: "package"
    },
    {
      access: ["read", "write"],
      path: workspace.injectedRoot,
      required: true,
      surface: "injected"
    },
    {
      access: ["read", "write"],
      path: workspace.memoryRoot,
      required: true,
      surface: "memory"
    },
    {
      access: ["read", "write"],
      path: workspace.artifactWorkspaceRoot,
      required: true,
      surface: "artifact_workspace"
    },
    {
      access: ["read", "write"],
      path: workspace.runtimeRoot,
      required: true,
      surface: "runtime_state"
    },
    {
      access: ["read", "write"],
      path: workspace.retrievalRoot,
      required: true,
      surface: "retrieval_cache"
    },
    {
      access: ["read", "write"],
      path: workspace.sourceWorkspaceRoot,
      required: true,
      surface: "source_workspace"
    },
    {
      access: ["read", "write"],
      path: workspace.engineStateRoot,
      required: true,
      surface: "engine_state"
    },
    {
      access: ["read", "write"],
      path: workspace.wikiRepositoryRoot,
      required: true,
      surface: "wiki_repository"
    }
  ];
}

async function inspectRuntimeWorkspaceSurface(
  expectation: RuntimeWorkspaceSurfaceExpectation
): Promise<RuntimeWorkspaceSurfaceHealth> {
  if (!expectation.path) {
    return {
      access: expectation.access,
      reason: "Workspace surface path is not materialized in runtime context.",
      required: expectation.required,
      status: "missing",
      surface: expectation.surface
    };
  }

  try {
    const entry = await stat(expectation.path);

    if (!entry.isDirectory()) {
      return {
        access: expectation.access,
        reason: "Workspace surface is not a directory.",
        required: expectation.required,
        status: "not_directory",
        surface: expectation.surface
      };
    }

    if (expectation.access.includes("read")) {
      try {
        await access(expectation.path, fsConstants.R_OK);
      } catch {
        return {
          access: expectation.access,
          reason: "Workspace surface is not readable by the host process.",
          required: expectation.required,
          status: "unreadable",
          surface: expectation.surface
        };
      }
    }

    if (expectation.access.includes("write")) {
      try {
        await access(expectation.path, fsConstants.W_OK);
      } catch {
        return {
          access: expectation.access,
          reason: "Workspace surface is not writable by the host process.",
          required: expectation.required,
          status: "unwritable",
          surface: expectation.surface
        };
      }
    }

    return {
      access: expectation.access,
      required: expectation.required,
      status: "ready",
      surface: expectation.surface
    };
  } catch (error) {
    const errorWithCode = error as NodeJS.ErrnoException;
    let status: RuntimeWorkspaceSurfaceHealth["status"] = "missing";
    let reason = "Workspace surface is missing.";

    if (errorWithCode.code !== "ENOENT") {
      status = "unreadable";
      reason = `Workspace surface could not be inspected: ${formatUnknownError(error)}`;
    }

    return {
      access: expectation.access,
      reason,
      required: expectation.required,
      status,
      surface: expectation.surface
    };
  }
}

async function inspectRuntimeWorkspaceHealth(
  workspace: EffectiveRuntimeContext["workspace"]
): Promise<RuntimeWorkspaceHealth> {
  const surfaces = await Promise.all(
    buildRuntimeWorkspaceSurfaceExpectations(workspace).map((expectation) =>
      inspectRuntimeWorkspaceSurface(expectation)
    )
  );
  const status = surfaces.some(
    (surface) => surface.required && surface.status !== "ready"
  )
    ? "degraded"
    : "ready";

  return {
    checkedAt: nowIsoString(),
    layoutVersion: runtimeWorkspaceLayoutVersion,
    status,
    surfaces
  };
}

function summarizeRuntimeWorkspaceHealthFailure(
  health: RuntimeWorkspaceHealth
): string {
  const degradedSurfaces = health.surfaces
    .filter((surface) => surface.required && surface.status !== "ready")
    .map((surface) => `${surface.surface}:${surface.status}`)
    .join(", ");

  return degradedSurfaces.length > 0
    ? `Runtime workspace health check failed: ${degradedSurfaces}.`
    : "Runtime workspace health check failed.";
}

async function readRuntimeIntentRecord(
  nodeId: string
): Promise<RuntimeIntentRecord | undefined> {
  const filePath = path.join(runtimeIntentsRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeIntentRecordSchema.parse(await readJsonFile(filePath));
}

async function readRuntimeRecoveryPolicyRecord(
  nodeId: string
): Promise<RuntimeRecoveryPolicyRecord | undefined> {
  const filePath = runtimeRecoveryPolicyRecordPath(nodeId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeRecoveryPolicyRecordSchema.parse(await readJsonFile(filePath));
}

async function ensureRuntimeRecoveryPolicyRecord(
  nodeId: string
): Promise<RuntimeRecoveryPolicyRecord> {
  const existingRecord = await readRuntimeRecoveryPolicyRecord(nodeId);

  if (existingRecord) {
    return existingRecord;
  }

  const defaultRecord = buildDefaultRuntimeRecoveryPolicy(nodeId);
  await writeJsonFile(runtimeRecoveryPolicyRecordPath(nodeId), defaultRecord);
  return defaultRecord;
}

async function readObservedRuntimeRecord(
  nodeId: string
): Promise<ObservedRuntimeRecord | undefined> {
  const filePath = path.join(observedRuntimesRoot, `${nodeId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRuntimeRecordSchema.parse(await readJsonFile(filePath));
}

async function readRuntimeRecoveryControllerRecord(
  nodeId: string
): Promise<RuntimeRecoveryControllerRecord | undefined> {
  const filePath = runtimeRecoveryControllerRecordPath(nodeId);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return runtimeRecoveryControllerRecordSchema.parse(await readJsonFile(filePath));
}

async function listRuntimeRecoveryRecords(input: {
  limit?: number;
  nodeId: string;
}): Promise<RuntimeRecoveryRecord[]> {
  const directoryPath = runtimeRecoveryHistoryNodeRoot(input.nodeId);

  if (!(await pathExists(directoryPath))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(directoryPath))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        runtimeRecoveryRecordSchema.parse(
          await readJsonFile(path.join(directoryPath, entry))
        )
      )
  );

  records.sort((left, right) => {
    const recordedAtOrdering = right.recordedAt.localeCompare(left.recordedAt);

    if (recordedAtOrdering !== 0) {
      return recordedAtOrdering;
    }

    return right.recoveryId.localeCompare(left.recoveryId);
  });

  return records.slice(0, input.limit ?? records.length);
}

async function readLatestRuntimeRecoveryRecord(
  nodeId: string
): Promise<RuntimeRecoveryRecord | undefined> {
  const [latestRecord] = await listRuntimeRecoveryRecords({
    limit: 1,
    nodeId
  });

  return latestRecord;
}

async function readObservedSessionActivityRecord(
  nodeId: string,
  sessionId: string
): Promise<ObservedSessionActivityRecord | undefined> {
  const filePath = path.join(
    observedSessionActivityRoot,
    `${nodeId}--${sessionId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedSessionActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedRunnerTurnActivityRecord(
  nodeId: string,
  turnId: string
): Promise<ObservedRunnerTurnActivityRecord | undefined> {
  const filePath = path.join(observedRunnerTurnActivityRoot, `${nodeId}--${turnId}.json`);

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedRunnerTurnActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedConversationActivityRecord(
  nodeId: string,
  conversationId: string
): Promise<ObservedConversationActivityRecord | undefined> {
  const filePath = path.join(
    observedConversationActivityRoot,
    `${nodeId}--${conversationId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedConversationActivityRecordSchema.parse(
    await readJsonFile(filePath)
  );
}

async function readObservedApprovalActivityRecord(
  nodeId: string,
  approvalId: string
): Promise<ObservedApprovalActivityRecord | undefined> {
  const filePath = path.join(
    observedApprovalActivityRoot,
    `${nodeId}--${approvalId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedApprovalActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function readObservedArtifactActivityRecord(
  nodeId: string,
  artifactId: string
): Promise<ObservedArtifactActivityRecord | undefined> {
  const filePath = path.join(
    observedArtifactActivityRoot,
    `${nodeId}--${artifactId}.json`
  );

  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return observedArtifactActivityRecordSchema.parse(await readJsonFile(filePath));
}

async function listObservedSessionActivityRecords(): Promise<
  ObservedSessionActivityRecord[]
> {
  if (!(await pathExists(observedSessionActivityRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedSessionActivityRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        observedSessionActivityRecordSchema.parse(
          await readJsonFile(path.join(observedSessionActivityRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.sessionId}`.localeCompare(
      `${right.nodeId}--${right.sessionId}`
    )
  );
}

async function listObservedConversationActivityRecords(): Promise<
  ObservedConversationActivityRecord[]
> {
  if (!(await pathExists(observedConversationActivityRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedConversationActivityRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        observedConversationActivityRecordSchema.parse(
          await readJsonFile(path.join(observedConversationActivityRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.conversationId}`.localeCompare(
      `${right.nodeId}--${right.conversationId}`
    )
  );
}

async function listObservedApprovalActivityRecords(): Promise<
  ObservedApprovalActivityRecord[]
> {
  if (!(await pathExists(observedApprovalActivityRoot))) {
    return [];
  }

  const records = await Promise.all(
    (await readdir(observedApprovalActivityRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) =>
        observedApprovalActivityRecordSchema.parse(
          await readJsonFile(path.join(observedApprovalActivityRoot, entry))
        )
      )
  );

  return records.sort((left, right) =>
    `${left.nodeId}--${left.approvalId}`.localeCompare(
      `${right.nodeId}--${right.approvalId}`
    )
  );
}

async function listObservedRuntimeNodeIds(): Promise<string[]> {
  if (!(await pathExists(observedRuntimesRoot))) {
    return [];
  }

  return (await readdir(observedRuntimesRoot))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -".json".length))
    .sort((left, right) => left.localeCompare(right));
}

async function readLatestReconciliationSnapshot(): Promise<
  ReconciliationSnapshot | undefined
> {
  if (!(await pathExists(latestReconciliationPath))) {
    return undefined;
  }

  return reconciliationSnapshotSchema.parse(
    await readJsonFile(latestReconciliationPath)
  );
}

function didRuntimeIntentChange(
  previous: RuntimeIntentRecord | undefined,
  next: RuntimeIntentRecord
): boolean {
  return (
    !previous ||
    previous.desiredState !== next.desiredState ||
    previous.reason !== next.reason ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId
  );
}

function createRuntimeIntentRecord(input: {
  desiredState: RuntimeDesiredState;
  existingIntent: RuntimeIntentRecord | undefined;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  reason: string | undefined;
  restartGeneration: number;
}): RuntimeIntentRecord {
  const isEquivalentToExisting =
    input.existingIntent &&
    input.existingIntent.desiredState === input.desiredState &&
    input.existingIntent.reason === input.reason &&
    input.existingIntent.graphId === input.graphId &&
    input.existingIntent.graphRevisionId === input.graphRevisionId &&
    input.existingIntent.restartGeneration === input.restartGeneration;
  const preservedUpdatedAt = input.existingIntent?.updatedAt;

  return runtimeIntentRecordSchema.parse({
    desiredState: input.desiredState,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    nodeId: input.nodeId,
    reason: input.reason,
    restartGeneration: input.restartGeneration,
    schemaVersion: "1",
    updatedAt: isEquivalentToExisting && preservedUpdatedAt ? preservedUpdatedAt : nowIsoString()
  });
}

function didObservedRuntimeChange(
  previous: ObservedRuntimeRecord | undefined,
  next: ObservedRuntimeRecord
): boolean {
  return (
    !previous ||
    previous.observedState !== next.observedState ||
    previous.statusMessage !== next.statusMessage ||
    previous.runtimeHandle !== next.runtimeHandle ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId
  );
}

function normalizeFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFingerprintValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([entryKey, entryValue]) => [
          entryKey,
          normalizeFingerprintValue(entryValue)
        ])
    );
  }

  return value;
}

function buildObservationFingerprint(value: unknown): string {
  return createHash("sha1")
    .update(JSON.stringify(normalizeFingerprintValue(value)))
    .digest("hex");
}

function runtimeRecoveryHistoryNodeRoot(nodeId: string): string {
  return path.join(runtimeRecoveryHistoryRoot, nodeId);
}

function runtimeRecoveryPolicyRecordPath(nodeId: string): string {
  return path.join(runtimeRecoveryPoliciesRoot, `${nodeId}.json`);
}

function runtimeRecoveryControllerRecordPath(nodeId: string): string {
  return path.join(runtimeRecoveryControllersRoot, `${nodeId}.json`);
}

function buildDefaultRuntimeRecoveryPolicy(nodeId: string): RuntimeRecoveryPolicyRecord {
  return runtimeRecoveryPolicyRecordSchema.parse({
    nodeId,
    policy: {
      mode: "manual"
    },
    schemaVersion: "1",
    updatedAt: nowIsoString()
  });
}

function buildIdleRuntimeRecoveryController(input: {
  graphId?: string;
  graphRevisionId?: string;
  nodeId: string;
}): RuntimeRecoveryControllerRecord {
  return runtimeRecoveryControllerRecordSchema.parse({
    attemptsUsed: 0,
    ...(input.graphId ? { graphId: input.graphId } : {}),
    ...(input.graphRevisionId ? { graphRevisionId: input.graphRevisionId } : {}),
    nodeId: input.nodeId,
    schemaVersion: "1",
    state: "idle",
    updatedAt: nowIsoString()
  });
}

function addSecondsToIsoString(isoString: string, seconds: number): string {
  return new Date(Date.parse(isoString) + seconds * 1000).toISOString();
}

function buildRuntimeRecoveryRecordId(input: {
  fingerprint: string;
  nodeId: string;
  recordedAt: string;
}): string {
  return sanitizeIdentifier(
    `${input.nodeId}-${input.recordedAt}-${input.fingerprint.slice(0, 12)}`
  );
}

function buildRuntimeRecoveryFailureFingerprint(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}): string {
  return buildObservationFingerprint({
    ...(input.lastError ? { lastError: input.lastError } : {}),
    runtime: {
      backendKind: input.inspection.backendKind,
      contextAvailable: input.inspection.contextAvailable,
      desiredState: input.inspection.desiredState,
      graphId: input.inspection.graphId,
      graphRevisionId: input.inspection.graphRevisionId,
      nodeId: input.inspection.nodeId,
      observedState: input.inspection.observedState,
      reason: input.inspection.reason,
      statusMessage: input.inspection.statusMessage
    }
  });
}

function buildRuntimeRecoveryComparable(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}) {
  const inspection = runtimeInspectionResponseSchema.parse(input.inspection);
  const provisioning = inspection.primaryGitRepositoryProvisioning;
  const workspaceHealth = inspection.workspaceHealth
    ? {
        ...inspection.workspaceHealth,
        checkedAt: ""
      }
    : undefined;

  return {
    ...(input.lastError ? { lastError: input.lastError } : {}),
    runtime: {
      ...inspection,
      workspaceHealth,
      primaryGitRepositoryProvisioning: provisioning
        ? {
            ...(provisioning.created === undefined
              ? {}
              : { created: provisioning.created }),
            ...(provisioning.lastError === undefined
              ? {}
              : { lastError: provisioning.lastError }),
            state: provisioning.state,
            target: provisioning.target
          }
        : undefined
    }
  };
}

function didReconciliationSnapshotChange(
  previous: ReconciliationSnapshot | undefined,
  next: ReconciliationSnapshot
): boolean {
  return (
    !previous ||
    previous.graphId !== next.graphId ||
    previous.graphRevisionId !== next.graphRevisionId ||
    previous.managedRuntimeCount !== next.managedRuntimeCount ||
    previous.runningRuntimeCount !== next.runningRuntimeCount ||
    previous.stoppedRuntimeCount !== next.stoppedRuntimeCount ||
    previous.transitioningRuntimeCount !== next.transitioningRuntimeCount ||
    previous.degradedRuntimeCount !== next.degradedRuntimeCount ||
    previous.blockedRuntimeCount !== next.blockedRuntimeCount ||
    previous.failedRuntimeCount !== next.failedRuntimeCount ||
    previous.issueCount !== next.issueCount ||
    JSON.stringify(previous.findingCodes) !== JSON.stringify(next.findingCodes) ||
    JSON.stringify(previous.nodes) !== JSON.stringify(next.nodes)
  );
}

function buildRuntimeInspectionFromState(input: {
  agentRuntime: RuntimeAgentRuntimeInspection | undefined;
  backendKind: ReturnType<typeof observedRuntimeRecordSchema.parse>["backendKind"];
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  observedState: RuntimeObservedState;
  packageSourceId: string | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  reason: string | undefined;
  restartGeneration: number;
  runtimeHandle: string | undefined;
  statusMessage: string | undefined;
  workspaceHealth: RuntimeWorkspaceHealth | undefined;
}): RuntimeInspectionInternal {
  const contextPath = input.context
    ? path.join(input.context.workspace.injectedRoot, runtimeContextFileName)
    : undefined;
  const inspection = runtimeInspectionResponseSchema.parse({
    agentRuntime: input.agentRuntime,
    backendKind: input.backendKind,
    contextAvailable: Boolean(input.context),
    desiredState: input.desiredState,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    nodeId: input.nodeId,
    observedState: input.observedState,
    packageSourceId: input.packageSourceId,
    primaryGitRepositoryProvisioning: input.primaryGitRepositoryProvisioning,
    reason: input.reason,
    restartGeneration: input.restartGeneration,
    runtimeHandle: input.runtimeHandle,
    statusMessage: input.statusMessage,
    workspaceHealth: input.workspaceHealth
  });

  return {
    ...inspection,
    ...(contextPath ? { contextPath } : {})
  };
}

async function buildRuntimeAgentRuntimeInspection(
  context: EffectiveRuntimeContext
): Promise<RuntimeAgentRuntimeInspection> {
  const turns = await listRuntimeTurnRecords(context.workspace.runtimeRoot);
  const approvals = await listRuntimeApprovalRecords(context.workspace.runtimeRoot);
  const latestEngineTurn = turns
    .filter((turn) => Boolean(turn.engineOutcome))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const outcome = latestEngineTurn?.engineOutcome;
  const lastPermissionObservation = outcome?.permissionObservations?.at(-1);
  const defaultAgent =
    context.agentRuntimeContext.defaultAgent ??
    context.agentRuntimeContext.engineProfile.defaultAgent;

  return runtimeAgentRuntimeInspectionSchema.parse({
    ...(defaultAgent ? { defaultAgent } : {}),
    engineKind: context.agentRuntimeContext.engineProfile.kind,
    ...(context.agentRuntimeContext.engineProfile.permissionMode
      ? {
          enginePermissionMode:
            context.agentRuntimeContext.engineProfile.permissionMode
        }
      : {}),
    engineProfileDisplayName:
      context.agentRuntimeContext.engineProfile.displayName,
    engineProfileRef: context.agentRuntimeContext.engineProfileRef,
    ...(outcome?.failure?.classification
      ? { lastEngineFailureClassification: outcome.failure.classification }
      : {}),
    ...(outcome?.failure?.message
      ? { lastEngineFailureMessage: outcome.failure.message }
      : {}),
    ...(outcome?.engineSessionId
      ? { lastEngineSessionId: outcome.engineSessionId }
      : {}),
    ...(outcome?.stopReason
      ? { lastEngineStopReason: outcome.stopReason }
      : {}),
    ...(outcome?.engineVersion
      ? { lastEngineVersion: outcome.engineVersion }
      : {}),
    ...(lastPermissionObservation
      ? {
          lastPermissionDecision: lastPermissionObservation.decision,
          lastPermissionOperation: lastPermissionObservation.operation,
          ...(lastPermissionObservation.reason
            ? { lastPermissionReason: lastPermissionObservation.reason }
            : {})
        }
      : {}),
    ...(latestEngineTurn?.sourceChangeSummary
      ? { lastSourceChangeSummary: latestEngineTurn.sourceChangeSummary }
      : {}),
    lastProducedArtifactIds: latestEngineTurn?.producedArtifactIds ?? [],
    lastRequestedApprovalIds: latestEngineTurn?.requestedApprovalIds ?? [],
    ...(latestEngineTurn?.sourceChangeCandidateIds?.[0]
      ? {
          lastSourceChangeCandidateId:
            latestEngineTurn.sourceChangeCandidateIds[0]
        }
      : {}),
    ...(latestEngineTurn
      ? {
          lastTurnId: latestEngineTurn.turnId,
          lastTurnUpdatedAt: latestEngineTurn.updatedAt
        }
      : {}),
    mode: context.agentRuntimeContext.mode,
    pendingApprovalIds: approvals
      .filter((approval) => approval.status === "pending")
      .sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.approvalId.localeCompare(right.approvalId)
      )
      .map((approval) => approval.approvalId),
    stateScope: context.agentRuntimeContext.engineProfile.stateScope
  });
}

async function reconcileObservedRuntimeState(input: {
  context: EffectiveRuntimeContext | undefined;
  desiredState: RuntimeDesiredState;
  existingObservedRecord: ObservedRuntimeRecord | undefined;
  graphId: string;
  graphRevisionId: string;
  nodeId: string;
  packageSourceId: string | undefined;
  primaryGitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  reason: string | undefined;
  restartGeneration: number;
  runtimeIdentitySecret: string | undefined;
}): Promise<{
  inspection: RuntimeInspectionInternal;
  observedRecord: ObservedRuntimeRecord;
}> {
  const runtimeBackend = getRuntimeBackend();
  const contextPath = input.context
    ? path.join(input.context.workspace.injectedRoot, runtimeContextFileName)
    : undefined;
  const joinConfigPath = input.context
    ? path.join(input.context.workspace.injectedRoot, runnerJoinConfigFileName)
    : undefined;
  const joinConfigAvailable = joinConfigPath
    ? await pathExists(joinConfigPath)
    : false;
  const workspaceHealth = input.context
    ? await inspectRuntimeWorkspaceHealth(input.context.workspace)
    : undefined;
  let observedRuntime: Awaited<ReturnType<RuntimeBackend["reconcileRuntime"]>>;

  if (
    input.context &&
    input.desiredState === "running" &&
    workspaceHealth?.status === "degraded"
  ) {
    const healthFailureMessage =
      summarizeRuntimeWorkspaceHealthFailure(workspaceHealth);
    observedRuntime = {
      backendKind: runtimeBackend.kind,
      lastError: healthFailureMessage,
      observedState: "failed",
      runtimeHandle: undefined,
      statusMessage: healthFailureMessage
    };
  } else {
    try {
      observedRuntime = await runtimeBackend.reconcileRuntime({
        context: input.context,
        contextPath,
        desiredState: input.desiredState,
        graphId: input.graphId,
        graphRevisionId: input.graphRevisionId,
        ...(joinConfigAvailable && joinConfigPath ? { joinConfigPath } : {}),
        nodeId: input.nodeId,
        reason: input.reason,
        restartGeneration: input.restartGeneration,
        ...(input.context && input.runtimeIdentitySecret
          ? {
              secretEnvironment: {
                ENTANGLE_NOSTR_SECRET_KEY: input.runtimeIdentitySecret
              }
            }
          : {})
      });
    } catch (error: unknown) {
      observedRuntime = {
        backendKind: runtimeBackend.kind,
        lastError: formatUnknownError(error),
        observedState: "failed",
        runtimeHandle: undefined,
        statusMessage: `Runtime reconciliation failed: ${formatUnknownError(error)}`
      };
    }
  }
  const observedRecord = observedRuntimeRecordSchema.parse({
    backendKind: observedRuntime.backendKind,
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    lastError: observedRuntime.lastError,
    lastSeenAt: nowIsoString(),
    nodeId: input.nodeId,
    observedState: observedRuntime.observedState,
    runtimeContextPath: contextPath,
    runtimeHandle: observedRuntime.runtimeHandle,
    schemaVersion: "1",
    statusMessage: observedRuntime.statusMessage
  });
  await writeJsonFileIfChanged(
    path.join(observedRuntimesRoot, `${input.nodeId}.json`),
    observedRecord
  );

  if (didObservedRuntimeChange(input.existingObservedRecord, observedRecord)) {
    await appendHostEvent({
      backendKind: observedRecord.backendKind,
      category: "runtime",
      desiredState: input.desiredState,
      graphId: input.graphId,
      graphRevisionId: input.graphRevisionId,
      message: `Runtime '${input.nodeId}' observed state is now '${observedRecord.observedState}'.`,
      nodeId: input.nodeId,
      observedState: observedRecord.observedState,
      previousObservedState: input.existingObservedRecord?.observedState,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      type: "runtime.observed_state.changed"
    } satisfies RuntimeObservedStateChangedEventInput);
  }

  const agentRuntime = input.context
    ? await buildRuntimeAgentRuntimeInspection(input.context)
    : undefined;

  return {
    inspection: buildRuntimeInspectionFromState({
      agentRuntime,
      backendKind: observedRecord.backendKind,
      context: input.context,
      desiredState: input.desiredState,
      graphId: input.graphId,
      graphRevisionId: input.graphRevisionId,
      nodeId: input.nodeId,
      observedState: observedRecord.observedState,
      packageSourceId: input.packageSourceId,
      primaryGitRepositoryProvisioning: input.primaryGitRepositoryProvisioning,
      reason: input.reason,
      restartGeneration: input.restartGeneration,
      runtimeHandle: observedRecord.runtimeHandle,
      statusMessage: observedRecord.statusMessage,
      workspaceHealth
    }),
    observedRecord
  };
}

function buildReconciliationSnapshot(input: {
  backendKind: ReconciliationSnapshot["backendKind"];
  graphId: string | undefined;
  graphRevisionId: string | undefined;
  lastReconciledAt: string;
  runtimes: RuntimeInspectionResponse[];
}): ReconciliationSnapshot {
  const findingCodes = new Set<
    ReconciliationSnapshot["findingCodes"][number]
  >();
  const nodes = input.runtimes.map((runtime) => {
    for (const findingCode of runtime.reconciliation.findingCodes) {
      findingCodes.add(findingCode);
    }

    return {
      desiredState: runtime.desiredState,
      nodeId: runtime.nodeId,
      observedState: runtime.observedState,
      reconciliation: runtime.reconciliation,
      statusMessage: runtime.statusMessage
    };
  });

  return reconciliationSnapshotSchema.parse({
    backendKind: input.backendKind,
    blockedRuntimeCount: input.runtimes.filter((runtime) =>
      runtime.reconciliation.findingCodes.includes("context_unavailable")
    ).length,
    degradedRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.reconciliation.state === "degraded"
    ).length,
    failedRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.observedState === "failed"
    ).length,
    findingCodes: Array.from(findingCodes).sort(),
    graphId: input.graphId,
    graphRevisionId: input.graphRevisionId,
    issueCount: input.runtimes.reduce(
      (total, runtime) => total + runtime.reconciliation.findingCodes.length,
      0
    ),
    lastReconciledAt: input.lastReconciledAt,
    managedRuntimeCount: input.runtimes.length,
    nodes,
    runningRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.observedState === "running"
    ).length,
    schemaVersion: "1",
    stoppedRuntimeCount: input.runtimes.filter(
      (runtime) =>
        runtime.observedState === "stopped" ||
        runtime.observedState === "missing"
    ).length,
    transitioningRuntimeCount: input.runtimes.filter(
      (runtime) => runtime.reconciliation.state === "transitioning"
    ).length
  });
}

function externalPrincipalRecordPath(principalId: string): string {
  return path.join(externalPrincipalsRoot, `${principalId}.json`);
}

export async function initializeHostState(): Promise<void> {
  await ensureDirectory(hostStateRoot);
  await ensureStateLayoutCompatible();

  await Promise.all([
    ensureDirectory(runtimeIdentitiesRoot),
    ensureDirectory(secretRefsRoot),
    ensureDirectory(hostAuthorityRoot),
    ensureDirectory(runnerRegistryRoot),
    ensureDirectory(runtimeAssignmentsRoot),
    ensureDirectory(userNodeIdentitiesRoot),
    ensureDirectory(externalPrincipalsRoot),
    ensureDirectory(nodeBindingsRoot),
    ensureDirectory(runtimeIntentsRoot),
    ensureDirectory(runtimeRecoveryPoliciesRoot),
    ensureDirectory(packageSourcesRoot),
    ensureDirectory(graphRevisionsRoot),
    ensureDirectory(observedRuntimesRoot),
    ensureDirectory(observedArtifactRefsRoot),
    ensureDirectory(observedSourceChangeRefsRoot),
    ensureDirectory(observedSourceHistoryRefsRoot),
    ensureDirectory(observedSourceHistoryReplaysRoot),
    ensureDirectory(observedWikiRefsRoot),
    ensureDirectory(observedRunnerHeartbeatRoot),
    ensureDirectory(runtimeRecoveryHistoryRoot),
    ensureDirectory(runtimeRecoveryControllersRoot),
    ensureDirectory(gitRepositoryTargetsRoot),
    ensureDirectory(observedRunnerTurnActivityRoot),
    ensureDirectory(observedSessionActivityRoot),
    ensureDirectory(observedUserNodeConversationReadsRoot),
    ensureDirectory(observedUserNodeMessagesRoot),
    ensureDirectory(reconciliationHistoryRoot),
    ensureDirectory(path.join(observedRoot, "health")),
    ensureDirectory(controlPlaneTraceRoot),
    ensureDirectory(path.join(tracesRoot, "sessions")),
    ensureDirectory(path.join(importsRoot, "packages")),
    ensureDirectory(packageStoreRoot),
    ensureDirectory(workspacesRoot),
    ensureDirectory(path.join(cacheRoot, "validator")),
    ensureDirectory(path.join(cacheRoot, "projections")),
    ensureDirectory(artifactGitResolverCacheRoot),
    ensureDirectory(hostGitAskPassRoot),
    ensureDirectory(path.join(cacheRoot, "temp"))
  ]);

  await ensureHostAuthorityMaterialized();

  if (!(await pathExists(catalogPath))) {
    const defaultCatalog = buildDefaultCatalog();

    await writeJsonFile(catalogPath, defaultCatalog);
    await appendHostEvent({
      catalogId: defaultCatalog.catalogId,
      category: "control_plane",
      message: "Bootstrapped default deployment resource catalog.",
      type: "catalog.updated",
      updateKind: "bootstrap"
    } satisfies CatalogUpdatedEventInput);
  }
}

export async function getCatalogInspection(): Promise<CatalogInspectionResponse> {
  await initializeHostState();
  const catalog = deploymentResourceCatalogSchema.parse(
    await readJsonFile(catalogPath)
  );
  const validation = validateDeploymentResourceCatalogDocument(catalog);

  return {
    catalog,
    validation
  };
}

export function validateCatalogCandidate(input: unknown): CatalogInspectionResponse {
  const parseResult = deploymentResourceCatalogSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      catalog: undefined,
      validation: buildValidationReport(
        parseResult.error.issues.map((issue) => ({
          code: "resource_catalog_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        }))
      )
    };
  }

  return {
    catalog: parseResult.data,
    validation: validateDeploymentResourceCatalogDocument(parseResult.data)
  };
}

export async function applyCatalog(
  input: unknown
): Promise<CatalogInspectionResponse> {
  const inspection = validateCatalogCandidate(input);

  if (!inspection.validation.ok || !inspection.catalog) {
    return inspection;
  }

  await writeJsonFile(catalogPath, inspection.catalog);
  await synchronizeCurrentGraphRuntimeState();
  await appendHostEvent({
    catalogId: inspection.catalog.catalogId,
    category: "control_plane",
    message: `Applied catalog '${inspection.catalog.catalogId}'.`,
    type: "catalog.updated",
    updateKind: "apply"
  } satisfies CatalogUpdatedEventInput);

  return inspection;
}

export async function upsertAgentEngineProfile(
  profileId: string,
  request: AgentEngineProfileUpsertRequest
): Promise<CatalogInspectionResponse> {
  const catalog = await readCatalog();
  const existingProfile = catalog.agentEngineProfiles.find(
    (candidate) => candidate.id === profileId
  );
  const kind = request.kind ?? existingProfile?.kind ?? "opencode_server";
  const profile: AgentEngineProfile = {
    ...(existingProfile ?? {
      displayName: request.displayName ?? profileId,
      id: profileId,
      kind,
      stateScope: "node" as const
    }),
    ...(request.displayName ? { displayName: request.displayName } : {}),
    id: profileId,
    kind,
    stateScope: request.stateScope ?? existingProfile?.stateScope ?? "node"
  };

  if (
    !existingProfile &&
    kind === "opencode_server" &&
    !request.baseUrl &&
    !request.clearExecutable
  ) {
    profile.executable = "opencode";
  }

  if (request.executable) {
    profile.executable = request.executable;
  } else if (request.clearExecutable) {
    delete profile.executable;
  }

  if (request.baseUrl) {
    profile.baseUrl = request.baseUrl;
  } else if (request.clearBaseUrl) {
    delete profile.baseUrl;
  }

  if (request.defaultAgent) {
    profile.defaultAgent = request.defaultAgent;
  } else if (request.clearDefaultAgent) {
    delete profile.defaultAgent;
  }

  if (request.permissionMode) {
    profile.permissionMode = request.permissionMode;
  } else if (request.clearPermissionMode) {
    delete profile.permissionMode;
  }

  if (request.version) {
    profile.version = request.version;
  } else if (request.clearVersion) {
    delete profile.version;
  }

  const candidateCatalog = {
    ...catalog,
    agentEngineProfiles: [
      ...catalog.agentEngineProfiles.filter(
        (candidate) => candidate.id !== profileId
      ),
      profile
    ].sort((left, right) => left.id.localeCompare(right.id)),
    defaults: {
      ...catalog.defaults,
      ...(request.setDefault
        ? {
            agentEngineProfileRef: profileId
          }
        : {})
    }
  };
  const inspection = validateCatalogCandidate(candidateCatalog);

  if (!inspection.validation.ok || !inspection.catalog) {
    return inspection;
  }

  await writeJsonFile(catalogPath, inspection.catalog);
  await synchronizeCurrentGraphRuntimeState();
  await appendHostEvent({
    catalogId: inspection.catalog.catalogId,
    category: "control_plane",
    message: `Upserted agent engine profile '${profileId}' in catalog '${inspection.catalog.catalogId}'.`,
    type: "catalog.updated",
    updateKind: "apply"
  } satisfies CatalogUpdatedEventInput);

  return inspection;
}

export async function listPackageSources(): Promise<PackageSourceListResponse> {
  await initializeHostState();
  const records = await listPackageSourceRecords();
  const packageSources: PackageSourceInspectionResponse[] = [];

  for (const record of records) {
    packageSources.push({
      packageSource: record,
      manifest: await resolveManifestForPackageSource(record),
      validation: await validatePersistedPackageSource(record)
    });
  }

  packageSources.sort((left, right) =>
    left.packageSource.packageSourceId.localeCompare(
      right.packageSource.packageSourceId
    )
  );

  return { packageSources };
}

export async function getPackageSourceInspection(
  packageSourceId: string
): Promise<PackageSourceInspectionResponse | null> {
  await initializeHostState();
  const packageSourcePath = packageSourceRecordPath(packageSourceId);

  if (!(await pathExists(packageSourcePath))) {
    return null;
  }

  const record = await reconcileMaterializedPackageSourceRecord(
    packageSourceRecordSchema.parse(await readJsonFile(packageSourcePath))
  );

  return {
    packageSource: record,
    manifest: await resolveManifestForPackageSource(record),
    validation: await validatePersistedPackageSource(record)
  };
}

export async function admitPackageSource(
  request: PackageSourceAdmissionRequest
): Promise<PackageSourceInspectionResponse> {
  await initializeHostState();

  if (request.sourceKind === "local_archive") {
    const existing = await listPackageSources();
    const fallbackPackageSourceId = buildPackageSourceId(
      request.packageSourceId,
      stripSupportedPackageArchiveExtension(request.archivePath),
      existing.packageSources.map(
        (entry: PackageSourceInspectionResponse) =>
          entry.packageSource.packageSourceId
      )
    );
    const extractionRoot = path.join(
      cacheRoot,
      "temp",
      sanitizeIdentifier(`package-archive-${randomUUID()}`)
    );
    let packageSourceId = fallbackPackageSourceId;
    let manifest: AgentPackageManifest | undefined;

    try {
      await ensureDirectory(extractionRoot);
      await extractPackageTarArchive({
        archivePath: request.archivePath,
        extractionRoot
      });

      const extractedPackageRoot = await resolveExtractedPackageRoot(extractionRoot);
      manifest = await readPackageManifestFromRoot(extractedPackageRoot);
      packageSourceId = buildPackageSourceId(
        request.packageSourceId,
        manifest?.packageId ?? stripSupportedPackageArchiveExtension(request.archivePath),
        existing.packageSources.map(
          (entry: PackageSourceInspectionResponse) =>
            entry.packageSource.packageSourceId
        )
      );

      const validation = await validatePackageDirectory(extractedPackageRoot);
      const importedPackageRoot = path.join(
        importsRoot,
        "packages",
        packageSourceId,
        "package"
      );
      const recordBase = {
        sourceKind: request.sourceKind,
        packageSourceId,
        archivePath: request.archivePath,
        admittedAt: nowIsoString()
      } as const;

      if (!validation.ok) {
        return {
          packageSource: packageSourceRecordSchema.parse(recordBase),
          manifest,
          validation
        };
      }

      await rm(packageSourceImportRoot(packageSourceId), {
        force: true,
        recursive: true
      });
      await syncDirectoryContents(extractedPackageRoot, importedPackageRoot);

      const record = packageSourceRecordSchema.parse({
        ...recordBase,
        materialization: await materializePackageStore(
          packageSourceId,
          importedPackageRoot
        )
      });

      await writeJsonFile(
        packageSourceRecordPath(packageSourceId),
        record
      );
      await appendHostEvent({
        category: "control_plane",
        message: `Admitted package source '${packageSourceId}'.`,
        packageSourceId,
        type: "package_source.admitted"
      } satisfies PackageSourceAdmittedEventInput);

      return {
        packageSource: record,
        manifest,
        validation
      };
    } catch (error) {
      return {
        packageSource: packageSourceRecordSchema.parse({
          sourceKind: request.sourceKind,
          packageSourceId,
          archivePath: request.archivePath,
          admittedAt: nowIsoString()
        }),
        manifest,
        validation: buildValidationReport([
          {
            code: "archive_package_extract_failed",
            severity: "error",
            message:
              error instanceof Error
                ? `Could not extract package archive: ${error.message}`
                : "Could not extract package archive.",
            path: ["archivePath"]
          }
        ])
      };
    } finally {
      await rm(extractionRoot, {
        force: true,
        recursive: true
      });
    }
  }

  if (request.sourceKind === "local_path") {
    const validation = await validatePackageDirectory(request.absolutePath);
    const manifest = await resolveManifestForPackageSource({
      sourceKind: "local_path",
      packageSourceId: sanitizeIdentifier(request.packageSourceId ?? "candidate"),
      absolutePath: request.absolutePath
    });
    const existing = await listPackageSources();
    const packageSourceId = buildPackageSourceId(
      request.packageSourceId,
      manifest?.packageId ?? path.basename(request.absolutePath),
      existing.packageSources.map(
        (entry: PackageSourceInspectionResponse) =>
          entry.packageSource.packageSourceId
      )
    );

    const record = packageSourceRecordSchema.parse({
      sourceKind: "local_path",
      packageSourceId,
      absolutePath: request.absolutePath,
      materialization: validation.ok
        ? await materializePackageStore(packageSourceId, request.absolutePath)
        : undefined,
      admittedAt: nowIsoString()
    });

    if (validation.ok) {
      await writeJsonFile(packageSourceRecordPath(packageSourceId), record);
      await appendHostEvent({
        category: "control_plane",
        message: `Admitted package source '${packageSourceId}'.`,
        packageSourceId,
        type: "package_source.admitted"
      } satisfies PackageSourceAdmittedEventInput);
    }

    return {
      packageSource: record,
      manifest,
      validation
    };
  }

  throw new Error("Unsupported package source admission request.");
}

export async function deletePackageSource(
  packageSourceId: string
): Promise<PackageSourceDeletionResult> {
  await initializeHostState();

  const recordPath = packageSourceRecordPath(packageSourceId);

  if (!(await pathExists(recordPath))) {
    return {
      conflict: {
        kind: "package_source_not_found",
        packageSourceId
      },
      ok: false
    };
  }

  const { graph } = await readActiveGraphState();
  const referencingNodeIds =
    graph?.nodes
      .filter((node) => node.packageSourceRef === packageSourceId)
      .map((node) => node.nodeId)
      .sort() ?? [];

  if (referencingNodeIds.length > 0) {
    return {
      conflict: {
        kind: "package_source_in_use",
        nodeIds: referencingNodeIds,
        packageSourceId
      },
      ok: false
    };
  }

  const record = packageSourceRecordSchema.parse(await readJsonFile(recordPath));

  await rm(recordPath, { force: true });

  if (record.sourceKind === "local_archive") {
    await rm(packageSourceImportRoot(packageSourceId), {
      force: true,
      recursive: true
    });
  }

  await appendHostEvent({
    category: "control_plane",
    message: `Deleted package source '${packageSourceId}'.`,
    packageSourceId,
    type: "package_source.deleted"
  } satisfies PackageSourceDeletedEventInput);

  return {
    ok: true,
    response: {
      deletedPackageSourceId: packageSourceId
    }
  };
}

async function readExternalPrincipalRecords(): Promise<ExternalPrincipalRecord[]> {
  if (!(await pathExists(externalPrincipalsRoot))) {
    return [];
  }

  const fileNames = (await readdir(externalPrincipalsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      externalPrincipalRecordSchema.parse(
        await readJsonFile(path.join(externalPrincipalsRoot, fileName))
      )
    )
  );
}

async function currentExternalPrincipals(): Promise<ExternalPrincipalRecord[]> {
  return readExternalPrincipalRecords();
}

export async function listExternalPrincipals(): Promise<ExternalPrincipalListResponse> {
  await initializeHostState();

  const principals = (await readExternalPrincipalRecords()).map((principal) =>
    externalPrincipalInspectionResponseSchema.parse({
      principal,
      validation: buildValidationReport([])
    })
  );

  return externalPrincipalListResponseSchema.parse({
    principals
  });
}

export async function getExternalPrincipalInspection(
  principalId: string
): Promise<ExternalPrincipalInspectionResponse | null> {
  await initializeHostState();
  const recordPath = externalPrincipalRecordPath(principalId);

  if (!(await pathExists(recordPath))) {
    return null;
  }

  return externalPrincipalInspectionResponseSchema.parse({
    principal: externalPrincipalRecordSchema.parse(await readJsonFile(recordPath)),
    validation: buildValidationReport([])
  });
}

export async function upsertExternalPrincipal(
  principal: ExternalPrincipalRecord
): Promise<ExternalPrincipalInspectionResponse> {
  await initializeHostState();

  const canonicalPrincipal = externalPrincipalRecordSchema.parse(principal);

  await writeJsonFile(
    externalPrincipalRecordPath(canonicalPrincipal.principalId),
    canonicalPrincipal
  );
  await appendHostEvent({
    category: "control_plane",
    message: `Upserted external principal '${canonicalPrincipal.principalId}'.`,
    principalId: canonicalPrincipal.principalId,
    type: "external_principal.updated"
  } satisfies ExternalPrincipalUpdatedEventInput);

  return externalPrincipalInspectionResponseSchema.parse({
    principal: canonicalPrincipal,
    validation: buildValidationReport([])
  });
}

export async function deleteExternalPrincipal(
  principalId: string
): Promise<ExternalPrincipalDeletionResult> {
  await initializeHostState();

  const recordPath = externalPrincipalRecordPath(principalId);

  if (!(await pathExists(recordPath))) {
    return {
      conflict: {
        kind: "external_principal_not_found",
        principalId
      },
      ok: false
    };
  }

  const { graph } = await readActiveGraphState();
  const referencingNodeIds =
    graph?.nodes
      .filter((node) =>
        resolveEffectiveExternalPrincipalRefs(node, graph).includes(principalId)
      )
      .map((node) => node.nodeId)
      .sort() ?? [];

  if (referencingNodeIds.length > 0) {
    return {
      conflict: {
        kind: "external_principal_in_use",
        nodeIds: referencingNodeIds,
        principalId
      },
      ok: false
    };
  }

  await rm(recordPath, { force: true });
  await appendHostEvent({
    category: "control_plane",
    message: `Deleted external principal '${principalId}'.`,
    principalId,
    type: "external_principal.deleted"
  } satisfies ExternalPrincipalDeletedEventInput);

  return {
    ok: true,
    response: externalPrincipalDeletionResponseSchema.parse({
      deletedPrincipalId: principalId
    })
  };
}

export async function getGraphInspection(): Promise<GraphInspectionResponse> {
  await initializeHostState();

  if (!(await pathExists(currentGraphPath))) {
    return {
      graph: undefined,
      activeRevisionId: undefined
    };
  }

  const graph = graphSpecSchema.parse(await readJsonFile(currentGraphPath));
  const revisionRecord = await readActiveGraphRevisionRecord();

  return {
    graph,
    activeRevisionId: revisionRecord?.activeRevisionId
  };
}

async function currentPackageSourceIds(): Promise<string[]> {
  const records = await listPackageSourceRecords();
  return records.map((record) => record.packageSourceId);
}

export async function validateGraphCandidate(
  input: unknown
): Promise<GraphMutationResponse> {
  const parseResult = graphSpecSchema.safeParse(input);

  if (!parseResult.success) {
    return {
      graph: undefined,
      activeRevisionId: undefined,
      validation: buildValidationReport(
        parseResult.error.issues.map((issue) => ({
          code: "graph_invalid",
          severity: "error",
          message: issue.message,
          path: issue.path.map(String)
        }))
      )
    };
  }

  const catalogInspection = await getCatalogInspection();
  const validationOptions = {
    externalPrincipals: await currentExternalPrincipals(),
    packageSourceIds: await currentPackageSourceIds(),
    ...(catalogInspection.catalog ? { catalog: catalogInspection.catalog } : {})
  };
  const validation = validateGraphDocument(parseResult.data, validationOptions);

  return {
    graph: parseResult.data,
    activeRevisionId: undefined,
    validation
  };
}

function buildRuntimeIntentReasonForUnavailableContext(input: {
  hasAgentEngineProfile: boolean;
  gitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;
  node: NodeBinding;
  packageManifest: AgentPackageManifest | undefined;
  packageSource: PackageSourceRecord | undefined;
  packageSourcePathExists: boolean;
}): string {
  if (!input.node.packageSourceRef) {
    return `Node '${input.node.nodeId}' cannot start because it has no package source binding.`;
  }

  if (!input.packageSource) {
    return `Node '${input.node.nodeId}' cannot start because package source '${input.node.packageSourceRef}' is not admitted.`;
  }

  if (!input.packageSourcePathExists) {
    return `Node '${input.node.nodeId}' cannot start because package source '${input.packageSource.packageSourceId}' is unavailable on disk.`;
  }

  if (!input.packageManifest) {
    return `Node '${input.node.nodeId}' cannot start because its package manifest could not be resolved.`;
  }

  if (!input.hasAgentEngineProfile) {
    return `Node '${input.node.nodeId}' cannot start because it has no effective agent engine profile.`;
  }

  if (input.gitRepositoryProvisioning?.state === "failed") {
    return (
      `Node '${input.node.nodeId}' cannot start because primary git repository target ` +
      `'${input.gitRepositoryProvisioning.target.namespace}/${input.gitRepositoryProvisioning.target.repositoryName}' ` +
      `could not be provisioned. ${input.gitRepositoryProvisioning.lastError ?? "Unknown provisioning error."}`
    );
  }

  return `Node '${input.node.nodeId}' has no realizable runtime context.`;
}

async function buildRuntimeResolution(input: {
  activeRevisionId: string;
  catalog: DeploymentResourceCatalog;
  graph: GraphSpec;
  node: NodeBinding;
  packageSources: Map<string, PackageSourceRecord>;
  repositoryProvisioningCache: Map<string, GitRepositoryProvisioningRecord>;
  runtimeAssignments: RuntimeAssignmentRecord[];
}): Promise<RuntimeResolution> {
  const {
    activeRevisionId,
    catalog,
    graph,
    node,
    packageSources,
    repositoryProvisioningCache,
    runtimeAssignments
  } = input;
  const workspace = buildWorkspaceLayout(node.nodeId);
  const packageSource = node.packageSourceRef
    ? packageSources.get(node.packageSourceRef)
    : undefined;
  const resolvedRelayProfiles = resolveEffectiveRelayProfiles(node, graph, catalog);
  const resolvedRelayProfileRefs = resolveEffectiveRelayProfileRefs(
    node,
    graph,
    catalog
  );
  const resolvedPrimaryRelayProfileRef = resolveEffectivePrimaryRelayProfileRef(
    node,
    graph,
    catalog
  );
  const resolvedGitServices = resolveEffectiveGitServices(node, graph, catalog);
  const resolvedPrimaryGitServiceRef = resolveEffectivePrimaryGitServiceRef(
    node,
    graph,
    catalog
  );
  const resolvedModelEndpointProfile = resolveEffectiveModelEndpointProfile(
    node,
    graph,
    catalog
  );
  const resolvedModelEndpointProfileRef = resolveEffectiveModelEndpointProfileRef(
    node,
    graph,
    catalog
  );
  const resolvedAgentRuntime = resolveEffectiveAgentRuntime(
    node,
    graph,
    catalog
  );
  const resolvedAgentEngineProfile = resolveEffectiveAgentEngineProfile(
    node,
    graph,
    catalog
  );
  const resolvedModelAuthBinding = resolvedModelEndpointProfile
    ? await resolveSecretBinding(resolvedModelEndpointProfile.secretRef)
    : undefined;
  const sourcePackageRoot = packageSource
    ? packageSourcePackageRoot(packageSource)
    : undefined;
  const runtimeIdentity = await ensureRuntimeIdentity({
    graphId: graph.graphId,
    nodeId: node.nodeId
  });
  const runtimeContextPath = path.join(
    workspace.injectedRoot,
    runtimeContextFileName
  );
  const runnerJoinConfigPath = path.join(
    workspace.injectedRoot,
    runnerJoinConfigFileName
  );
  const runtimeIdentitySecret = (await readFile(
    runtimeIdentity.secretStoragePath,
    "utf8"
  )).trim();
  const resolvedExternalPrincipals = resolveEffectiveExternalPrincipals(
    node,
    graph,
    await currentExternalPrincipals()
  );
  const resolvedGitPrincipals = resolvedExternalPrincipals.filter(
    (principal) => principal.systemKind === "git"
  );
  const resolvedGitPrincipalBindings = await resolveGitPrincipalRuntimeBindings(
    resolvedGitPrincipals
  );
  const resolvedPrimaryGitPrincipalRef = resolveEffectivePrimaryGitPrincipalRef(
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedDefaultNamespace = resolveEffectiveGitDefaultNamespace(
    resolvedGitServices,
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedPrimaryGitRepositoryTarget = resolvePrimaryGitRepositoryTarget({
    defaultNamespace: resolvedDefaultNamespace,
    gitServices: resolvedGitServices,
    graphId: graph.graphId,
    primaryGitServiceRef: resolvedPrimaryGitServiceRef
  });
  const packageSourcePathExists = sourcePackageRoot
    ? await pathExists(sourcePackageRoot)
    : false;
  const packageManifest =
    sourcePackageRoot && packageSourcePathExists
      ? await readPackageManifest(sourcePackageRoot)
      : undefined;
  const canAttemptContext =
    Boolean(sourcePackageRoot) &&
    packageSourcePathExists &&
    Boolean(packageManifest) &&
    Boolean(resolvedAgentEngineProfile);
  const gitRepositoryProvisioningRecordId = resolvedPrimaryGitRepositoryTarget
    ? buildGitRepositoryTargetRecordId(resolvedPrimaryGitRepositoryTarget)
    : undefined;
  let gitRepositoryProvisioning: GitRepositoryProvisioningRecord | undefined;

  if (canAttemptContext && resolvedPrimaryGitRepositoryTarget) {
    gitRepositoryProvisioning = repositoryProvisioningCache.get(
      gitRepositoryProvisioningRecordId!
    );

    if (!gitRepositoryProvisioning) {
      gitRepositoryProvisioning = await ensureGitRepositoryTargetProvisioning({
        target: resolvedPrimaryGitRepositoryTarget,
        gitServices: resolvedGitServices
      });
      repositoryProvisioningCache.set(
        gitRepositoryProvisioningRecordId!,
        gitRepositoryProvisioning
      );
    }

    await persistGitRepositoryProvisioningRecord(gitRepositoryProvisioning);
  }
  const effectiveBinding = effectiveNodeBindingSchema.parse({
    bindingId: sanitizeIdentifier(`${activeRevisionId}-${node.nodeId}`),
    externalPrincipals: resolvedExternalPrincipals,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    node,
    packageSource,
    resolvedResourceBindings: {
      externalPrincipalRefs: resolveEffectiveExternalPrincipalRefs(node, graph),
      relayProfileRefs: resolvedRelayProfileRefs,
      primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
      gitServiceRefs: resolvedGitServices.map((service) => service.id),
      primaryGitServiceRef: resolvedPrimaryGitServiceRef,
      modelEndpointProfileRef: resolvedModelEndpointProfileRef
    },
    runtimeProfile: graph.defaults.runtimeProfile,
    schemaVersion: "1"
  });

  await Promise.all([
    ensureDirectory(workspace.root),
    ensureDirectory(workspace.injectedRoot),
    ensureDirectory(workspace.memoryRoot),
    ensureDirectory(workspace.artifactWorkspaceRoot),
    ensureDirectory(workspace.engineStateRoot),
    ensureDirectory(workspace.retrievalRoot),
    ensureDirectory(workspace.runtimeRoot),
    ensureDirectory(workspace.sourceWorkspaceRoot),
    ensureDirectory(workspace.wikiRepositoryRoot)
  ]);

  let context: EffectiveRuntimeContext | undefined;

  if (
    sourcePackageRoot &&
    packageManifest &&
    canAttemptContext &&
    gitRepositoryProvisioning?.state !== "failed"
  ) {
    await syncWorkspacePackageLink(sourcePackageRoot, workspace.packageRoot);
    await initializeWorkspaceMemory(
      workspace.memoryRoot,
      sourcePackageRoot,
      packageManifest
    );
    let existingContext: EffectiveRuntimeContext | undefined;

    if (await pathExists(runtimeContextPath)) {
      const parsedExistingContext = effectiveRuntimeContextSchema.safeParse(
        await readJsonFile(runtimeContextPath)
      );

      if (parsedExistingContext.success) {
        existingContext = parsedExistingContext.data;
      }
    }

    const hostAuthority = await ensureHostAuthorityMaterialized();
    const edgeRoutes: EffectiveRuntimeContext["relayContext"]["edgeRoutes"] = [];

    for (const edge of graph.edges) {
      if (
        !edge.enabled ||
        (edge.fromNodeId !== node.nodeId && edge.toNodeId !== node.nodeId)
      ) {
        continue;
      }

      const peerNodeId =
        edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId;
      const peerNode = graph.nodes.find((candidate) => candidate.nodeId === peerNodeId);

      if (!peerNode) {
        continue;
      }

      const peerRelayRefs = resolveEffectiveRelayProfileRefs(
        peerNode,
        graph,
        catalog
      );
      const transportRelayRefs =
        edge.transportPolicy.relayProfileRefs.length > 0
          ? edge.transportPolicy.relayProfileRefs
          : intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs);
      const realizableRelayRefs = intersectIdentifiers(
        intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs),
        transportRelayRefs
      );

      if (realizableRelayRefs.length === 0) {
        continue;
      }

      const peerRuntimeIdentity =
        peerNode.nodeKind === "user"
          ? await ensureUserNodeIdentity({
              graphId: graph.graphId,
              hostAuthorityPubkey: hostAuthority.publicKey,
              node: peerNode
            })
          : await ensureRuntimeIdentity({
              graphId: graph.graphId,
              nodeId: peerNode.nodeId
            });

      edgeRoutes.push({
        channel: edge.transportPolicy.channel,
        edgeId: edge.edgeId,
        peerNodeId,
        ...(peerRuntimeIdentity ? { peerPubkey: peerRuntimeIdentity.publicKey } : {}),
        relation: edge.relation,
        relayProfileRefs: realizableRelayRefs
      });
    }

    const contextDraft = {
      agentRuntimeContext: {
        mode: resolvedAgentRuntime.mode,
        defaultAgent: resolvedAgentRuntime.defaultAgent,
        engineProfile: resolvedAgentEngineProfile,
        engineProfileRef: resolvedAgentRuntime.engineProfileRef
      },
      artifactContext: {
        backends: ["git"],
        defaultNamespace: resolvedDefaultNamespace,
        gitPrincipalBindings: resolvedGitPrincipalBindings,
        gitServices: resolvedGitServices,
        primaryGitPrincipalRef: resolvedPrimaryGitPrincipalRef,
        primaryGitRepositoryTarget: resolvedPrimaryGitRepositoryTarget,
        primaryGitServiceRef: resolvedPrimaryGitServiceRef
      },
      binding: {
        ...effectiveBinding
      },
      generatedAt: nowIsoString(),
      identityContext: runtimeIdentityContextSchema.parse({
        algorithm: runtimeIdentity.algorithm,
        publicKey: runtimeIdentity.publicKey,
        secretDelivery: {
          envVar: "ENTANGLE_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      }),
      modelContext: {
        auth: resolvedModelAuthBinding,
        modelEndpointProfile: resolvedModelEndpointProfile
      },
      packageManifest,
      policyContext: {
        autonomy: node.autonomy,
        notes: [],
        runtimeProfile: graph.defaults.runtimeProfile,
        sourceMutation: node.policy?.sourceMutation ?? defaultNodeSourceMutationPolicy
      },
      relayContext: {
        edgeRoutes,
        primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
        relayProfiles: resolvedRelayProfiles
      },
      schemaVersion: "1",
      workspace
    };
    const comparableDraft = JSON.stringify({
      ...contextDraft,
      generatedAt: ""
    });
    const comparableExisting = existingContext
      ? JSON.stringify({
          ...existingContext,
          generatedAt: ""
        })
      : undefined;

    context = effectiveRuntimeContextSchema.parse({
      ...contextDraft,
      generatedAt:
        comparableExisting === comparableDraft
          ? existingContext?.generatedAt ?? contextDraft.generatedAt
          : nowIsoString()
    });

    await writeJsonFileIfChanged(runtimeContextPath, context);

    const runnerJoinConfig = buildRunnerJoinConfigForRuntimeContext(
      context,
      hostAuthority.publicKey
    );

    if (runnerJoinConfig) {
      await writeJsonFileIfChanged(runnerJoinConfigPath, runnerJoinConfig);
    } else {
      await rm(runnerJoinConfigPath, { force: true });
    }
  } else {
    await rm(workspace.packageRoot, { force: true, recursive: true });
    await rm(runtimeContextPath, { force: true });
    await rm(runnerJoinConfigPath, { force: true });
  }

  await writeJsonFileIfChanged(
    path.join(nodeBindingsRoot, `${node.nodeId}.json`),
    effectiveBinding
  );

  const existingIntent = await readRuntimeIntentRecord(node.nodeId);
  const federatedAssignment = selectRuntimeProjectionAssignment({
    assignments: runtimeAssignments,
    nodeId: node.nodeId
  });
  const recoveryPolicyRecord = await ensureRuntimeRecoveryPolicyRecord(node.nodeId);
  const operatorStopped =
    existingIntent?.desiredState === "stopped" &&
    existingIntent.reason === "stopped_by_operator";
  const desiredState: RuntimeDesiredState = context
    ? operatorStopped
      ? "stopped"
      : "running"
    : "stopped";
  const reason =
    desiredState === "stopped"
      ? context
        ? "stopped_by_operator"
        : buildRuntimeIntentReasonForUnavailableContext({
            hasAgentEngineProfile: Boolean(resolvedAgentEngineProfile),
            gitRepositoryProvisioning,
            node,
            packageManifest,
            packageSource,
            packageSourcePathExists
          })
      : undefined;

  const intentRecord = runtimeIntentRecordSchema.parse({
    ...createRuntimeIntentRecord({
      desiredState,
      existingIntent,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      nodeId: node.nodeId,
      reason,
      restartGeneration: existingIntent?.restartGeneration ?? 0
    })
  });
  await writeJsonFileIfChanged(
    path.join(runtimeIntentsRoot, `${node.nodeId}.json`),
    intentRecord
  );
  if (didRuntimeIntentChange(existingIntent, intentRecord)) {
    await appendHostEvent({
      category: "runtime",
      desiredState: intentRecord.desiredState,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      message: `Runtime '${node.nodeId}' desired state is now '${intentRecord.desiredState}'.`,
      nodeId: node.nodeId,
      previousDesiredState: existingIntent?.desiredState,
      previousReason: existingIntent?.reason,
      reason: intentRecord.reason,
      type: "runtime.desired_state.changed"
    } satisfies RuntimeDesiredStateChangedEventInput);
  }

  const existingObservedRecord = await readObservedRuntimeRecord(node.nodeId);
  if (federatedAssignment) {
    const federatedObservedRecord =
      existingObservedRecord?.backendKind === "federated" &&
      (!existingObservedRecord.assignmentId ||
        existingObservedRecord.assignmentId === federatedAssignment.assignmentId) &&
      (!existingObservedRecord.runnerId ||
        existingObservedRecord.runnerId === federatedAssignment.runnerId)
        ? existingObservedRecord
        : undefined;

    if (existingObservedRecord && existingObservedRecord !== federatedObservedRecord) {
      await rm(path.join(observedRuntimesRoot, `${node.nodeId}.json`), {
        force: true
      });
    }

    const agentRuntime = context
      ? await buildRuntimeAgentRuntimeInspection(context)
      : undefined;
    const runnerId =
      federatedObservedRecord?.runnerId ?? federatedAssignment.runnerId;
    const runtimeHandle =
      federatedObservedRecord?.runtimeHandle ??
      `federated:${runnerId}:${federatedAssignment.assignmentId}`;

    return {
      binding: effectiveBinding,
      context,
      primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
      inspection: buildRuntimeInspectionFromState({
        agentRuntime,
        backendKind: "federated",
        context,
        desiredState: intentRecord.desiredState,
        graphId: graph.graphId,
        graphRevisionId: activeRevisionId,
        nodeId: node.nodeId,
        observedState: federatedObservedRecord?.observedState ?? "missing",
        packageSourceId: packageSource?.packageSourceId,
        primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
        reason: intentRecord.reason,
        restartGeneration: intentRecord.restartGeneration,
        runtimeHandle,
        statusMessage:
          federatedObservedRecord?.statusMessage ??
          `Runtime '${node.nodeId}' is assigned to federated runner '${runnerId}' and waiting for runner observation.`,
        workspaceHealth: undefined
      })
    };
  }

  let currentIntentRecord = intentRecord;
  let { inspection, observedRecord } = await reconcileObservedRuntimeState({
    context,
    desiredState: currentIntentRecord.desiredState,
    existingObservedRecord,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId,
    packageSourceId: packageSource?.packageSourceId,
    primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
    reason: currentIntentRecord.reason,
    restartGeneration: currentIntentRecord.restartGeneration,
    runtimeIdentitySecret
  });
  await synchronizeRuntimeRecoveryHistory({
    inspection,
    lastError: observedRecord.lastError
  });

  const existingRecoveryController = await readRuntimeRecoveryControllerRecord(
    node.nodeId
  );
  let nextRecoveryController = buildIdleRuntimeRecoveryController({
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    nodeId: node.nodeId
  });

  if (
    inspection.desiredState === "running" &&
    inspection.contextAvailable &&
    inspection.observedState === "failed"
  ) {
    const failureFingerprint = buildRuntimeRecoveryFailureFingerprint({
      inspection,
      lastError: observedRecord.lastError
    });
    const previousControllerForFailure =
      existingRecoveryController?.activeFailureFingerprint === failureFingerprint
        ? existingRecoveryController
        : undefined;
    const lastFailureAt = nowIsoString();

    if (recoveryPolicyRecord.policy.mode === "manual") {
      nextRecoveryController = createRuntimeRecoveryControllerRecord({
        activeFailureFingerprint: failureFingerprint,
        attemptsUsed: 0,
        existingRecord: existingRecoveryController,
        graphId: graph.graphId,
        graphRevisionId: activeRevisionId,
        lastFailureAt,
        nodeId: node.nodeId,
        state: "manual_required"
      });
    } else {
      const attemptsUsed = previousControllerForFailure?.attemptsUsed ?? 0;
      const nextEligibleAt = previousControllerForFailure?.nextEligibleAt;
      const now = nowIsoString();

      if (nextEligibleAt && nextEligibleAt > now) {
        nextRecoveryController = createRuntimeRecoveryControllerRecord({
          activeFailureFingerprint: failureFingerprint,
          attemptsUsed,
          existingRecord: existingRecoveryController,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          ...(previousControllerForFailure?.lastAttemptedAt
            ? { lastAttemptedAt: previousControllerForFailure.lastAttemptedAt }
            : {}),
          lastFailureAt,
          nextEligibleAt,
          nodeId: node.nodeId,
          state: "cooldown"
        });
      } else if (attemptsUsed >= recoveryPolicyRecord.policy.maxAttempts) {
        nextRecoveryController = createRuntimeRecoveryControllerRecord({
          activeFailureFingerprint: failureFingerprint,
          attemptsUsed,
          existingRecord: existingRecoveryController,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          ...(previousControllerForFailure?.lastAttemptedAt
            ? { lastAttemptedAt: previousControllerForFailure.lastAttemptedAt }
            : {}),
          lastFailureAt,
          nodeId: node.nodeId,
          state: "exhausted"
        });
      } else {
        const attemptedAt = nowIsoString();
        const nextRestartGeneration =
          Math.max(
            currentIntentRecord.restartGeneration,
            existingIntent?.restartGeneration ?? 0
          ) + 1;
        const attemptedIntentRecord = createRuntimeIntentRecord({
          desiredState: "running",
          existingIntent: currentIntentRecord,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          nodeId: node.nodeId,
          reason: undefined,
          restartGeneration: nextRestartGeneration
        });
        await writeJsonFile(
          path.join(runtimeIntentsRoot, `${node.nodeId}.json`),
          attemptedIntentRecord
        );
        await appendHostEvent({
          category: "runtime",
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          message:
            `Runtime '${node.nodeId}' restart was requested with generation '${nextRestartGeneration}'.`,
          nodeId: node.nodeId,
          previousRestartGeneration: currentIntentRecord.restartGeneration,
          restartGeneration: nextRestartGeneration,
          type: "runtime.restart.requested"
        } satisfies RuntimeRestartRequestedEventInput);

        currentIntentRecord = attemptedIntentRecord;
        const retryResult = await reconcileObservedRuntimeState({
          context,
          desiredState: currentIntentRecord.desiredState,
          existingObservedRecord: observedRecord,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          nodeId: node.nodeId,
          packageSourceId: packageSource?.packageSourceId,
          primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
          reason: currentIntentRecord.reason,
          restartGeneration: currentIntentRecord.restartGeneration,
          runtimeIdentitySecret
        });
        inspection = retryResult.inspection;
        observedRecord = retryResult.observedRecord;
        await synchronizeRuntimeRecoveryHistory({
          inspection,
          lastError: observedRecord.lastError
        });

        const attemptsAfterAttempt = attemptsUsed + 1;
        const cooldownUntil =
          recoveryPolicyRecord.policy.cooldownSeconds > 0
            ? addSecondsToIsoString(
                attemptedAt,
                recoveryPolicyRecord.policy.cooldownSeconds
              )
            : undefined;
        await appendHostEvent({
          attemptNumber: attemptsAfterAttempt,
          category: "runtime",
          cooldownSeconds: recoveryPolicyRecord.policy.cooldownSeconds,
          failureFingerprint,
          graphId: graph.graphId,
          graphRevisionId: activeRevisionId,
          maxAttempts: recoveryPolicyRecord.policy.maxAttempts,
          message:
            `Runtime '${node.nodeId}' automatic recovery attempted restart generation '${currentIntentRecord.restartGeneration}'.`,
          ...(cooldownUntil ? { nextEligibleAt: cooldownUntil } : {}),
          nodeId: node.nodeId,
          restartGeneration: currentIntentRecord.restartGeneration,
          type: "runtime.recovery.attempted"
        } satisfies RuntimeRecoveryAttemptedEventInput);

        if (inspection.observedState === "failed") {
          const nextControllerState =
            attemptsAfterAttempt >= recoveryPolicyRecord.policy.maxAttempts
              ? "exhausted"
              : "cooldown";
          nextRecoveryController = createRuntimeRecoveryControllerRecord({
            activeFailureFingerprint: failureFingerprint,
            attemptsUsed: attemptsAfterAttempt,
            existingRecord: existingRecoveryController,
            graphId: graph.graphId,
            graphRevisionId: activeRevisionId,
            lastAttemptedAt: attemptedAt,
            lastFailureAt,
            ...(attemptsAfterAttempt < recoveryPolicyRecord.policy.maxAttempts &&
            cooldownUntil
              ? { nextEligibleAt: cooldownUntil }
              : {}),
            nodeId: node.nodeId,
            state: nextControllerState
          });

          if (
            nextControllerState === "exhausted" &&
            (existingRecoveryController?.state !== "exhausted" ||
              existingRecoveryController.activeFailureFingerprint !==
                failureFingerprint ||
              existingRecoveryController.attemptsUsed !== attemptsAfterAttempt)
          ) {
            await appendHostEvent({
              attemptsUsed: attemptsAfterAttempt,
              category: "runtime",
              failureFingerprint,
              graphId: graph.graphId,
              graphRevisionId: activeRevisionId,
              maxAttempts: recoveryPolicyRecord.policy.maxAttempts,
              message:
                `Runtime '${node.nodeId}' exhausted automatic recovery after '${attemptsAfterAttempt}' attempts.`,
              nodeId: node.nodeId,
              type: "runtime.recovery.exhausted"
            } satisfies RuntimeRecoveryExhaustedEventInput);
          }
        } else {
          nextRecoveryController = buildIdleRuntimeRecoveryController({
            graphId: graph.graphId,
            graphRevisionId: activeRevisionId,
            nodeId: node.nodeId
          });
        }
      }
    }
  }

  await writeJsonFileIfChanged(
    runtimeRecoveryControllerRecordPath(node.nodeId),
    nextRecoveryController
  );
  if (didRuntimeRecoveryControllerChange(existingRecoveryController, nextRecoveryController)) {
    await appendHostEvent({
      category: "runtime",
      controller: nextRecoveryController,
      graphId: graph.graphId,
      graphRevisionId: activeRevisionId,
      message:
        `Runtime '${node.nodeId}' recovery controller is now ` +
        `'${nextRecoveryController.state}'.`,
      nodeId: node.nodeId,
      ...(existingRecoveryController
        ? {
            previousAttemptsUsed: existingRecoveryController.attemptsUsed,
            previousState: existingRecoveryController.state
          }
        : {}),
      type: "runtime.recovery_controller.updated"
    } satisfies RuntimeRecoveryControllerUpdatedEventInput);
  }

  return {
    binding: effectiveBinding,
    context,
    primaryGitRepositoryProvisioning: gitRepositoryProvisioning,
    inspection
  };
}

async function performCurrentGraphRuntimeStateSynchronization(): Promise<CurrentGraphRuntimeSynchronizationResult> {
  const { graph, activeRevisionId } = await readActiveGraphState();
  const previousSnapshot = await readLatestReconciliationSnapshot();
  const runtimeBackend = getRuntimeBackend();

  if (!graph || !activeRevisionId) {
    const emptySnapshot = reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      blockedRuntimeCount: 0,
      degradedRuntimeCount: 0,
      failedRuntimeCount: 0,
      findingCodes: [],
      graphId: undefined,
      graphRevisionId: undefined,
      issueCount: 0,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    });
    await writeJsonFileIfChanged(latestReconciliationPath, emptySnapshot);
    await removeJsonFilesExcept(gitRepositoryTargetsRoot, new Set());
    await removeJsonFilesExcept(runtimeRecoveryControllersRoot, new Set());
    await removeJsonFilesExcept(observedSessionActivityRoot, new Set());
    await removeJsonFilesExcept(observedRunnerTurnActivityRoot, new Set());
    if (didReconciliationSnapshotChange(previousSnapshot, emptySnapshot)) {
      await appendHostEvent({
        backendKind: emptySnapshot.backendKind,
        blockedRuntimeCount: emptySnapshot.blockedRuntimeCount,
        category: "reconciliation",
        degradedRuntimeCount: emptySnapshot.degradedRuntimeCount,
        failedRuntimeCount: emptySnapshot.failedRuntimeCount,
        findingCodes: emptySnapshot.findingCodes,
        graphId: emptySnapshot.graphId,
        graphRevisionId: emptySnapshot.graphRevisionId,
        issueCount: emptySnapshot.issueCount,
        managedRuntimeCount: emptySnapshot.managedRuntimeCount,
        message: "Host reconciliation completed with no active graph.",
        runningRuntimeCount: emptySnapshot.runningRuntimeCount,
        stoppedRuntimeCount: emptySnapshot.stoppedRuntimeCount,
        transitioningRuntimeCount: emptySnapshot.transitioningRuntimeCount,
        type: "host.reconciliation.completed"
      } satisfies HostReconciliationCompletedEventInput);
    }

    return {
      nodes: [],
      runtimes: [],
      snapshot: emptySnapshot
    };
  }

  const catalog = await readCatalog();
  const packageSources = await listPackageSourceRecordMap();
  const runtimeNodes = graph.nodes.filter((node) => node.nodeKind !== "user");
  const runtimeNodeIds = new Set(runtimeNodes.map((node) => node.nodeId));
  const graphNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  await ensureUserNodeIdentitiesForGraph(graph);
  const repositoryProvisioningCache = new Map<
    string,
    GitRepositoryProvisioningRecord
  >();
  const runtimeAssignments = await listRuntimeAssignmentRecords();
  const nodeInspections: NodeInspectionResponse[] = [];
  const inspections: RuntimeInspectionInternal[] = [];

  for (const nodeId of await listObservedRuntimeNodeIds()) {
    if (!graphNodeIds.has(nodeId)) {
      await runtimeBackend.removeInactiveRuntime(nodeId);
    }
  }

  await removeJsonFilesExcept(nodeBindingsRoot, runtimeNodeIds);
  await removeJsonFilesExcept(runtimeIntentsRoot, runtimeNodeIds);
  await removeJsonFilesExcept(runtimeRecoveryControllersRoot, runtimeNodeIds);
  await removeJsonFilesExcept(observedRuntimesRoot, graphNodeIds);

  for (const node of runtimeNodes) {
    const resolution = await buildRuntimeResolution({
      activeRevisionId,
      catalog,
      graph,
      node,
      packageSources,
      repositoryProvisioningCache,
      runtimeAssignments
    });
    nodeInspections.push(
      nodeInspectionResponseSchema.parse({
        binding: resolution.binding,
        runtime: resolution.inspection
      })
    );
    inspections.push(resolution.inspection);
  }

  const retainedRepositoryProvisioningRecordIds = new Set(
    repositoryProvisioningCache.keys()
  );
  for (const recordId of await listRuntimeSourceHistoryPublicationTargetRecordIds(
    runtimeNodeIds
  )) {
    retainedRepositoryProvisioningRecordIds.add(recordId);
  }

  await removeJsonFilesExcept(
    gitRepositoryTargetsRoot,
    retainedRepositoryProvisioningRecordIds
  );
  await synchronizeRuntimeActivityEvents({
    runtimes: inspections
  });

  inspections.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  nodeInspections.sort((left, right) =>
    left.binding.node.nodeId.localeCompare(right.binding.node.nodeId)
  );
  const snapshot = buildReconciliationSnapshot({
    backendKind: runtimeBackend.kind,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    lastReconciledAt: nowIsoString(),
    runtimes: inspections
  });

  await writeJsonFileIfChanged(latestReconciliationPath, snapshot);
  if (didReconciliationSnapshotChange(previousSnapshot, snapshot)) {
    await appendHostEvent({
      backendKind: snapshot.backendKind,
      blockedRuntimeCount: snapshot.blockedRuntimeCount,
      category: "reconciliation",
      degradedRuntimeCount: snapshot.degradedRuntimeCount,
      failedRuntimeCount: snapshot.failedRuntimeCount,
      findingCodes: snapshot.findingCodes,
      graphId: snapshot.graphId,
      graphRevisionId: snapshot.graphRevisionId,
      issueCount: snapshot.issueCount,
      managedRuntimeCount: snapshot.managedRuntimeCount,
      message: `Host reconciliation completed for graph '${snapshot.graphId}'.`,
      runningRuntimeCount: snapshot.runningRuntimeCount,
      stoppedRuntimeCount: snapshot.stoppedRuntimeCount,
      transitioningRuntimeCount: snapshot.transitioningRuntimeCount,
      type: "host.reconciliation.completed"
    } satisfies HostReconciliationCompletedEventInput);
  }

  return {
    nodes: nodeInspections,
    runtimes: inspections,
    snapshot
  };
}

async function synchronizeCurrentGraphRuntimeState(): Promise<CurrentGraphRuntimeSynchronizationResult> {
  if (currentGraphRuntimeSynchronizationPromise) {
    return currentGraphRuntimeSynchronizationPromise;
  }

  const synchronizationPromise = performCurrentGraphRuntimeStateSynchronization().finally(
    () => {
      if (currentGraphRuntimeSynchronizationPromise === synchronizationPromise) {
        currentGraphRuntimeSynchronizationPromise = undefined;
      }
    }
  );

  currentGraphRuntimeSynchronizationPromise = synchronizationPromise;
  return synchronizationPromise;
}

export async function listRuntimeInspections(): Promise<RuntimeListResponse> {
  return runtimeListResponseSchema.parse({
    runtimes: (await synchronizeCurrentGraphRuntimeState()).runtimes
  });
}

export async function listNodeInspections(): Promise<NodeListResponse> {
  return nodeListResponseSchema.parse({
    nodes: (await synchronizeCurrentGraphRuntimeState()).nodes
  });
}

export async function listEdges(): Promise<EdgeListResponse> {
  const { graph } = await readActiveGraphState();

  return edgeListResponseSchema.parse({
    edges: graph?.edges ?? []
  });
}

export async function getNodeInspection(
  nodeId: string
): Promise<NodeInspectionResponse | null> {
  const { nodes } = await synchronizeCurrentGraphRuntimeState();
  return nodes.find((node) => node.binding.node.nodeId === nodeId) ?? null;
}

export async function createManagedNode(
  input: NodeCreateRequest
): Promise<ManagedNodeMutationResult<NodeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (graph.nodes.some((node) => node.nodeId === input.nodeId)) {
    return {
      conflict: {
        kind: "node_exists",
        nodeId: input.nodeId
      },
      ok: false
    };
  }

  const nextNode = nodeBindingSchema.parse(input);
  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: [...graph.nodes, nextNode]
    }),
    mutationKind: "created",
    nodeId: input.nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeMutationSuccessResponse({
      applied
    })
  };
}

export async function createEdge(
  input: EdgeCreateRequest
): Promise<EdgeMutationResult<EdgeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (graph.edges.some((edge) => edge.edgeId === input.edgeId)) {
    return {
      conflict: {
        edgeId: input.edgeId,
        kind: "edge_exists"
      },
      ok: false
    };
  }

  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: [...graph.edges, input]
    }),
    edgeId: input.edgeId,
    mutationKind: "created"
  });

  return {
    ok: true,
    response: buildEdgeMutationSuccessResponse({
      applied
    })
  };
}

export async function replaceManagedNode(
  nodeId: string,
  replacement: NodeReplacementRequest
): Promise<ManagedNodeMutationResult<NodeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findManagedNode(graph, nodeId)) {
    return {
      conflict: {
        kind: "node_not_found",
        nodeId
      },
      ok: false
    };
  }

  const nextNode = nodeBindingSchema.parse({
    ...replacement,
    nodeId
  });
  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: graph.nodes.map((node) => (node.nodeId === nodeId ? nextNode : node))
    }),
    mutationKind: "replaced",
    nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeMutationSuccessResponse({
      applied
    })
  };
}

export async function replaceEdge(
  edgeId: string,
  replacement: EdgeReplacementRequest
): Promise<EdgeMutationResult<EdgeMutationResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findEdge(graph, edgeId)) {
    return {
      conflict: {
        edgeId,
        kind: "edge_not_found"
      },
      ok: false
    };
  }

  const nextEdge: Edge = {
    ...replacement,
    edgeId
  };
  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: graph.edges.map((edge) => (edge.edgeId === edgeId ? nextEdge : edge))
    }),
    edgeId,
    mutationKind: "replaced"
  });

  return {
    ok: true,
    response: buildEdgeMutationSuccessResponse({
      applied
    })
  };
}

export async function deleteManagedNode(
  nodeId: string
): Promise<ManagedNodeMutationResult<NodeDeletionResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildManagedNodeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findManagedNode(graph, nodeId)) {
    return {
      conflict: {
        kind: "node_not_found",
        nodeId
      },
      ok: false
    };
  }

  const connectedEdgeIds = graph.edges
    .filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId)
    .map((edge) => edge.edgeId)
    .sort();

  if (connectedEdgeIds.length > 0) {
    return {
      conflict: {
        edgeIds: connectedEdgeIds,
        kind: "node_has_edges",
        nodeId
      },
      ok: false
    };
  }

  const applied = await applyNodeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      nodes: graph.nodes.filter((node) => node.nodeId !== nodeId)
    }),
    mutationKind: "deleted",
    nodeId
  });

  return {
    ok: true,
    response: buildManagedNodeDeletionSuccessResponse({
      applied,
      nodeId
    })
  };
}

export async function deleteEdge(
  edgeId: string
): Promise<EdgeMutationResult<EdgeDeletionResponse>> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return {
      conflict: buildEdgeMissingGraphConflict(),
      ok: false
    };
  }

  if (!findEdge(graph, edgeId)) {
    return {
      conflict: {
        edgeId,
        kind: "edge_not_found"
      },
      ok: false
    };
  }

  const applied = await applyEdgeGraphCandidate({
    candidateGraph: graphSpecSchema.parse({
      ...graph,
      edges: graph.edges.filter((edge) => edge.edgeId !== edgeId)
    }),
    edgeId,
    mutationKind: "deleted"
  });

  return {
    ok: true,
    response: buildEdgeDeletionSuccessResponse({
      applied,
      edgeId
    })
  };
}

export async function getRuntimeInspection(
  nodeId: string
): Promise<RuntimeInspectionResponse | null> {
  const runtime = await getRuntimeInspectionInternal(nodeId);
  return runtime ? runtimeInspectionResponseSchema.parse(runtime) : null;
}

async function getRuntimeInspectionInternal(
  nodeId: string
): Promise<RuntimeInspectionInternal | null> {
  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  return runtimes.find((runtime) => runtime.nodeId === nodeId) ?? null;
}

async function buildUserNodeRuntimeContext(
  nodeId: string
): Promise<EffectiveRuntimeContext | null> {
  await initializeHostState();

  const { graph, activeRevisionId } = await readActiveGraphState();

  if (!graph || !activeRevisionId) {
    return null;
  }

  const node = graph.nodes.find((candidate) => candidate.nodeId === nodeId);

  if (!node || node.nodeKind !== "user") {
    return null;
  }

  const catalog = await readCatalog();
  const workspace = buildWorkspaceLayout(node.nodeId);
  const resolvedRelayProfiles = resolveEffectiveRelayProfiles(
    node,
    graph,
    catalog
  );
  const resolvedRelayProfileRefs = resolveEffectiveRelayProfileRefs(
    node,
    graph,
    catalog
  );
  const resolvedPrimaryRelayProfileRef = resolveEffectivePrimaryRelayProfileRef(
    node,
    graph,
    catalog
  );
  const resolvedGitServices = resolveEffectiveGitServices(node, graph, catalog);
  const resolvedPrimaryGitServiceRef = resolveEffectivePrimaryGitServiceRef(
    node,
    graph,
    catalog
  );
  const resolvedAgentEngineProfile = resolveEffectiveAgentEngineProfile(
    node,
    graph,
    catalog
  );

  if (!resolvedAgentEngineProfile) {
    return null;
  }

  const hostAuthority = await ensureHostAuthorityMaterialized();
  const userNodeIdentity = await ensureUserNodeIdentity({
    graphId: graph.graphId,
    hostAuthorityPubkey: hostAuthority.publicKey,
    node
  });
  const resolvedExternalPrincipals = resolveEffectiveExternalPrincipals(
    node,
    graph,
    await currentExternalPrincipals()
  );
  const resolvedGitPrincipals = resolvedExternalPrincipals.filter(
    (principal) => principal.systemKind === "git"
  );
  const resolvedGitPrincipalBindings = await resolveGitPrincipalRuntimeBindings(
    resolvedGitPrincipals
  );
  const resolvedPrimaryGitPrincipalRef = resolveEffectivePrimaryGitPrincipalRef(
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedDefaultNamespace = resolveEffectiveGitDefaultNamespace(
    resolvedGitServices,
    resolvedGitPrincipals,
    resolvedPrimaryGitServiceRef
  );
  const resolvedPrimaryGitRepositoryTarget = resolvePrimaryGitRepositoryTarget({
    defaultNamespace: resolvedDefaultNamespace,
    gitServices: resolvedGitServices,
    graphId: graph.graphId,
    primaryGitServiceRef: resolvedPrimaryGitServiceRef
  });
  const effectiveBinding = effectiveNodeBindingSchema.parse({
    bindingId: sanitizeIdentifier(`${activeRevisionId}-${node.nodeId}`),
    externalPrincipals: resolvedExternalPrincipals,
    graphId: graph.graphId,
    graphRevisionId: activeRevisionId,
    node,
    resolvedResourceBindings: {
      externalPrincipalRefs: resolveEffectiveExternalPrincipalRefs(node, graph),
      relayProfileRefs: resolvedRelayProfileRefs,
      primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
      gitServiceRefs: resolvedGitServices.map((service) => service.id),
      primaryGitServiceRef: resolvedPrimaryGitServiceRef
    },
    runtimeProfile: graph.defaults.runtimeProfile,
    schemaVersion: "1"
  });

  await Promise.all([
    ensureDirectory(workspace.root),
    ensureDirectory(workspace.injectedRoot),
    ensureDirectory(workspace.memoryRoot),
    ensureDirectory(workspace.artifactWorkspaceRoot),
    ensureDirectory(workspace.engineStateRoot),
    ensureDirectory(workspace.packageRoot),
    ensureDirectory(workspace.retrievalRoot),
    ensureDirectory(workspace.runtimeRoot),
    ensureDirectory(workspace.sourceWorkspaceRoot),
    ensureDirectory(workspace.wikiRepositoryRoot)
  ]);

  const edgeRoutes: EffectiveRuntimeContext["relayContext"]["edgeRoutes"] = [];

  for (const edge of graph.edges) {
    if (
      !edge.enabled ||
      (edge.fromNodeId !== node.nodeId && edge.toNodeId !== node.nodeId)
    ) {
      continue;
    }

    const peerNodeId =
      edge.fromNodeId === node.nodeId ? edge.toNodeId : edge.fromNodeId;
    const peerNode = graph.nodes.find((candidate) => candidate.nodeId === peerNodeId);

    if (!peerNode) {
      continue;
    }

    const peerRelayRefs = resolveEffectiveRelayProfileRefs(
      peerNode,
      graph,
      catalog
    );
    const transportRelayRefs =
      edge.transportPolicy.relayProfileRefs.length > 0
        ? edge.transportPolicy.relayProfileRefs
        : intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs);
    const realizableRelayRefs = intersectIdentifiers(
      intersectIdentifiers(resolvedRelayProfileRefs, peerRelayRefs),
      transportRelayRefs
    );

    if (realizableRelayRefs.length === 0) {
      continue;
    }

    const peerRuntimeIdentity =
      peerNode.nodeKind === "user"
        ? await ensureUserNodeIdentity({
            graphId: graph.graphId,
            hostAuthorityPubkey: hostAuthority.publicKey,
            node: peerNode
          })
        : await ensureRuntimeIdentity({
            graphId: graph.graphId,
            nodeId: peerNode.nodeId
          });

    edgeRoutes.push({
      channel: edge.transportPolicy.channel,
      edgeId: edge.edgeId,
      peerNodeId,
      ...(peerRuntimeIdentity ? { peerPubkey: peerRuntimeIdentity.publicKey } : {}),
      relation: edge.relation,
      relayProfileRefs: realizableRelayRefs
    });
  }

  const context = effectiveRuntimeContextSchema.parse({
    agentRuntimeContext: {
      mode: "disabled",
      engineProfile: resolvedAgentEngineProfile,
      engineProfileRef: resolvedAgentEngineProfile.id
    },
    artifactContext: {
      backends: ["git"],
      defaultNamespace: resolvedDefaultNamespace,
      gitPrincipalBindings: resolvedGitPrincipalBindings,
      gitServices: resolvedGitServices,
      primaryGitPrincipalRef: resolvedPrimaryGitPrincipalRef,
      primaryGitRepositoryTarget: resolvedPrimaryGitRepositoryTarget,
      primaryGitServiceRef: resolvedPrimaryGitServiceRef
    },
    binding: effectiveBinding,
    generatedAt: nowIsoString(),
    identityContext: runtimeIdentityContextSchema.parse({
      algorithm: "nostr_secp256k1",
      publicKey: userNodeIdentity.publicKey,
      secretDelivery: {
        envVar: "ENTANGLE_NOSTR_SECRET_KEY",
        mode: "env_var"
      }
    }),
    modelContext: {},
    policyContext: {
      autonomy: node.autonomy,
      notes: ["Human Interface Runtime context."],
      runtimeProfile: graph.defaults.runtimeProfile,
      sourceMutation: node.policy?.sourceMutation ?? defaultNodeSourceMutationPolicy
    },
    relayContext: {
      edgeRoutes,
      primaryRelayProfileRef: resolvedPrimaryRelayProfileRef,
      relayProfiles: resolvedRelayProfiles
    },
    schemaVersion: "1",
    workspace
  });

  await writeJsonFileIfChanged(
    path.join(workspace.injectedRoot, runtimeContextFileName),
    context
  );

  const runnerJoinConfig = buildRunnerJoinConfigForRuntimeContext(
    context,
    hostAuthority.publicKey
  );

  if (runnerJoinConfig) {
    await writeJsonFileIfChanged(
      path.join(workspace.injectedRoot, runnerJoinConfigFileName),
      runnerJoinConfig
    );
  }

  return context;
}

export async function getRuntimeContext(
  nodeId: string
): Promise<EffectiveRuntimeContext | null> {
  const userNodeContext = await buildUserNodeRuntimeContext(nodeId);

  if (userNodeContext) {
    return userNodeContext;
  }

  const inspection = await getRuntimeInspectionInternal(nodeId);

  if (!inspection?.contextPath || !inspection.contextAvailable) {
    return null;
  }

  return effectiveRuntimeContextSchema.parse(
    await readJsonFile(inspection.contextPath)
  );
}

async function getRuntimeFilesystemContext(
  nodeId: string
): Promise<EffectiveRuntimeContext | null> {
  const inspection = await getRuntimeInspectionInternal(nodeId);

  if (
    !inspection?.contextPath ||
    !inspection.contextAvailable ||
    inspection.backendKind === "federated"
  ) {
    return null;
  }

  return effectiveRuntimeContextSchema.parse(
    await readJsonFile(inspection.contextPath)
  );
}

function buildPortableWorkspaceLayout(
  workspace: EffectiveRuntimeContext["workspace"]
): EffectiveRuntimeContext["workspace"] {
  const root = "/entangle/runtime/workspace";

  return {
    artifactWorkspaceRoot: path.posix.join(root, "artifact-workspace"),
    ...(workspace.engineStateRoot
      ? { engineStateRoot: path.posix.join(root, "engine-state") }
      : {}),
    injectedRoot: path.posix.join(root, "injected"),
    memoryRoot: path.posix.join(root, "memory"),
    packageRoot: path.posix.join(root, "package"),
    retrievalRoot: path.posix.join(root, "retrieval"),
    root,
    runtimeRoot: path.posix.join(root, "runtime"),
    ...(workspace.sourceWorkspaceRoot
      ? { sourceWorkspaceRoot: path.posix.join(root, "source") }
      : {}),
    ...(workspace.wikiRepositoryRoot
      ? { wikiRepositoryRoot: path.posix.join(root, "wiki-repository") }
      : {})
  };
}

function buildPortableRuntimeContext(
  context: EffectiveRuntimeContext
): EffectiveRuntimeContext {
  const workspace = buildPortableWorkspaceLayout(context.workspace);
  const packageSource = context.binding.packageSource;
  const portablePackageSource =
    packageSource?.sourceKind === "local_path"
      ? {
          ...packageSource,
          absolutePath: workspace.packageRoot,
          ...(packageSource.materialization
            ? {
                materialization: {
                  ...packageSource.materialization,
                  packageRoot: workspace.packageRoot
                }
              }
            : {})
        }
      : packageSource?.sourceKind === "local_archive"
        ? {
            ...packageSource,
            archivePath: path.posix.join(
              workspace.packageRoot,
              ".source-archive"
            ),
            ...(packageSource.materialization
              ? {
                  materialization: {
                    ...packageSource.materialization,
                    packageRoot: workspace.packageRoot
                  }
                }
              : {})
          }
        : undefined;

  return effectiveRuntimeContextSchema.parse({
    ...context,
    binding: {
      ...context.binding,
      ...(portablePackageSource ? { packageSource: portablePackageSource } : {})
    },
    workspace
  });
}

async function buildRuntimeBootstrapDirectorySnapshot(input: {
  capturedAt: string;
  root: RuntimeBootstrapDirectorySnapshot["root"];
  rootPath: string;
}): Promise<RuntimeBootstrapDirectorySnapshot> {
  const files: RuntimeBootstrapDirectorySnapshot["files"] = [];

  async function collect(currentPath: string, relativeRoot = ""): Promise<void> {
    if (!(await pathExists(currentPath))) {
      return;
    }

    const entries = (await readdir(currentPath)).sort();

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry);
      const relativePath = relativeRoot ? `${relativeRoot}/${entry}` : entry;
      const entryStats = await stat(entryPath);

      if (entryStats.isDirectory()) {
        await collect(entryPath, relativePath);
        continue;
      }

      if (!entryStats.isFile()) {
        continue;
      }

      const content = await readFile(entryPath);
      files.push({
        contentBase64: content.toString("base64"),
        path: relativePath,
        sha256: createHash("sha256").update(content).digest("hex"),
        sizeBytes: content.byteLength
      });
    }
  }

  await collect(input.rootPath);

  return runtimeBootstrapDirectorySnapshotSchema.parse({
    capturedAt: input.capturedAt,
    files,
    root: input.root,
    schemaVersion: "1"
  });
}

export async function getRuntimeBootstrapBundle(
  nodeId: string
): Promise<RuntimeBootstrapBundleResponse | null> {
  const context = await getRuntimeContext(nodeId);

  if (!context) {
    return null;
  }

  const capturedAt = nowIsoString();
  const runtimeContext = buildPortableRuntimeContext(context);
  const snapshots = await Promise.all([
    buildRuntimeBootstrapDirectorySnapshot({
      capturedAt,
      root: "package",
      rootPath: context.workspace.packageRoot
    }),
    buildRuntimeBootstrapDirectorySnapshot({
      capturedAt,
      root: "memory",
      rootPath: context.workspace.memoryRoot
    })
  ]);

  return runtimeBootstrapBundleResponseSchema.parse({
    graphId: context.binding.graphId,
    graphRevisionId: context.binding.graphRevisionId,
    nodeId,
    runtimeContext,
    schemaVersion: "1",
    snapshots
  });
}

function buildRuntimeArtifactRecordFromProjection(
  record: ArtifactRefProjectionRecord
): ArtifactRecord {
  if (record.artifactRecord) {
    return artifactRecordSchema.parse(record.artifactRecord);
  }

  return artifactRecordSchema.parse({
    createdAt: record.projection.updatedAt,
    ref: record.artifactRef,
    updatedAt: record.projection.updatedAt
  });
}

async function listProjectedRuntimeArtifactRecords(
  nodeId: string
): Promise<ArtifactRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const records = await listArtifactRefProjectionRecords();

  return records
    .filter(
      (record) =>
        record.graphId === graph.graphId && record.nodeId === nodeId
    )
    .map(buildRuntimeArtifactRecordFromProjection)
    .sort((left, right) =>
      left.ref.artifactId.localeCompare(right.ref.artifactId)
    );
}

export async function listRuntimeArtifacts(
  nodeId: string
): Promise<RuntimeArtifactListResponse | null> {
  const [context, projectedArtifacts] = await Promise.all([
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeArtifactRecords(nodeId)
  ]);

  if (!context) {
    return runtimeArtifactListResponseSchema.parse({
      artifacts: projectedArtifacts
    });
  }

  const artifactRecordsById = new Map(
    projectedArtifacts.map((artifact) => [artifact.ref.artifactId, artifact])
  );

  for (const artifact of await listRuntimeArtifactRecords(
    context.workspace.runtimeRoot
  )) {
    artifactRecordsById.set(artifact.ref.artifactId, artifact);
  }

  return runtimeArtifactListResponseSchema.parse({
    artifacts: [...artifactRecordsById.values()].sort((left, right) =>
      left.ref.artifactId.localeCompare(right.ref.artifactId)
    )
  });
}

export async function getRuntimeArtifactInspection(input: {
  artifactId: string;
  nodeId: string;
}): Promise<RuntimeArtifactInspectionResponse | null> {
  const artifacts = await listRuntimeArtifacts(input.nodeId);

  if (!artifacts) {
    return null;
  }

  const artifact = artifacts.artifacts.find(
    (candidate) => candidate.ref.artifactId === input.artifactId
  );

  return artifact
    ? runtimeArtifactInspectionResponseSchema.parse({ artifact })
    : null;
}

function isPathInsideRoot(input: {
  candidatePath: string;
  rootPath: string;
}): boolean {
  const candidatePath = path.resolve(input.candidatePath);
  const rootPath = path.resolve(input.rootPath);
  const relativePath = path.relative(rootPath, candidatePath);

  return (
    relativePath.length === 0 ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function toRuntimeMemoryRelativePath(input: {
  filePath: string;
  memoryRoot: string;
}): string {
  return path
    .relative(input.memoryRoot, input.filePath)
    .split(path.sep)
    .join(path.posix.sep);
}

function classifyRuntimeMemoryPage(
  relativePath: string
): RuntimeMemoryPageKind {
  if (relativePath.startsWith("schema/")) {
    return "schema";
  }

  if (relativePath === "wiki/index.md") {
    return "wiki_index";
  }

  if (relativePath === "wiki/log.md") {
    return "wiki_log";
  }

  if (relativePath.startsWith("wiki/summaries/")) {
    return "summary";
  }

  if (relativePath.startsWith("wiki/tasks/")) {
    return "task";
  }

  return "wiki_page";
}

async function collectRuntimeMemoryFilePaths(rootPath: string): Promise<string[]> {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const entries = await readdir(rootPath, { withFileTypes: true });
  const childPaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return collectRuntimeMemoryFilePaths(entryPath);
      }

      return entry.isFile() ? [entryPath] : [];
    })
  );

  return childPaths.flat();
}

async function buildRuntimeMemoryPageSummary(input: {
  filePath: string;
  memoryRoot: string;
}): Promise<RuntimeMemoryPageSummary | null> {
  if (!isPathInsideRoot({ candidatePath: input.filePath, rootPath: input.memoryRoot })) {
    return null;
  }

  const fileStat = await stat(input.filePath);

  if (!fileStat.isFile()) {
    return null;
  }

  const relativePath = toRuntimeMemoryRelativePath(input);

  return {
    kind: classifyRuntimeMemoryPage(relativePath),
    path: relativePath,
    sizeBytes: fileStat.size,
    updatedAt: fileStat.mtime.toISOString()
  };
}

async function collectRuntimeMemoryPageSummaries(
  memoryRoot: string
): Promise<RuntimeMemoryPageSummary[]> {
  const filePaths = await collectRuntimeMemoryFilePaths(memoryRoot);
  const pages = (
    await Promise.all(
      filePaths.map((filePath) =>
        buildRuntimeMemoryPageSummary({ filePath, memoryRoot })
      )
    )
  ).filter((page): page is RuntimeMemoryPageSummary => page !== null);

  return pages.sort((left, right) => left.path.localeCompare(right.path));
}

function normalizeProjectedWikiMemoryPath(
  record: WikiRefProjectionRecord
): string {
  const locatorPath =
    record.artifactRef.backend === "wiki" ? record.artifactRef.locator.path : "";
  const normalized = path.posix.normalize(locatorPath.replace(/\\/g, "/"));
  const withoutLeadingSlash = normalized.replace(/^\/+/, "");

  if (
    !withoutLeadingSlash ||
    withoutLeadingSlash === "." ||
    withoutLeadingSlash === ".." ||
    withoutLeadingSlash.startsWith("../")
  ) {
    return `wiki/refs/${record.artifactId}.md`;
  }

  return withoutLeadingSlash.startsWith("wiki/")
    ? withoutLeadingSlash
    : `wiki/${withoutLeadingSlash}`;
}

function projectWikiRefToRuntimeMemoryPageSummary(
  record: WikiRefProjectionRecord
): RuntimeMemoryPageSummary {
  const pagePath = normalizeProjectedWikiMemoryPath(record);

  return {
    kind: classifyRuntimeMemoryPage(pagePath),
    path: pagePath,
    sizeBytes:
      record.artifactPreview?.available === true
        ? record.artifactPreview.bytesRead
        : 0,
    updatedAt: record.projection.updatedAt
  };
}

async function listProjectedRuntimeMemoryPages(
  nodeId: string
): Promise<RuntimeMemoryPageSummary[]> {
  const { graph } = await readActiveGraphState();

  if (!graph || !graph.nodes.some((node) => node.nodeId === nodeId)) {
    return [];
  }

  return (await listWikiRefProjectionRecords())
    .filter((record) => record.graphId === graph.graphId && record.nodeId === nodeId)
    .map(projectWikiRefToRuntimeMemoryPageSummary)
    .sort((left, right) => left.path.localeCompare(right.path));
}

function mergeRuntimeMemoryPages(input: {
  localPages: RuntimeMemoryPageSummary[];
  projectedPages: RuntimeMemoryPageSummary[];
}): RuntimeMemoryPageSummary[] {
  const pages = new Map<string, RuntimeMemoryPageSummary>();

  for (const page of input.projectedPages) {
    pages.set(page.path, page);
  }

  for (const page of input.localPages) {
    pages.set(page.path, page);
  }

  return [...pages.values()].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
}

export async function getRuntimeMemoryInspection(
  nodeId: string
): Promise<RuntimeMemoryInspectionResponse | null> {
  const [{ graph }, context, projectedPages] = await Promise.all([
    readActiveGraphState(),
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeMemoryPages(nodeId)
  ]);

  if (!context && !graph?.nodes.some((node) => node.nodeId === nodeId)) {
    return null;
  }

  const localPages = context
    ? await collectRuntimeMemoryPageSummaries(context.workspace.memoryRoot)
    : [];
  const pages = mergeRuntimeMemoryPages({
    localPages,
    projectedPages
  });

  return runtimeMemoryInspectionResponseSchema.parse({
    focusedRegisters: pages.filter((page) =>
      focusedMemoryRegisterPaths.has(page.path)
    ),
    memoryRoot: context
      ? context.workspace.memoryRoot
      : `projection://${nodeId}/wiki-refs`,
    nodeId,
    pages,
    taskPages: pages.filter((page) => page.kind === "task")
  });
}

function resolveRuntimeMemoryPagePath(input: {
  memoryRoot: string;
  pagePath: string;
}): { filePath: string } | { reason: string } {
  const normalizedPath = path.posix.normalize(
    input.pagePath.replace(/\\/g, "/")
  );

  if (
    normalizedPath === "." ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    path.posix.isAbsolute(normalizedPath)
  ) {
    return {
      reason:
        "Memory page preview is unavailable because the requested path is outside the runtime memory workspace."
    };
  }

  const filePath = path.resolve(
    input.memoryRoot,
    ...normalizedPath.split(path.posix.sep)
  );

  if (!isPathInsideRoot({ candidatePath: filePath, rootPath: input.memoryRoot })) {
    return {
      reason:
        "Memory page preview is unavailable because the requested path is outside the runtime memory workspace."
    };
  }

  return { filePath };
}

function inferRuntimeMemoryContentType(
  filePath: string
): "text/markdown" | "text/plain" {
  const extension = path.extname(filePath).toLowerCase();

  return extension === ".md" || extension === ".markdown"
    ? "text/markdown"
    : "text/plain";
}

async function readRuntimeMemoryPreview(
  filePath: string
): Promise<RuntimeMemoryPageInspectionResponse["preview"]> {
  if (!(await pathExists(filePath))) {
    return {
      available: false,
      reason: "Memory page preview is unavailable because the page is missing."
    };
  }

  if (!(await stat(filePath)).isFile()) {
    return {
      available: false,
      reason: "Memory page preview is unavailable because the path is not a file."
    };
  }

  const file = await open(filePath, "r");

  try {
    const buffer = Buffer.alloc(memoryPreviewMaxBytes + 1);
    const { bytesRead } = await file.read(
      buffer,
      0,
      memoryPreviewMaxBytes + 1,
      0
    );
    const truncated = bytesRead > memoryPreviewMaxBytes;
    const previewBuffer = buffer.subarray(
      0,
      Math.min(bytesRead, memoryPreviewMaxBytes)
    );

    if (previewBuffer.includes(0)) {
      return {
        available: false,
        reason:
          "Memory page preview is unavailable because the page is not text."
      };
    }

    return {
      available: true,
      bytesRead: previewBuffer.length,
      content: previewBuffer.toString("utf8"),
      contentEncoding: "utf8",
      contentType: inferRuntimeMemoryContentType(filePath),
      sourcePath: filePath,
      truncated
    };
  } finally {
    await file.close();
  }
}

function readProjectedRuntimeMemoryPreview(
  record: WikiRefProjectionRecord
): RuntimeMemoryPageInspectionResponse["preview"] {
  if (!record.artifactPreview) {
    return {
      available: false,
      reason:
        "Memory page preview is unavailable because the projected wiki ref did not include preview content."
    };
  }

  if (!record.artifactPreview.available) {
    return {
      available: false,
      reason: record.artifactPreview.reason
    };
  }

  return {
    available: true,
    bytesRead: record.artifactPreview.bytesRead,
    content: record.artifactPreview.content,
    contentEncoding: record.artifactPreview.contentEncoding,
    contentType: record.artifactPreview.contentType,
    truncated: record.artifactPreview.truncated
  };
}

async function getProjectedRuntimeMemoryPageInspection(input: {
  nodeId: string;
  path: string;
}): Promise<RuntimeMemoryPageInspectionResponse | null> {
  const { graph } = await readActiveGraphState();

  if (!graph || !graph.nodes.some((node) => node.nodeId === input.nodeId)) {
    return null;
  }

  const record = (await listWikiRefProjectionRecords()).find(
    (candidate) =>
      candidate.graphId === graph.graphId &&
      candidate.nodeId === input.nodeId &&
      normalizeProjectedWikiMemoryPath(candidate) === input.path
  );

  if (!record) {
    return null;
  }

  return runtimeMemoryPageInspectionResponseSchema.parse({
    nodeId: input.nodeId,
    page: projectWikiRefToRuntimeMemoryPageSummary(record),
    preview: readProjectedRuntimeMemoryPreview(record)
  });
}

export async function getRuntimeMemoryPageInspection(input: {
  nodeId: string;
  path: string;
}): Promise<RuntimeMemoryPageInspectionResponse | null> {
  const context = await getRuntimeFilesystemContext(input.nodeId);

  if (context) {
    const resolvedPath = resolveRuntimeMemoryPagePath({
      memoryRoot: context.workspace.memoryRoot,
      pagePath: input.path
    });

    if (!("reason" in resolvedPath) && (await pathExists(resolvedPath.filePath))) {
      const page = await buildRuntimeMemoryPageSummary({
        filePath: resolvedPath.filePath,
        memoryRoot: context.workspace.memoryRoot
      });

      if (page) {
        return runtimeMemoryPageInspectionResponseSchema.parse({
          nodeId: input.nodeId,
          page,
          preview: await readRuntimeMemoryPreview(resolvedPath.filePath)
        });
      }
    }
  }

  return getProjectedRuntimeMemoryPageInspection({
    nodeId: input.nodeId,
    path: input.path
  });
}

function resolveArtifactPreviewPath(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
}): { filePath: string } | { reason: string } {
  const candidatePaths = [
    input.artifact.materialization?.localPath,
    input.artifact.materialization?.repoPath && input.artifact.ref.backend === "git"
      ? path.join(input.artifact.materialization.repoPath, input.artifact.ref.locator.path)
      : undefined,
    input.artifact.ref.backend === "local_file"
      ? input.artifact.ref.locator.path
      : undefined
  ].filter((candidatePath): candidatePath is string => Boolean(candidatePath));

  if (candidatePaths.length === 0) {
    return {
      reason:
        "Artifact preview is unavailable because the artifact has no materialized file path."
    };
  }

  const allowedRoots = [
    input.context.workspace.artifactWorkspaceRoot,
    input.context.workspace.retrievalRoot
  ];

  for (const candidatePath of candidatePaths) {
    if (
      allowedRoots.some((rootPath) =>
        isPathInsideRoot({ candidatePath, rootPath })
      )
    ) {
      return { filePath: path.resolve(candidatePath) };
    }
  }

  return {
    reason:
      "Artifact preview is unavailable because the artifact file is outside the runtime artifact workspace."
  };
}

function inferArtifactPreviewContentType(input: {
  artifact: ArtifactRecord;
  filePath: string;
}): "text/markdown" | "text/plain" {
  const extension = path.extname(input.filePath).toLowerCase();

  if (
    extension === ".md" ||
    extension === ".markdown" ||
    input.artifact.ref.artifactKind === "report_file" ||
    input.artifact.ref.artifactKind === "wiki_page"
  ) {
    return "text/markdown";
  }

  return "text/plain";
}

async function readArtifactPreview(input: {
  artifact: ArtifactRecord;
  filePath: string;
}): Promise<RuntimeArtifactPreviewResponse["preview"]> {
  if (!(await pathExists(input.filePath))) {
    return {
      available: false,
      reason: "Artifact preview is unavailable because the artifact file is missing."
    };
  }

  if (!(await stat(input.filePath)).isFile()) {
    return {
      available: false,
      reason: "Artifact preview is unavailable because the artifact path is not a file."
    };
  }

  const file = await open(input.filePath, "r");

  try {
    const buffer = Buffer.alloc(artifactPreviewMaxBytes + 1);
    const { bytesRead } = await file.read(
      buffer,
      0,
      artifactPreviewMaxBytes + 1,
      0
    );
    const truncated = bytesRead > artifactPreviewMaxBytes;
    const previewBuffer = buffer.subarray(
      0,
      Math.min(bytesRead, artifactPreviewMaxBytes)
    );

    if (previewBuffer.includes(0)) {
      return {
        available: false,
        reason:
          "Artifact preview is unavailable because the artifact file is not text."
      };
    }

    return {
      available: true,
      bytesRead: previewBuffer.length,
      content: previewBuffer.toString("utf8"),
      contentEncoding: "utf8",
      contentType: inferArtifactPreviewContentType(input),
      sourcePath: input.filePath,
      truncated
    };
  } finally {
    await file.close();
  }
}

export async function getRuntimeArtifactPreview(input: {
  artifactId: string;
  nodeId: string;
}): Promise<RuntimeArtifactPreviewResponse | null> {
  const context = await getRuntimeFilesystemContext(input.nodeId);

  if (context) {
    const artifacts = await listRuntimeArtifactRecords(context.workspace.runtimeRoot);
    const artifact = artifacts.find(
      (candidate) => candidate.ref.artifactId === input.artifactId
    );

    if (artifact) {
      const resolvedPath = resolveArtifactPreviewPath({ artifact, context });

      if ("reason" in resolvedPath) {
        return runtimeArtifactPreviewResponseSchema.parse({
          artifact,
          preview: {
            available: false,
            reason: resolvedPath.reason
          }
        });
      }

      return runtimeArtifactPreviewResponseSchema.parse({
        artifact,
        preview: await readArtifactPreview({
          artifact,
          filePath: resolvedPath.filePath
        })
      });
    }
  }

  return getProjectedRuntimeArtifactPreview(input);
}

async function getProjectedRuntimeArtifactPreview(input: {
  artifactId: string;
  nodeId: string;
}): Promise<RuntimeArtifactPreviewResponse | null> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return null;
  }

  const record = (await listArtifactRefProjectionRecords()).find(
    (candidate) =>
      candidate.graphId === graph.graphId &&
      candidate.nodeId === input.nodeId &&
      candidate.artifactId === input.artifactId
  );

  if (!record) {
    return null;
  }

  return runtimeArtifactPreviewResponseSchema.parse({
    artifact: buildRuntimeArtifactRecordFromProjection(record),
    preview: record.artifactPreview ?? {
      available: false,
      reason:
        "Artifact ref was observed, but no bounded preview was included in projection."
    }
  });
}

function normalizeGitArtifactPath(
  artifact: Extract<ArtifactRecord["ref"], { backend: "git" }>
): { path: string } | { reason: string } {
  const normalizedPath = path.posix.normalize(
    artifact.locator.path.replace(/\\/g, "/")
  );

  if (
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    path.posix.isAbsolute(normalizedPath)
  ) {
    return {
      reason:
        "Artifact git history is unavailable because the artifact locator path is unsafe."
    };
  }

  return {
    path:
      normalizedPath === "."
        ? "."
        : normalizedPath.replace(/^\.\//, "")
  };
}

async function resolveArtifactGitInspectionTarget(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
}): Promise<
  | {
      artifactPath: string;
      repoPath: string;
    }
  | { reason: string }
> {
  if (input.artifact.ref.backend !== "git") {
    return {
      reason:
        "Artifact git history is unavailable because the artifact is not git-backed."
    };
  }

  if (!input.artifact.materialization?.repoPath) {
    return {
      reason:
        "Artifact git history is unavailable because the artifact has no repository materialization."
    };
  }

  const repoPath = path.resolve(input.artifact.materialization.repoPath);
  const allowedRoots = [
    input.context.workspace.artifactWorkspaceRoot,
    input.context.workspace.retrievalRoot
  ];

  if (
    !allowedRoots.some((rootPath) =>
      isPathInsideRoot({ candidatePath: repoPath, rootPath })
    )
  ) {
    return {
      reason:
        "Artifact git history is unavailable because the artifact repository is outside the runtime artifact workspace."
    };
  }

  if (!(await pathExists(path.join(repoPath, ".git")))) {
    return {
      reason:
        "Artifact git history is unavailable because the materialization repository is missing."
    };
  }

  const normalizedPath = normalizeGitArtifactPath(input.artifact.ref);

  if ("reason" in normalizedPath) {
    return normalizedPath;
  }

  return {
    artifactPath: normalizedPath.path,
    repoPath
  };
}

function sanitizeArtifactGitInspectionReason(input: {
  context: EffectiveRuntimeContext;
  reason: string;
  repoPath?: string | undefined;
}): string {
  let reason = input.reason;

  for (const [targetPath, placeholder] of [
    [input.repoPath, "<artifact_repo>"],
    [input.context.workspace.artifactWorkspaceRoot, "<artifact_workspace>"],
    [input.context.workspace.retrievalRoot, "<retrieval_cache>"],
    [input.context.workspace.runtimeRoot, "<runtime_state>"]
  ] as Array<[string | undefined, string]>) {
    if (targetPath) {
      reason = reason.replaceAll(targetPath, placeholder);
    }
  }

  return reason;
}

type ArtifactGitInspectionTarget = {
  artifactPath: string;
  repoPath: string;
  sanitizeReason: (reason: string) => string;
};

async function readArtifactGitHistoryFromTarget(input: {
  artifact: ArtifactRecord;
  limit: number;
  target: ArtifactGitInspectionTarget;
}): Promise<RuntimeArtifactHistoryResponse["history"]> {
  const artifactRef = input.artifact.ref;

  if (artifactRef.backend !== "git") {
    return {
      available: false,
      reason:
        "Artifact git history is unavailable because the artifact is not git-backed."
    };
  }

  try {
    await runSourceHistoryGitCommand(input.target.repoPath, [
      "cat-file",
      "-e",
      `${artifactRef.locator.commit}^{commit}`
    ]);
    const output = await runSourceHistoryGitCommand(input.target.repoPath, [
      "log",
      `--max-count=${input.limit + 1}`,
      "--format=%H%x1f%h%x1f%cI%x1f%an%x1f%ae%x1f%s",
      artifactRef.locator.commit,
      "--",
      input.target.artifactPath
    ]);
    const lines = output.split("\n").filter((line) => line.trim().length > 0);
    const commits = lines.slice(0, input.limit).map((line) => {
      const [commit, abbreviatedCommit, committedAt, authorName, authorEmail, subject] =
        line.split("\x1f");

      return {
        abbreviatedCommit: abbreviatedCommit ?? commit?.slice(0, 12) ?? "unknown",
        ...(authorEmail ? { authorEmail } : {}),
        ...(authorName ? { authorName } : {}),
        commit: commit ?? "unknown",
        committedAt: committedAt ?? "",
        subject: subject ?? ""
      };
    });

    return {
      available: true,
      commits,
      inspectedPath: input.target.artifactPath,
      truncated: lines.length > input.limit
    };
  } catch (error) {
    return {
      available: false,
      reason: `Artifact git history is unavailable: ${input.target.sanitizeReason(
        formatUnknownError(error)
      )}`
    };
  }
}

async function readArtifactGitHistory(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
  limit: number;
}): Promise<RuntimeArtifactHistoryResponse["history"]> {
  const target = await resolveArtifactGitInspectionTarget(input);

  if ("reason" in target) {
    return {
      available: false,
      reason: target.reason
    };
  }

  return readArtifactGitHistoryFromTarget({
    artifact: input.artifact,
    limit: input.limit,
    target: {
      artifactPath: target.artifactPath,
      repoPath: target.repoPath,
      sanitizeReason: (reason) =>
        sanitizeArtifactGitInspectionReason({
          context: input.context,
          reason,
          repoPath: target.repoPath
        })
    }
  });
}

async function resolveArtifactDiffBaseCommit(input: {
  fromCommit?: string | undefined;
  repoPath: string;
  toCommit: string;
}): Promise<string> {
  if (input.fromCommit) {
    await runSourceHistoryGitCommand(input.repoPath, [
      "cat-file",
      "-e",
      `${input.fromCommit}^{commit}`
    ]);
    return input.fromCommit;
  }

  const revisionLine = await runSourceHistoryGitCommand(input.repoPath, [
    "rev-list",
    "--parents",
    "-n",
    "1",
    input.toCommit
  ]);
  const [, firstParent] = revisionLine.split(/\s+/);

  return firstParent ?? gitEmptyTreeHash;
}

async function readArtifactGitDiffFromTarget(input: {
  artifact: ArtifactRecord;
  fromCommit?: string | undefined;
  target: ArtifactGitInspectionTarget;
}): Promise<RuntimeArtifactDiffResponse["diff"]> {
  const artifactRef = input.artifact.ref;

  if (artifactRef.backend !== "git") {
    return {
      available: false,
      reason:
        "Artifact git diff is unavailable because the artifact is not git-backed."
    };
  }

  let fromCommit: string;

  try {
    await runSourceHistoryGitCommand(input.target.repoPath, [
      "cat-file",
      "-e",
      `${artifactRef.locator.commit}^{commit}`
    ]);
    fromCommit = await resolveArtifactDiffBaseCommit({
      fromCommit: input.fromCommit,
      repoPath: input.target.repoPath,
      toCommit: artifactRef.locator.commit
    });
  } catch (error) {
    return {
      available: false,
      reason: `Artifact git diff is unavailable: ${input.target.sanitizeReason(
        formatUnknownError(error)
      )}`
    };
  }

  return new Promise((resolve) => {
    const child = spawn(
      "git",
      [
        "diff",
        "--no-ext-diff",
        "--no-color",
        fromCommit,
        artifactRef.locator.commit,
        "--",
        input.target.artifactPath
      ],
      {
        cwd: input.target.repoPath,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stdoutKeptBytes = 0;
    let stderrKeptBytes = 0;

    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += buffer.length;

      if (stdoutKeptBytes < artifactDiffMaxBytes) {
        const remaining = artifactDiffMaxBytes - stdoutKeptBytes;
        stdoutChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stdoutKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      if (stderrKeptBytes < 1_000) {
        const remaining = 1_000 - stderrKeptBytes;
        stderrChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stderrKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.on("error", (error) => {
      resolve({
        available: false,
        reason: `Artifact git diff is unavailable: ${input.target.sanitizeReason(
          formatUnknownError(error)
        )}`
      });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        const reason = stderr || `git diff exited with code ${code ?? "unknown"}`;

        resolve({
          available: false,
          reason: `Artifact git diff is unavailable: ${input.target.sanitizeReason(reason)}`
        });
        return;
      }

      const content = Buffer.concat(stdoutChunks).toString("utf8");

      resolve({
        available: true,
        bytesRead: Buffer.byteLength(content),
        content,
        contentEncoding: "utf8",
        contentType: "text/x-diff",
        fromCommit,
        toCommit: artifactRef.locator.commit,
        truncated: stdoutBytes > artifactDiffMaxBytes
      });
    });
  });
}

async function readArtifactGitDiff(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
  fromCommit?: string | undefined;
}): Promise<RuntimeArtifactDiffResponse["diff"]> {
  const target = await resolveArtifactGitInspectionTarget(input);

  if ("reason" in target) {
    return {
      available: false,
      reason: target.reason.replace("history", "diff")
    };
  }

  return readArtifactGitDiffFromTarget({
    artifact: input.artifact,
    fromCommit: input.fromCommit,
    target: {
      artifactPath: target.artifactPath,
      repoPath: target.repoPath,
      sanitizeReason: (reason) =>
        sanitizeArtifactGitInspectionReason({
          context: input.context,
          reason,
          repoPath: target.repoPath
        })
    }
  });
}

function buildArtifactGitCachePath(target: GitRepositoryTarget): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        gitServiceRef: target.gitServiceRef,
        namespace: target.namespace,
        remoteUrl: target.remoteUrl,
        repositoryName: target.repositoryName
      })
    )
    .digest("hex")
    .slice(0, 16);

  return path.join(
    artifactGitResolverCacheRoot,
    sanitizeIdentifier(
      `${target.gitServiceRef}-${target.namespace}-${target.repositoryName}-${digest}`
    )
  );
}

async function ensureHostGitHttpsAskPassScript(): Promise<string> {
  const askPassScriptPath = path.join(hostGitAskPassRoot, "https-askpass.sh");
  const askPassScript = [
    "#!/bin/sh",
    "case \"$1\" in",
    "  *Username*) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_USERNAME\" ;;",
    "  *Password*) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_TOKEN\" ;;",
    "  *) printf '%s\\n' \"$ENTANGLE_GIT_ASKPASS_TOKEN\" ;;",
    "esac",
    ""
  ].join("\n");

  await mkdir(path.dirname(askPassScriptPath), { recursive: true });
  await writeFile(askPassScriptPath, askPassScript, {
    encoding: "utf8",
    mode: 0o700
  });
  await chmod(askPassScriptPath, 0o700);

  return askPassScriptPath;
}

async function buildHostGitCommandEnvForRemoteOperation(input: {
  context: EffectiveRuntimeContext;
  target: GitRepositoryTarget;
}): Promise<NodeJS.ProcessEnv | undefined> {
  if (!input.target.remoteUrl.includes("://")) {
    return undefined;
  }

  if (input.target.transportKind === "file") {
    return undefined;
  }

  const principalResolution = resolveGitPrincipalBindingForService({
    artifactContext: input.context.artifactContext,
    gitServiceRef: input.target.gitServiceRef
  });

  if (principalResolution.status === "missing") {
    throw new Error(
      `Remote git artifact inspection requires a git principal binding for service '${input.target.gitServiceRef}', but none was resolved.`
    );
  }

  if (principalResolution.status === "ambiguous") {
    throw new Error(
      `Remote git artifact inspection requires a deterministic git principal for service '${input.target.gitServiceRef}', but multiple candidates were resolved: ${principalResolution.candidatePrincipalIds.join(", ")}.`
    );
  }

  const principalBinding = principalResolution.binding;

  if (input.target.transportKind === "ssh") {
    if (principalBinding.principal.transportAuthMode !== "ssh_key") {
      throw new Error(
        `Remote git artifact inspection requires an SSH-key git principal, but '${principalBinding.principal.principalId}' uses '${principalBinding.principal.transportAuthMode}'.`
      );
    }

    if (
      principalBinding.transport.status !== "available" ||
      principalBinding.transport.delivery?.mode !== "mounted_file"
    ) {
      throw new Error(
        `Remote git artifact inspection requires an available mounted SSH key for git principal '${principalBinding.principal.principalId}'.`
      );
    }

    return {
      GIT_SSH_COMMAND: [
        "ssh",
        "-F",
        "/dev/null",
        "-i",
        principalBinding.transport.delivery.filePath,
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        "StrictHostKeyChecking=accept-new"
      ].join(" ")
    };
  }

  if (principalBinding.principal.transportAuthMode !== "https_token") {
    throw new Error(
      `Remote git artifact inspection requires an HTTPS-token git principal, but '${principalBinding.principal.principalId}' uses '${principalBinding.principal.transportAuthMode}'.`
    );
  }

  const token = await readSecretRefValue(principalBinding.principal.secretRef);

  if (!token) {
    throw new Error(
      `Remote git artifact inspection requires an available HTTPS token for git principal '${principalBinding.principal.principalId}'.`
    );
  }

  return {
    ENTANGLE_GIT_ASKPASS_TOKEN: token,
    ENTANGLE_GIT_ASKPASS_USERNAME: principalBinding.principal.subject,
    GIT_ASKPASS: await ensureHostGitHttpsAskPassScript(),
    GIT_TERMINAL_PROMPT: "0"
  };
}

async function ensureArtifactBackendGitRepository(input: {
  context: EffectiveRuntimeContext;
  target: GitRepositoryTarget;
}): Promise<{ env?: NodeJS.ProcessEnv | undefined; repoPath: string }> {
  const repoPath = buildArtifactGitCachePath(input.target);
  const env = await buildHostGitCommandEnvForRemoteOperation(input);

  await ensureDirectory(artifactGitResolverCacheRoot);

  if (!(await pathExists(path.join(repoPath, ".git")))) {
    await rm(repoPath, { force: true, recursive: true });
    await runSourceHistoryGitCommand(
      artifactGitResolverCacheRoot,
      ["clone", "--no-checkout", input.target.remoteUrl, path.basename(repoPath)],
      { env }
    );
  } else {
    const remotes = await runSourceHistoryGitCommand(repoPath, ["remote"], {
      env
    }).catch(() => "");

    if (remotes.split("\n").includes("origin")) {
      await runSourceHistoryGitCommand(
        repoPath,
        ["remote", "set-url", "origin", input.target.remoteUrl],
        { env }
      );
    } else {
      await runSourceHistoryGitCommand(
        repoPath,
        ["remote", "add", "origin", input.target.remoteUrl],
        { env }
      );
    }
  }

  await runSourceHistoryGitCommand(
    repoPath,
    [
      "fetch",
      "--prune",
      "origin",
      "+refs/heads/*:refs/remotes/origin/*",
      "+refs/tags/*:refs/tags/*"
    ],
    { env }
  );

  return { env, repoPath };
}

function sanitizeArtifactBackendGitInspectionReason(input: {
  reason: string;
  repoPath?: string | undefined;
  target?: GitRepositoryTarget | undefined;
}): string {
  let reason = input.reason;

  for (const [targetValue, placeholder] of [
    [input.repoPath, "<artifact_backend_cache>"],
    [input.target?.remoteUrl, "<git_remote>"],
    [artifactGitResolverCacheRoot, "<artifact_git_cache>"],
    [cacheRoot, "<host_cache>"]
  ] as Array<[string | undefined, string]>) {
    if (targetValue) {
      reason = reason.replaceAll(targetValue, placeholder);
    }
  }

  return reason;
}

async function resolveArtifactBackendGitInspectionTarget(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
}): Promise<ArtifactGitInspectionTarget | { reason: string }> {
  if (input.artifact.ref.backend !== "git") {
    return {
      reason:
        "Artifact git history is unavailable because the artifact is not git-backed."
    };
  }

  const target = resolveGitRepositoryTargetForArtifactLocator({
    artifactContext: input.context.artifactContext,
    locator: input.artifact.ref.locator
  });

  if (!target) {
    return {
      reason:
        "Artifact git history is unavailable because the projected git locator does not include a resolvable git service, namespace, and repository."
    };
  }

  const normalizedPath = normalizeGitArtifactPath(input.artifact.ref);

  if ("reason" in normalizedPath) {
    return normalizedPath;
  }

  try {
    const repository = await ensureArtifactBackendGitRepository({
      context: input.context,
      target
    });

    return {
      artifactPath: normalizedPath.path,
      repoPath: repository.repoPath,
      sanitizeReason: (reason) =>
        sanitizeArtifactBackendGitInspectionReason({
          reason,
          repoPath: repository.repoPath,
          target
        })
    };
  } catch (error) {
    return {
      reason: `Artifact git history is unavailable: ${sanitizeArtifactBackendGitInspectionReason(
        {
          reason: formatUnknownError(error),
          target
        }
      )}`
    };
  }
}

async function readArtifactBackendGitHistory(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
  limit: number;
}): Promise<RuntimeArtifactHistoryResponse["history"]> {
  const target = await resolveArtifactBackendGitInspectionTarget(input);

  if ("reason" in target) {
    return {
      available: false,
      reason: target.reason
    };
  }

  return readArtifactGitHistoryFromTarget({
    artifact: input.artifact,
    limit: input.limit,
    target
  });
}

async function readArtifactBackendGitDiff(input: {
  artifact: ArtifactRecord;
  context: EffectiveRuntimeContext;
  fromCommit?: string | undefined;
}): Promise<RuntimeArtifactDiffResponse["diff"]> {
  const target = await resolveArtifactBackendGitInspectionTarget(input);

  if ("reason" in target) {
    return {
      available: false,
      reason: target.reason.replace("history", "diff")
    };
  }

  return readArtifactGitDiffFromTarget({
    artifact: input.artifact,
    fromCommit: input.fromCommit,
    target
  });
}

export async function getRuntimeArtifactHistory(input: {
  artifactId: string;
  limit: number;
  nodeId: string;
}): Promise<RuntimeArtifactHistoryResponse | null> {
  const context = await getRuntimeFilesystemContext(input.nodeId);

  if (context) {
    const artifacts = await listRuntimeArtifactRecords(context.workspace.runtimeRoot);
    const artifact = artifacts.find(
      (candidate) => candidate.ref.artifactId === input.artifactId
    );

    if (artifact) {
      return runtimeArtifactHistoryResponseSchema.parse({
        artifact,
        history: await readArtifactGitHistory({
          artifact,
          context,
          limit: input.limit
        })
      });
    }
  }

  const artifactInspection = await getRuntimeArtifactInspection({
    artifactId: input.artifactId,
    nodeId: input.nodeId
  });

  if (!artifactInspection) {
    return null;
  }

  const semanticContext = await getRuntimeContext(input.nodeId);

  if (semanticContext) {
    return runtimeArtifactHistoryResponseSchema.parse({
      artifact: artifactInspection.artifact,
      history: await readArtifactBackendGitHistory({
        artifact: artifactInspection.artifact,
        context: semanticContext,
        limit: input.limit
      })
    });
  }

  return runtimeArtifactHistoryResponseSchema.parse({
    artifact: artifactInspection.artifact,
    history: {
      available: false,
      reason:
        "Artifact git history is unavailable because only a projected artifact ref is available and no semantic artifact backend context is attached to Host."
    }
  });
}

export async function getRuntimeArtifactDiff(input: {
  artifactId: string;
  fromCommit?: string | undefined;
  nodeId: string;
}): Promise<RuntimeArtifactDiffResponse | null> {
  const context = await getRuntimeFilesystemContext(input.nodeId);

  if (context) {
    const artifacts = await listRuntimeArtifactRecords(context.workspace.runtimeRoot);
    const artifact = artifacts.find(
      (candidate) => candidate.ref.artifactId === input.artifactId
    );

    if (artifact) {
      return runtimeArtifactDiffResponseSchema.parse({
        artifact,
        diff: await readArtifactGitDiff({
          artifact,
          context,
          fromCommit: input.fromCommit
        })
      });
    }
  }

  const artifactInspection = await getRuntimeArtifactInspection({
    artifactId: input.artifactId,
    nodeId: input.nodeId
  });

  if (!artifactInspection) {
    return null;
  }

  const semanticContext = await getRuntimeContext(input.nodeId);

  if (semanticContext) {
    return runtimeArtifactDiffResponseSchema.parse({
      artifact: artifactInspection.artifact,
      diff: await readArtifactBackendGitDiff({
        artifact: artifactInspection.artifact,
        context: semanticContext,
        fromCommit: input.fromCommit
      })
    });
  }

  return runtimeArtifactDiffResponseSchema.parse({
    artifact: artifactInspection.artifact,
    diff: {
      available: false,
      reason:
        "Artifact git diff is unavailable because only a projected artifact ref is available and no semantic artifact backend context is attached to Host."
    }
  });
}

async function listProjectedRuntimeApprovalRecords(
  nodeId: string
): Promise<ApprovalRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph || !graph.nodes.some((node) => node.nodeId === nodeId)) {
    return [];
  }

  const records = await listObservedApprovalActivityRecords();

  return records
    .filter(
      (record) =>
        record.graphId === graph.graphId &&
        record.nodeId === nodeId &&
        Boolean(record.approval)
    )
    .map((record) => record.approval)
    .filter((approval): approval is ApprovalRecord => Boolean(approval))
    .sort((left, right) => left.approvalId.localeCompare(right.approvalId));
}

export async function listRuntimeApprovals(
  nodeId: string
): Promise<RuntimeApprovalListResponse | null> {
  const [context, projectedApprovals] = await Promise.all([
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeApprovalRecords(nodeId)
  ]);

  if (!context) {
    return runtimeApprovalListResponseSchema.parse({
      approvals: projectedApprovals
    });
  }

  const approvalRecordsById = new Map(
    projectedApprovals.map((approval) => [approval.approvalId, approval])
  );

  for (const approval of await listRuntimeApprovalRecords(
    context.workspace.runtimeRoot
  )) {
    approvalRecordsById.set(approval.approvalId, approval);
  }

  return runtimeApprovalListResponseSchema.parse({
    approvals: [...approvalRecordsById.values()].sort((left, right) =>
      left.approvalId.localeCompare(right.approvalId)
    )
  });
}

export async function getRuntimeApprovalInspection(input: {
  approvalId: string;
  nodeId: string;
}): Promise<RuntimeApprovalInspectionResponse | null> {
  const approvals = await listRuntimeApprovals(input.nodeId);

  if (!approvals) {
    return null;
  }

  const approval = approvals.approvals.find(
    (candidate) => candidate.approvalId === input.approvalId
  );

  return approval
    ? runtimeApprovalInspectionResponseSchema.parse({ approval })
    : null;
}

async function listProjectedRuntimeSourceChangeCandidateRecords(
  nodeId: string
): Promise<SourceChangeCandidateRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const records = await listSourceChangeRefProjectionRecords();

  return records
    .filter(
      (
        record
      ): record is SourceChangeRefProjectionRecord & {
        candidate: SourceChangeCandidateRecord;
      } =>
        record.graphId === graph.graphId &&
        record.nodeId === nodeId &&
        Boolean(record.candidate)
    )
    .map((record) => record.candidate)
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId));
}

async function listProjectedRuntimeSourceHistoryRecords(
  nodeId: string
): Promise<SourceHistoryRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const records = await listSourceHistoryRefProjectionRecords();

  return records
    .filter(
      (record) => record.graphId === graph.graphId && record.nodeId === nodeId
    )
    .map((record) => record.history)
    .sort((left, right) =>
      left.sourceHistoryId.localeCompare(right.sourceHistoryId)
    );
}

async function listProjectedRuntimeSourceHistoryReplayRecords(input: {
  nodeId: string;
  sourceHistoryId?: string | undefined;
}): Promise<SourceHistoryReplayRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const records = await listSourceHistoryReplayProjectionRecords();

  return records
    .filter(
      (record) =>
        record.graphId === graph.graphId &&
        record.nodeId === input.nodeId &&
        (!input.sourceHistoryId ||
          record.sourceHistoryId === input.sourceHistoryId)
    )
    .map((record) => record.replay)
    .sort((left, right) => {
      const updatedOrder = right.updatedAt.localeCompare(left.updatedAt);
      return updatedOrder !== 0
        ? updatedOrder
        : left.replayId.localeCompare(right.replayId);
    });
}

export async function listRuntimeSourceChangeCandidates(
  nodeId: string
): Promise<RuntimeSourceChangeCandidateListResponse | null> {
  const [context, projectedCandidates] = await Promise.all([
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeSourceChangeCandidateRecords(nodeId)
  ]);

  if (!context) {
    return runtimeSourceChangeCandidateListResponseSchema.parse({
      candidates: projectedCandidates
    });
  }

  const candidatesById = new Map(
    projectedCandidates.map((candidate) => [candidate.candidateId, candidate])
  );

  for (const candidate of await listRuntimeSourceChangeCandidateRecords(
    context.workspace.runtimeRoot
  )) {
    candidatesById.set(candidate.candidateId, candidate);
  }

  return runtimeSourceChangeCandidateListResponseSchema.parse({
    candidates: [...candidatesById.values()].sort((left, right) =>
      left.candidateId.localeCompare(right.candidateId)
    )
  });
}

export async function getRuntimeSourceChangeCandidateInspection(input: {
  candidateId: string;
  nodeId: string;
}): Promise<RuntimeSourceChangeCandidateInspectionResponse | null> {
  const candidates = await listRuntimeSourceChangeCandidates(input.nodeId);

  if (!candidates) {
    return null;
  }

  const candidate = candidates.candidates.find(
    (candidateRecord) => candidateRecord.candidateId === input.candidateId
  );

  return candidate
    ? runtimeSourceChangeCandidateInspectionResponseSchema.parse({ candidate })
    : null;
}

export async function listRuntimeSourceHistory(
  nodeId: string
): Promise<RuntimeSourceHistoryListResponse | null> {
  const [context, projectedHistory] = await Promise.all([
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeSourceHistoryRecords(nodeId)
  ]);

  if (!context) {
    return runtimeSourceHistoryListResponseSchema.parse({
      history: projectedHistory
    });
  }

  const historyById = new Map(
    projectedHistory.map((history) => [history.sourceHistoryId, history])
  );

  for (const history of await listRuntimeSourceHistoryRecords(
    context.workspace.runtimeRoot
  )) {
    historyById.set(history.sourceHistoryId, history);
  }

  return runtimeSourceHistoryListResponseSchema.parse({
    history: [...historyById.values()].sort((left, right) =>
      left.sourceHistoryId.localeCompare(right.sourceHistoryId)
    )
  });
}

export async function getRuntimeSourceHistoryInspection(input: {
  nodeId: string;
  sourceHistoryId: string;
}): Promise<RuntimeSourceHistoryInspectionResponse | null> {
  const history = await listRuntimeSourceHistory(input.nodeId);

  if (!history) {
    return null;
  }

  const entry = history.history.find(
    (historyRecord) => historyRecord.sourceHistoryId === input.sourceHistoryId
  );

  return entry
    ? runtimeSourceHistoryInspectionResponseSchema.parse({ entry })
    : null;
}

export async function listRuntimeSourceHistoryReplays(input: {
  nodeId: string;
  sourceHistoryId?: string | undefined;
}): Promise<RuntimeSourceHistoryReplayListResponse | null> {
  const inspection = await getRuntimeInspection(input.nodeId);
  const replays = await listProjectedRuntimeSourceHistoryReplayRecords(input);

  if (!inspection && replays.length === 0) {
    return null;
  }

  return runtimeSourceHistoryReplayListResponseSchema.parse({
    replays
  });
}

export async function getRuntimeSourceHistoryReplayInspection(input: {
  nodeId: string;
  replayId: string;
}): Promise<RuntimeSourceHistoryReplayInspectionResponse | null> {
  const replays = await listRuntimeSourceHistoryReplays({
    nodeId: input.nodeId
  });

  if (!replays) {
    return null;
  }

  const replay = replays.replays.find(
    (candidate) => candidate.replayId === input.replayId
  );

  return replay
    ? runtimeSourceHistoryReplayInspectionResponseSchema.parse({ replay })
    : null;
}

const gitEmptyTreeHash = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

type HostGitCommandOptions = {
  env?: NodeJS.ProcessEnv | undefined;
  gitDir?: string | undefined;
  workTree?: string | undefined;
};

async function runSourceHistoryGitCommand(
  cwd: string,
  args: string[],
  options: HostGitCommandOptions = {}
): Promise<string> {
  const fullArgs = [
    ...(options.gitDir ? ["--git-dir", options.gitDir] : []),
    ...(options.workTree ? ["--work-tree", options.workTree] : []),
    ...args
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("git", fullArgs, {
      cwd,
      env: {
        ...process.env,
        ...options.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `Git source-history command failed (${args.join(" ")}): ${
            stderr.trim() || stdout.trim() || `exit ${code ?? "unknown"}`
          }`
        )
      );
    });
  });
}

async function readSourceChangeCandidateDiff(input: {
  context: EffectiveRuntimeContext;
  candidate: SourceChangeCandidateRecord;
}): Promise<RuntimeSourceChangeCandidateDiffResponse["diff"]> {
  if (!input.candidate.snapshot) {
    return {
      available: false,
      reason:
        "Source change candidate diff is unavailable because the candidate has no snapshot."
    };
  }

  const gitDir = path.join(input.context.workspace.runtimeRoot, "source-snapshot.git");
  const sanitizeReason = (reason: string): string =>
    reason
      .replaceAll(gitDir, "<source_snapshot>")
      .replaceAll(input.context.workspace.runtimeRoot, "<runtime_state>");

  if (!(await pathExists(gitDir))) {
    return {
      available: false,
      reason:
        "Source change candidate diff is unavailable because the source snapshot store is missing."
    };
  }

  const args = [
    "--git-dir",
    gitDir,
    "diff",
    "--no-ext-diff",
    "--no-renames",
    input.candidate.snapshot.baseTree,
    input.candidate.snapshot.headTree,
    "--"
  ];

  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: input.context.workspace.runtimeRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stdoutKeptBytes = 0;
    let stderrKeptBytes = 0;

    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += buffer.length;

      if (stdoutKeptBytes < sourceCandidateDiffMaxBytes) {
        const remaining = sourceCandidateDiffMaxBytes - stdoutKeptBytes;
        stdoutChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stdoutKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      if (stderrKeptBytes < 1_000) {
        const remaining = 1_000 - stderrKeptBytes;
        stderrChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stderrKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.on("error", (error) => {
      resolve({
        available: false,
        reason: `Source change candidate diff is unavailable: ${sanitizeReason(
          formatUnknownError(error)
        )}`
      });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        const reason = stderr || `git diff exited with code ${code ?? "unknown"}`;

        resolve({
          available: false,
          reason: `Source change candidate diff is unavailable: ${sanitizeReason(
            reason
          )}`
        });
        return;
      }

      const content = Buffer.concat(stdoutChunks).toString("utf8");

      resolve({
        available: true,
        bytesRead: Buffer.byteLength(content),
        content,
        contentEncoding: "utf8",
        contentType: "text/x-diff",
        truncated: stdoutBytes > sourceCandidateDiffMaxBytes
      });
    });
  });
}

export async function getRuntimeSourceChangeCandidateDiff(input: {
  candidateId: string;
  nodeId: string;
}): Promise<RuntimeSourceChangeCandidateDiffResponse | null> {
  const candidates = await listRuntimeSourceChangeCandidates(input.nodeId);

  if (!candidates) {
    return null;
  }

  const candidate = candidates.candidates.find(
    (candidateRecord) => candidateRecord.candidateId === input.candidateId
  );

  if (!candidate) {
    return null;
  }

  const context = await getRuntimeFilesystemContext(input.nodeId);

  if (context && candidate.snapshot) {
    const diff = await readSourceChangeCandidateDiff({ candidate, context });

    if (diff.available || !candidate.sourceChangeSummary.diffExcerpt) {
      return runtimeSourceChangeCandidateDiffResponseSchema.parse({
        candidate,
        diff
      });
    }
  }

  if (candidate.sourceChangeSummary.diffExcerpt) {
    return runtimeSourceChangeCandidateDiffResponseSchema.parse({
      candidate,
      diff: {
        available: true,
        bytesRead: Buffer.byteLength(
          candidate.sourceChangeSummary.diffExcerpt,
          "utf8"
        ),
        content: candidate.sourceChangeSummary.diffExcerpt,
        contentEncoding: "utf8",
        contentType: "text/x-diff",
        truncated: candidate.sourceChangeSummary.truncated
      }
    });
  }

  return runtimeSourceChangeCandidateDiffResponseSchema.parse({
    candidate,
    diff: {
      available: false,
      reason:
        "Source change candidate diff is unavailable because no projected diff excerpt was observed."
    }
  });
}

function normalizeSourceCandidateFilePreviewPath(filePath: string):
  | {
      path: string;
    }
  | {
      reason: string;
    } {
  if (filePath.includes("\0") || filePath.includes("\\")) {
    return {
      reason:
        "Source change candidate file preview is unavailable because the requested path is not a portable source path."
    };
  }

  if (
    filePath.startsWith("/") ||
    filePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    return {
      reason:
        "Source change candidate file preview is unavailable because the requested path is not a relative source path."
    };
  }

  return {
    path: filePath
  };
}

function inferSourceCandidateFilePreviewContentType(
  filePath: string
): "text/markdown" | "text/plain" {
  const extension = path.extname(filePath).toLowerCase();

  return extension === ".md" || extension === ".markdown"
    ? "text/markdown"
    : "text/plain";
}

async function readSourceChangeCandidateFilePreview(input: {
  context: EffectiveRuntimeContext;
  candidate: SourceChangeCandidateRecord;
  filePath: string;
}): Promise<RuntimeSourceChangeCandidateFilePreviewResponse["preview"]> {
  const normalized = normalizeSourceCandidateFilePreviewPath(input.filePath);

  if ("reason" in normalized) {
    return {
      available: false,
      reason: normalized.reason
    };
  }

  if (!input.candidate.snapshot) {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the candidate has no snapshot."
    };
  }

  const fileSummary = input.candidate.sourceChangeSummary.files.find(
    (file) => file.path === normalized.path
  );

  if (!fileSummary) {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the requested path is not listed in the candidate changed-file summary."
    };
  }

  if (fileSummary.status === "deleted") {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the file is deleted in the candidate snapshot."
    };
  }

  const gitDir = path.join(input.context.workspace.runtimeRoot, "source-snapshot.git");
  const sanitizeReason = (reason: string): string =>
    reason
      .replaceAll(gitDir, "<source_snapshot>")
      .replaceAll(input.context.workspace.runtimeRoot, "<runtime_state>");

  if (!(await pathExists(gitDir))) {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the source snapshot store is missing."
    };
  }

  const args = [
    "--git-dir",
    gitDir,
    "show",
    `${input.candidate.snapshot.headTree}:${normalized.path}`
  ];

  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: input.context.workspace.runtimeRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let stdoutKeptBytes = 0;
    let stderrKeptBytes = 0;

    child.stdout.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      stdoutBytes += buffer.length;

      if (stdoutKeptBytes < sourceCandidateFilePreviewMaxBytes + 1) {
        const remaining = sourceCandidateFilePreviewMaxBytes + 1 - stdoutKeptBytes;
        stdoutChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stdoutKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      if (stderrKeptBytes < 1_000) {
        const remaining = 1_000 - stderrKeptBytes;
        stderrChunks.push(buffer.subarray(0, Math.max(0, remaining)));
        stderrKeptBytes += Math.min(buffer.length, remaining);
      }
    });
    child.on("error", (error) => {
      resolve({
        available: false,
        reason: `Source change candidate file preview is unavailable: ${sanitizeReason(
          formatUnknownError(error)
        )}`
      });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
        const reason = stderr || `git show exited with code ${code ?? "unknown"}`;

        resolve({
          available: false,
          reason: `Source change candidate file preview is unavailable: ${sanitizeReason(
            reason
          )}`
        });
        return;
      }

      const keptBuffer = Buffer.concat(stdoutChunks);
      const previewBuffer = keptBuffer.subarray(
        0,
        Math.min(keptBuffer.length, sourceCandidateFilePreviewMaxBytes)
      );

      if (previewBuffer.includes(0)) {
        resolve({
          available: false,
          reason:
            "Source change candidate file preview is unavailable because the source file is not text."
        });
        return;
      }

      resolve({
        available: true,
        bytesRead: previewBuffer.length,
        content: previewBuffer.toString("utf8"),
        contentEncoding: "utf8",
        contentType: inferSourceCandidateFilePreviewContentType(normalized.path),
        truncated: stdoutBytes > sourceCandidateFilePreviewMaxBytes
      });
    });
  });
}

function readProjectedSourceChangeCandidateFilePreview(input: {
  candidate: SourceChangeCandidateRecord;
  filePath: string;
}): RuntimeSourceChangeCandidateFilePreviewResponse["preview"] {
  const normalized = normalizeSourceCandidateFilePreviewPath(input.filePath);

  if ("reason" in normalized) {
    return {
      available: false,
      reason: normalized.reason
    };
  }

  const fileSummary = input.candidate.sourceChangeSummary.files.find(
    (file) => file.path === normalized.path
  );

  if (!fileSummary) {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the requested path is not listed in the candidate changed-file summary."
    };
  }

  if (fileSummary.status === "deleted") {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because the file is deleted in the candidate snapshot."
    };
  }

  const projectedPreview = input.candidate.sourceChangeSummary.filePreviews.find(
    (preview) => preview.path === normalized.path
  );

  if (!projectedPreview) {
    return {
      available: false,
      reason:
        "Source change candidate file preview is unavailable because no bounded projected file preview was observed."
    };
  }

  if (!projectedPreview.available) {
    return {
      available: false,
      reason: projectedPreview.reason
    };
  }

  return {
    available: true,
    bytesRead: projectedPreview.bytesRead,
    content: projectedPreview.content,
    contentEncoding: projectedPreview.contentEncoding,
    contentType: projectedPreview.contentType,
    truncated: projectedPreview.truncated
  };
}

export async function getRuntimeSourceChangeCandidateFilePreview(input: {
  candidateId: string;
  nodeId: string;
  path: string;
}): Promise<RuntimeSourceChangeCandidateFilePreviewResponse | null> {
  const candidates = await listRuntimeSourceChangeCandidates(input.nodeId);

  if (!candidates) {
    return null;
  }

  const candidate = candidates.candidates.find(
    (candidateRecord) => candidateRecord.candidateId === input.candidateId
  );

  if (!candidate) {
    return null;
  }

  const context = await getRuntimeFilesystemContext(input.nodeId);
  const localPreview =
    context && candidate.snapshot
      ? await readSourceChangeCandidateFilePreview({
          candidate,
          context,
          filePath: input.path
        })
      : undefined;

  if (localPreview?.available) {
    return runtimeSourceChangeCandidateFilePreviewResponseSchema.parse({
      candidate,
      path: input.path,
      preview: localPreview
    });
  }

  const projectedPreview = readProjectedSourceChangeCandidateFilePreview({
    candidate,
    filePath: input.path
  });

  return runtimeSourceChangeCandidateFilePreviewResponseSchema.parse({
    candidate,
    path: input.path,
    preview:
      projectedPreview.available || !localPreview ? projectedPreview : localPreview
  });
}

async function listProjectedRuntimeTurnRecords(
  nodeId: string
): Promise<RunnerTurnRecord[]> {
  const { graph } = await readActiveGraphState();

  if (!graph || !graph.nodes.some((node) => node.nodeId === nodeId)) {
    return [];
  }

  const records = (await pathExists(observedRunnerTurnActivityRoot))
    ? await Promise.all(
        (await readdir(observedRunnerTurnActivityRoot))
          .filter((entry) => entry.endsWith(".json"))
          .map(async (entry) =>
            observedRunnerTurnActivityRecordSchema.parse(
              await readJsonFile(path.join(observedRunnerTurnActivityRoot, entry))
            )
          )
      )
    : [];

  return records
    .filter(
      (record) =>
        record.graphId === graph.graphId &&
        record.nodeId === nodeId &&
        Boolean(record.turn)
    )
    .map((record) => record.turn)
    .filter((turn): turn is RunnerTurnRecord => Boolean(turn))
    .sort((left, right) => left.turnId.localeCompare(right.turnId));
}

export async function listRuntimeTurns(
  nodeId: string
): Promise<RuntimeTurnListResponse | null> {
  const [context, projectedTurns] = await Promise.all([
    getRuntimeFilesystemContext(nodeId),
    listProjectedRuntimeTurnRecords(nodeId)
  ]);

  if (!context) {
    return runtimeTurnListResponseSchema.parse({
      turns: projectedTurns
    });
  }

  const turnRecordsById = new Map(
    projectedTurns.map((turn) => [turn.turnId, turn])
  );

  for (const turn of await listRuntimeTurnRecords(context.workspace.runtimeRoot)) {
    turnRecordsById.set(turn.turnId, turn);
  }

  return runtimeTurnListResponseSchema.parse({
    turns: [...turnRecordsById.values()].sort((left, right) =>
      left.turnId.localeCompare(right.turnId)
    )
  });
}

export async function getRuntimeTurnInspection(input: {
  nodeId: string;
  turnId: string;
}): Promise<RuntimeTurnInspectionResponse | null> {
  const turns = await listRuntimeTurns(input.nodeId);

  if (!turns) {
    return null;
  }

  const turn = turns.turns.find((candidate) => candidate.turnId === input.turnId);

  return turn ? runtimeTurnInspectionResponseSchema.parse({ turn }) : null;
}

export async function getRuntimeRecoveryInspection(input: {
  limit?: number;
  nodeId: string;
}): Promise<RuntimeRecoveryInspectionResponse | null> {
  const inspection = await getRuntimeInspection(input.nodeId);
  const existingPolicy = await readRuntimeRecoveryPolicyRecord(input.nodeId);
  const controller =
    (await readRuntimeRecoveryControllerRecord(input.nodeId)) ??
    buildIdleRuntimeRecoveryController({
      ...(inspection ? { graphId: inspection.graphId } : {}),
      ...(inspection ? { graphRevisionId: inspection.graphRevisionId } : {}),
      nodeId: input.nodeId
    });
  const entries = await listRuntimeRecoveryRecords({
    limit: input.limit ?? 50,
    nodeId: input.nodeId
  });

  if (!inspection && entries.length === 0 && !existingPolicy) {
    return null;
  }

  const policy =
    existingPolicy ??
    (inspection
      ? await ensureRuntimeRecoveryPolicyRecord(input.nodeId)
      : buildDefaultRuntimeRecoveryPolicy(input.nodeId));

  return runtimeRecoveryInspectionResponseSchema.parse({
    controller,
    ...(inspection ? { currentRuntime: inspection } : {}),
    entries,
    nodeId: input.nodeId,
    policy
  });
}

async function listRuntimeSessionRecords(
  runtimeRoot: string
): Promise<SessionRecord[]> {
  const sessionsRoot = path.join(runtimeRoot, "sessions");

  if (!(await pathExists(sessionsRoot))) {
    return [];
  }

  const fileNames = (await readdir(sessionsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      sessionRecordSchema.parse(
        await readJsonFile(path.join(sessionsRoot, fileName))
      )
    )
  );
}

async function listRuntimeConversationRecords(
  runtimeRoot: string
): Promise<ConversationRecord[]> {
  const conversationsRoot = path.join(runtimeRoot, "conversations");

  if (!(await pathExists(conversationsRoot))) {
    return [];
  }

  const fileNames = (await readdir(conversationsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      conversationRecordSchema.parse(
        await readJsonFile(path.join(conversationsRoot, fileName))
      )
    )
  );
}

async function listRuntimeApprovalRecords(
  runtimeRoot: string
): Promise<ApprovalRecord[]> {
  const approvalsRoot = path.join(runtimeRoot, "approvals");

  if (!(await pathExists(approvalsRoot))) {
    return [];
  }

  const fileNames = (await readdir(approvalsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      approvalRecordSchema.parse(
        await readJsonFile(path.join(approvalsRoot, fileName))
      )
    )
  );
}

async function listRuntimeTurnRecords(
  runtimeRoot: string
): Promise<RunnerTurnRecord[]> {
  const turnsRoot = path.join(runtimeRoot, "turns");

  if (!(await pathExists(turnsRoot))) {
    return [];
  }

  const fileNames = (await readdir(turnsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      runnerTurnRecordSchema.parse(
        await readJsonFile(path.join(turnsRoot, fileName))
      )
    )
  );
}

async function listRuntimeSourceChangeCandidateRecords(
  runtimeRoot: string
): Promise<SourceChangeCandidateRecord[]> {
  const candidatesRoot = runtimeSourceChangeCandidatesRoot(runtimeRoot);

  if (!(await pathExists(candidatesRoot))) {
    return [];
  }

  const fileNames = (await readdir(candidatesRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      sourceChangeCandidateRecordSchema.parse(
        await readJsonFile(path.join(candidatesRoot, fileName))
      )
    )
  );
}

async function listRuntimeSourceHistoryRecords(
  runtimeRoot: string
): Promise<SourceHistoryRecord[]> {
  const sourceHistoryRoot = runtimeSourceHistoryRoot(runtimeRoot);

  if (!(await pathExists(sourceHistoryRoot))) {
    return [];
  }

  const fileNames = (await readdir(sourceHistoryRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      sourceHistoryRecordSchema.parse(
        await readJsonFile<unknown>(path.join(sourceHistoryRoot, fileName))
      )
    )
  );
}

async function listRuntimeSourceHistoryPublicationTargetRecordIds(
  nodeIds: Set<string>
): Promise<Set<string>> {
  const recordIds = new Set<string>();

  for (const nodeId of nodeIds) {
    const runtimeRoot = buildWorkspaceLayout(nodeId).runtimeRoot;

    for (const history of await listRuntimeSourceHistoryRecords(runtimeRoot)) {
      const publication = history.publication;

      if (
        publication?.targetGitServiceRef &&
        publication.targetNamespace &&
        publication.targetRepositoryName
      ) {
        recordIds.add(
          buildGitRepositoryTargetRecordId({
            gitServiceRef: publication.targetGitServiceRef,
            namespace: publication.targetNamespace,
            repositoryName: publication.targetRepositoryName
          })
        );
      }
    }
  }

  return recordIds;
}

function runtimeSourceChangeCandidatesRoot(runtimeRoot: string): string {
  return path.join(runtimeRoot, "source-change-candidates");
}

function runtimeSourceHistoryRoot(runtimeRoot: string): string {
  return path.join(runtimeRoot, "source-history");
}

async function listRuntimeArtifactRecords(
  runtimeRoot: string
): Promise<ArtifactRecord[]> {
  const artifactsRoot = runtimeArtifactsRoot(runtimeRoot);

  if (!(await pathExists(artifactsRoot))) {
    return [];
  }

  const fileNames = (await readdir(artifactsRoot))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) =>
      artifactRecordSchema.parse(
        await readJsonFile(path.join(artifactsRoot, fileName))
      )
    )
  );
}

function runtimeArtifactsRoot(runtimeRoot: string): string {
  return path.join(runtimeRoot, "artifacts");
}

async function synchronizeSessionActivityObservation(input: {
  approvalRecords: ApprovalRecord[];
  conversationRecords: ConversationRecord[];
  runtime: RuntimeInspectionResponse;
  sessionRecord: SessionRecord;
}): Promise<void> {
  const { runtime, sessionRecord } = input;
  const approvalStatusCounts = countApprovalStatuses(input.approvalRecords);
  const conversationStatusCounts = countConversationStatuses(
    input.conversationRecords
  );
  const sessionConsistencyFindings = inspectSessionConsistency({
    approvalRecords: input.approvalRecords,
    conversationRecords: input.conversationRecords,
    nodeId: runtime.nodeId,
    sessionRecord
  });
  const sessionConsistencyFindingCodes: HostSessionConsistencyFindingCode[] =
    Array.from(
      new Set(sessionConsistencyFindings.map((finding) => finding.code))
    ).sort();
  const fingerprint = buildObservationFingerprint({
    approvalStatusCounts,
    conversationStatusCounts,
    sessionConsistencyFindingCodes,
    sessionConsistencyFindingCount: sessionConsistencyFindings.length,
    sessionRecord
  });
  const existingRecord = await readObservedSessionActivityRecord(
    runtime.nodeId,
    sessionRecord.sessionId
  );
  const nextRecord = observedSessionActivityRecordSchema.parse({
    activeConversationIds: sessionRecord.activeConversationIds,
    fingerprint,
    graphId: sessionRecord.graphId,
    ...(sessionRecord.lastMessageType
      ? { lastMessageType: sessionRecord.lastMessageType }
      : {}),
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
    rootArtifactIds: sessionRecord.rootArtifactIds,
    schemaVersion: "1",
    session: sessionRecord,
    sessionId: sessionRecord.sessionId,
    source: "runtime_filesystem",
    status: sessionRecord.status,
    traceId: sessionRecord.traceId,
    updatedAt: sessionRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedSessionActivityRoot,
      `${runtime.nodeId}--${sessionRecord.sessionId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    category: "session",
    graphId: sessionRecord.graphId,
    activeConversationIds: sessionRecord.activeConversationIds,
    approvalStatusCounts,
    conversationStatusCounts,
    ...(sessionRecord.lastMessageType
      ? { lastMessageType: sessionRecord.lastMessageType }
      : {}),
    message:
      `Session '${sessionRecord.sessionId}' on node '${runtime.nodeId}' is now ` +
      `'${sessionRecord.status}' with ${sessionRecord.activeConversationIds.length} ` +
      `active conversation(s).`,
    nodeId: runtime.nodeId,
    ownerNodeId: sessionRecord.ownerNodeId,
    rootArtifactIds: sessionRecord.rootArtifactIds,
    sessionConsistencyFindingCodes,
    sessionConsistencyFindingCount: sessionConsistencyFindings.length,
    sessionId: sessionRecord.sessionId,
    status: sessionRecord.status,
    traceId: sessionRecord.traceId,
    updatedAt: sessionRecord.updatedAt,
    type: "session.updated"
  } satisfies SessionUpdatedEventInput);
}

async function synchronizeRunnerTurnActivityObservation(input: {
  runtime: RuntimeInspectionResponse;
  turnRecord: RunnerTurnRecord;
}): Promise<void> {
  const { runtime, turnRecord } = input;
  const fingerprint = buildObservationFingerprint(turnRecord);
  const existingRecord = await readObservedRunnerTurnActivityRecord(
    runtime.nodeId,
    turnRecord.turnId
  );
  const nextRecord = observedRunnerTurnActivityRecordSchema.parse({
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
    ...(turnRecord.engineOutcome ? { engineOutcome: turnRecord.engineOutcome } : {}),
    ...(turnRecord.engineRequestSummary
      ? { engineRequestSummary: turnRecord.engineRequestSummary }
      : {}),
    emittedHandoffMessageIds: turnRecord.emittedHandoffMessageIds,
    ...(turnRecord.memoryRepositorySyncOutcome
      ? { memoryRepositorySyncOutcome: turnRecord.memoryRepositorySyncOutcome }
      : {}),
    ...(turnRecord.memorySynthesisOutcome
      ? { memorySynthesisOutcome: turnRecord.memorySynthesisOutcome }
      : {}),
    fingerprint,
    graphId: turnRecord.graphId,
    nodeId: runtime.nodeId,
    phase: turnRecord.phase,
    producedArtifactIds: turnRecord.producedArtifactIds,
    schemaVersion: "1",
    sessionId: turnRecord.sessionId,
    source: "runtime_filesystem",
    sourceChangeCandidateIds: turnRecord.sourceChangeCandidateIds,
    ...(turnRecord.sourceChangeSummary
      ? { sourceChangeSummary: turnRecord.sourceChangeSummary }
      : {}),
    startedAt: turnRecord.startedAt,
    triggerKind: turnRecord.triggerKind,
    turn: turnRecord,
    turnId: turnRecord.turnId,
    updatedAt: turnRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedRunnerTurnActivityRoot,
      `${runtime.nodeId}--${turnRecord.turnId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    category: "runner",
    consumedArtifactIds: turnRecord.consumedArtifactIds,
    conversationId: turnRecord.conversationId,
    ...(turnRecord.engineOutcome ? { engineOutcome: turnRecord.engineOutcome } : {}),
    ...(turnRecord.engineRequestSummary
      ? { engineRequestSummary: turnRecord.engineRequestSummary }
      : {}),
    emittedHandoffMessageIds: turnRecord.emittedHandoffMessageIds,
    ...(turnRecord.memoryRepositorySyncOutcome
      ? { memoryRepositorySyncOutcome: turnRecord.memoryRepositorySyncOutcome }
      : {}),
    ...(turnRecord.memorySynthesisOutcome
      ? { memorySynthesisOutcome: turnRecord.memorySynthesisOutcome }
      : {}),
    graphId: turnRecord.graphId,
    message:
      `Runner turn '${turnRecord.turnId}' on node '${runtime.nodeId}' is now in phase ` +
      `'${turnRecord.phase}'.`,
    nodeId: runtime.nodeId,
    phase: turnRecord.phase,
    producedArtifactIds: turnRecord.producedArtifactIds,
    sessionId: turnRecord.sessionId,
    sourceChangeCandidateIds: turnRecord.sourceChangeCandidateIds,
    ...(turnRecord.sourceChangeSummary
      ? { sourceChangeSummary: turnRecord.sourceChangeSummary }
      : {}),
    startedAt: turnRecord.startedAt,
    triggerKind: turnRecord.triggerKind,
    turnId: turnRecord.turnId,
    updatedAt: turnRecord.updatedAt,
    type: "runner.turn.updated"
  } satisfies RunnerTurnUpdatedEventInput);
}

async function synchronizeConversationActivityObservation(input: {
  conversationRecord: ConversationRecord;
  runtime: RuntimeInspectionResponse;
}): Promise<void> {
  const { conversationRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint(conversationRecord);
  const existingRecord = await readObservedConversationActivityRecord(
    runtime.nodeId,
    conversationRecord.conversationId
  );
  const nextRecord = observedConversationActivityRecordSchema.parse({
    artifactIds: conversationRecord.artifactIds,
    conversationId: conversationRecord.conversationId,
    fingerprint,
    followupCount: conversationRecord.followupCount,
    graphId: conversationRecord.graphId,
    initiator: conversationRecord.initiator,
    lastMessageType: conversationRecord.lastMessageType,
    nodeId: runtime.nodeId,
    peerNodeId: conversationRecord.peerNodeId,
    schemaVersion: "1",
    sessionId: conversationRecord.sessionId,
    source: "runtime_filesystem",
    status: conversationRecord.status,
    updatedAt: conversationRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedConversationActivityRoot,
      `${runtime.nodeId}--${conversationRecord.conversationId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    artifactIds: conversationRecord.artifactIds,
    category: "session",
    conversationId: conversationRecord.conversationId,
    followupCount: conversationRecord.followupCount,
    graphId: conversationRecord.graphId,
    initiator: conversationRecord.initiator,
    lastMessageType: conversationRecord.lastMessageType,
    message:
      `Conversation '${conversationRecord.conversationId}' on node '${runtime.nodeId}' ` +
      `is now '${conversationRecord.status}'.`,
    nodeId: runtime.nodeId,
    peerNodeId: conversationRecord.peerNodeId,
    sessionId: conversationRecord.sessionId,
    status: conversationRecord.status,
    type: "conversation.trace.event",
    updatedAt: conversationRecord.updatedAt
  } satisfies ConversationTraceEventInput);
}

async function synchronizeApprovalActivityObservation(input: {
  approvalRecord: ApprovalRecord;
  runtime: RuntimeInspectionResponse;
}): Promise<void> {
  const { approvalRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint(approvalRecord);
  const existingRecord = await readObservedApprovalActivityRecord(
    runtime.nodeId,
    approvalRecord.approvalId
  );
  const nextRecord = observedApprovalActivityRecordSchema.parse({
    approval: approvalRecord,
    approvalId: approvalRecord.approvalId,
    approverNodeIds: approvalRecord.approverNodeIds,
    conversationId: approvalRecord.conversationId,
    fingerprint,
    graphId: approvalRecord.graphId,
    nodeId: runtime.nodeId,
    ...(approvalRecord.operation ? { operation: approvalRecord.operation } : {}),
    ...(approvalRecord.resource ? { resource: approvalRecord.resource } : {}),
    requestedAt: approvalRecord.requestedAt,
    requestedByNodeId: approvalRecord.requestedByNodeId,
    schemaVersion: "1",
    sessionId: approvalRecord.sessionId,
    source: "runtime_filesystem",
    status: approvalRecord.status,
    updatedAt: approvalRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedApprovalActivityRoot,
      `${runtime.nodeId}--${approvalRecord.approvalId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    approvalId: approvalRecord.approvalId,
    approverNodeIds: approvalRecord.approverNodeIds,
    category: "session",
    conversationId: approvalRecord.conversationId,
    graphId: approvalRecord.graphId,
    message:
      `Approval '${approvalRecord.approvalId}' on node '${runtime.nodeId}' ` +
      `is now '${approvalRecord.status}'.`,
    nodeId: runtime.nodeId,
    ...(approvalRecord.operation ? { operation: approvalRecord.operation } : {}),
    ...(approvalRecord.resource ? { resource: approvalRecord.resource } : {}),
    requestedAt: approvalRecord.requestedAt,
    requestedByNodeId: approvalRecord.requestedByNodeId,
    sessionId: approvalRecord.sessionId,
    status: approvalRecord.status,
    type: "approval.trace.event",
    updatedAt: approvalRecord.updatedAt
  } satisfies ApprovalTraceEventInput);
}

function resolveArtifactObservationGraphId(input: {
  artifactRecord: ArtifactRecord;
  conversationsById: Map<string, ConversationRecord>;
  sessionsById: Map<string, SessionRecord>;
  turnsById: Map<string, RunnerTurnRecord>;
}): string | undefined {
  const artifactSessionId = input.artifactRecord.ref.sessionId;
  const artifactConversationId = input.artifactRecord.ref.conversationId;
  const turnRecord = input.artifactRecord.turnId
    ? input.turnsById.get(input.artifactRecord.turnId)
    : undefined;
  const conversationRecord = artifactConversationId
    ? input.conversationsById.get(artifactConversationId)
    : undefined;
  const sessionRecord = artifactSessionId
    ? input.sessionsById.get(artifactSessionId)
    : undefined;

  return (
    turnRecord?.graphId ??
    conversationRecord?.graphId ??
    sessionRecord?.graphId
  );
}

function buildArtifactTraceMessage(input: {
  artifactRecord: ArtifactRecord;
  runtime: RuntimeInspectionResponse;
}): string {
  const summary = [
    `lifecycle '${input.artifactRecord.ref.status ?? "unknown"}'`,
    `publication '${input.artifactRecord.publication?.state ?? "not_requested"}'`,
    ...(input.artifactRecord.retrieval
      ? [`retrieval '${input.artifactRecord.retrieval.state}'`]
      : [])
  ].join(", ");

  return (
    `Artifact '${input.artifactRecord.ref.artifactId}' on node '${input.runtime.nodeId}' ` +
    `changed trace state (${summary}).`
  );
}

async function synchronizeArtifactActivityObservation(input: {
  artifactRecord: ArtifactRecord;
  conversationsById: Map<string, ConversationRecord>;
  runtime: RuntimeInspectionResponse;
  sessionsById: Map<string, SessionRecord>;
  turnsById: Map<string, RunnerTurnRecord>;
}): Promise<void> {
  const { artifactRecord, runtime } = input;
  const fingerprint = buildObservationFingerprint({
    artifactRecord,
    graphId: resolveArtifactObservationGraphId(input)
  });
  const existingRecord = await readObservedArtifactActivityRecord(
    runtime.nodeId,
    artifactRecord.ref.artifactId
  );
  const turnRecord = artifactRecord.turnId
    ? input.turnsById.get(artifactRecord.turnId)
    : undefined;
  const nextRecord = observedArtifactActivityRecordSchema.parse({
    artifactId: artifactRecord.ref.artifactId,
    artifactKind: artifactRecord.ref.artifactKind,
    backend: artifactRecord.ref.backend,
    conversationId:
      artifactRecord.ref.conversationId ?? turnRecord?.conversationId,
    fingerprint,
    graphId: resolveArtifactObservationGraphId(input),
    lifecycleState: artifactRecord.ref.status,
    nodeId: runtime.nodeId,
    publicationState: artifactRecord.publication?.state,
    retrievalState: artifactRecord.retrieval?.state,
    schemaVersion: "1",
    sessionId: artifactRecord.ref.sessionId ?? turnRecord?.sessionId,
    source: "runtime_filesystem",
    turnId: artifactRecord.turnId,
    updatedAt: artifactRecord.updatedAt
  });
  await writeJsonFileIfChanged(
    path.join(
      observedArtifactActivityRoot,
      `${runtime.nodeId}--${artifactRecord.ref.artifactId}.json`
    ),
    nextRecord
  );

  if (existingRecord?.fingerprint === nextRecord.fingerprint) {
    return;
  }

  await appendHostEvent({
    artifactId: artifactRecord.ref.artifactId,
    artifactKind: artifactRecord.ref.artifactKind,
    backend: artifactRecord.ref.backend,
    category: "session",
    conversationId:
      artifactRecord.ref.conversationId ?? turnRecord?.conversationId,
    graphId: nextRecord.graphId,
    lifecycleState: artifactRecord.ref.status,
    message: buildArtifactTraceMessage({
      artifactRecord,
      runtime
    }),
    nodeId: runtime.nodeId,
    publicationState: artifactRecord.publication?.state,
    retrievalState: artifactRecord.retrieval?.state,
    sessionId: artifactRecord.ref.sessionId ?? turnRecord?.sessionId,
    turnId: artifactRecord.turnId,
    type: "artifact.trace.event",
    updatedAt: artifactRecord.updatedAt
  } satisfies ArtifactTraceEventInput);
}

async function synchronizeRuntimeActivityEvents(input: {
  runtimes: RuntimeInspectionInternal[];
}): Promise<void> {
  const activeApprovalActivityIds = new Set<string>();
  const activeArtifactActivityIds = new Set<string>();
  const activeConversationActivityIds = new Set<string>();
  const activeSessionActivityIds = new Set<string>();
  const activeTurnActivityIds = new Set<string>();

  for (const runtime of input.runtimes) {
    if (runtime.backendKind === "federated") {
      continue;
    }

    if (!runtime.contextAvailable || !runtime.contextPath) {
      continue;
    }

    const context = effectiveRuntimeContextSchema.parse(
      await readJsonFile(runtime.contextPath)
    );
    const [
      approvalRecords,
      artifactRecords,
      conversationRecords,
      sessionRecords,
      turnRecords
    ] = await Promise.all([
      listRuntimeApprovalRecords(context.workspace.runtimeRoot),
      listRuntimeArtifactRecords(context.workspace.runtimeRoot),
      listRuntimeConversationRecords(context.workspace.runtimeRoot),
      listRuntimeSessionRecords(context.workspace.runtimeRoot),
      listRuntimeTurnRecords(context.workspace.runtimeRoot)
    ]);
    const sessionsById = new Map(
      sessionRecords.map((sessionRecord) => [
        sessionRecord.sessionId,
        sessionRecord
      ])
    );
    const conversationsById = new Map(
      conversationRecords.map((conversationRecord) => [
        conversationRecord.conversationId,
        conversationRecord
      ])
    );
    const turnsById = new Map(
      turnRecords.map((turnRecord) => [turnRecord.turnId, turnRecord])
    );

    for (const sessionRecord of sessionRecords) {
      activeSessionActivityIds.add(`${runtime.nodeId}--${sessionRecord.sessionId}`);
      await synchronizeSessionActivityObservation({
        approvalRecords: approvalRecords.filter(
          (approvalRecord) => approvalRecord.sessionId === sessionRecord.sessionId
        ),
        conversationRecords: conversationRecords.filter(
          (conversationRecord) =>
            conversationRecord.sessionId === sessionRecord.sessionId
        ),
        runtime,
        sessionRecord
      });
    }

    for (const conversationRecord of conversationRecords) {
      activeConversationActivityIds.add(
        `${runtime.nodeId}--${conversationRecord.conversationId}`
      );
      await synchronizeConversationActivityObservation({
        conversationRecord,
        runtime
      });
    }

    for (const approvalRecord of approvalRecords) {
      activeApprovalActivityIds.add(`${runtime.nodeId}--${approvalRecord.approvalId}`);
      await synchronizeApprovalActivityObservation({
        approvalRecord,
        runtime
      });
    }

    for (const turnRecord of turnRecords) {
      activeTurnActivityIds.add(`${runtime.nodeId}--${turnRecord.turnId}`);
      await synchronizeRunnerTurnActivityObservation({
        runtime,
        turnRecord
      });
    }

    for (const artifactRecord of artifactRecords) {
      activeArtifactActivityIds.add(
        `${runtime.nodeId}--${artifactRecord.ref.artifactId}`
      );
      await synchronizeArtifactActivityObservation({
        artifactRecord,
        conversationsById,
        runtime,
        sessionsById,
        turnsById
      });
    }
  }

  await removeRuntimeFilesystemObservedActivityFilesExcept(
    observedApprovalActivityRoot,
    activeApprovalActivityIds
  );
  await removeRuntimeFilesystemObservedActivityFilesExcept(
    observedArtifactActivityRoot,
    activeArtifactActivityIds
  );
  await removeRuntimeFilesystemObservedActivityFilesExcept(
    observedConversationActivityRoot,
    activeConversationActivityIds
  );
  await removeRuntimeFilesystemObservedActivityFilesExcept(
    observedSessionActivityRoot,
    activeSessionActivityIds
  );
  await removeRuntimeFilesystemObservedActivityFilesExcept(
    observedRunnerTurnActivityRoot,
    activeTurnActivityIds
  );
}

async function pruneRuntimeRecoveryHistory(
  nodeId: string,
  maxEntries = 50
): Promise<void> {
  const records = await listRuntimeRecoveryRecords({
    nodeId
  });

  if (records.length <= maxEntries) {
    return;
  }

  await Promise.all(
    records.slice(maxEntries).map((record) =>
      rm(
        path.join(runtimeRecoveryHistoryNodeRoot(nodeId), `${record.recoveryId}.json`),
        { force: true }
      )
    )
  );
}

async function synchronizeRuntimeRecoveryHistory(input: {
  inspection: RuntimeInspectionResponse;
  lastError: string | undefined;
}): Promise<void> {
  const comparable = buildRuntimeRecoveryComparable(input);
  const fingerprint = buildObservationFingerprint(comparable);
  const latestRecord = await readLatestRuntimeRecoveryRecord(input.inspection.nodeId);
  const latestFingerprint = latestRecord
    ? buildObservationFingerprint(
        buildRuntimeRecoveryComparable({
          inspection: latestRecord.runtime,
          lastError: latestRecord.lastError
        })
      )
    : undefined;

  if (latestFingerprint === fingerprint) {
    return;
  }

  const recordedAt = nowIsoString();
  const record = runtimeRecoveryRecordSchema.parse({
    ...(input.lastError ? { lastError: input.lastError } : {}),
    recordedAt,
    recoveryId: buildRuntimeRecoveryRecordId({
      fingerprint,
      nodeId: input.inspection.nodeId,
      recordedAt
    }),
    runtime: input.inspection
  });

  await writeJsonFile(
    path.join(
      runtimeRecoveryHistoryNodeRoot(input.inspection.nodeId),
      `${record.recoveryId}.json`
    ),
    record
  );
  await pruneRuntimeRecoveryHistory(input.inspection.nodeId);
  await appendHostEvent({
    category: "runtime",
    desiredState: record.runtime.desiredState,
    graphId: record.runtime.graphId,
    graphRevisionId: record.runtime.graphRevisionId,
    ...(record.lastError ? { lastError: record.lastError } : {}),
    message:
      `Runtime '${record.runtime.nodeId}' recorded a recovery snapshot in observed state ` +
      `'${record.runtime.observedState}'.`,
    nodeId: record.runtime.nodeId,
    observedState: record.runtime.observedState,
    recordedAt: record.recordedAt,
    recoveryId: record.recoveryId,
    restartGeneration: record.runtime.restartGeneration,
    type: "runtime.recovery.recorded"
  } satisfies RuntimeRecoveryRecordedEventInput);
}

function didRuntimeRecoveryPolicyChange(
  previous: RuntimeRecoveryPolicyRecord | undefined,
  next: RuntimeRecoveryPolicyRecord
): boolean {
  return !previous || JSON.stringify(previous.policy) !== JSON.stringify(next.policy);
}

function createRuntimeRecoveryPolicyRecord(input: {
  existingRecord: RuntimeRecoveryPolicyRecord | undefined;
  nodeId: string;
  policy: RuntimeRecoveryPolicy;
}): RuntimeRecoveryPolicyRecord {
  const isEquivalentToExisting =
    input.existingRecord &&
    JSON.stringify(input.existingRecord.policy) === JSON.stringify(input.policy);

  return runtimeRecoveryPolicyRecordSchema.parse({
    nodeId: input.nodeId,
    policy: input.policy,
    schemaVersion: "1",
    updatedAt:
      isEquivalentToExisting && input.existingRecord
        ? input.existingRecord.updatedAt
        : nowIsoString()
  });
}

function createRuntimeRecoveryControllerRecord(input: {
  activeFailureFingerprint?: string;
  attemptsUsed: number;
  existingRecord: RuntimeRecoveryControllerRecord | undefined;
  graphId?: string;
  graphRevisionId?: string;
  lastAttemptedAt?: string;
  lastFailureAt?: string;
  nextEligibleAt?: string;
  nodeId: string;
  state: RuntimeRecoveryControllerRecord["state"];
}): RuntimeRecoveryControllerRecord {
  const nextRecord = runtimeRecoveryControllerRecordSchema.parse({
    ...(input.activeFailureFingerprint
      ? { activeFailureFingerprint: input.activeFailureFingerprint }
      : {}),
    attemptsUsed: input.attemptsUsed,
    ...(input.graphId ? { graphId: input.graphId } : {}),
    ...(input.graphRevisionId ? { graphRevisionId: input.graphRevisionId } : {}),
    ...(input.lastAttemptedAt ? { lastAttemptedAt: input.lastAttemptedAt } : {}),
    ...(input.lastFailureAt ? { lastFailureAt: input.lastFailureAt } : {}),
    ...(input.nextEligibleAt ? { nextEligibleAt: input.nextEligibleAt } : {}),
    nodeId: input.nodeId,
    schemaVersion: "1",
    state: input.state,
    updatedAt: nowIsoString()
  });

  if (!input.existingRecord) {
    return nextRecord;
  }

  const comparableNext = {
    ...nextRecord,
    updatedAt: ""
  };
  const comparableExisting = {
    ...input.existingRecord,
    updatedAt: ""
  };

  if (JSON.stringify(comparableExisting) === JSON.stringify(comparableNext)) {
    return runtimeRecoveryControllerRecordSchema.parse({
      ...nextRecord,
      updatedAt: input.existingRecord.updatedAt
    });
  }

  return nextRecord;
}

function isTrivialIdleRuntimeRecoveryControllerRecord(
  record: RuntimeRecoveryControllerRecord | undefined
): boolean {
  if (!record) {
    return true;
  }

  return (
    record.state === "idle" &&
    record.attemptsUsed === 0 &&
    record.activeFailureFingerprint === undefined &&
    record.lastAttemptedAt === undefined &&
    record.lastFailureAt === undefined &&
    record.nextEligibleAt === undefined
  );
}

function didRuntimeRecoveryControllerChange(
  previous: RuntimeRecoveryControllerRecord | undefined,
  next: RuntimeRecoveryControllerRecord
): boolean {
  if (!previous) {
    return !isTrivialIdleRuntimeRecoveryControllerRecord(next);
  }

  const comparablePrevious = {
    ...previous,
    updatedAt: ""
  };
  const comparableNext = {
    ...next,
    updatedAt: ""
  };

  return JSON.stringify(comparablePrevious) !== JSON.stringify(comparableNext);
}

function buildEmptyConversationStatusCounts(): ConversationStatusCounts {
  return conversationStatusCountsSchema.parse(
    Object.fromEntries(
      conversationLifecycleStateSchema.options.map((status) => [status, 0])
    )
  );
}

function countConversationStatuses(
  conversationRecords: ConversationRecord[]
): ConversationStatusCounts {
  const counts = buildEmptyConversationStatusCounts();

  for (const conversationRecord of conversationRecords) {
    counts[conversationRecord.status] += 1;
  }

  return conversationStatusCountsSchema.parse(counts);
}

function mergeConversationStatusCounts(
  statusCounts: Array<ConversationStatusCounts | undefined>
): ConversationStatusCounts {
  const mergedCounts = buildEmptyConversationStatusCounts();

  for (const counts of statusCounts) {
    if (!counts) {
      continue;
    }

    for (const status of conversationLifecycleStateSchema.options) {
      mergedCounts[status] += counts[status];
    }
  }

  return conversationStatusCountsSchema.parse(mergedCounts);
}

function buildEmptyApprovalStatusCounts(): ApprovalStatusCounts {
  return approvalStatusCountsSchema.parse({});
}

function countApprovalStatuses(
  approvalRecords: ApprovalRecord[]
): ApprovalStatusCounts {
  const counts = buildEmptyApprovalStatusCounts();

  for (const approvalRecord of approvalRecords) {
    counts[approvalRecord.status] += 1;
  }

  return approvalStatusCountsSchema.parse(counts);
}

function mergeApprovalStatusCounts(
  statusCounts: Array<ApprovalStatusCounts | undefined>
): ApprovalStatusCounts {
  const mergedCounts = buildEmptyApprovalStatusCounts();

  for (const counts of statusCounts) {
    if (!counts) {
      continue;
    }

    for (const status of approvalLifecycleStateSchema.options) {
      mergedCounts[status] += counts[status];
    }
  }

  return approvalStatusCountsSchema.parse(mergedCounts);
}

function groupConversationRecordsBySessionId(
  conversationRecords: ConversationRecord[]
): Map<string, ConversationRecord[]> {
  const recordsBySessionId = new Map<string, ConversationRecord[]>();

  for (const conversationRecord of conversationRecords) {
    const records = recordsBySessionId.get(conversationRecord.sessionId) ?? [];
    records.push(conversationRecord);
    recordsBySessionId.set(conversationRecord.sessionId, records);
  }

  return recordsBySessionId;
}

function groupApprovalRecordsBySessionId(
  approvalRecords: ApprovalRecord[]
): Map<string, ApprovalRecord[]> {
  const recordsBySessionId = new Map<string, ApprovalRecord[]>();

  for (const approvalRecord of approvalRecords) {
    const records = recordsBySessionId.get(approvalRecord.sessionId) ?? [];
    records.push(approvalRecord);
    recordsBySessionId.set(approvalRecord.sessionId, records);
  }

  return recordsBySessionId;
}

function hasOpenConversationStatusForHostDiagnostics(
  conversationRecord: ConversationRecord
): boolean {
  return !["closed", "expired", "rejected", "resolved"].includes(
    conversationRecord.status
  );
}

function buildSessionConsistencyFinding(
  input: HostSessionConsistencyFinding
): HostSessionConsistencyFinding {
  return hostSessionConsistencyFindingSchema.parse(input);
}

function sortSessionConsistencyFindings(
  findings: HostSessionConsistencyFinding[]
): HostSessionConsistencyFinding[] {
  return [...findings].sort((left, right) => {
    const nodeOrdering = left.nodeId.localeCompare(right.nodeId);

    if (nodeOrdering !== 0) {
      return nodeOrdering;
    }

    const conversationOrdering = (left.conversationId ?? "").localeCompare(
      right.conversationId ?? ""
    );

    if (conversationOrdering !== 0) {
      return conversationOrdering;
    }

    const approvalOrdering = (left.approvalId ?? "").localeCompare(
      right.approvalId ?? ""
    );

    if (approvalOrdering !== 0) {
      return approvalOrdering;
    }

    return left.code.localeCompare(right.code);
  });
}

function inspectSessionConsistency(input: {
  approvalRecords: ApprovalRecord[];
  conversationRecords: ConversationRecord[];
  nodeId: string;
  sessionRecord: SessionRecord;
}): HostSessionConsistencyFinding[] {
  const conversationRecordsById = new Map(
    input.conversationRecords.map((conversationRecord) => [
      conversationRecord.conversationId,
      conversationRecord
    ])
  );
  const activeConversationIds = new Set(
    input.sessionRecord.activeConversationIds
  );
  const openConversationRecords = input.conversationRecords.filter(
    hasOpenConversationStatusForHostDiagnostics
  );
  const approvalRecordsById = new Map(
    input.approvalRecords.map((approvalRecord) => [
      approvalRecord.approvalId,
      approvalRecord
    ])
  );
  const waitingApprovalIds = new Set(input.sessionRecord.waitingApprovalIds);
  const pendingApprovalRecords = input.approvalRecords.filter(
    (approvalRecord) => approvalRecord.status === "pending"
  );
  const findings: HostSessionConsistencyFinding[] = [];

  if (
    input.sessionRecord.status === "active" &&
    activeConversationIds.size === 0 &&
    openConversationRecords.length === 0
  ) {
    findings.push(
      buildSessionConsistencyFinding({
        code: "active_session_without_open_conversations",
        message:
          `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
          "is active but has no active conversation ids and no open " +
          "conversation records.",
        nodeId: input.nodeId,
        severity: "warning"
      })
    );
  }

  for (const conversationId of input.sessionRecord.activeConversationIds) {
    const conversationRecord = conversationRecordsById.get(conversationId);

    if (!conversationRecord) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "active_conversation_missing_record",
          conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `references active conversation '${conversationId}', but no ` +
            "conversation record exists.",
          nodeId: input.nodeId,
          severity: "error"
        })
      );
      continue;
    }

    if (!hasOpenConversationStatusForHostDiagnostics(conversationRecord)) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "terminal_conversation_still_active",
          conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `still references conversation '${conversationId}' as active ` +
            `after it reached '${conversationRecord.status}'.`,
          nodeId: input.nodeId,
          severity: "error"
        })
      );
    }
  }

  for (const conversationRecord of openConversationRecords) {
    if (
      !activeConversationIds.has(conversationRecord.conversationId)
    ) {
      findings.push(
        buildSessionConsistencyFinding({
          code: "open_conversation_missing_active_reference",
          conversationId: conversationRecord.conversationId,
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `has open conversation '${conversationRecord.conversationId}' in ` +
            `'${conversationRecord.status}' but it is missing from ` +
            "activeConversationIds.",
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  for (const approvalId of input.sessionRecord.waitingApprovalIds) {
    const approvalRecord = approvalRecordsById.get(approvalId);

    if (!approvalRecord) {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId,
          code: "waiting_approval_missing_record",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `references waiting approval '${approvalId}', but no approval ` +
            "record exists.",
          nodeId: input.nodeId,
          severity: "error"
        })
      );
      continue;
    }

    if (approvalRecord.status !== "pending") {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId,
          code: "waiting_approval_not_pending",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `is still waiting on approval '${approvalId}', but that approval ` +
            `record is '${approvalRecord.status}'.`,
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  for (const approvalRecord of pendingApprovalRecords) {
    if (!waitingApprovalIds.has(approvalRecord.approvalId)) {
      findings.push(
        buildSessionConsistencyFinding({
          approvalId: approvalRecord.approvalId,
          code: "pending_approval_missing_waiting_reference",
          message:
            `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
            `has pending approval '${approvalRecord.approvalId}', but it is ` +
            "missing from waitingApprovalIds.",
          nodeId: input.nodeId,
          severity: "warning"
        })
      );
    }
  }

  if (
    input.sessionRecord.status === "waiting_approval" &&
    !input.sessionRecord.waitingApprovalIds.some(
      (approvalId) => approvalRecordsById.get(approvalId)?.status === "pending"
    )
  ) {
    findings.push(
      buildSessionConsistencyFinding({
        code: "waiting_approval_session_without_pending_approval",
        message:
          `Session '${input.sessionRecord.sessionId}' on node '${input.nodeId}' ` +
          "is waiting for approval but has no pending approval record in its " +
          "waitingApprovalIds set.",
        nodeId: input.nodeId,
        severity: "error"
      })
    );
  }

  return sortSessionConsistencyFindings(findings);
}

async function collectSessionInspectionNodes(): Promise<
  Map<string, SessionInspectionResponse["nodes"]>
> {
  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  const sessions = new Map<string, SessionInspectionResponse["nodes"]>();

  for (const runtime of runtimes) {
    if (runtime.backendKind === "federated") {
      continue;
    }

    if (!runtime.contextAvailable || !runtime.contextPath) {
      continue;
    }

    const context = effectiveRuntimeContextSchema.parse(
      await readJsonFile(runtime.contextPath)
    );
    const sessionRecords = await listRuntimeSessionRecords(
      context.workspace.runtimeRoot
    );
    const approvalRecordsBySessionId = groupApprovalRecordsBySessionId(
      await listRuntimeApprovalRecords(context.workspace.runtimeRoot)
    );
    const conversationRecordsBySessionId = groupConversationRecordsBySessionId(
      await listRuntimeConversationRecords(context.workspace.runtimeRoot)
    );

    for (const sessionRecord of sessionRecords) {
      const entries = sessions.get(sessionRecord.sessionId) ?? [];
      const approvalRecords =
        approvalRecordsBySessionId.get(sessionRecord.sessionId) ?? [];
      const conversationRecords =
        conversationRecordsBySessionId.get(sessionRecord.sessionId) ?? [];
      const sessionConsistencyFindings =
        inspectSessionConsistency({
          approvalRecords,
          conversationRecords,
          nodeId: runtime.nodeId,
          sessionRecord
        });
      entries.push({
        approvalStatusCounts: countApprovalStatuses(approvalRecords),
        conversationStatusCounts: countConversationStatuses(conversationRecords),
        nodeId: runtime.nodeId,
        runtime,
        ...(sessionConsistencyFindings.length > 0
          ? { sessionConsistencyFindings }
          : {}),
        session: sessionRecord
      });
      sessions.set(sessionRecord.sessionId, entries);
    }
  }

  for (const entries of sessions.values()) {
    entries.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  return sessions;
}

function buildSessionSummary(
  sessionId: string,
  nodes: SessionInspectionResponse["nodes"]
) {
  const [firstNode] = nodes;

  if (!firstNode) {
    throw new Error(
      `Cannot build a host session summary for session '${sessionId}' without any node records.`
    );
  }

  const graphIds = new Set(nodes.map((entry) => entry.session.graphId));

  if (graphIds.size !== 1) {
    throw new Error(
      `Session '${sessionId}' contains inconsistent graph ids across node-owned session records.`
    );
  }

  const activeConversationIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.activeConversationIds)
  );
  const rootArtifactIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.rootArtifactIds)
  );
  const traceIds = uniqueSortedIdentifiers(
    nodes.map((entry) => entry.session.traceId)
  );
  const waitingApprovalIds = uniqueSortedIdentifiers(
    nodes.flatMap((entry) => entry.session.waitingApprovalIds)
  );
  const latestMessageType = resolveLatestSessionMessageType(nodes);
  const approvalStatusCounts = mergeApprovalStatusCounts(
    nodes.map((entry) => entry.approvalStatusCounts)
  );
  const conversationStatusCounts = mergeConversationStatusCounts(
    nodes.map((entry) => entry.conversationStatusCounts)
  );
  const sessionConsistencyFindings = sortSessionConsistencyFindings(
    nodes.flatMap((entry) => entry.sessionConsistencyFindings ?? [])
  );

  const summaryInput = {
    activeConversationIds,
    approvalStatusCounts,
    conversationStatusCounts,
    graphId: firstNode.session.graphId,
    nodeIds: nodes.map((entry) => entry.nodeId),
    nodeStatuses: nodes.map((entry) => ({
      nodeId: entry.nodeId,
      status: entry.session.status
    })),
    rootArtifactIds,
    ...(sessionConsistencyFindings.length > 0
      ? { sessionConsistencyFindings }
      : {}),
    sessionId,
    traceIds,
    waitingApprovalIds,
    updatedAt: nodes
      .map((entry) => entry.session.updatedAt)
      .sort((left, right) => right.localeCompare(left))[0]
  };

  return hostSessionSummarySchema.parse(
    latestMessageType
      ? {
          ...summaryInput,
          latestMessageType
        }
      : summaryInput
  );
}

function uniqueSortedIdentifiers(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function resolveLatestSessionMessageType(
  nodes: SessionInspectionResponse["nodes"]
): SessionRecord["lastMessageType"] {
  return [...nodes]
    .filter((entry) => entry.session.lastMessageType)
    .sort((left, right) =>
      right.session.updatedAt.localeCompare(left.session.updatedAt)
    )[0]?.session.lastMessageType;
}

function countObservedApprovalStatuses(
  records: ObservedApprovalActivityRecord[]
): ApprovalStatusCounts {
  const counts = approvalStatusCountsSchema.parse({});

  for (const record of records) {
    counts[record.status] += 1;
  }

  return counts;
}

function countObservedConversationStatuses(
  records: ObservedConversationActivityRecord[]
): ConversationStatusCounts {
  const counts = conversationStatusCountsSchema.parse({});

  for (const record of records) {
    counts[record.status] += 1;
  }

  return counts;
}

function resolveLatestObservedSessionMessageType(
  records: ObservedSessionActivityRecord[]
): SessionRecord["lastMessageType"] {
  return [...records]
    .filter((record) => record.session?.lastMessageType)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
    ?.session?.lastMessageType;
}

async function listProjectedSessionSummaries(): Promise<HostSessionSummary[]> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return [];
  }

  const activeNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const [sessionRecords, conversationRecords, approvalRecords] =
    await Promise.all([
      listObservedSessionActivityRecords(),
      listObservedConversationActivityRecords(),
      listObservedApprovalActivityRecords()
    ]);
  const scopedSessionRecords = sessionRecords.filter(
    (record) =>
      record.graphId === graph.graphId &&
      activeNodeIds.has(record.nodeId) &&
      record.session?.graphId === graph.graphId
  );

  if (scopedSessionRecords.length === 0) {
    return [];
  }

  const scopedConversationRecords = conversationRecords.filter(
    (record) =>
      record.graphId === graph.graphId && activeNodeIds.has(record.nodeId)
  );
  const scopedApprovalRecords = approvalRecords.filter(
    (record) =>
      record.graphId === graph.graphId && activeNodeIds.has(record.nodeId)
  );
  const recordsBySessionId = new Map<string, ObservedSessionActivityRecord[]>();

  for (const record of scopedSessionRecords) {
    const records = recordsBySessionId.get(record.sessionId) ?? [];
    records.push(record);
    recordsBySessionId.set(record.sessionId, records);
  }

  return Array.from(recordsBySessionId.entries()).map(([sessionId, records]) => {
    const sessionRecordsForSummary = records
      .map((record) => record.session)
      .filter((sessionRecord): sessionRecord is SessionRecord =>
        Boolean(sessionRecord)
      );
    const [firstSessionRecord] = sessionRecordsForSummary;

    if (!firstSessionRecord) {
      throw new Error(
        `Cannot build a projected host session summary for session '${sessionId}' without a session record.`
      );
    }

    const graphIds = new Set(
      sessionRecordsForSummary.map((sessionRecord) => sessionRecord.graphId)
    );

    if (graphIds.size !== 1) {
      throw new Error(
        `Session '${sessionId}' contains inconsistent graph ids across projected session records.`
      );
    }

    const latestMessageType = resolveLatestObservedSessionMessageType(records);
    const approvalStatusCounts = countObservedApprovalStatuses(
      scopedApprovalRecords.filter((record) => record.sessionId === sessionId)
    );
    const conversationStatusCounts = countObservedConversationStatuses(
      scopedConversationRecords.filter((record) => record.sessionId === sessionId)
    );
    const summaryInput = {
      activeConversationIds: uniqueSortedIdentifiers(
        sessionRecordsForSummary.flatMap(
          (sessionRecord) => sessionRecord.activeConversationIds
        )
      ),
      approvalStatusCounts,
      conversationStatusCounts,
      graphId: firstSessionRecord.graphId,
      nodeIds: records.map((record) => record.nodeId),
      nodeStatuses: records.map((record) => ({
        nodeId: record.nodeId,
        status: record.status
      })),
      rootArtifactIds: uniqueSortedIdentifiers(
        sessionRecordsForSummary.flatMap(
          (sessionRecord) => sessionRecord.rootArtifactIds
        )
      ),
      sessionId,
      traceIds: uniqueSortedIdentifiers(
        sessionRecordsForSummary.map((sessionRecord) => sessionRecord.traceId)
      ),
      waitingApprovalIds: uniqueSortedIdentifiers(
        sessionRecordsForSummary.flatMap(
          (sessionRecord) => sessionRecord.waitingApprovalIds
        )
      ),
      updatedAt: records
        .map((record) => record.updatedAt)
        .sort((left, right) => right.localeCompare(left))[0]
    };

    return hostSessionSummarySchema.parse(
      latestMessageType
        ? {
            ...summaryInput,
            latestMessageType
          }
        : summaryInput
    );
  });
}

function buildRuntimeInspectionFromProjection(
  projection: RuntimeProjectionRecord
): RuntimeInspectionResponse {
  return runtimeInspectionResponseSchema.parse({
    backendKind: projection.backendKind,
    contextAvailable: false,
    desiredState: projection.desiredState,
    graphId: projection.graphId,
    graphRevisionId: projection.graphRevisionId,
    nodeId: projection.nodeId,
    observedState: projection.observedState,
    restartGeneration: projection.restartGeneration,
    runtimeHandle: projection.runtimeHandle,
    statusMessage: projection.statusMessage
  });
}

async function collectProjectedSessionInspectionNodes(): Promise<
  Map<string, SessionInspectionResponse["nodes"]>
> {
  const { graph } = await readActiveGraphState();

  if (!graph) {
    return new Map();
  }

  const activeNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const authority = await ensureHostAuthorityMaterialized();
  const [assignments, sessionRecords, conversationRecords, approvalRecords] =
    await Promise.all([
      listRuntimeAssignmentRecords(),
      listObservedSessionActivityRecords(),
      listObservedConversationActivityRecords(),
      listObservedApprovalActivityRecords()
    ]);
  const runtimeProjections = await listRuntimeProjectionRecords({
    assignments,
    hostAuthorityPubkey: authority.publicKey
  });
  const runtimeProjectionsByNodeId = new Map(
    runtimeProjections.map((projection) => [projection.nodeId, projection])
  );
  const scopedSessionRecords = sessionRecords.filter(
    (record) =>
      record.graphId === graph.graphId &&
      activeNodeIds.has(record.nodeId) &&
      record.session?.graphId === graph.graphId
  );
  const scopedConversationRecords = conversationRecords.filter(
    (record) =>
      record.graphId === graph.graphId && activeNodeIds.has(record.nodeId)
  );
  const scopedApprovalRecords = approvalRecords.filter(
    (record) =>
      record.graphId === graph.graphId && activeNodeIds.has(record.nodeId)
  );
  const sessions = new Map<string, SessionInspectionResponse["nodes"]>();

  for (const record of scopedSessionRecords) {
    if (!record.session) {
      continue;
    }

    const projection = runtimeProjectionsByNodeId.get(record.nodeId);

    if (!projection) {
      continue;
    }

    const approvalRecordsForSession = scopedApprovalRecords.filter(
      (approvalRecord) =>
        approvalRecord.nodeId === record.nodeId &&
        approvalRecord.sessionId === record.sessionId
    );
    const conversationRecordsForSession = scopedConversationRecords.filter(
      (conversationRecord) =>
        conversationRecord.nodeId === record.nodeId &&
        conversationRecord.sessionId === record.sessionId
    );
    const entries = sessions.get(record.sessionId) ?? [];
    entries.push({
      approvalStatusCounts: countObservedApprovalStatuses(approvalRecordsForSession),
      conversationStatusCounts: countObservedConversationStatuses(
        conversationRecordsForSession
      ),
      nodeId: record.nodeId,
      runtime: buildRuntimeInspectionFromProjection(projection),
      session: record.session
    });
    sessions.set(record.sessionId, entries);
  }

  for (const entries of sessions.values()) {
    entries.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  return sessions;
}

export async function listSessions(): Promise<SessionListResponse> {
  const sessions = await collectSessionInspectionNodes();
  const filesystemSummaries = Array.from(sessions.entries()).map(
    ([sessionId, nodes]) => buildSessionSummary(sessionId, nodes)
  );
  const projectedSummaries = await listProjectedSessionSummaries();
  const filesystemSessionIds = new Set(
    filesystemSummaries.map((summary) => summary.sessionId)
  );
  const summaries = [
    ...filesystemSummaries,
    ...projectedSummaries.filter(
      (summary) => !filesystemSessionIds.has(summary.sessionId)
    )
  ]
    .sort((left, right) => {
      const updatedAtOrdering = right.updatedAt.localeCompare(left.updatedAt);

      if (updatedAtOrdering !== 0) {
        return updatedAtOrdering;
      }

      return left.sessionId.localeCompare(right.sessionId);
    });

  return sessionListResponseSchema.parse({
    sessions: summaries
  });
}

export async function getSessionInspection(
  sessionId: string
): Promise<SessionInspectionResponse | null> {
  const sessions = await collectSessionInspectionNodes();
  const nodes =
    sessions.get(sessionId) ??
    (await collectProjectedSessionInspectionNodes()).get(sessionId);

  if (!nodes || nodes.length === 0) {
    return null;
  }

  const [firstNode] = nodes;

  if (!firstNode) {
    return null;
  }

  const graphIds = new Set(nodes.map((entry) => entry.session.graphId));

  if (graphIds.size !== 1) {
    throw new Error(
      `Session '${sessionId}' contains inconsistent graph ids across node-owned session records.`
    );
  }

  return sessionInspectionResponseSchema.parse({
    graphId: firstNode.session.graphId,
    nodes,
    sessionId
  });
}

function buildSessionCancellationId(input: {
  request: SessionCancellationMutationRequest;
  sessionId: string;
}): string {
  return sanitizeIdentifier(
    input.request.cancellationId ??
      `session-cancel-${input.sessionId}-${randomUUID().slice(0, 8)}`
  );
}

export function buildFederatedSessionCancellationRequestRecord(input: {
  assignment: RuntimeAssignmentRecord;
  request: SessionCancellationMutationRequest;
  sessionId: string;
}): SessionCancellationRequestRecord {
  const request = sessionCancellationMutationRequestSchema.parse(input.request);

  return sessionCancellationRequestRecordSchema.parse({
    cancellationId: buildSessionCancellationId({
      request,
      sessionId: input.sessionId
    }),
    graphId: input.assignment.graphId,
    nodeId: input.assignment.nodeId,
    ...(request.reason ? { reason: request.reason } : {}),
    requestedAt: nowIsoString(),
    ...(request.requestedBy ? { requestedBy: request.requestedBy } : {}),
    sessionId: input.sessionId,
    status: "requested"
  });
}

async function appendSessionCancellationRequestedEvent(
  record: SessionCancellationRequestRecord
): Promise<void> {
  await appendHostEvent({
    cancellationId: record.cancellationId,
    category: "session",
    graphId: record.graphId,
    message:
      `Session cancellation '${record.cancellationId}' was requested for ` +
      `session '${record.sessionId}' on node '${record.nodeId}'.`,
    nodeId: record.nodeId,
    ...(record.reason ? { reason: record.reason } : {}),
    ...(record.requestedBy ? { requestedBy: record.requestedBy } : {}),
    sessionId: record.sessionId,
    status: record.status,
    type: "session.cancellation.requested"
  } satisfies SessionCancellationRequestedEventInput);
}

export async function recordFederatedSessionCancellationRequest(
  record: SessionCancellationRequestRecord
): Promise<SessionCancellationRequestRecord> {
  const parsed = sessionCancellationRequestRecordSchema.parse(record);
  await appendSessionCancellationRequestedEvent(parsed);
  return parsed;
}

async function applyValidatedGraphDocument(graph: GraphSpec): Promise<{
  activeRevisionId: string;
  graph: GraphSpec;
  nodes: NodeInspectionResponse[];
  runtimes: RuntimeInspectionResponse[];
}> {
  const activeRevisionId = buildGraphRevisionId(graph.graphId);
  const revisionRecord = activeGraphRevisionRecordSchema.parse({
    activeRevisionId,
    appliedAt: nowIsoString()
  });

  await writeJsonFile(currentGraphPath, graph);
  await writeJsonFile(
    path.join(graphRevisionsRoot, `${activeRevisionId}.json`),
    graphRevisionRecordSchema.parse({
      appliedAt: revisionRecord.appliedAt,
      graph,
      revisionId: activeRevisionId
    })
  );
  await writeJsonFile(activeGraphRevisionPath, revisionRecord);
  const synchronizedState = await synchronizeCurrentGraphRuntimeState();
  await appendHostEvent({
    activeRevisionId,
    category: "control_plane",
    graphId: graph.graphId,
    message: `Applied graph '${graph.graphId}' as revision '${activeRevisionId}'.`,
    type: "graph.revision.applied"
  } satisfies GraphRevisionAppliedEventInput);

  return {
    activeRevisionId,
    graph,
    nodes: synchronizedState.nodes,
    runtimes: synchronizedState.runtimes
  };
}

function buildManagedNodeMissingGraphConflict(): ManagedNodeMutationConflict {
  return {
    kind: "graph_missing",
    message: "Managed node mutation requires an active graph revision."
  };
}

function findManagedNode(graph: GraphSpec, nodeId: string): NodeBinding | undefined {
  return graph.nodes.find(
    (candidate) => candidate.nodeId === nodeId && candidate.nodeKind !== "user"
  );
}

function buildEdgeMissingGraphConflict(): EdgeMutationConflict {
  return {
    kind: "graph_missing",
    message: "Edge mutation requires an active graph revision."
  };
}

function findEdge(graph: GraphSpec, edgeId: string): Edge | undefined {
  return graph.edges.find((candidate) => candidate.edgeId === edgeId);
}

async function applyNodeGraphCandidate(input: {
  candidateGraph: GraphSpec;
  nodeId: string;
  mutationKind: "created" | "deleted" | "replaced";
}): Promise<
  | {
      activeRevisionId: string;
      graph: GraphSpec;
      node: NodeInspectionResponse | undefined;
      validation: GraphMutationResponse["validation"];
    }
  | {
      validation: GraphMutationResponse["validation"];
    }
> {
  const candidate = await validateGraphCandidate(input.candidateGraph);

  if (!candidate.validation.ok || !candidate.graph) {
    return {
      validation: candidate.validation
    };
  }

  const applied = await applyValidatedGraphDocument(candidate.graph);
  const node = applied.nodes.find(
    (inspection) => inspection.binding.node.nodeId === input.nodeId
  );

  if (input.mutationKind !== "deleted" && !node) {
    throw new Error(
      `Managed node '${input.nodeId}' was not materialized after a successful '${input.mutationKind}' mutation.`
    );
  }

  await appendHostEvent({
    activeRevisionId: applied.activeRevisionId,
    category: "control_plane",
    graphId: applied.graph.graphId,
    message:
      input.mutationKind === "deleted"
        ? `Deleted managed node '${input.nodeId}' in graph '${applied.graph.graphId}'.`
        : `${input.mutationKind === "created" ? "Created" : "Replaced"} managed node '${input.nodeId}' in graph '${applied.graph.graphId}'.`,
    mutationKind: input.mutationKind,
    nodeId: input.nodeId,
    type: "node.binding.updated"
  } satisfies NodeBindingUpdatedEventInput);

  return {
    activeRevisionId: applied.activeRevisionId,
    graph: applied.graph,
    node,
    validation: candidate.validation
  };
}

async function applyEdgeGraphCandidate(input: {
  candidateGraph: GraphSpec;
  edgeId: string;
  mutationKind: "created" | "deleted" | "replaced";
}): Promise<
  | {
      activeRevisionId: string;
      edge: Edge | undefined;
      graph: GraphSpec;
      validation: GraphMutationResponse["validation"];
    }
  | {
      validation: GraphMutationResponse["validation"];
    }
> {
  const candidate = await validateGraphCandidate(input.candidateGraph);

  if (!candidate.validation.ok || !candidate.graph) {
    return {
      validation: candidate.validation
    };
  }

  const applied = await applyValidatedGraphDocument(candidate.graph);
  const edge = applied.graph.edges.find(
    (inspection) => inspection.edgeId === input.edgeId
  );

  if (input.mutationKind !== "deleted" && !edge) {
    throw new Error(
      `Edge '${input.edgeId}' was not materialized after a successful '${input.mutationKind}' mutation.`
    );
  }

  await appendHostEvent({
    activeRevisionId: applied.activeRevisionId,
    category: "control_plane",
    edgeId: input.edgeId,
    graphId: applied.graph.graphId,
    message:
      input.mutationKind === "deleted"
        ? `Deleted edge '${input.edgeId}' in graph '${applied.graph.graphId}'.`
        : `${input.mutationKind === "created" ? "Created" : "Replaced"} edge '${input.edgeId}' in graph '${applied.graph.graphId}'.`,
    mutationKind: input.mutationKind,
    type: "edge.updated"
  } satisfies EdgeUpdatedEventInput);

  return {
    activeRevisionId: applied.activeRevisionId,
    edge,
    graph: applied.graph,
    validation: candidate.validation
  };
}

function buildManagedNodeMutationSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        graph: GraphSpec;
        node: NodeInspectionResponse | undefined;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
}): NodeMutationResponse {
  return nodeMutationResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    node: "node" in input.applied ? input.applied.node : undefined,
    validation: input.applied.validation
  });
}

function buildEdgeMutationSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        edge: Edge | undefined;
        graph: GraphSpec;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
}): EdgeMutationResponse {
  return edgeMutationResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    edge: "edge" in input.applied ? input.applied.edge : undefined,
    validation: input.applied.validation
  });
}

function buildManagedNodeDeletionSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        graph: GraphSpec;
        node: NodeInspectionResponse | undefined;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
  nodeId: string;
}): NodeDeletionResponse {
  return nodeDeletionResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    deletedNodeId: "activeRevisionId" in input.applied ? input.nodeId : undefined,
    validation: input.applied.validation
  });
}

function buildEdgeDeletionSuccessResponse(input: {
  applied:
    | {
        activeRevisionId: string;
        edge: Edge | undefined;
        graph: GraphSpec;
        validation: GraphMutationResponse["validation"];
      }
    | {
        validation: GraphMutationResponse["validation"];
      };
  edgeId: string;
}): EdgeDeletionResponse {
  return edgeDeletionResponseSchema.parse({
    activeRevisionId:
      "activeRevisionId" in input.applied ? input.applied.activeRevisionId : undefined,
    deletedEdgeId: "activeRevisionId" in input.applied ? input.edgeId : undefined,
    validation: input.applied.validation
  });
}

export async function setRuntimeDesiredState(
  nodeId: string,
  desiredState: RuntimeDesiredState
): Promise<RuntimeInspectionResponse | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection) {
    return null;
  }

  const existingIntent = await readRuntimeIntentRecord(nodeId);
  const intent = createRuntimeIntentRecord({
    desiredState,
    existingIntent,
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    nodeId,
    reason: desiredState === "stopped" ? "stopped_by_operator" : undefined,
    restartGeneration: existingIntent?.restartGeneration ?? inspection.restartGeneration
  });
  await writeJsonFile(path.join(runtimeIntentsRoot, `${nodeId}.json`), intent);

  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  const runtime = runtimes.find((candidate) => candidate.nodeId === nodeId);
  return runtime ? runtimeInspectionResponseSchema.parse(runtime) : null;
}

export async function restartRuntime(
  nodeId: string
): Promise<RuntimeInspectionResponse | null> {
  const inspection = await getRuntimeInspection(nodeId);

  if (!inspection) {
    return null;
  }

  const existingIntent = await readRuntimeIntentRecord(nodeId);
  const nextRestartGeneration =
    Math.max(
      existingIntent?.restartGeneration ?? 0,
      inspection.restartGeneration
    ) + 1;
  const intent = createRuntimeIntentRecord({
    desiredState: "running",
    existingIntent,
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    nodeId,
    reason: undefined,
    restartGeneration: nextRestartGeneration
  });
  await writeJsonFile(path.join(runtimeIntentsRoot, `${nodeId}.json`), intent);
  await appendHostEvent({
    category: "runtime",
    graphId: inspection.graphId,
    graphRevisionId: inspection.graphRevisionId,
    message:
      `Runtime '${nodeId}' restart was requested with generation '${nextRestartGeneration}'.`,
    nodeId,
    previousRestartGeneration: existingIntent?.restartGeneration ?? inspection.restartGeneration,
    restartGeneration: nextRestartGeneration,
    type: "runtime.restart.requested"
  } satisfies RuntimeRestartRequestedEventInput);

  const { runtimes } = await synchronizeCurrentGraphRuntimeState();
  const runtime = runtimes.find((candidate) => candidate.nodeId === nodeId);
  return runtime ? runtimeInspectionResponseSchema.parse(runtime) : null;
}

export async function setRuntimeRecoveryPolicy(input: {
  nodeId: string;
  policy: RuntimeRecoveryPolicy;
}): Promise<RuntimeRecoveryInspectionResponse | null> {
  const inspection = await getRuntimeInspection(input.nodeId);

  if (!inspection) {
    return null;
  }

  const existingPolicyRecord = await readRuntimeRecoveryPolicyRecord(input.nodeId);
  const nextPolicyRecord = createRuntimeRecoveryPolicyRecord({
    existingRecord: existingPolicyRecord,
    nodeId: input.nodeId,
    policy: input.policy
  });
  await writeJsonFile(
    runtimeRecoveryPolicyRecordPath(input.nodeId),
    nextPolicyRecord
  );

  if (didRuntimeRecoveryPolicyChange(existingPolicyRecord, nextPolicyRecord)) {
    await appendHostEvent({
      category: "runtime",
      graphId: inspection.graphId,
      graphRevisionId: inspection.graphRevisionId,
      message:
        `Runtime '${input.nodeId}' recovery policy is now '${nextPolicyRecord.policy.mode}'.`,
      nodeId: input.nodeId,
      policy: nextPolicyRecord.policy,
      previousPolicy: existingPolicyRecord?.policy,
      type: "runtime.recovery_policy.updated"
    } satisfies RuntimeRecoveryPolicyUpdatedEventInput);
  }

  return getRuntimeRecoveryInspection({
    nodeId: input.nodeId
  });
}

export async function applyGraph(input: unknown): Promise<GraphMutationResponse> {
  const candidate = await validateGraphCandidate(input);

  if (!candidate.validation.ok || !candidate.graph) {
    return candidate;
  }
  const applied = await applyValidatedGraphDocument(candidate.graph);

  return {
    ...candidate,
    activeRevisionId: applied.activeRevisionId
  };
}

function resolveHostControlObserveRelayUrlsFromCatalog(
  catalog: CatalogInspectionResponse["catalog"] | undefined
): string[] {
  if (!catalog) {
    return [];
  }

  const defaultRelayRefs = new Set(catalog.defaults.relayProfileRefs);
  const selectedRelays =
    defaultRelayRefs.size > 0
      ? catalog.relays.filter((relay) => defaultRelayRefs.has(relay.id))
      : catalog.relays;

  return [
    ...new Set(
      selectedRelays.flatMap((relay) => [
        ...relay.readUrls,
        ...relay.writeUrls
      ])
    )
  ].sort((left, right) => left.localeCompare(right));
}

function buildHostTransportHealth(input: {
  catalog: CatalogInspectionResponse["catalog"] | undefined;
  timestamp: string;
}) {
  if (hostFederatedControlObserveTransportHealth) {
    return {
      controlObserve: hostFederatedControlObserveTransportHealth
    };
  }

  const relayUrls = resolveHostControlObserveRelayUrlsFromCatalog(input.catalog);

  return {
    controlObserve: {
      configuredRelayCount: relayUrls.length,
      relayUrls,
      relays: buildHostTransportRelayHealth({
        relayUrls,
        status: relayUrls.length > 0 ? "not_started" : "disabled",
        updatedAt: input.timestamp
      }),
      status: relayUrls.length > 0 ? ("not_started" as const) : ("disabled" as const),
      updatedAt: input.timestamp
    }
  };
}

async function calculateDirectorySizeBytes(directoryPath: string): Promise<number> {
  let totalSizeBytes = 0;
  const entries = await readdir(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      totalSizeBytes += await calculateDirectorySizeBytes(entryPath);
      continue;
    }

    if (entry.isFile()) {
      totalSizeBytes += (await lstat(entryPath)).size;
    }
  }

  return totalSizeBytes;
}

async function buildArtifactBackendCacheStatus(timestamp: string) {
  try {
    const entries = await readdir(artifactGitResolverCacheRoot, {
      withFileTypes: true
    });
    const repositoryEntries = entries.filter((entry) => entry.isDirectory());
    const totalSizeBytes = (
      await Promise.all(
        repositoryEntries.map((entry) =>
          calculateDirectorySizeBytes(
            path.join(artifactGitResolverCacheRoot, entry.name)
          )
        )
      )
    ).reduce((total, sizeBytes) => total + sizeBytes, 0);

    return {
      available: true,
      repositoryCount: repositoryEntries.length,
      totalSizeBytes,
      updatedAt: timestamp
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        available: true,
        repositoryCount: 0,
        totalSizeBytes: 0,
        updatedAt: timestamp
      };
    }

    return {
      available: false,
      reason: formatUnknownError(error),
      repositoryCount: 0,
      totalSizeBytes: 0,
      updatedAt: timestamp
    };
  }
}

function buildHostOperatorSecurityStatus() {
  return buildHostOperatorSecurityStatusFromEnv();
}

function buildArtifactBackendCacheTargetPrefix(input: {
  gitServiceRef?: string | undefined;
  namespace?: string | undefined;
  repositoryName?: string | undefined;
}) {
  if (!input.gitServiceRef) {
    return undefined;
  }

  return sanitizeIdentifier(
    [
      input.gitServiceRef,
      ...(input.namespace ? [input.namespace] : []),
      ...(input.repositoryName ? [input.repositoryName] : [])
    ].join("-")
  );
}

function artifactBackendCacheEntryMatchesTarget(input: {
  entryName: string;
  targetPrefix?: string | undefined;
}) {
  return (
    input.targetPrefix === undefined ||
    input.entryName === input.targetPrefix ||
    input.entryName.startsWith(`${input.targetPrefix}-`)
  );
}

export async function clearArtifactBackendCache(
  input: {
    dryRun?: boolean | undefined;
    gitServiceRef?: string | undefined;
    maxSizeBytes?: number | undefined;
    namespace?: string | undefined;
    olderThanSeconds?: number | undefined;
    repositoryName?: string | undefined;
  } = {}
) {
  const completedAt = new Date().toISOString();
  const dryRun = input.dryRun === true;
  const completedAtMs = Date.parse(completedAt);
  const olderThanCutoffMs =
    input.olderThanSeconds === undefined
      ? undefined
      : completedAtMs - input.olderThanSeconds * 1000;

  try {
    const entries = await readdir(artifactGitResolverCacheRoot, {
      withFileTypes: true
    });
    const cacheTargetPrefix = buildArtifactBackendCacheTargetPrefix(input);
    const repositoryEntries = entries.filter(
      (entry) =>
        entry.isDirectory() &&
        artifactBackendCacheEntryMatchesTarget({
          entryName: entry.name,
          targetPrefix: cacheTargetPrefix
        })
    );
    const repositoryCandidates = await Promise.all(
      repositoryEntries.map(async (entry) => {
        const repositoryPath = path.join(artifactGitResolverCacheRoot, entry.name);
        const metadata = await lstat(repositoryPath);
        const sizeBytes = await calculateDirectorySizeBytes(repositoryPath);

        return {
          mtimeMs: metadata.mtime.getTime(),
          path: repositoryPath,
          sizeBytes,
          ageEligible:
            olderThanCutoffMs === undefined ||
            metadata.mtime.getTime() <= olderThanCutoffMs
        };
      })
    );
    const selectedRepositoryPaths = new Set<string>();
    let retainedSizeBytes = repositoryCandidates.reduce(
      (total, candidate) => total + candidate.sizeBytes,
      0
    );
    const clearAll =
      olderThanCutoffMs === undefined && input.maxSizeBytes === undefined;

    for (const candidate of repositoryCandidates) {
      if (
        clearAll ||
        (candidate.ageEligible && olderThanCutoffMs !== undefined)
      ) {
        selectedRepositoryPaths.add(candidate.path);
        retainedSizeBytes -= candidate.sizeBytes;
      }
    }

    if (
      input.maxSizeBytes !== undefined &&
      retainedSizeBytes > input.maxSizeBytes
    ) {
      for (const candidate of [...repositoryCandidates].sort(
        (left, right) =>
          left.mtimeMs - right.mtimeMs || left.path.localeCompare(right.path)
      )) {
        if (selectedRepositoryPaths.has(candidate.path)) {
          continue;
        }

        selectedRepositoryPaths.add(candidate.path);
        retainedSizeBytes -= candidate.sizeBytes;

        if (retainedSizeBytes <= input.maxSizeBytes) {
          break;
        }
      }
    }

    const repositoryPaths = repositoryCandidates
      .filter((candidate) => selectedRepositoryPaths.has(candidate.path))
      .map((candidate) => candidate.path);
    const matchedRepositoryCount = repositoryCandidates.length;
    const retainedRepositoryCount =
      repositoryCandidates.length - repositoryPaths.length;
    const totalSizeBytes = repositoryCandidates
      .filter((candidate) => selectedRepositoryPaths.has(candidate.path))
      .reduce((total, candidate) => total + candidate.sizeBytes, 0);

    if (!dryRun) {
      await Promise.all(
        repositoryPaths.map((repositoryPath) =>
          rm(repositoryPath, { force: true, recursive: true })
        )
      );
    }

    return {
      completedAt,
      dryRun,
      ...(input.gitServiceRef !== undefined
        ? { gitServiceRef: input.gitServiceRef }
        : {}),
      matchedRepositoryCount,
      ...(input.maxSizeBytes !== undefined
        ? { maxSizeBytes: input.maxSizeBytes }
        : {}),
      ...(input.namespace !== undefined ? { namespace: input.namespace } : {}),
      ...(input.olderThanSeconds !== undefined
        ? { olderThanSeconds: input.olderThanSeconds }
        : {}),
      ...(input.repositoryName !== undefined
        ? { repositoryName: input.repositoryName }
        : {}),
      repositoryCount: repositoryPaths.length,
      retainedRepositoryCount,
      retainedSizeBytes,
      status: dryRun ? "dry_run" : "cleared",
      totalSizeBytes
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        completedAt,
        dryRun,
        ...(input.gitServiceRef !== undefined
          ? { gitServiceRef: input.gitServiceRef }
          : {}),
        matchedRepositoryCount: 0,
        ...(input.maxSizeBytes !== undefined
          ? { maxSizeBytes: input.maxSizeBytes }
          : {}),
        ...(input.namespace !== undefined ? { namespace: input.namespace } : {}),
        ...(input.olderThanSeconds !== undefined
          ? { olderThanSeconds: input.olderThanSeconds }
          : {}),
        ...(input.repositoryName !== undefined
          ? { repositoryName: input.repositoryName }
          : {}),
        repositoryCount: 0,
        retainedRepositoryCount: 0,
        retainedSizeBytes: 0,
        status: dryRun ? "dry_run" : "cleared",
        totalSizeBytes: 0
      };
    }

    throw error;
  }
}

export async function buildHostStatus() {
  const graphInspection = await getGraphInspection();
  const authorityInspection = await getHostAuthorityInspection();
  const catalogInspection = await getCatalogInspection();
  const stateLayout = await inspectStateLayout({
    materializeIfMissing: true
  });
  const timestamp = nowIsoString();
  const transportHealth = buildHostTransportHealth({
    catalog: catalogInspection.catalog,
    timestamp
  });
  const artifactBackendCache = await buildArtifactBackendCacheStatus(timestamp);
  const runtimeInspections = await listRuntimeInspections();
  const sessionList = await listSessions();
  const sessionDiagnostics = {
    consistencyFindingCount: sessionList.sessions.reduce(
      (total, session) =>
        total + (session.sessionConsistencyFindings?.length ?? 0),
      0
    ),
    inspectedSessionCount: sessionList.sessions.length,
    sessionsWithConsistencyFindings: sessionList.sessions.filter(
      (session) => (session.sessionConsistencyFindings?.length ?? 0) > 0
    ).length
  };
  const runtimeBackend = getRuntimeBackend();
  const reconciliationSnapshot =
    (await readLatestReconciliationSnapshot()) ??
    reconciliationSnapshotSchema.parse({
      backendKind: runtimeBackend.kind,
      blockedRuntimeCount: 0,
      degradedRuntimeCount: 0,
      failedRuntimeCount: 0,
      findingCodes: [],
      graphId: graphInspection.graph?.graphId,
      graphRevisionId: graphInspection.activeRevisionId,
      issueCount: 0,
      lastReconciledAt: nowIsoString(),
      managedRuntimeCount: 0,
      nodes: [],
      runningRuntimeCount: 0,
      schemaVersion: "1",
      stoppedRuntimeCount: 0,
      transitioningRuntimeCount: 0
    });
  const hostStatus =
    stateLayout.status !== "current" ||
    authorityInspection.secret.status !== "available" ||
    transportHealth.controlObserve.status === "degraded" ||
    reconciliationSnapshot.degradedRuntimeCount > 0 ||
    sessionDiagnostics.consistencyFindingCount > 0
      ? "degraded"
      : reconciliationSnapshot.transitioningRuntimeCount > 0
        ? "starting"
        : "healthy";

  return {
    authority: {
      authorityId: authorityInspection.authority.authorityId,
      publicKey: authorityInspection.authority.publicKey,
      secretStatus: authorityInspection.secret.status,
      status: authorityInspection.authority.status,
      updatedAt: authorityInspection.authority.updatedAt
    },
    artifactBackendCache,
    service: "entangle-host" as const,
    security: buildHostOperatorSecurityStatus(),
    status: hostStatus,
    graphRevisionId: graphInspection.activeRevisionId,
    reconciliation: {
      backendKind: reconciliationSnapshot.backendKind,
      blockedRuntimeCount: reconciliationSnapshot.blockedRuntimeCount,
      degradedRuntimeCount: reconciliationSnapshot.degradedRuntimeCount,
      failedRuntimeCount: reconciliationSnapshot.failedRuntimeCount,
      findingCodes: reconciliationSnapshot.findingCodes,
      issueCount: reconciliationSnapshot.issueCount,
      lastReconciledAt: reconciliationSnapshot.lastReconciledAt,
      managedRuntimeCount: reconciliationSnapshot.managedRuntimeCount,
      runningRuntimeCount: reconciliationSnapshot.runningRuntimeCount,
      stoppedRuntimeCount: reconciliationSnapshot.stoppedRuntimeCount,
      transitioningRuntimeCount:
        reconciliationSnapshot.transitioningRuntimeCount
    },
    runtimeCounts: {
      desired: runtimeInspections.runtimes.filter(
        (runtime) => runtime.desiredState === "running"
      ).length,
      observed: runtimeInspections.runtimes.filter(
        (runtime) => runtime.observedState !== "missing"
      ).length,
      running: runtimeInspections.runtimes.filter(
        (runtime) => runtime.observedState === "running"
      ).length
    },
    sessionDiagnostics,
    stateLayout,
    timestamp,
    transport: transportHealth
  };
}
