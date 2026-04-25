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
  identifierSchema,
  hostEventListQuerySchema,
  hostEventListResponseSchema,
  hostEventStreamQuerySchema,
  hostErrorResponseSchema,
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
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryListQuerySchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeListResponseSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  sessionInspectionResponseSchema,
  sessionLaunchRequestSchema,
  sessionLaunchResponseSchema,
  sessionListResponseSchema
} from "@entangle/types";
import { ZodError, type ZodType } from "zod";
import {
  admitPackageSource,
  applyCatalog,
  applyGraph,
  buildHostStatus,
  createEdge,
  createManagedNode,
  deleteEdge,
  deleteExternalPrincipal,
  deleteManagedNode,
  deletePackageSource,
  getNodeInspection,
  getRuntimeContext,
  getRuntimeInspection,
  getRuntimeApprovalInspection,
  getRuntimeRecoveryInspection,
  getRuntimeTurnInspection,
  getExternalPrincipalInspection,
  listRuntimeArtifacts,
  listRuntimeApprovals,
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
  getSessionInspection,
  initializeHostState,
  listRuntimeInspections,
  listSessions,
  listPackageSources,
  getRuntimeArtifactPreview,
  restartRuntime,
  replaceEdge,
  replaceManagedNode,
  setRuntimeDesiredState,
  setRuntimeRecoveryPolicy,
  recordHostOperatorRequestCompleted,
  subscribeToHostEvents,
  upsertExternalPrincipal,
  validateCatalogCandidate,
  validateGraphCandidate
} from "./state.js";
import { publishHostSessionLaunch } from "./session-launch.js";

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

export async function buildHostServer() {
  const server = Fastify({
    logger: true
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

    const runtimeContext = await getRuntimeContext(params.nodeId);

    if (!runtimeContext) {
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
      return sessionLaunchResponseSchema.parse(
        await publishHostSessionLaunch({
          graph: graphInspection.graph,
          request: launchRequest,
          runtimeContext
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

    const updatedInspection = await setRuntimeDesiredState(params.nodeId, "running");

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
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

    const updatedInspection = await setRuntimeDesiredState(params.nodeId, "stopped");

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
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

    const updatedInspection = await restartRuntime(params.nodeId);

    if (!updatedInspection) {
      throw new HostHttpError({
        code: "not_found",
        message: `Runtime '${params.nodeId}' was not found in the active graph.`,
        statusCode: 404
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
  const server = await buildHostServer();

  await server.listen({
    host: "0.0.0.0",
    port
  });

  return server;
}

if (isDirectExecution()) {
  startHostServer().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
