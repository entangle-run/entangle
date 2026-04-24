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
  externalPrincipalInspectionResponseSchema,
  externalPrincipalListResponseSchema,
  externalPrincipalMutationRequestSchema,
  graphMutationResponseSchema,
  graphInspectionResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  type HostEventRecord,
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
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryListQuerySchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeListResponseSchema,
  sessionInspectionResponseSchema,
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
  deleteManagedNode,
  getNodeInspection,
  getRuntimeContext,
  getRuntimeInspection,
  getRuntimeRecoveryInspection,
  getExternalPrincipalInspection,
  listRuntimeArtifacts,
  listHostEvents,
  getCatalogInspection,
  getGraphInspection,
  getGraphRevision,
  listExternalPrincipals,
  listEdges,
  listGraphRevisions,
  listNodeInspections,
  getPackageSourceInspection,
  getSessionInspection,
  initializeHostState,
  listRuntimeInspections,
  listSessions,
  listPackageSources,
  restartRuntime,
  replaceEdge,
  replaceManagedNode,
  setRuntimeDesiredState,
  setRuntimeRecoveryPolicy,
  subscribeToHostEvents,
  upsertExternalPrincipal,
  validateCatalogCandidate,
  validateGraphCandidate
} from "./state.js";

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
