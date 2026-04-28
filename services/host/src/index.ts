import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  catalogInspectionResponseSchema,
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
  type RuntimeAssignmentRecord,
  runtimeAssignmentInspectionResponseSchema,
  runtimeAssignmentListResponseSchema,
  runtimeAssignmentOfferRequestSchema,
  runtimeAssignmentOfferResponseSchema,
  runtimeAssignmentRevokeRequestSchema,
  runtimeAssignmentRevokeResponseSchema,
  hostAuthorityExportResponseSchema,
  hostAuthorityImportRequestSchema,
  hostAuthorityImportResponseSchema,
  hostAuthorityInspectionResponseSchema,
  identifierSchema,
  nostrEventIdSchema,
  hostEventListQuerySchema,
  hostEventListResponseSchema,
  hostEventStreamQuerySchema,
  hostErrorResponseSchema,
  hostProjectionSnapshotSchema,
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
  runtimeArtifactPromotionListResponseSchema,
  runtimeArtifactPromotionRequestSchema,
  runtimeArtifactPromotionResponseSchema,
  runtimeArtifactRestoreListResponseSchema,
  runtimeArtifactRestoreRequestSchema,
  runtimeArtifactRestoreResponseSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  runtimeMemoryPageQuerySchema,
  runtimeWikiRepositoryPublicationListResponseSchema,
  runtimeWikiRepositoryPublicationRequestSchema,
  runtimeWikiRepositoryPublicationResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryListQuerySchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeListResponseSchema,
  runtimeSourceChangeCandidateApplyMutationRequestSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewQuerySchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryReplayListResponseSchema,
  runtimeSourceHistoryReplayRequestSchema,
  runtimeSourceHistoryReplayResponseSchema,
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
  applyRuntimeSourceChangeCandidate,
  applyCatalog,
  applyGraph,
  buildHostStatus,
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
  getRuntimeTurnInspection,
  getUserNodeConversation,
  getUserNodeIdentity,
  getUserNodeMessage,
  getUserNodeSigningMaterial,
  markUserNodeConversationRead,
  getExternalPrincipalInspection,
  listRuntimeArtifacts,
  listRuntimeArtifactRestores,
  listRuntimeArtifactRestoresForArtifact,
  listRuntimeApprovals,
  listRuntimeSourceChangeCandidates,
  listRuntimeSourceHistory,
  listRuntimeSourceHistoryReplays,
  listRuntimeSourceHistoryReplaysForEntry,
  listRuntimeWikiRepositoryPublications,
  listRuntimeTurns,
  listHostEvents,
  getCatalogInspection,
  getGraphInspection,
  getGraphRevision,
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
  listRuntimeArtifactPromotions,
  listRuntimeArtifactPromotionsForArtifact,
  restartRuntime,
  promoteRuntimeArtifact,
  restoreRuntimeArtifact,
  replaceEdge,
  replaceManagedNode,
  offerRuntimeAssignment,
  publishRuntimeWikiRepository,
  replayRuntimeSourceHistory,
  requestRuntimeBoundSessionCancellation,
  requestSessionCancellation,
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
};

export type HostServerOptions = {
  federatedControlAuthRequired?: boolean;
  federatedControlPlane?: HostFederatedAssignmentPublisher;
  federatedControlRelayUrls?: string[];
};

function normalizeOperatorToken(token: string | undefined): string | undefined {
  const normalizedToken = token?.trim();
  return normalizedToken && normalizedToken.length > 0
    ? normalizedToken
    : undefined;
}

function extractBearerToken(authorization: string | undefined): string | undefined {
  const prefix = "Bearer ";

  if (!authorization?.startsWith(prefix)) {
    return undefined;
  }

  return normalizeOperatorToken(authorization.slice(prefix.length));
}

function extractWebSocketAccessToken(query: unknown): string | undefined {
  if (typeof query !== "object" || query === null || !("access_token" in query)) {
    return undefined;
  }

  const rawAccessToken = (query as { access_token?: unknown }).access_token;
  return typeof rawAccessToken === "string"
    ? normalizeOperatorToken(rawAccessToken)
    : undefined;
}

function isWebSocketUpgrade(upgrade: string | undefined): boolean {
  return upgrade?.toLowerCase() === "websocket";
}

function requestHasValidOperatorToken(input: {
  authorization: string | undefined;
  operatorToken: string;
  query: unknown;
  upgrade: string | undefined;
}): boolean {
  const bearerToken = extractBearerToken(input.authorization);

  if (bearerToken === input.operatorToken) {
    return true;
  }

  return (
    isWebSocketUpgrade(input.upgrade) &&
    extractWebSocketAccessToken(input.query) === input.operatorToken
  );
}

function normalizeOperatorId(operatorId: string | undefined): string {
  const normalizedOperatorId = operatorId?.trim();
  const parsedOperatorId = identifierSchema.safeParse(normalizedOperatorId);

  if (parsedOperatorId.success) {
    return parsedOperatorId.data;
  }

  return "bootstrap-operator";
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

export async function buildHostServer(options: HostServerOptions = {}) {
  const server = Fastify({
    logger: process.env.ENTANGLE_HOST_LOGGER === "false" ? false : true
  });
  const operatorToken = normalizeOperatorToken(
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN
  );
  await server.register(websocket);

  if (operatorToken) {
    const operatorId = normalizeOperatorId(process.env.ENTANGLE_HOST_OPERATOR_ID);

    server.addHook("preHandler", (request, reply, done) => {
      if (
        requestHasValidOperatorToken({
          authorization: request.headers.authorization,
          operatorToken,
          query: request.query,
          upgrade: request.headers.upgrade
        })
      ) {
        done();
        return;
      }

      reply.header("www-authenticate", "Bearer realm=\"entangle-host\"");
      reply.status(401).send(
        hostErrorResponseSchema.parse({
          code: "unauthorized",
          message: "Entangle host operator token is required."
        })
      );
    });

    server.addHook("onResponse", async (request, reply) => {
      const method = asHostOperatorRequestMethod(request.method);

      if (!method) {
        return;
      }

      const path = stripRequestQuery(request.url);

      try {
        await recordHostOperatorRequestCompleted({
          authMode: "bootstrap_operator_token",
          category: "security",
          message: `Host operator request '${method} ${path}' completed with status ${reply.statusCode}.`,
          method,
          operatorId,
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

  server.route({
    method: "GET",
    url: "/v1/events",
    handler: async (request) => {
      const query = parseRequestInput(hostEventListQuerySchema, request.query, {
        detailsKey: "queryIssues",
        message: "Request query did not match the expected schema."
      });

      return hostEventListResponseSchema.parse(
        await listHostEvents(query.limit ?? 100)
      );
    },
    wsHandler: (rawSocket, request) => {
      const socket = rawSocket as HostEventStreamSocket;

      if (
        operatorToken &&
        !requestHasValidOperatorToken({
          authorization: request.headers.authorization,
          operatorToken,
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
    if (!operatorToken) {
      throw new HostHttpError({
        code: "conflict",
        message:
          "Runtime bootstrap bundle export requires ENTANGLE_HOST_OPERATOR_TOKEN so the Host API request is authenticated.",
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
    if (!operatorToken) {
      throw new HostHttpError({
        code: "conflict",
        message:
          "Runtime identity secret export requires ENTANGLE_HOST_OPERATOR_TOKEN so the Host API request is authenticated.",
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

  server.get("/v1/runtimes/:nodeId/artifact-restores", async (request, reply) => {
    const params = request.params as { nodeId: string };
    const inspection = await getRuntimeInspection(params.nodeId);

    if (!inspection) {
      reply.status(404);
      return hostErrorResponseSchema.parse({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`
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

    const restores = await listRuntimeArtifactRestores(params.nodeId);

    if (!restores) {
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

    return runtimeArtifactRestoreListResponseSchema.parse(restores);
  });

  server.get(
    "/v1/runtimes/:nodeId/artifact-promotions",
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

      const promotions = await listRuntimeArtifactPromotions(params.nodeId);

      if (!promotions) {
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

      return runtimeArtifactPromotionListResponseSchema.parse(promotions);
    }
  );

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

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/restores",
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

      const restores = await listRuntimeArtifactRestoresForArtifact({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!restores) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactRestoreListResponseSchema.parse(restores);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/promotions",
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

      const promotions = await listRuntimeArtifactPromotionsForArtifact({
        artifactId: params.artifactId,
        nodeId: params.nodeId
      });

      if (!promotions) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactPromotionListResponseSchema.parse(promotions);
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/artifacts/:artifactId/promote",
    async (request, reply) => {
      const params = request.params as { artifactId: string; nodeId: string };
      const body = parseRequestInput(
        runtimeArtifactPromotionRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected artifact promotion schema."
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

      const artifactPromotion = await promoteRuntimeArtifact({
        artifactId: params.artifactId,
        nodeId: params.nodeId,
        request: body
      });

      if (!artifactPromotion) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message:
            `Artifact '${params.artifactId}' or requested restore was not found ` +
            `for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactPromotionResponseSchema.parse(artifactPromotion);
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
          message: "Request body did not match the expected schema."
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

      const artifactRestore = await restoreRuntimeArtifact({
        artifactId: params.artifactId,
        nodeId: params.nodeId,
        request: body
      });

      if (!artifactRestore) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Artifact '${params.artifactId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeArtifactRestoreResponseSchema.parse(artifactRestore);
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

  server.get(
    "/v1/runtimes/:nodeId/wiki-repository/publications",
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

      const publications =
        await listRuntimeWikiRepositoryPublications(params.nodeId);

      if (!publications) {
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

      return runtimeWikiRepositoryPublicationListResponseSchema.parse(
        publications
      );
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/wiki-repository/publish",
    async (request, reply) => {
      const params = request.params as { nodeId: string };
      const publish = parseRequestInput(
        runtimeWikiRepositoryPublicationRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected wiki-repository publication schema."
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

      const publishResult = await publishRuntimeWikiRepository({
        nodeId: params.nodeId,
        publish
      });

      if (!publishResult) {
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

      if (!publishResult.ok) {
        throw new HostHttpError({
          code: publishResult.code,
          message: publishResult.message,
          statusCode: 409
        });
      }

      return runtimeWikiRepositoryPublicationResponseSchema.parse(
        publishResult.publication
      );
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

  server.post(
    "/v1/runtimes/:nodeId/source-change-candidates/:candidateId/apply",
    async (request, reply) => {
      const params = request.params as { candidateId: string; nodeId: string };
      const apply = parseRequestInput(
        runtimeSourceChangeCandidateApplyMutationRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected source-change candidate application schema."
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

      const applyResult = await applyRuntimeSourceChangeCandidate({
        apply,
        candidateId: params.candidateId,
        nodeId: params.nodeId
      });

      if (!applyResult) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source change candidate '${params.candidateId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      if (!applyResult.ok) {
        throw new HostHttpError({
          code: applyResult.code,
          message: applyResult.message,
          statusCode: 409
        });
      }

      return runtimeSourceHistoryInspectionResponseSchema.parse(
        applyResult.history
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
      const inspection = await getRuntimeInspection(params.nodeId);

      if (!inspection) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
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

      const replays = await listRuntimeSourceHistoryReplays(params.nodeId);

      if (!replays) {
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

      return runtimeSourceHistoryReplayListResponseSchema.parse(replays);
    }
  );

  server.post(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId/replay",
    async (request, reply) => {
      const params = request.params as { nodeId: string; sourceHistoryId: string };
      const replay = parseRequestInput(
        runtimeSourceHistoryReplayRequestSchema,
        request.body ?? {},
        {
          detailsKey: "bodyIssues",
          message:
            "Request body did not match the expected source-history replay schema."
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

      const replayResult = await replayRuntimeSourceHistory({
        nodeId: params.nodeId,
        replay,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!replayResult) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceHistoryReplayResponseSchema.parse(replayResult);
    }
  );

  server.get(
    "/v1/runtimes/:nodeId/source-history/:sourceHistoryId/replays",
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

      const replays = await listRuntimeSourceHistoryReplaysForEntry({
        nodeId: params.nodeId,
        sourceHistoryId: params.sourceHistoryId
      });

      if (!replays) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Source history entry '${params.sourceHistoryId}' was not found for runtime '${params.nodeId}'.`
        });
      }

      return runtimeSourceHistoryReplayListResponseSchema.parse(replays);
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
    const cancellation = await requestSessionCancellation({
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
      const cancellation = await requestRuntimeBoundSessionCancellation({
        nodeId: params.nodeId,
        request: cancellationRequest,
        sessionId: params.sessionId
      });

      if (!cancellation) {
        reply.status(404);
        return hostErrorResponseSchema.parse({
          code: "not_found",
          message: `Runtime '${params.nodeId}' was not found in the active graph.`
        });
      }

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
