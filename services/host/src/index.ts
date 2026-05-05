import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  catalogInspectionResponseSchema,
  agentEngineProfileUpsertRequestSchema,
  edgeCreateRequestSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  edgeReplacementRequestSchema,
  externalPrincipalDeletionResponseSchema,
  externalPrincipalInspectionResponseSchema,
  externalPrincipalListResponseSchema,
  externalPrincipalMutationRequestSchema,
  graphMutationResponseSchema,
  graphInspectionResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  type HostEventRecord,
  type HostOperatorRequestMethod,
  type OperatorPermission,
  type OperatorRole,
  type ArtifactRef,
  type GitRepositoryTargetSelector,
  type RuntimeAssignmentRecord,
  type RuntimeWikiUpsertPageResponse,
  type SourceHistoryPublicationTarget,
  type SessionCancellationMutationRequest,
  type SessionCancellationRequestRecord,
  type SessionCancellationResponse,
  runtimeAssignmentInspectionResponseSchema,
  runtimeAssignmentListResponseSchema,
  runtimeAssignmentOfferRequestSchema,
  runtimeAssignmentOfferResponseSchema,
  runtimeAssignmentRevokeRequestSchema,
  runtimeAssignmentRevokeResponseSchema,
  runtimeAssignmentTimelineResponseSchema,
  hostAuthorityExportResponseSchema,
  hostAuthorityImportRequestSchema,
  hostAuthorityImportResponseSchema,
  hostAuthorityInspectionResponseSchema,
  identifierSchema,
  nostrEventIdSchema,
  hostEventAuditBundleResponseSchema,
  hostEventIntegrityResponseSchema,
  hostEventIntegritySignedReportResponseSchema,
  hostEventListQuerySchema,
  hostEventListResponseSchema,
  hostEventStreamQuerySchema,
  hostErrorResponseSchema,
  hostProjectionSnapshotSchema,
  hostArtifactBackendCacheClearRequestSchema,
  hostArtifactBackendCacheClearResponseSchema,
  nodeCreateRequestSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  nodeReplacementRequestSchema,
  hostStatusResponseSchema,
  packageSourceAdmissionRequestSchema,
  packageSourceDeletionResponseSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  runtimeArtifactDiffQuerySchema,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryQuerySchema,
  runtimeArtifactHistoryResponseSchema,
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeArtifactRestoreRequestSchema,
  runtimeArtifactRestoreResponseSchema,
  runtimeArtifactSourceChangeProposalRequestSchema,
  runtimeArtifactSourceChangeProposalResponseSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  runtimeMemoryPageQuerySchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryListQuerySchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeListResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewQuerySchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryPublishRequestSchema,
  runtimeSourceHistoryPublishResponseSchema,
  runtimeSourceHistoryReplayInspectionResponseSchema,
  runtimeSourceHistoryReplayListQuerySchema,
  runtimeSourceHistoryReplayListResponseSchema,
  runtimeSourceHistoryReconcileRequestSchema,
  runtimeSourceHistoryReconcileResponseSchema,
  runtimeSourceHistoryReplayRequestSchema,
  runtimeSourceHistoryReplayResponseSchema,
  runtimeWikiPublishRequestSchema,
  runtimeWikiPublishResponseSchema,
  runtimeWikiUpsertPageBatchRequestSchema,
  runtimeWikiUpsertPageBatchResponseSchema,
  runtimeWikiUpsertPageRequestSchema,
  runtimeWikiUpsertPageResponseSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runnerRegistryInspectionResponseSchema,
  runnerRegistryListResponseSchema,
  runnerRevokeMutationRequestSchema,
  runnerRevokeMutationResponseSchema,
  runnerTrustMutationRequestSchema,
  runnerTrustMutationResponseSchema,
  sessionCancellationMutationRequestSchema,
  sessionCancellationResponseSchema,
  sessionInspectionResponseSchema,
  sessionLaunchRequestSchema,
  sessionLaunchResponseSchema,
  sessionListResponseSchema,
  userNodeConversationReadResponseSchema,
  userNodeConversationResponseSchema,
  userNodeCommandReceiptListResponseSchema,
  userNodeIdentityInspectionResponseSchema,
  userNodeIdentityListResponseSchema,
  userNodeInboxResponseSchema,
  userNodeInboundMessageRecordRequestSchema,
  userNodeMessageInspectionResponseSchema,
  userNodeMessageRecordSchema,
  userNodeMessagePublishRequestSchema,
  userNodeMessagePublishResponseSchema
} from "@entangle/types";
import { ZodError, type ZodType } from "zod";
import {
  admitPackageSource,
  applyCatalog,
  applyGraph,
  buildHostStatus,
  clearArtifactBackendCache,
  createEdge,
  createManagedNode,
  deleteEdge,
  deleteExternalPrincipal,
  deleteManagedNode,
  deletePackageSource,
  exportHostAuthority,
  getHostAuthorityInspection,
  getHostProjectionSnapshot,
  getNodeInspection,
  getRunnerRegistryEntry,
  getRuntimeAssignment,
  getRuntimeAssignmentTimeline,
  getRuntimeBootstrapBundle,
  getRuntimeContext,
  getRuntimeIdentitySecret,
  getRuntimeInspection,
  getRuntimeApprovalInspection,
  getRuntimeRecoveryInspection,
  getRuntimeSourceChangeCandidateDiff,
  getRuntimeSourceChangeCandidateFilePreview,
  getRuntimeSourceChangeCandidateInspection,
  getRuntimeSourceHistoryInspection,
  getRuntimeSourceHistoryReplayInspection,
  getRuntimeTurnInspection,
  getUserNodeConversation,
  getUserNodeIdentity,
  getUserNodeMessage,
  getUserNodeSigningMaterial,
  listUserNodeCommandReceipts,
  markUserNodeConversationRead,
  getExternalPrincipalInspection,
  listRuntimeArtifacts,
  listRuntimeApprovals,
  listRuntimeSourceChangeCandidates,
  listRuntimeSourceHistory,
  listRuntimeSourceHistoryReplays,
  listRuntimeTurns,
  listHostEvents,
  inspectHostEventIntegrity,
  exportSignedHostEventIntegrityReport,
  exportHostEventAuditBundle,
  getCatalogInspection,
  getGraphInspection,
  getGraphRevision,
  buildFederatedSessionCancellationRequestRecord,
  listExternalPrincipals,
  listEdges,
  listGraphRevisions,
  listNodeInspections,
  getPackageSourceInspection,
  getRuntimeArtifactInspection,
  getRuntimeMemoryInspection,
  getRuntimeMemoryPageInspection,
  getSessionInspection,
  initializeHostState,
  importHostAuthority,
  listRunnerRegistry,
  listRuntimeAssignments,
  listRuntimeInspections,
  listUserNodeIdentities,
  listSessions,
  listPackageSources,
  getRuntimeArtifactDiff,
  getRuntimeArtifactHistory,
  getRuntimeArtifactPreview,
  restartRuntime,
  replaceEdge,
  replaceManagedNode,
  offerRuntimeAssignment,
  recordFederatedSessionCancellationRequest,
  revokeRunnerRegistration,
  revokeRuntimeAssignment,
  setRuntimeDesiredState,
  setRuntimeRecoveryPolicy,
  trustRunnerRegistration,
  recordHostOperatorRequestCompleted,
  recordHostFederatedControlObserveTransportHealth,
  recordUserNodeInboundMessage,
  recordUserNodePublishedMessage,
  subscribeToHostEvents,
  upsertAgentEngineProfile,
  upsertExternalPrincipal,
  validateCatalogCandidate,
  validateGraphCandidate
} from "./state.js";
import {
  resolveHostFederatedRelayUrls,
  startHostFederatedControlPlane,
  type HostFederatedRuntime
} from "./host-federated-runtime.js";
import { publishHostSessionLaunch } from "./session-launch.js";
import { publishUserNodeA2AMessage } from "./user-node-messaging.js";
import {
  resolveHostOperatorPrincipalForRequest,
  resolveHostOperatorPrincipalsFromEnv,
  resolveUnauthorizedOperatorAuditPrincipal,
  type HostOperatorPrincipal
} from "./operator-auth.js";

class HostHttpError extends Error {
  readonly code:
    | "bad_request"
    | "conflict"
    | "unauthorized"
    | "not_found"
    | "internal_error";
  readonly details: Record<string, unknown> | undefined;
  readonly statusCode: number;

  constructor(options: {
    code:
      | "bad_request"
      | "conflict"
      | "unauthorized"
      | "not_found"
      | "internal_error";
    details?: Record<string, unknown>;
    message: string;
    statusCode: number;
  }) {
    super(options.message);
    this.code = options.code;
    this.details = options.details;
    this.statusCode = options.statusCode;
  }
}

type HostEventStreamSocket = {
  close(code?: number, reason?: string): void;
  on(event: "close", listener: () => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  readyState: number;
  send(payload: string): void;
};

type HostFederatedAssignmentPublisher = {
  publishRuntimeAssignmentOffer(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    correlationId?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeAssignmentRevoke(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeStart?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeStop?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeRestart?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeSessionCancel?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    cancellation: SessionCancellationRequestRecord;
    commandId: string;
    correlationId?: string;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeArtifactRestore?(input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    restoreId?: string;
  }): Promise<unknown>;
  publishRuntimeArtifactSourceChangeProposal?(input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    overwrite?: boolean;
    proposalId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    targetPath?: string;
  }): Promise<unknown>;
  publishRuntimeSourceHistoryPublish?(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    retryFailedPublication?: boolean;
    sourceHistoryId: string;
    target?: SourceHistoryPublicationTarget;
  }): Promise<unknown>;
  publishRuntimeSourceHistoryReplay?(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<unknown>;
  publishRuntimeSourceHistoryReconcile?(input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }): Promise<unknown>;
  publishRuntimeWikiPublish?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    correlationId?: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
    retryFailedPublication?: boolean;
    target?: GitRepositoryTargetSelector;
  }): Promise<unknown>;
  publishRuntimeWikiUpsertPage?(input: {
    assignment: RuntimeAssignmentRecord;
    authRequired?: boolean;
    commandId: string;
    content: string;
    correlationId?: string;
    expectedCurrentSha256?: string;
    mode?: "append" | "patch" | "replace";
    path: string;
    reason?: string;
    relayUrls: string[];
    requestedBy?: string;
  }): Promise<unknown>;
};

export type HostServerOptions = {
  federatedControlAuthRequired?: boolean;
  federatedControlPlane?: HostFederatedAssignmentPublisher;
  federatedControlRelayUrls?: string[];
};

function isReadOnlyRequestMethod(method: string): boolean {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function parseCommaSeparatedValues(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function resolveHostCorsAllowedOrigins(): string[] {
  return parseCommaSeparatedValues(process.env.ENTANGLE_HOST_CORS_ORIGINS);
}

function resolveAllowedCorsOrigin(input: {
  allowedOrigins: string[];
  origin: string | undefined;
}): string | undefined {
  if (!input.origin || input.allowedOrigins.length === 0) {
    return undefined;
  }

  return input.allowedOrigins.includes("*") ||
    input.allowedOrigins.includes(input.origin)
    ? input.origin
    : undefined;
}

function operatorRoleAllowsRequest(input: {
  method: string;
  role: OperatorRole;
}): boolean {
  return input.role === "viewer"
    ? isReadOnlyRequestMethod(input.method)
    : true;
}

function resolveRequiredOperatorPermission(input: {
  method: string;
  path: string;
}): OperatorPermission {
  if (isReadOnlyRequestMethod(input.method)) {
    return "host.read";
  }

  if (input.path === "/v1/authority/import") {
    return "host.authority.write";
  }

  if (input.path.startsWith("/v1/host/artifact-backend-cache/")) {
    return "host.maintenance.write";
  }

  if (
    input.path === "/v1/catalog" ||
    input.path.startsWith("/v1/catalog/") ||
    input.path.startsWith("/v1/package-sources") ||
    input.path.startsWith("/v1/external-principals")
  ) {
    return "host.catalog.write";
  }

  if (
    input.path === "/v1/graph" ||
    input.path.startsWith("/v1/graph/") ||
    input.path.startsWith("/v1/nodes") ||
    input.path.startsWith("/v1/edges")
  ) {
    return "host.graph.write";
  }

  if (input.path.startsWith("/v1/runners")) {
    return "host.runners.write";
  }

  if (input.path.startsWith("/v1/assignments")) {
    return "host.assignments.write";
  }

  if (input.path.startsWith("/v1/user-nodes")) {
    return "host.user_nodes.write";
  }

  if (
    input.path.startsWith("/v1/runtimes") ||
    input.path.startsWith("/v1/sessions")
  ) {
    return "host.runtimes.write";
  }

  return "host.admin";
}

function operatorPermissionsAllowRequest(input: {
  permission: OperatorPermission;
  principal: HostOperatorPrincipal;
}): boolean {
  if (!input.principal.operatorPermissions) {
    return true;
  }

  return (
    input.principal.operatorPermissions.includes("host.admin") ||
    input.principal.operatorPermissions.includes(input.permission)
  );
}

function asHostOperatorRequestMethod(
  method: string
): HostOperatorRequestMethod | undefined {
  switch (method.toUpperCase()) {
    case "DELETE":
      return "DELETE";
    case "PATCH":
      return "PATCH";
    case "POST":
      return "POST";
    case "PUT":
      return "PUT";
    default:
      return undefined;
  }
}

function stripRequestQuery(rawUrl: string): string {
  const queryIndex = rawUrl.indexOf("?");
  const path = queryIndex === -1 ? rawUrl : rawUrl.slice(0, queryIndex);

  return path.length > 0 ? path : "/";
}

type HostOperatorRequestContext = {
  operatorId: string;
  operatorPermissions?: OperatorPermission[];
  operatorRole: OperatorRole;
};

function setHostOperatorRequestContext(
  request: unknown,
  context: HostOperatorRequestContext
) {
  (request as { hostOperatorRequestContext?: HostOperatorRequestContext })
    .hostOperatorRequestContext = context;
}

function getHostOperatorRequestContext(
  request: unknown
): HostOperatorRequestContext | undefined {
  return (request as { hostOperatorRequestContext?: HostOperatorRequestContext })
    .hostOperatorRequestContext;
}

function parseRequestInput<T>(
  schema: ZodType<T>,
  input: unknown,
  options: {
    detailsKey: string;
    message: string;
  }
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new HostHttpError({
      code: "bad_request",
      details: {
        [options.detailsKey]: parsed.error.issues
      },
      message: options.message,
      statusCode: 400
    });
  }

  return parsed.data;
}

function buildErrorPayload(error: HostHttpError) {
  return hostErrorResponseSchema.parse({
    code: error.code,
    ...(error.details ? { details: error.details } : {}),
    message: error.message
  });
}

function throwForManagedNodeMutationConflict(conflict: {
  kind: "graph_missing" | "node_exists" | "node_has_edges" | "node_not_found";
  message?: string;
  nodeId?: string;
  edgeIds?: string[];
}): never {
  switch (conflict.kind) {
    case "graph_missing":
      throw new HostHttpError({
        code: "conflict",
        message: conflict.message ?? "Managed node mutation requires an active graph revision.",
        statusCode: 409
      });
    case "node_exists":
      throw new HostHttpError({
        code: "conflict",
        message: `Managed node '${conflict.nodeId}' already exists in the active graph.`,
        statusCode: 409
      });
    case "node_has_edges":
      throw new HostHttpError({
        code: "conflict",
        details: {
          edgeIds: conflict.edgeIds ?? []
        },
        message:
          `Managed node '${conflict.nodeId}' cannot be deleted while graph edges still reference it.`,
        statusCode: 409
      });
    case "node_not_found":
      throw new HostHttpError({
        code: "not_found",
        message: `Managed node '${conflict.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
  }
}

function throwForEdgeMutationConflict(conflict: {
  kind: "edge_exists" | "edge_not_found" | "graph_missing";
  edgeId?: string;
  message?: string;
}): never {
  switch (conflict.kind) {
    case "graph_missing":
      throw new HostHttpError({
        code: "conflict",
        message: conflict.message ?? "Edge mutation requires an active graph revision.",
        statusCode: 409
      });
    case "edge_exists":
      throw new HostHttpError({
        code: "conflict",
        message: `Edge '${conflict.edgeId}' already exists in the active graph.`,
        statusCode: 409
      });
    case "edge_not_found":
      throw new HostHttpError({
        code: "not_found",
        message: `Edge '${conflict.edgeId}' was not found in the active graph.`,
        statusCode: 404
      });
  }
}

function throwForPackageSourceDeletionConflict(conflict: {
  kind: "package_source_in_use" | "package_source_not_found";
  nodeIds?: string[];
  packageSourceId: string;
}): never {
  switch (conflict.kind) {
    case "package_source_in_use":
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeIds: conflict.nodeIds ?? []
        },
        message:
          `Package source '${conflict.packageSourceId}' cannot be deleted while active graph nodes still reference it.`,
        statusCode: 409
      });
    case "package_source_not_found":
      throw new HostHttpError({
        code: "not_found",
        message: `Package source '${conflict.packageSourceId}' was not found.`,
        statusCode: 404
      });
  }
}

function throwForExternalPrincipalDeletionConflict(conflict: {
  kind: "external_principal_in_use" | "external_principal_not_found";
  nodeIds?: string[];
  principalId: string;
}): never {
  switch (conflict.kind) {
    case "external_principal_in_use":
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeIds: conflict.nodeIds ?? []
        },
        message:
          `External principal '${conflict.principalId}' cannot be deleted while active graph nodes still reference it.`,
        statusCode: 409
      });
    case "external_principal_not_found":
      throw new HostHttpError({
        code: "not_found",
        message: `External principal '${conflict.principalId}' was not found.`,
        statusCode: 404
      });
  }
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return typeof entrypoint === "string" && import.meta.url === pathToFileURL(entrypoint).href;
}

async function publishRuntimeAssignmentOfferFromHost(
  options: HostServerOptions,
  assignment: RuntimeAssignmentRecord
): Promise<void> {
  if (
    !options.federatedControlPlane ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return;
  }

  await options.federatedControlPlane.publishRuntimeAssignmentOffer({
    assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    relayUrls: options.federatedControlRelayUrls
  });
}

async function publishRuntimeAssignmentRevokeFromHost(
  options: HostServerOptions,
  assignment: RuntimeAssignmentRecord,
  reason: string | undefined
): Promise<void> {
  if (
    !options.federatedControlPlane ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return;
  }

  await options.federatedControlPlane.publishRuntimeAssignmentRevoke({
    assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    ...(reason ? { reason } : {}),
    relayUrls: options.federatedControlRelayUrls
  });
}

function selectFederatedRuntimeControlAssignment(input: {
  assignments: RuntimeAssignmentRecord[];
  nodeId: string;
}): RuntimeAssignmentRecord | undefined {
  return input.assignments
    .filter(
      (assignment) =>
        assignment.nodeId === input.nodeId &&
        (assignment.status === "accepted" || assignment.status === "active")
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

async function publishRuntimeLifecycleCommandFromHost(
  options: HostServerOptions,
  input: {
    assignment: RuntimeAssignmentRecord;
    command: "restart" | "start" | "stop";
    reason?: string;
  }
): Promise<boolean> {
  if (
    !options.federatedControlPlane ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return false;
  }

  const publisher =
    input.command === "start"
      ? options.federatedControlPlane.publishRuntimeStart?.bind(
          options.federatedControlPlane
        )
      : input.command === "stop"
        ? options.federatedControlPlane.publishRuntimeStop?.bind(
            options.federatedControlPlane
          )
        : options.federatedControlPlane.publishRuntimeRestart?.bind(
            options.federatedControlPlane
          );

  if (!publisher) {
    return false;
  }

  await publisher({
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId: `cmd-${input.command}-${randomUUID()}`,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls
  });

  return true;
}

async function publishRuntimeSessionCancelCommandFromHost(
  options: HostServerOptions,
  input: {
    assignment: RuntimeAssignmentRecord;
    cancellation: SessionCancellationRequestRecord;
  }
): Promise<boolean> {
  if (
    !options.federatedControlPlane?.publishRuntimeSessionCancel ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return false;
  }

  await options.federatedControlPlane.publishRuntimeSessionCancel({
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    cancellation: input.cancellation,
    commandId: `cmd-session-cancel-${randomUUID()}`,
    relayUrls: options.federatedControlRelayUrls
  });

  return true;
}

async function publishRuntimeArtifactRestoreCommandFromHost(
  options: HostServerOptions,
  input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    requestedBy?: string;
    restoreId?: string;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeArtifactRestore ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-artifact-restore-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeArtifactRestore({
    artifactRef: input.artifactRef,
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
    ...(input.restoreId ? { restoreId: input.restoreId } : {})
  });

  return commandId;
}

async function publishRuntimeArtifactSourceChangeProposalCommandFromHost(
  options: HostServerOptions,
  input: {
    artifactRef: ArtifactRef;
    assignment: RuntimeAssignmentRecord;
    overwrite?: boolean;
    proposalId?: string;
    reason?: string;
    requestedBy?: string;
    targetPath?: string;
  }
): Promise<{ commandId: string; proposalId: string } | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeArtifactSourceChangeProposal ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-artifact-proposal-${randomUUID()}`;
  const proposalId = input.proposalId ?? commandId.replace(/^cmd-/u, "");
  await options.federatedControlPlane.publishRuntimeArtifactSourceChangeProposal({
    artifactRef: input.artifactRef,
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    overwrite: input.overwrite ?? false,
    proposalId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
    ...(input.targetPath ? { targetPath: input.targetPath } : {})
  });

  return {
    commandId,
    proposalId
  };
}

async function publishRuntimeSourceHistoryPublishCommandFromHost(
  options: HostServerOptions,
  input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    sourceHistoryId: string;
    target?: SourceHistoryPublicationTarget;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeSourceHistoryPublish ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-source-history-publish-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeSourceHistoryPublish({
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
    retryFailedPublication: input.retryFailedPublication ?? false,
    sourceHistoryId: input.sourceHistoryId,
    ...(input.target ? { target: input.target } : {})
  });

  return commandId;
}

async function publishRuntimeSourceHistoryReplayCommandFromHost(
  options: HostServerOptions,
  input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeSourceHistoryReplay ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-source-history-replay-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeSourceHistoryReplay({
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
    ...(input.replayId ? { replayId: input.replayId } : {}),
    sourceHistoryId: input.sourceHistoryId
  });

  return commandId;
}

async function publishRuntimeSourceHistoryReconcileCommandFromHost(
  options: HostServerOptions,
  input: {
    approvalId?: string;
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    replayedBy?: string;
    replayId?: string;
    sourceHistoryId: string;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeSourceHistoryReconcile ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-source-history-reconcile-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeSourceHistoryReconcile({
    ...(input.approvalId ? { approvalId: input.approvalId } : {}),
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.replayedBy ? { replayedBy: input.replayedBy } : {}),
    ...(input.replayId ? { replayId: input.replayId } : {}),
    sourceHistoryId: input.sourceHistoryId
  });

  return commandId;
}

async function publishRuntimeWikiPublishCommandFromHost(
  options: HostServerOptions,
  input: {
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    requestedBy?: string;
    retryFailedPublication?: boolean;
    target?: GitRepositoryTargetSelector;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeWikiPublish ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-wiki-publish-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeWikiPublish({
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.requestedBy ? { requestedBy: input.requestedBy } : {}),
    retryFailedPublication: input.retryFailedPublication ?? false,
    ...(input.target ? { target: input.target } : {})
  });

  return commandId;
}

async function publishRuntimeWikiUpsertPageCommandFromHost(
  options: HostServerOptions,
  input: {
    assignment: RuntimeAssignmentRecord;
    content: string;
    expectedCurrentSha256?: string;
    mode?: "append" | "patch" | "replace";
    path: string;
    reason?: string;
    requestedBy?: string;
  }
): Promise<string | undefined> {
  if (
    !options.federatedControlPlane?.publishRuntimeWikiUpsertPage ||
    !options.federatedControlRelayUrls ||
    options.federatedControlRelayUrls.length === 0
  ) {
    return undefined;
  }

  const commandId = `cmd-wiki-upsert-page-${randomUUID()}`;
  await options.federatedControlPlane.publishRuntimeWikiUpsertPage({
    assignment: input.assignment,
    ...(options.federatedControlAuthRequired !== undefined
      ? { authRequired: options.federatedControlAuthRequired }
      : {}),
    commandId,
    content: input.content,
    ...(input.expectedCurrentSha256
      ? { expectedCurrentSha256: input.expectedCurrentSha256 }
      : {}),
    mode: input.mode ?? "replace",
    path: input.path,
    ...(input.reason ? { reason: input.reason } : {}),
    relayUrls: options.federatedControlRelayUrls,
    ...(input.requestedBy ? { requestedBy: input.requestedBy } : {})
  });

  return commandId;
}

async function requestRuntimeSessionCancellationFromHost(
  options: HostServerOptions,
  input: {
    assignments: RuntimeAssignmentRecord[];
    nodeId: string;
    request: SessionCancellationMutationRequest;
    sessionId: string;
  }
): Promise<SessionCancellationRequestRecord | null> {
  const assignment = selectFederatedRuntimeControlAssignment({
    assignments: input.assignments,
    nodeId: input.nodeId
  });

  if (!assignment) {
    const inspection = await getRuntimeInspection(input.nodeId);

    if (!inspection) {
      return null;
    }

    throw new HostHttpError({
      code: "conflict",
      details: {
        nodeId: input.nodeId,
        sessionId: input.sessionId
      },
      message:
        `Session cancellation for runtime '${input.nodeId}' requires ` +
        "an accepted federated runner assignment.",
      statusCode: 409
    });
  }

  const cancellation = buildFederatedSessionCancellationRequestRecord({
    assignment,
    request: input.request,
    sessionId: input.sessionId
  });
  const published = await publishRuntimeSessionCancelCommandFromHost(options, {
    assignment,
    cancellation
  });

  if (!published) {
    throw new HostHttpError({
      code: "conflict",
      details: {
        nodeId: input.nodeId,
        sessionId: input.sessionId
      },
      message:
        "Federated session cancellation requires an active Host control plane and relay configuration.",
      statusCode: 409
    });
  }

  return recordFederatedSessionCancellationRequest(cancellation);
}

async function requestSessionCancellationFromHost(
  options: HostServerOptions,
  input: {
    request: SessionCancellationMutationRequest;
    sessionId: string;
  }
): Promise<SessionCancellationResponse | null> {
  const request = sessionCancellationMutationRequestSchema.parse(input.request);
  const targetNodeIds = [
    ...new Set(
      request.nodeIds.length > 0
        ? request.nodeIds
        : ((await getSessionInspection(input.sessionId))?.nodes.map(
            (node) => node.nodeId
          ) ?? [])
    )
  ];

  if (targetNodeIds.length === 0) {
    return null;
  }

  const assignments = (await listRuntimeAssignments()).assignments;
  const cancellations = (
    await Promise.all(
      targetNodeIds.map((nodeId) =>
        requestRuntimeSessionCancellationFromHost(options, {
          assignments,
          nodeId,
          request,
          sessionId: input.sessionId
        })
      )
    )
  ).filter(
    (
      record
    ): record is SessionCancellationRequestRecord => record !== null
  );

  if (cancellations.length === 0) {
    return null;
  }

  const inspection = await getSessionInspection(input.sessionId);

  return sessionCancellationResponseSchema.parse({
    cancellations,
    ...(inspection ? { inspection } : {}),
    sessionId: input.sessionId
  });
}

export async function buildHostServer(options: HostServerOptions = {}) {
  const server = Fastify({
    logger: process.env.ENTANGLE_HOST_LOGGER === "false" ? false : true
  });
  const operatorPrincipals = resolveHostOperatorPrincipalsFromEnv();
  const operatorAuthRequired = operatorPrincipals.length > 0;
  const unauthorizedOperatorAuditPrincipal =
    resolveUnauthorizedOperatorAuditPrincipal(operatorPrincipals);
  const corsAllowedOrigins = resolveHostCorsAllowedOrigins();
  await server.register(websocket);

  server.addHook("onRequest", (request, reply, done) => {
    const origin =
      typeof request.headers.origin === "string"
        ? request.headers.origin
        : undefined;
    const allowedOrigin = resolveAllowedCorsOrigin({
      allowedOrigins: corsAllowedOrigins,
      origin
    });

    if (!allowedOrigin) {
      done();
      return;
    }

    reply.header("access-control-allow-origin", allowedOrigin);
    reply.header("access-control-allow-credentials", "true");
    reply.header(
      "access-control-allow-headers",
      "authorization, content-type"
    );
    reply.header(
      "access-control-allow-methods",
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    reply.header("access-control-max-age", "600");
    reply.header("vary", "Origin");

    if (request.method.toUpperCase() === "OPTIONS") {
      reply.status(204).send();
      return;
    }

    done();
  });

  if (operatorAuthRequired) {
    server.addHook("preHandler", (request, reply, done) => {
      setHostOperatorRequestContext(
        request,
        unauthorizedOperatorAuditPrincipal
      );
      const operatorPrincipal = resolveHostOperatorPrincipalForRequest({
        authorization: request.headers.authorization,
        principals: operatorPrincipals,
        query: request.query,
        upgrade: request.headers.upgrade
      });

      if (!operatorPrincipal) {
        reply.header("www-authenticate", "Bearer realm=\"entangle-host\"");
        reply.status(401).send(
          hostErrorResponseSchema.parse({
            code: "unauthorized",
            message: "Entangle host operator token is required."
          })
        );
        return;
      }

      setHostOperatorRequestContext(request, operatorPrincipal);

      const path = stripRequestQuery(request.url);
      const requiredPermission = resolveRequiredOperatorPermission({
        method: request.method,
        path
      });

      if (
        !operatorRoleAllowsRequest({
          method: request.method,
          role: operatorPrincipal.operatorRole
        })
      ) {
        reply.status(403).send(
          hostErrorResponseSchema.parse({
            code: "forbidden",
            message:
              `Entangle host operator role '${operatorPrincipal.operatorRole}' ` +
              `is not allowed to perform ${request.method.toUpperCase()} requests.`
          })
        );
        return;
      }

      if (
        !operatorPermissionsAllowRequest({
          permission: requiredPermission,
          principal: operatorPrincipal
        })
      ) {
        reply.status(403).send(
          hostErrorResponseSchema.parse({
            code: "forbidden",
            message:
              `Entangle host operator '${operatorPrincipal.operatorId}' is missing ` +
              `permission '${requiredPermission}' for ${request.method.toUpperCase()} ${path}.`
          })
        );
        return;
      }

      done();
    });

    server.addHook("onResponse", async (request, reply) => {
      const method = asHostOperatorRequestMethod(request.method);

      if (!method) {
        return;
      }

      const path = stripRequestQuery(request.url);
      const operatorContext =
        getHostOperatorRequestContext(request) ??
        unauthorizedOperatorAuditPrincipal;

      try {
        await recordHostOperatorRequestCompleted({
          authMode: "bootstrap_operator_token",
          category: "security",
          message: `Host operator request '${method} ${path}' completed with status ${reply.statusCode}.`,
          method,
          operatorId: operatorContext.operatorId,
          ...(operatorContext.operatorPermissions
            ? { operatorPermissions: operatorContext.operatorPermissions }
            : {}),
          operatorRole: operatorContext.operatorRole,
          path,
          requestId: String(request.id),
          statusCode: reply.statusCode,
          type: "host.operator_request.completed"
        });
      } catch (error) {
        request.log.error(
          { err: error },
          "failed to record host operator request audit event"
        );
      }
    });
  }

  server.get("/v1/host/status", async () =>
    hostStatusResponseSchema.parse(await buildHostStatus())
  );

  server.post("/v1/host/artifact-backend-cache/clear", async (request) => {
    const body = hostArtifactBackendCacheClearRequestSchema.parse(
      request.body ?? {}
    );

    return hostArtifactBackendCacheClearResponseSchema.parse(
      await clearArtifactBackendCache(body)
    );
  });

  server.get("/v1/projection", async () =>
    hostProjectionSnapshotSchema.parse(await getHostProjectionSnapshot())
  );

  server.get("/v1/user-nodes", async () =>
    userNodeIdentityListResponseSchema.parse(await listUserNodeIdentities())
  );

  server.get("/v1/user-nodes/:nodeId", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const nodeId = identifierSchema.parse(params.nodeId);
    const inspection = await getUserNodeIdentity(nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `User Node '${nodeId}' was not found.`
      });
    }

    return userNodeIdentityInspectionResponseSchema.parse(inspection);
  });

  server.get(
    "/v1/user-nodes/:nodeId/command-receipts",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const nodeId = identifierSchema.parse(params.nodeId);
      const receipts = await listUserNodeCommandReceipts(nodeId);

      if (!receipts) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `User Node '${nodeId}' was not found.`
        });
      }

      return userNodeCommandReceiptListResponseSchema.parse(receipts);
    }
  );

  server.get("/v1/user-nodes/:nodeId/inbox", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const nodeId = identifierSchema.parse(params.nodeId);
    const [inspection, projection] = await Promise.all([
      getUserNodeIdentity(nodeId),
      getHostProjectionSnapshot()
    ]);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `User Node '${nodeId}' was not found.`
      });
    }

    return userNodeInboxResponseSchema.parse({
      conversations: projection.userConversations.filter(
        (conversation) => conversation.userNodeId === nodeId
      ),
      generatedAt: projection.generatedAt,
      userNodeId: nodeId
    });
  });

  server.get(
    "/v1/user-nodes/:nodeId/inbox/:conversationId",
    async (request, reply) => {
      const params = request.params as {
        conversationId: string;
        nodeId: string;
      };
      const nodeId = identifierSchema.parse(params.nodeId);
      const conversationId = identifierSchema.parse(params.conversationId);
      const inspection = await getUserNodeConversation(nodeId, conversationId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `User Node '${nodeId}' was not found.`
        });
      }

      return userNodeConversationResponseSchema.parse(inspection);
    }
  );

  server.post(
    "/v1/user-nodes/:nodeId/inbox/:conversationId/read",
    async (request, reply) => {
      const params = request.params as {
        conversationId: string;
        nodeId: string;
      };
      const nodeId = identifierSchema.parse(params.nodeId);
      const conversationId = identifierSchema.parse(params.conversationId);
      const read = await markUserNodeConversationRead({
        conversationId,
        userNodeId: nodeId
      });

      if (!read) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `User Node '${nodeId}' was not found.`
        });
      }

      return userNodeConversationReadResponseSchema.parse(read);
    }
  );

  server.get(
    "/v1/user-nodes/:nodeId/messages/:eventId",
    async (request, reply) => {
      const params = request.params as {
        eventId: string;
        nodeId: string;
      };
      const nodeId = identifierSchema.parse(params.nodeId);
      const eventId = nostrEventIdSchema.parse(params.eventId);
      const inspection = await getUserNodeMessage(nodeId, eventId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Message '${eventId}' was not found for User Node '${nodeId}'.`
        });
      }

      return userNodeMessageInspectionResponseSchema.parse(inspection);
    }
  );

  server.post(
    "/v1/user-nodes/:nodeId/messages/inbound",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const nodeId = identifierSchema.parse(params.nodeId);
      const userNode = await getUserNodeIdentity(nodeId);

      if (!userNode) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `User Node '${nodeId}' was not found.`
        });
      }

      const recordRequest = parseRequestInput(
        userNodeInboundMessageRecordRequestSchema,
        request.body,
        {
          detailsKey: "inboundMessage",
          message: "Invalid User Node inbound message payload."
        }
      );

      if (
        recordRequest.message.toNodeId !== nodeId ||
        recordRequest.message.toPubkey !== userNode.userNode.publicKey
      ) {
        throw new HostHttpError({
          code: "bad_request",
          message:
            `Inbound message '${recordRequest.eventId}' is not addressed to ` +
            `User Node '${nodeId}'.`,
          statusCode: 400
        });
      }

      if (
        recordRequest.signerPubkey &&
        recordRequest.signerPubkey !== recordRequest.message.fromPubkey
      ) {
        throw new HostHttpError({
          code: "bad_request",
          message:
            `Inbound message '${recordRequest.eventId}' signer does not ` +
            "match its fromPubkey.",
          statusCode: 400
        });
      }

      return userNodeMessageRecordSchema.parse(
        await recordUserNodeInboundMessage({
          request: recordRequest,
          userNodeId: nodeId
        })
      );
    }
  );

  server.post("/v1/user-nodes/:nodeId/messages", async (request) => {
    const params = request.params as { nodeId: string };
    const nodeId = identifierSchema.parse(params.nodeId);
    const messageRequest = parseRequestInput(
      userNodeMessagePublishRequestSchema,
      request.body ?? {},
      {
        detailsKey: "bodyIssues",
        message:
          "Request body did not match the expected User Node message schema."
      }
    );
    const [graphInspection, runtimeContext] = await Promise.all([
      getGraphInspection(),
      getRuntimeContext(messageRequest.targetNodeId)
    ]);

    if (!graphInspection.graph) {
      throw new HostHttpError({
        code: "conflict",
        message: "Cannot publish a User Node message without an active graph.",
        statusCode: 409
      });
    }

    if (!runtimeContext) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${messageRequest.targetNodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    const edgeAllowsMessage = graphInspection.graph.edges.some(
      (edge) =>
        edge.enabled !== false &&
        edge.fromNodeId === nodeId &&
        edge.toNodeId === messageRequest.targetNodeId
    );

    if (!edgeAllowsMessage) {
      throw new HostHttpError({
        code: "conflict",
        message:
          `User Node '${nodeId}' does not have an enabled outbound edge to ` +
          `runtime '${messageRequest.targetNodeId}'.`,
        statusCode: 409
      });
    }

    try {
      const userNode = await getUserNodeSigningMaterial({
        graph: graphInspection.graph,
        nodeId
      });

      const published = userNodeMessagePublishResponseSchema.parse(
        await publishUserNodeA2AMessage({
          request: messageRequest,
          runtimeContext,
          userNode: {
            nodeId: userNode.identity.nodeId,
            publicKey: userNode.identity.publicKey,
            secretKey: userNode.secretKey
          }
        })
      );

      await recordUserNodePublishedMessage({
        request: messageRequest,
        response: published
      });

      return published;
    } catch (error: unknown) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId,
          targetNodeId: messageRequest.targetNodeId
        },
        message:
          error instanceof Error
            ? error.message
            : "Could not publish the User Node message to the configured relay.",
        statusCode: 409
      });
    }
  });

  server.get("/v1/authority", async () =>
    hostAuthorityInspectionResponseSchema.parse(await getHostAuthorityInspection())
  );

  server.get("/v1/authority/export", async () => {
    try {
      return hostAuthorityExportResponseSchema.parse(await exportHostAuthority());
    } catch (error) {
      throw new HostHttpError({
        code: "conflict",
        message:
          error instanceof Error
            ? error.message
            : "Host Authority export is not available.",
        statusCode: 409
      });
    }
  });

  server.put("/v1/authority/import", async (request) => {
    const importRequest = parseRequestInput(
      hostAuthorityImportRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected Host Authority import schema."
      }
    );

    try {
      return hostAuthorityImportResponseSchema.parse(
        await importHostAuthority(importRequest)
      );
    } catch (error) {
      throw new HostHttpError({
        code: "bad_request",
        message:
          error instanceof Error
            ? error.message
            : "Host Authority import failed.",
        statusCode: 400
      });
    }
  });

  server.get("/v1/runners", async () =>
    runnerRegistryListResponseSchema.parse(await listRunnerRegistry())
  );

  server.get("/v1/runners/:runnerId", async (request, reply) => {
    const params = request.params as { runnerId: string };
    const runnerId = identifierSchema.parse(params.runnerId);
    const inspection = await getRunnerRegistryEntry(runnerId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runner '${runnerId}' was not found.`
      });
    }

    return runnerRegistryInspectionResponseSchema.parse(inspection);
  });

  server.post("/v1/runners/:runnerId/trust", async (request, reply) => {
    const params = request.params as { runnerId: string };
    const runnerId = identifierSchema.parse(params.runnerId);
    const existing = await getRunnerRegistryEntry(runnerId);

    if (!existing) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runner '${runnerId}' was not found.`
      });
    }

    const mutation = parseRequestInput(
      runnerTrustMutationRequestSchema,
      request.body ?? {},
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected runner trust schema."
      }
    );

    return runnerTrustMutationResponseSchema.parse(
      await trustRunnerRegistration({
        request: mutation,
        runnerId
      })
    );
  });

  server.post("/v1/runners/:runnerId/revoke", async (request, reply) => {
    const params = request.params as { runnerId: string };
    const runnerId = identifierSchema.parse(params.runnerId);
    const existing = await getRunnerRegistryEntry(runnerId);

    if (!existing) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runner '${runnerId}' was not found.`
      });
    }

    const mutation = parseRequestInput(
      runnerRevokeMutationRequestSchema,
      request.body ?? {},
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected runner revoke schema."
      }
    );

    return runnerRevokeMutationResponseSchema.parse(
      await revokeRunnerRegistration({
        request: mutation,
        runnerId
      })
    );
  });

  server.get("/v1/assignments", async () =>
    runtimeAssignmentListResponseSchema.parse(await listRuntimeAssignments())
  );

  server.get("/v1/assignments/:assignmentId/timeline", async (request, reply) => {
    const params = request.params as { assignmentId: string };
    const assignmentId = identifierSchema.parse(params.assignmentId);
    const timeline = await getRuntimeAssignmentTimeline(assignmentId);

    if (!timeline) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime assignment '${assignmentId}' was not found.`
      });
    }

    return runtimeAssignmentTimelineResponseSchema.parse(timeline);
  });

  server.get("/v1/assignments/:assignmentId", async (request, reply) => {
    const params = request.params as { assignmentId: string };
    const assignmentId = identifierSchema.parse(params.assignmentId);
    const inspection = await getRuntimeAssignment(assignmentId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime assignment '${assignmentId}' was not found.`
      });
    }

    return runtimeAssignmentInspectionResponseSchema.parse(inspection);
  });

  server.post("/v1/assignments", async (request) => {
    const mutation = parseRequestInput(
      runtimeAssignmentOfferRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message:
          "Request body did not match the expected runtime assignment offer schema."
      }
    );

    let response: { assignment: RuntimeAssignmentRecord };

    try {
      response = runtimeAssignmentOfferResponseSchema.parse(
        await offerRuntimeAssignment(mutation)
      );
    } catch (error) {
      throw new HostHttpError({
        code: "conflict",
        message:
          error instanceof Error
            ? error.message
            : "Runtime assignment offer could not be created.",
        statusCode: 409
      });
    }

    await publishRuntimeAssignmentOfferFromHost(options, response.assignment);
    return response;
  });

  server.post("/v1/assignments/:assignmentId/revoke", async (request, reply) => {
    const params = request.params as { assignmentId: string };
    const assignmentId = identifierSchema.parse(params.assignmentId);
    const existing = await getRuntimeAssignment(assignmentId);

    if (!existing) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime assignment '${assignmentId}' was not found.`
      });
    }

    const mutation = parseRequestInput(
      runtimeAssignmentRevokeRequestSchema,
      request.body ?? {},
      {
        detailsKey: "bodyIssues",
        message:
          "Request body did not match the expected runtime assignment revoke schema."
      }
    );

    const response = runtimeAssignmentRevokeResponseSchema.parse(
      await revokeRuntimeAssignment({
        assignmentId,
        request: mutation
      })
    );
    await publishRuntimeAssignmentRevokeFromHost(
      options,
      response.assignment,
      mutation.reason
    );
    return response;
  });

  server.get("/v1/catalog", async () =>
    catalogInspectionResponseSchema.parse(await getCatalogInspection())
  );

  server.get("/v1/events/integrity", async () =>
    hostEventIntegrityResponseSchema.parse(await inspectHostEventIntegrity())
  );

  server.get("/v1/events/integrity/signed", async () =>
    hostEventIntegritySignedReportResponseSchema.parse(
      await exportSignedHostEventIntegrityReport()
    )
  );

  server.get("/v1/events/audit-bundle", async () =>
    hostEventAuditBundleResponseSchema.parse(await exportHostEventAuditBundle())
  );

  server.route({
    method: "GET",
    url: "/v1/events",
    handler: async (request) => {
      const query = parseRequestInput(hostEventListQuerySchema, request.query, {
        detailsKey: "queryIssues",
        message: "Request query did not match the expected schema."
      });

      return hostEventListResponseSchema.parse(
        await listHostEvents(query)
      );
    },
    wsHandler: (rawSocket, request) => {
      const socket = rawSocket as HostEventStreamSocket;

      if (
        operatorAuthRequired &&
        !resolveHostOperatorPrincipalForRequest({
          authorization: request.headers.authorization,
          principals: operatorPrincipals,
          query: request.query,
          upgrade: request.headers.upgrade
        })
      ) {
        socket.close(1008, "Entangle host operator token is required.");
        return;
      }

      const parsedQuery = hostEventStreamQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        socket.close(1008, "Invalid event stream query.");
        return;
      }

      const sendEvent = (event: unknown) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(event));
        }
      };
      let unsubscribe = () => {};
      let isReplaying = true;
      const bufferedEvents: HostEventRecord[] = [];

      void (async () => {
        const replayCount = parsedQuery.data.replay ?? 0;
        unsubscribe = subscribeToHostEvents((event) => {
          if (isReplaying) {
            bufferedEvents.push(event);
            return;
          }

          sendEvent(event);
        });

        if (replayCount > 0) {
          const replay = await listHostEvents(replayCount);
          const replayedEventIds = new Set(
            replay.events.map((event) => event.eventId)
          );

          for (const event of replay.events) {
            sendEvent(event);
          }

          for (const event of bufferedEvents) {
            if (!replayedEventIds.has(event.eventId)) {
              sendEvent(event);
            }
          }
        } else {
          for (const event of bufferedEvents) {
            sendEvent(event);
          }
        }

        bufferedEvents.length = 0;
        isReplaying = false;
      })().catch((error: unknown) => {
        request.log.error(error);
        isReplaying = false;
        bufferedEvents.length = 0;
        unsubscribe();
        socket.close(1011, "Failed to initialize the host event stream.");
      });

      socket.on("close", () => {
        unsubscribe();
      });
      socket.on("error", (error) => {
        request.log.error(error);
        unsubscribe();
      });
    }
  });

  server.post("/v1/catalog/validate", (request) =>
    catalogInspectionResponseSchema.parse(validateCatalogCandidate(request.body))
  );

  server.put(
    "/v1/catalog/agent-engine-profiles/:profileId",
    async (request, reply) => {
      const params = request.params as { profileId: string };
      const profileId = identifierSchema.parse(params.profileId);
      const mutation = parseRequestInput(
        agentEngineProfileUpsertRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected agent engine profile upsert schema."
        }
      );
      const inspection = await upsertAgentEngineProfile(profileId, mutation);

      if (!inspection.validation.ok) {
        reply.status(400);
      }

      return catalogInspectionResponseSchema.parse(inspection);
    }
  );

  server.put("/v1/catalog", async (request, reply) => {
    const inspection = await applyCatalog(request.body);

    if (!inspection.validation.ok) {
      reply.status(400);
    }

    return catalogInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/package-sources", async () =>
    packageSourceListResponseSchema.parse(await listPackageSources())
  );

  server.get("/v1/external-principals", async () =>
    externalPrincipalListResponseSchema.parse(await listExternalPrincipals())
  );

  server.get("/v1/external-principals/:principalId", async (request, reply) => {
    const params = request.params as { principalId: string };
    const inspection = await getExternalPrincipalInspection(params.principalId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `External principal '${params.principalId}' was not found.`
      });
    }

    return externalPrincipalInspectionResponseSchema.parse(inspection);
  });

  server.put("/v1/external-principals/:principalId", async (request) => {
    const params = request.params as { principalId: string };
    const mutation = parseRequestInput(
      externalPrincipalMutationRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected schema."
      }
    );

    if (mutation.principalId !== params.principalId) {
      throw new HostHttpError({
        code: "bad_request",
        details: {
          bodyPrincipalId: mutation.principalId,
          pathPrincipalId: params.principalId
        },
        message:
          "External principal body principalId must match the path parameter.",
        statusCode: 400
      });
    }

    return externalPrincipalInspectionResponseSchema.parse(
      await upsertExternalPrincipal(mutation)
    );
  });

  server.delete("/v1/external-principals/:principalId", async (request) => {
    const params = request.params as { principalId: string };
    const result = await deleteExternalPrincipal(params.principalId);

    if (!result.ok) {
      throwForExternalPrincipalDeletionConflict(result.conflict);
    }

    return externalPrincipalDeletionResponseSchema.parse(result.response);
  });

  server.get("/v1/package-sources/:packageSourceId", async (request, reply) => {
    const params = request.params as { packageSourceId: string };
    const inspection = await getPackageSourceInspection(params.packageSourceId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Package source '${params.packageSourceId}' was not found.`
      });
    }

    return packageSourceInspectionResponseSchema.parse(inspection);
  });

  server.delete("/v1/package-sources/:packageSourceId", async (request) => {
    const params = request.params as { packageSourceId: string };
    const result = await deletePackageSource(params.packageSourceId);

    if (!result.ok) {
      throwForPackageSourceDeletionConflict(result.conflict);
    }

    return packageSourceDeletionResponseSchema.parse(result.response);
  });

  server.post("/v1/package-sources/admit", async (request, reply) => {
    const admissionRequest = parseRequestInput(
      packageSourceAdmissionRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected schema."
      }
    );
    const inspection = await admitPackageSource(admissionRequest);

    if (!inspection.validation.ok) {
      reply.status(400);
    }

    return packageSourceInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/graph", async () =>
    graphInspectionResponseSchema.parse(await getGraphInspection())
  );

  server.get("/v1/graph/revisions", async () =>
    graphRevisionListResponseSchema.parse(await listGraphRevisions())
  );

  server.get("/v1/graph/revisions/:revisionId", async (request, reply) => {
    const params = request.params as { revisionId: string };
    const inspection = await getGraphRevision(params.revisionId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Graph revision '${params.revisionId}' was not found.`
      });
    }

    return graphRevisionInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/nodes", async () =>
    nodeListResponseSchema.parse(await listNodeInspections())
  );

  server.post("/v1/nodes", async (request, reply) => {
    const mutation = parseRequestInput(nodeCreateRequestSchema, request.body, {
      detailsKey: "bodyIssues",
      message: "Request body did not match the expected managed-node create schema."
    });
    const result = await createManagedNode(mutation);

    if (!result.ok) {
      throwForManagedNodeMutationConflict(result.conflict);
    }

    if (!result.response.validation.ok) {
      reply.status(400);
    }

    return nodeMutationResponseSchema.parse(result.response);
  });

  server.get("/v1/nodes/:nodeId", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getNodeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Managed node '${params.nodeId}' was not found in the active graph.`
      });
    }

    return nodeInspectionResponseSchema.parse(inspection);
  });

  server.patch("/v1/nodes/:nodeId", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const replacement = parseRequestInput(
      nodeReplacementRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message:
          "Request body did not match the expected managed-node replacement schema."
      }
    );
    const result = await replaceManagedNode(params.nodeId, replacement);

    if (!result.ok) {
      throwForManagedNodeMutationConflict(result.conflict);
    }

    if (!result.response.validation.ok) {
      reply.status(400);
    }

    return nodeMutationResponseSchema.parse(result.response);
  });

  server.delete("/v1/nodes/:nodeId", async (request) => {
    const params = request.params as { nodeId: string };
    const result = await deleteManagedNode(params.nodeId);

    if (!result.ok) {
      throwForManagedNodeMutationConflict(result.conflict);
    }

    return nodeDeletionResponseSchema.parse(result.response);
  });

  server.get("/v1/edges", async () =>
    edgeListResponseSchema.parse(await listEdges())
  );

  server.post("/v1/edges", async (request, reply) => {
    const mutation = parseRequestInput(edgeCreateRequestSchema, request.body, {
      detailsKey: "bodyIssues",
      message: "Request body did not match the expected edge create schema."
    });
    const result = await createEdge(mutation);

    if (!result.ok) {
      throwForEdgeMutationConflict(result.conflict);
    }

    if (!result.response.validation.ok) {
      reply.status(400);
    }

    return edgeMutationResponseSchema.parse(result.response);
  });

  server.patch("/v1/edges/:edgeId", async (request, reply) => {
    const params = request.params as { edgeId: string };
    const replacement = parseRequestInput(
      edgeReplacementRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected edge replacement schema."
      }
    );
    const result = await replaceEdge(params.edgeId, replacement);

    if (!result.ok) {
      throwForEdgeMutationConflict(result.conflict);
    }

    if (!result.response.validation.ok) {
      reply.status(400);
    }

    return edgeMutationResponseSchema.parse(result.response);
  });

  server.delete("/v1/edges/:edgeId", async (request) => {
    const params = request.params as { edgeId: string };
    const result = await deleteEdge(params.edgeId);

    if (!result.ok) {
      throwForEdgeMutationConflict(result.conflict);
    }

    return edgeDeletionResponseSchema.parse(result.response);
  });

  server.post("/v1/graph/validate", async (request) =>
    graphMutationResponseSchema.parse(await validateGraphCandidate(request.body))
  );

  server.put("/v1/graph", async (request, reply) => {
    const mutation = await applyGraph(request.body);

    if (!mutation.validation.ok) {
      reply.status(400);
    }

    return graphMutationResponseSchema.parse(mutation);
  });

  server.get("/v1/runtimes", async () =>
    runtimeListResponseSchema.parse(await listRuntimeInspections())
  );

  server.get("/v1/runtimes/:nodeId", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    return runtimeInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/runtimes/:nodeId/context", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const runtimeContext = await getRuntimeContext(params.nodeId);

    if (!runtimeContext) {
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeContextInspectionResponseSchema.parse(runtimeContext);
  });

  server.get("/v1/runtimes/:nodeId/bootstrap-bundle", async (request, reply) => {
    if (!operatorAuthRequired) {
      throw new HostHttpError({
        code: "conflict",
        message:
          "Runtime bootstrap bundle export requires a configured Host operator token so the Host API request is authenticated.",
        statusCode: 409
      });
    }

    const params = request.params as { nodeId: string };
    const bootstrapBundle = await getRuntimeBootstrapBundle(params.nodeId);

    if (!bootstrapBundle) {
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeBootstrapBundleResponseSchema.parse(bootstrapBundle);
  });

  server.get("/v1/runtimes/:nodeId/identity-secret", async (request, reply) => {
    if (!operatorAuthRequired) {
      throw new HostHttpError({
        code: "conflict",
        message:
          "Runtime identity secret export requires a configured Host operator token so the Host API request is authenticated.",
        statusCode: 409
      });
    }

    const params = request.params as { nodeId: string };
    const identitySecret = await getRuntimeIdentitySecret({
      nodeId: params.nodeId
    });

    if (!identitySecret) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message:
          `Runtime '${params.nodeId}' was not found as an assignable node in the active graph.`
      });
    }

    return runtimeIdentitySecretResponseSchema.parse(identitySecret);
  });

  server.get("/v1/runtimes/:nodeId/turns", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const turns = await listRuntimeTurns(params.nodeId);

    if (!turns) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeTurnListResponseSchema.parse(turns);
  });

  server.get("/v1/runtimes/:nodeId/turns/:turnId", async (request, reply) => {
    const params = request.params as { nodeId: string; turnId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const turnInspection = await getRuntimeTurnInspection({
      nodeId: params.nodeId,
      turnId: params.turnId
    });

    if (!turnInspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Turn '${params.turnId}' was not found for runtime '${params.nodeId}'.`
      });
    }

    return runtimeTurnInspectionResponseSchema.parse(turnInspection);
  });

  server.get("/v1/runtimes/:nodeId/artifacts", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const artifacts = await listRuntimeArtifacts(params.nodeId);

    if (!artifacts) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeArtifactListResponseSchema.parse(artifacts);
  });

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/preview",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactPreview = await getRuntimeArtifactPreview({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!artifactPreview) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactPreviewResponseSchema.parse(artifactPreview);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/history",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const query = parseRequestInput(
        runtimeArtifactHistoryQuerySchema,
        request.query,
        {
          detailsKey: "queryIssues",
          message: "Request query did not match the expected schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactHistory = await getRuntimeArtifactHistory({
        artifactId: params.artifactId,
        limit: query.limit,
        nodeId: params.nodeId
      });

      if (!artifactHistory) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactHistoryResponseSchema.parse(artifactHistory);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/diff",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const query = parseRequestInput(runtimeArtifactDiffQuerySchema, request.query, {
        detailsKey: "queryIssues",
        message: "Request query did not match the expected schema."
      });
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactDiff = await getRuntimeArtifactDiff({
        artifactId: params.artifactId,
        fromCommit: query.fromCommit,
        nodeId: params.nodeId
      });

      if (!artifactDiff) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactDiffResponseSchema.parse(artifactDiff);
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/restore",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const body = parseRequestInput(
        runtimeArtifactRestoreRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message: "Request body did not match the expected artifact restore schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactInspection = await getRuntimeArtifactInspection({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!artifactInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            artifactId: params.artifactId,
            nodeId: params.nodeId
          },
          message:
            `Artifact restore for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId = await publishRuntimeArtifactRestoreCommandFromHost(
        options,
        {
          artifactRef: artifactInspection.artifact.ref,
          assignment,
          ...(body.reason ? { reason: body.reason } : {}),
          ...(body.requestedBy ? { requestedBy: body.requestedBy } : {}),
          ...(body.restoreId ? { restoreId: body.restoreId } : {})
        }
      );

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            artifactId: params.artifactId,
            nodeId: params.nodeId
          },
          message:
            "Federated artifact restore requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeArtifactRestoreResponseSchema.parse({
        artifactId: params.artifactId,
        assignmentId: assignment.assignmentId,
        commandId,
        nodeId: params.nodeId,
        requestedAt: new Date().toISOString(),
        status: "requested"
      });
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/source-change-proposal",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const body = parseRequestInput(
        runtimeArtifactSourceChangeProposalRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected artifact source-change proposal schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactInspection = await getRuntimeArtifactInspection({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!artifactInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            artifactId: params.artifactId,
            nodeId: params.nodeId
          },
          message:
            `Artifact source-change proposal for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const proposalCommand =
        await publishRuntimeArtifactSourceChangeProposalCommandFromHost(
          options,
          {
            artifactRef: artifactInspection.artifact.ref,
            assignment,
            overwrite: body.overwrite,
            ...(body.proposalId ? { proposalId: body.proposalId } : {}),
            ...(body.reason ? { reason: body.reason } : {}),
            ...(body.requestedBy ? { requestedBy: body.requestedBy } : {}),
            ...(body.targetPath ? { targetPath: body.targetPath } : {})
          }
        );

      if (!proposalCommand) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            artifactId: params.artifactId,
            nodeId: params.nodeId
          },
          message:
            "Federated artifact source-change proposal requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeArtifactSourceChangeProposalResponseSchema.parse({
        artifactId: params.artifactId,
        assignmentId: assignment.assignmentId,
        commandId: proposalCommand.commandId,
        nodeId: params.nodeId,
        proposalId: proposalCommand.proposalId,
        requestedAt: new Date().toISOString(),
        status: "requested",
        ...(body.targetPath ? { targetPath: body.targetPath } : {})
      });
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const artifactInspection = await getRuntimeArtifactInspection({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!artifactInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactInspectionResponseSchema.parse(artifactInspection);
    }
  );

  server.get("/v1/runtimes/:nodeId/memory", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const memoryInspection = await getRuntimeMemoryInspection(params.nodeId);

    if (!memoryInspection) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeMemoryInspectionResponseSchema.parse(memoryInspection);
  });

  server.get("/v1/runtimes/:nodeId/memory/page", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const query = parseRequestInput(runtimeMemoryPageQuerySchema, request.query, {
      detailsKey: "queryIssues",
      message: "Request query did not match the expected schema."
    });
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const pageInspection = await getRuntimeMemoryPageInspection({
      nodeId: params.nodeId,
      path: query.path
    });

    if (!pageInspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Memory page '${query.path}' was not found for runtime '${params.nodeId}'.`
      });
    }

    return runtimeMemoryPageInspectionResponseSchema.parse(pageInspection);
  });

  server.post(
    "/v1/runtimes/:nodeId/wiki/pages",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const body = parseRequestInput(
        runtimeWikiUpsertPageRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message: "Request body did not match the expected wiki page schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            `Wiki page mutation for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId = await publishRuntimeWikiUpsertPageCommandFromHost(options, {
        assignment,
        content: body.content,
        ...(body.expectedCurrentSha256
          ? { expectedCurrentSha256: body.expectedCurrentSha256 }
          : {}),
        mode: body.mode,
        path: body.path,
        ...(body.reason ? { reason: body.reason } : {}),
        ...(body.requestedBy ? { requestedBy: body.requestedBy } : {})
      });

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            "Federated wiki page mutation requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeWikiUpsertPageResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        commandId,
        ...(body.expectedCurrentSha256
          ? { expectedCurrentSha256: body.expectedCurrentSha256 }
          : {}),
        mode: body.mode,
        nodeId: params.nodeId,
        path: body.path,
        requestedAt: new Date().toISOString(),
        status: "requested"
      });
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/wiki/pages/batch",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const body = parseRequestInput(
        runtimeWikiUpsertPageBatchRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected wiki page batch schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            `Wiki page batch mutation for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const requestedAt = new Date().toISOString();
      const pages: RuntimeWikiUpsertPageResponse[] = [];

      for (const page of body.pages) {
        const commandId = await publishRuntimeWikiUpsertPageCommandFromHost(
          options,
          {
            assignment,
            content: page.content,
            ...(page.expectedCurrentSha256
              ? { expectedCurrentSha256: page.expectedCurrentSha256 }
              : {}),
            mode: page.mode,
            path: page.path,
            ...(page.reason ? { reason: page.reason } : {}),
            ...(page.requestedBy ? { requestedBy: page.requestedBy } : {})
          }
        );

        if (!commandId) {
          throw new HostHttpError({
            code: "conflict",
            details: {
              nodeId: params.nodeId
            },
            message:
              "Federated wiki page batch mutation requires an active Host control plane and relay configuration.",
            statusCode: 409
          });
        }

        pages.push({
          assignmentId: assignment.assignmentId,
          commandId,
          ...(page.expectedCurrentSha256
            ? { expectedCurrentSha256: page.expectedCurrentSha256 }
            : {}),
          mode: page.mode,
          nodeId: params.nodeId,
          path: page.path,
          requestedAt,
          status: "requested" as const
        });
      }

      return runtimeWikiUpsertPageBatchResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        nodeId: params.nodeId,
        pageCount: pages.length,
        pages,
        requestedAt,
        status: "requested"
      });
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/wiki-repository/publish",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const body = parseRequestInput(
        runtimeWikiPublishRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message: "Request body did not match the expected wiki publish schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            `Wiki publication for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId = await publishRuntimeWikiPublishCommandFromHost(options, {
        assignment,
        ...(body.reason ? { reason: body.reason } : {}),
        ...(body.requestedBy ? { requestedBy: body.requestedBy } : {}),
        retryFailedPublication: body.retryFailedPublication,
        ...(body.target ? { target: body.target } : {})
      });

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            "Federated wiki publication requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeWikiPublishResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        commandId,
        nodeId: params.nodeId,
        requestedAt: new Date().toISOString(),
        status: "requested"
      });
    }
  );

  server.get("/v1/runtimes/:nodeId/approvals", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const approvals = await listRuntimeApprovals(params.nodeId);

    if (!approvals) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeApprovalListResponseSchema.parse(approvals);
  });

  server.get(
    "/v1/runtimes/:nodeId/approvals/:approvalId",
    async (request, reply) => {
      const params = request.params as { approvalId: string; nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const approvalInspection = await getRuntimeApprovalInspection({
        approvalId: params.approvalId,
        nodeId: params.nodeId
      });

      if (!approvalInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Approval '${params.approvalId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeApprovalInspectionResponseSchema.parse(approvalInspection);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-change-candidates",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const candidates = await listRuntimeSourceChangeCandidates(params.nodeId);

      if (!candidates) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            inspection.reason ??
            `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
          statusCode: 409
        });
      }

      return runtimeSourceChangeCandidateListResponseSchema.parse(candidates);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-change-candidates/:candidateId/diff",
    async (request, reply) => {
      const params = request.params as { candidateId: string; nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const candidateDiff = await getRuntimeSourceChangeCandidateDiff({
        candidateId: params.candidateId,
        nodeId: params.nodeId
      });

      if (!candidateDiff) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source change candidate '${params.candidateId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceChangeCandidateDiffResponseSchema.parse(candidateDiff);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-change-candidates/:candidateId/file",
    async (request, reply) => {
      const params = request.params as { candidateId: string; nodeId: string };
      const query = parseRequestInput(
        runtimeSourceChangeCandidateFilePreviewQuerySchema,
        request.query,
        {
          detailsKey: "queryIssues",
          message: "Request query did not match the expected schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const filePreview = await getRuntimeSourceChangeCandidateFilePreview({
        candidateId: params.candidateId,
        nodeId: params.nodeId,
        path: query.path
      });

      if (!filePreview) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source change candidate '${params.candidateId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceChangeCandidateFilePreviewResponseSchema.parse(
        filePreview
      );
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-change-candidates/:candidateId",
    async (request, reply) => {
      const params = request.params as { candidateId: string; nodeId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const candidateInspection =
        await getRuntimeSourceChangeCandidateInspection({
          candidateId: params.candidateId,
          nodeId: params.nodeId
        });

      if (!candidateInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source change candidate '${params.candidateId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceChangeCandidateInspectionResponseSchema.parse(
        candidateInspection
      );
    }
  );

  server.get("/v1/runtimes/:nodeId/source-history", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
      });
    }

    const history = await listRuntimeSourceHistory(params.nodeId);

    if (!history) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    return runtimeSourceHistoryListResponseSchema.parse(history);
  });

  server.get(
    "/v1/runtimes/:nodeId/source-history-replays",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const query = parseRequestInput(
        runtimeSourceHistoryReplayListQuerySchema,
        request.query,
        {
          detailsKey: "queryIssues",
          message:
            "Query parameters did not match the expected source-history replay list schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const replays = await listRuntimeSourceHistoryReplays({
        nodeId: params.nodeId,
        ...(query.sourceHistoryId
          ? { sourceHistoryId: query.sourceHistoryId }
          : {})
      });

      if (!replays) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId
          },
          message:
            inspection.reason ??
            `Runtime '${params.nodeId}' does not currently have replay projection state.`,
          statusCode: 409
        });
      }

      return runtimeSourceHistoryReplayListResponseSchema.parse(replays);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-history-replays/:replayId",
    async (request, reply) => {
      const params = request.params as { nodeId: string; replayId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const replayInspection = await getRuntimeSourceHistoryReplayInspection({
        nodeId: params.nodeId,
        replayId: params.replayId
      });

      if (!replayInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history replay '${params.replayId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceHistoryReplayInspectionResponseSchema.parse(
        replayInspection
      );
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sourceHistoryId: string };
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const historyInspection = await getRuntimeSourceHistoryInspection({
        nodeId: params.nodeId,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!historyInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceHistoryInspectionResponseSchema.parse(
        historyInspection
      );
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId/publish",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sourceHistoryId: string };
      const body = parseRequestInput(
        runtimeSourceHistoryPublishRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message: "Request body did not match the expected source-history publish schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const historyInspection = await getRuntimeSourceHistoryInspection({
        nodeId: params.nodeId,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!historyInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            `Source history publication for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId =
        await publishRuntimeSourceHistoryPublishCommandFromHost(options, {
          ...(body.approvalId ? { approvalId: body.approvalId } : {}),
          assignment,
          ...(body.reason ? { reason: body.reason } : {}),
          ...(body.requestedBy ? { requestedBy: body.requestedBy } : {}),
          retryFailedPublication: body.retryFailedPublication,
          sourceHistoryId: params.sourceHistoryId,
          ...(body.target ? { target: body.target } : {})
        });

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            "Federated source-history publication requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeSourceHistoryPublishResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        commandId,
        nodeId: params.nodeId,
        requestedAt: new Date().toISOString(),
        sourceHistoryId: params.sourceHistoryId,
        status: "requested"
      });
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId/replay",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sourceHistoryId: string };
      const body = parseRequestInput(
        runtimeSourceHistoryReplayRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message: "Request body did not match the expected source-history replay schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const historyInspection = await getRuntimeSourceHistoryInspection({
        nodeId: params.nodeId,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!historyInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            `Source history replay for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId =
        await publishRuntimeSourceHistoryReplayCommandFromHost(options, {
          ...(body.approvalId ? { approvalId: body.approvalId } : {}),
          assignment,
          ...(body.reason ? { reason: body.reason } : {}),
          ...(body.replayedBy ? { replayedBy: body.replayedBy } : {}),
          ...(body.replayId ? { replayId: body.replayId } : {}),
          sourceHistoryId: params.sourceHistoryId
        });

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            "Federated source-history replay requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeSourceHistoryReplayResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        commandId,
        nodeId: params.nodeId,
        requestedAt: new Date().toISOString(),
        sourceHistoryId: params.sourceHistoryId,
        status: "requested"
      });
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId/reconcile",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sourceHistoryId: string };
      const body = parseRequestInput(
        runtimeSourceHistoryReconcileRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected source-history reconcile schema."
        }
      );
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const historyInspection = await getRuntimeSourceHistoryInspection({
        nodeId: params.nodeId,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!historyInspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      const assignment = selectFederatedRuntimeControlAssignment({
        assignments: (await listRuntimeAssignments()).assignments,
        nodeId: params.nodeId
      });

      if (!assignment) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            `Source history reconcile for runtime '${params.nodeId}' requires ` +
            "an accepted federated runner assignment.",
          statusCode: 409
        });
      }

      const commandId =
        await publishRuntimeSourceHistoryReconcileCommandFromHost(options, {
          ...(body.approvalId ? { approvalId: body.approvalId } : {}),
          assignment,
          ...(body.reason ? { reason: body.reason } : {}),
          ...(body.replayedBy ? { replayedBy: body.replayedBy } : {}),
          ...(body.replayId ? { replayId: body.replayId } : {}),
          sourceHistoryId: params.sourceHistoryId
        });

      if (!commandId) {
        throw new HostHttpError({
          code: "conflict",
          details: {
            nodeId: params.nodeId,
            sourceHistoryId: params.sourceHistoryId
          },
          message:
            "Federated source-history reconcile requires an active Host control plane and relay configuration.",
          statusCode: 409
        });
      }

      return runtimeSourceHistoryReconcileResponseSchema.parse({
        assignmentId: assignment.assignmentId,
        commandId,
        nodeId: params.nodeId,
        requestedAt: new Date().toISOString(),
        sourceHistoryId: params.sourceHistoryId,
        status: "requested"
      });
    }
  );

  server.get("/v1/runtimes/:nodeId/recovery", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const query = parseRequestInput(runtimeRecoveryListQuerySchema, request.query, {
      detailsKey: "queryIssues",
      message: "Request query did not match the expected schema."
    });
    const inspection = await getRuntimeRecoveryInspection({
      limit: query.limit ?? 50,
      nodeId: params.nodeId
    });

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime recovery history for '${params.nodeId}' was not found in current host state.`
      });
    }

    return runtimeRecoveryInspectionResponseSchema.parse(inspection);
  });

  server.put("/v1/runtimes/:nodeId/recovery-policy", async (request) => {
    const params = request.params as { nodeId: string };
    const policy = parseRequestInput(
      runtimeRecoveryPolicyMutationRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected schema."
      }
    );
    const inspection = await setRuntimeRecoveryPolicy({
      nodeId: params.nodeId,
      policy
    });

    if (!inspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    return runtimeRecoveryInspectionResponseSchema.parse(inspection);
  });

  server.get("/v1/sessions", async () =>
    sessionListResponseSchema.parse(await listSessions())
  );

  server.post("/v1/sessions/launch", async (request) => {
    const launchRequest = parseRequestInput(
      sessionLaunchRequestSchema,
      request.body,
      {
        detailsKey: "bodyIssues",
        message: "Request body did not match the expected schema."
      }
    );
    const inspection = await getRuntimeInspection(launchRequest.targetNodeId);

    if (!inspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${launchRequest.targetNodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (!inspection.contextAvailable) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: launchRequest.targetNodeId
        },
        message:
          inspection.reason ??
          `Runtime '${launchRequest.targetNodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    const [graphInspection, runtimeContext] = await Promise.all([
      getGraphInspection(),
      getRuntimeContext(launchRequest.targetNodeId)
    ]);

    if (!graphInspection.graph || !runtimeContext) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: launchRequest.targetNodeId
        },
        message:
          "Cannot launch a session without an active graph and a realizable target runtime context.",
        statusCode: 409
      });
    }

    try {
      const userNode = await getUserNodeSigningMaterial({
        graph: graphInspection.graph,
        ...(launchRequest.fromNodeId
          ? { nodeId: launchRequest.fromNodeId }
          : {})
      });

      return sessionLaunchResponseSchema.parse(
        await publishHostSessionLaunch({
          graph: graphInspection.graph,
          request: launchRequest,
          runtimeContext,
          userNode: {
            nodeId: userNode.identity.nodeId,
            publicKey: userNode.identity.publicKey,
            secretKey: userNode.secretKey
          }
        })
      );
    } catch (error: unknown) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: launchRequest.targetNodeId
        },
        message:
          error instanceof Error
            ? error.message
            : "Could not publish the launch request to the configured relay.",
        statusCode: 409
      });
    }
  });

  server.get("/v1/sessions/:sessionId", async (request, reply) => {
    const params = request.params as { sessionId: string };
    const inspection = await getSessionInspection(params.sessionId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Session '${params.sessionId}' was not found in the current host runtime state.`
      });
    }

    return sessionInspectionResponseSchema.parse(inspection);
  });

  server.post("/v1/sessions/:sessionId/cancel", async (request, reply) => {
    const params = request.params as { sessionId: string };
    const cancellationRequest = parseRequestInput(
      sessionCancellationMutationRequestSchema,
      request.body ?? {},
      {
        detailsKey: "bodyIssues",
        message:
          "Request body did not match the expected session cancellation schema."
      }
    );
    const cancellation = await requestSessionCancellationFromHost(options, {
      request: cancellationRequest,
      sessionId: params.sessionId
    });

    if (!cancellation) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message:
          `Session '${params.sessionId}' was not found in the current host runtime state ` +
          "and no target node ids were supplied."
      });
    }

    return sessionCancellationResponseSchema.parse(cancellation);
  });

  server.post(
    "/v1/runtimes/:nodeId/sessions/:sessionId/cancel",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sessionId: string };
      const cancellationRequest = parseRequestInput(
        sessionCancellationMutationRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected session cancellation schema."
        }
      );
      const cancellationRecord = await requestRuntimeSessionCancellationFromHost(
        options,
        {
          assignments: (await listRuntimeAssignments()).assignments,
          nodeId: params.nodeId,
          request: cancellationRequest,
          sessionId: params.sessionId
        }
      );

      if (!cancellationRecord) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

      const inspection = await getSessionInspection(params.sessionId);
      const cancellation = sessionCancellationResponseSchema.parse({
        cancellations: [cancellationRecord],
        ...(inspection ? { inspection } : {}),
        sessionId: params.sessionId
      });

      return sessionCancellationResponseSchema.parse(cancellation);
    }
  );

  server.post("/v1/runtimes/:nodeId/start", async (request) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (!inspection.contextAvailable) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    const assignment = selectFederatedRuntimeControlAssignment({
      assignments: (await listRuntimeAssignments()).assignments,
      nodeId: params.nodeId
    });
    const updatedInspection = await setRuntimeDesiredState(params.nodeId, "running");

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (assignment) {
      await publishRuntimeLifecycleCommandFromHost(options, {
        assignment,
        command: "start",
        reason: "Operator start requested through Host."
      });
    }

    return runtimeInspectionResponseSchema.parse(updatedInspection);
  });

  server.post("/v1/runtimes/:nodeId/stop", async (request) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    const assignment = selectFederatedRuntimeControlAssignment({
      assignments: (await listRuntimeAssignments()).assignments,
      nodeId: params.nodeId
    });
    const updatedInspection = await setRuntimeDesiredState(params.nodeId, "stopped");

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (assignment) {
      await publishRuntimeLifecycleCommandFromHost(options, {
        assignment,
        command: "stop",
        reason: "Operator stop requested through Host."
      });
    }

    return runtimeInspectionResponseSchema.parse(updatedInspection);
  });

  server.post("/v1/runtimes/:nodeId/restart", async (request) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (!inspection.contextAvailable) {
      throw new HostHttpError({
        code: "conflict",
        details: {
          nodeId: params.nodeId
        },
        message:
          inspection.reason ??
          `Runtime '${params.nodeId}' does not currently have a realizable runtime context.`,
        statusCode: 409
      });
    }

    const assignment = selectFederatedRuntimeControlAssignment({
      assignments: (await listRuntimeAssignments()).assignments,
      nodeId: params.nodeId
    });
    const updatedInspection = await restartRuntime(params.nodeId);

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
      });
    }

    if (assignment) {
      await publishRuntimeLifecycleCommandFromHost(options, {
        assignment,
        command: "restart",
        reason: "Operator restart requested through Host."
      });
    }

    return runtimeInspectionResponseSchema.parse(updatedInspection);
  });

  server.setErrorHandler((error, _request, reply) => {
    if (!reply.sent) {
      if (error instanceof HostHttpError) {
        reply.status(error.statusCode).send(buildErrorPayload(error));
        return;
      }

      if (error instanceof ZodError) {
        reply.status(500).send(
          hostErrorResponseSchema.parse({
            code: "internal_error",
            details: {
              issues: error.issues
            },
            message: "Host emitted a response that violated its declared contract."
          })
        );
        return;
      }

      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number" &&
        error.statusCode >= 400 &&
        error.statusCode < 500
          ? error.statusCode
          : 500;

      reply.status(statusCode).send(
        hostErrorResponseSchema.parse({
          code:
            statusCode === 404
              ? "not_found"
              : statusCode === 409
                ? "conflict"
                : statusCode === 401
                  ? "unauthorized"
                : statusCode < 500
                  ? "bad_request"
                  : "internal_error",
          message: error instanceof Error ? error.message : "Unknown host error"
        })
      );
    }
  });

  return server;
}

export async function startHostServer(): Promise<
  Awaited<ReturnType<typeof buildHostServer>>
> {
  const port = Number.parseInt(process.env.ENTANGLE_HOST_PORT ?? "7071", 10);
  await initializeHostState();
  let federatedRuntime: HostFederatedRuntime | undefined;
  const federatedControlRelayUrls = resolveHostFederatedRelayUrls(
    await getCatalogInspection()
  );

  try {
    recordHostFederatedControlObserveTransportHealth({
      relayUrls: federatedControlRelayUrls,
      status: federatedControlRelayUrls.length > 0 ? "not_started" : "disabled"
    });
    federatedRuntime = await startHostFederatedControlPlane({
      relayUrls: federatedControlRelayUrls
    });
    recordHostFederatedControlObserveTransportHealth({
      relayUrls: federatedRuntime?.relayUrls ?? federatedControlRelayUrls,
      status: federatedRuntime ? "subscribed" : "disabled",
      ...(federatedRuntime ? { subscribedAt: new Date().toISOString() } : {})
    });
  } catch (error) {
    recordHostFederatedControlObserveTransportHealth({
      lastFailureAt: new Date().toISOString(),
      lastFailureMessage:
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unknown federated control plane startup failure.",
      relayUrls: federatedControlRelayUrls,
      status: "degraded"
    });
    console.error("Failed to start Entangle federated control plane.", error);
  }

  const server = await buildHostServer({
    ...(federatedRuntime
      ? {
          federatedControlPlane: federatedRuntime.controlPlane,
          federatedControlRelayUrls: federatedRuntime.relayUrls
        }
      : {})
  }).catch(async (error: unknown) => {
    await federatedRuntime?.close();
    throw error;
  });

  if (federatedRuntime) {
    server.addHook("onClose", async () => {
      await federatedRuntime?.close();
      recordHostFederatedControlObserveTransportHealth({
        relayUrls: federatedRuntime?.relayUrls ?? federatedControlRelayUrls,
        status: "stopped"
      });
    });
  }

  try {
    await server.listen({
      host: "0.0.0.0",
      port
    });
  } catch (error) {
    await server.close();
    throw error;
  }

  return server;
}

if (isDirectExecution()) {
  startHostServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
