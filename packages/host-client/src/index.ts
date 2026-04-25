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
  graphInspectionResponseSchema,
  graphMutationResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostErrorResponseSchema,
  hostStatusResponseSchema,
  nodeCreateRequestSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  nodeReplacementRequestSchema,
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
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeRecoveryPolicyMutationRequestSchema,
  runtimeListResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceChangeCandidateReviewMutationRequestSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  sessionInspectionResponseSchema,
  sessionLaunchRequestSchema,
  sessionLaunchResponseSchema,
  sessionListResponseSchema,
  type CatalogInspectionResponse,
  type EdgeCreateRequest,
  type EdgeDeletionResponse,
  type EdgeListResponse,
  type EdgeMutationResponse,
  type EdgeReplacementRequest,
  type ExternalPrincipalDeletionResponse,
  type ExternalPrincipalInspectionResponse,
  type ExternalPrincipalListResponse,
  type ExternalPrincipalMutationRequest,
  type GraphInspectionResponse,
  type GraphMutationResponse,
  type GraphRevisionInspectionResponse,
  type GraphRevisionListResponse,
  type HostEventListResponse,
  type HostEventRecord,
  type HostStatusResponse,
  type NodeCreateRequest,
  type NodeDeletionResponse,
  type NodeInspectionResponse,
  type NodeListResponse,
  type NodeMutationResponse,
  type NodeReplacementRequest,
  type PackageSourceAdmissionRequest,
  type PackageSourceDeletionResponse,
  type PackageSourceInspectionResponse,
  type PackageSourceListResponse,
  type RuntimeApprovalInspectionResponse,
  type RuntimeApprovalListResponse,
  type RuntimeArtifactInspectionResponse,
  type RuntimeArtifactListResponse,
  type RuntimeArtifactPreviewResponse,
  type RuntimeContextInspectionResponse,
  type RuntimeInspectionResponse,
  type RuntimeMemoryInspectionResponse,
  type RuntimeMemoryPageInspectionResponse,
  type RuntimeRecoveryInspectionResponse,
  type RuntimeRecoveryPolicyMutationRequest,
  type RuntimeListResponse,
  type RuntimeSourceChangeCandidateDiffResponse,
  type RuntimeSourceChangeCandidateFilePreviewResponse,
  type RuntimeSourceChangeCandidateInspectionResponse,
  type RuntimeSourceChangeCandidateListResponse,
  type RuntimeSourceChangeCandidateReviewMutationRequest,
  type RuntimeTurnInspectionResponse,
  type RuntimeTurnListResponse,
  type SessionInspectionResponse,
  type SessionLaunchRequest,
  type SessionLaunchResponse,
  type SessionListResponse,
} from "@entangle/types";

type FetchResponse = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchRequest = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
};

type FetchLike = (input: string, init?: FetchRequest) => Promise<FetchResponse>;
type WebSocketMessageEvent = {
  data: unknown;
};
type WebSocketErrorEvent = {
  error?: unknown;
};
type WebSocketCloseEvent = {
  code?: number;
  reason?: string;
};
interface HostClientWebSocket {
  addEventListener(
    type: "close",
    listener: (event: WebSocketCloseEvent) => void
  ): void;
  addEventListener(
    type: "error",
    listener: (event: WebSocketErrorEvent) => void
  ): void;
  addEventListener(
    type: "message",
    listener: (event: WebSocketMessageEvent) => void
  ): void;
  addEventListener(type: "open", listener: () => void): void;
  close(code?: number, reason?: string): void;
}
type WebSocketFactory = (url: string) => HostClientWebSocket;

export interface HostClientOptions {
  authToken?: string;
  baseUrl: string;
  fetchImpl?: FetchLike;
  webSocketFactory?: WebSocketFactory;
}

export interface HostEventSubscriptionOptions {
  onClose?: (event: WebSocketCloseEvent) => void;
  onError?: (error: Error) => void;
  onEvent: (event: HostEventRecord) => void;
  onOpen?: () => void;
  replay?: number;
}

export interface HostEventSubscription {
  close(code?: number, reason?: string): void;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizeAuthToken(authToken: string | undefined): string | undefined {
  const normalizedToken = authToken?.trim();
  return normalizedToken && normalizedToken.length > 0
    ? normalizedToken
    : undefined;
}

function buildAuthenticatedRequest(
  request: FetchRequest | undefined,
  authToken: string | undefined
): FetchRequest | undefined {
  if (!authToken) {
    return request;
  }

  return {
    ...request,
    headers: {
      ...(request?.headers ?? {}),
      authorization: `Bearer ${authToken}`
    }
  };
}

function buildEventStreamUrl(
  baseUrl: string,
  replay: number,
  authToken: string | undefined
): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/events`;
  url.searchParams.set("replay", String(replay));

  if (authToken) {
    url.searchParams.set("access_token", authToken);
  }

  return url.toString();
}

function parseResponseBody(rawBody: string): unknown {
  if (rawBody.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function formatErrorBody(status: number, body: unknown): string {
  const parsedHostError = hostErrorResponseSchema.safeParse(body);

  if (parsedHostError.success) {
    return `Host request failed with ${status} [${parsedHostError.data.code}]: ${parsedHostError.data.message}`;
  }

  if (typeof body === "string") {
    return `Host request failed with ${status}: ${body}`;
  }

  return `Host request failed with ${status}: ${JSON.stringify(body, null, 2)}`;
}

function normalizeWebSocketMessageData(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    );
  }

  throw new Error("Unsupported host event message payload.");
}

function normalizeWebSocketError(event: WebSocketErrorEvent): Error {
  return event.error instanceof Error
    ? event.error
    : new Error("Host event stream reported an unexpected error.");
}

function normalizeWebSocketCloseEvent(
  event: WebSocketCloseEvent
): WebSocketCloseEvent {
  return {
    ...(event.code === undefined ? {} : { code: event.code }),
    ...(event.reason === undefined ? {} : { reason: event.reason })
  };
}

async function parseResponse<T>(
  response: FetchResponse,
  parser: { parse(input: unknown): T },
  options: {
    acceptedErrorStatuses?: number[];
  } = {}
): Promise<T> {
  const rawBody = await response.text();
  const body = parseResponseBody(rawBody);
  const acceptsCurrentErrorStatus =
    !response.ok &&
    options.acceptedErrorStatuses?.includes(response.status) === true;

  if (!response.ok && !acceptsCurrentErrorStatus) {
    throw new Error(formatErrorBody(response.status, body));
  }

  return parser.parse(body);
}

export function createHostClient(options: HostClientOptions) {
  const authToken = normalizeAuthToken(options.authToken);
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const webSocketFactory: WebSocketFactory =
    options.webSocketFactory ??
    ((url: string): HostClientWebSocket => {
      if (!globalThis.WebSocket) {
        throw new Error(
          "A WebSocket implementation is required to subscribe to Entangle host events."
        );
      }

      return new globalThis.WebSocket(url);
    });

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required to create an Entangle host client.");
  }

  const hostFetch: FetchLike = (input, init) =>
    fetchImpl(input, buildAuthenticatedRequest(init, authToken));

  return {
    async getHostStatus(): Promise<HostStatusResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/host/status`),
        hostStatusResponseSchema
      );
    },

    async listHostEvents(limit = 100): Promise<HostEventListResponse> {
      const url = new URL(`${baseUrl}/v1/events`);
      url.searchParams.set("limit", String(limit));

      return parseResponse(
        await hostFetch(url.toString()),
        hostEventListResponseSchema
      );
    },

    async getCatalog(): Promise<CatalogInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/catalog`),
        catalogInspectionResponseSchema
      );
    },

    async validateCatalog(catalog: unknown): Promise<CatalogInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/catalog/validate`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(catalog)
        }),
        catalogInspectionResponseSchema
      );
    },

    async applyCatalog(catalog: unknown): Promise<CatalogInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/catalog`, {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(catalog)
        }),
        catalogInspectionResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async listPackageSources(): Promise<PackageSourceListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/package-sources`),
        packageSourceListResponseSchema
      );
    },

    async listExternalPrincipals(): Promise<ExternalPrincipalListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/external-principals`),
        externalPrincipalListResponseSchema
      );
    },

    async getExternalPrincipal(
      principalId: string
    ): Promise<ExternalPrincipalInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/external-principals/${principalId}`),
        externalPrincipalInspectionResponseSchema
      );
    },

    async upsertExternalPrincipal(
      principal: ExternalPrincipalMutationRequest
    ): Promise<ExternalPrincipalInspectionResponse> {
      const canonicalPrincipal = externalPrincipalMutationRequestSchema.parse(principal);

      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/external-principals/${canonicalPrincipal.principalId}`,
          {
            method: "PUT",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(canonicalPrincipal)
          }
        ),
        externalPrincipalInspectionResponseSchema
      );
    },

    async deleteExternalPrincipal(
      principalId: string
    ): Promise<ExternalPrincipalDeletionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/external-principals/${principalId}`, {
          method: "DELETE"
        }),
        externalPrincipalDeletionResponseSchema
      );
    },

    async getPackageSource(
      packageSourceId: string
    ): Promise<PackageSourceInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/package-sources/${packageSourceId}`),
        packageSourceInspectionResponseSchema
      );
    },

    async admitPackageSource(
      request: PackageSourceAdmissionRequest
    ): Promise<PackageSourceInspectionResponse> {
      const canonicalRequest = packageSourceAdmissionRequestSchema.parse(request);

      return parseResponse(
        await hostFetch(`${baseUrl}/v1/package-sources/admit`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        packageSourceInspectionResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async deletePackageSource(
      packageSourceId: string
    ): Promise<PackageSourceDeletionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/package-sources/${packageSourceId}`, {
          method: "DELETE"
        }),
        packageSourceDeletionResponseSchema
      );
    },

    async getGraph(): Promise<GraphInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/graph`),
        graphInspectionResponseSchema
      );
    },

    async listGraphRevisions(): Promise<GraphRevisionListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/graph/revisions`),
        graphRevisionListResponseSchema
      );
    },

    async getGraphRevision(
      revisionId: string
    ): Promise<GraphRevisionInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/graph/revisions/${revisionId}`),
        graphRevisionInspectionResponseSchema
      );
    },

    async listNodes(): Promise<NodeListResponse> {
      return parseResponse(await hostFetch(`${baseUrl}/v1/nodes`), nodeListResponseSchema);
    },

    async getNode(nodeId: string): Promise<NodeInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/nodes/${nodeId}`),
        nodeInspectionResponseSchema
      );
    },

    async createNode(request: NodeCreateRequest): Promise<NodeMutationResponse> {
      const canonicalRequest = nodeCreateRequestSchema.parse(request);

      return parseResponse(
        await hostFetch(`${baseUrl}/v1/nodes`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        nodeMutationResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async replaceNode(
      nodeId: string,
      request: NodeReplacementRequest
    ): Promise<NodeMutationResponse> {
      const canonicalRequest = nodeReplacementRequestSchema.parse(request);

      return parseResponse(
        await hostFetch(`${baseUrl}/v1/nodes/${nodeId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        nodeMutationResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async deleteNode(nodeId: string): Promise<NodeDeletionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/nodes/${nodeId}`, {
          method: "DELETE"
        }),
        nodeDeletionResponseSchema
      );
    },

    async listEdges(): Promise<EdgeListResponse> {
      return parseResponse(await hostFetch(`${baseUrl}/v1/edges`), edgeListResponseSchema);
    },

    async createEdge(request: EdgeCreateRequest): Promise<EdgeMutationResponse> {
      const canonicalRequest = edgeCreateRequestSchema.parse(request);

      return parseResponse(
        await hostFetch(`${baseUrl}/v1/edges`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        edgeMutationResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async replaceEdge(
      edgeId: string,
      request: EdgeReplacementRequest
    ): Promise<EdgeMutationResponse> {
      const canonicalRequest = edgeReplacementRequestSchema.parse(request);

      return parseResponse(
        await hostFetch(`${baseUrl}/v1/edges/${edgeId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        edgeMutationResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async deleteEdge(edgeId: string): Promise<EdgeDeletionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/edges/${edgeId}`, {
          method: "DELETE"
        }),
        edgeDeletionResponseSchema
      );
    },

    async validateGraph(graph: unknown): Promise<GraphMutationResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/graph/validate`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(graph)
        }),
        graphMutationResponseSchema
      );
    },

    async applyGraph(graph: unknown): Promise<GraphMutationResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/graph`, {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(graph)
        }),
        graphMutationResponseSchema,
        { acceptedErrorStatuses: [400] }
      );
    },

    async listRuntimes(): Promise<RuntimeListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes`),
        runtimeListResponseSchema
      );
    },

    async getRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}`),
        runtimeInspectionResponseSchema
      );
    },

    async getRuntimeContext(
      nodeId: string
    ): Promise<RuntimeContextInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/context`),
        runtimeContextInspectionResponseSchema
      );
    },

    async listRuntimeTurns(nodeId: string): Promise<RuntimeTurnListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/turns`),
        runtimeTurnListResponseSchema
      );
    },

    async getRuntimeTurn(
      nodeId: string,
      turnId: string
    ): Promise<RuntimeTurnInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/turns/${turnId}`),
        runtimeTurnInspectionResponseSchema
      );
    },

    async listRuntimeArtifacts(nodeId: string): Promise<RuntimeArtifactListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/artifacts`),
        runtimeArtifactListResponseSchema
      );
    },

    async getRuntimeArtifact(
      nodeId: string,
      artifactId: string
    ): Promise<RuntimeArtifactInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/artifacts/${artifactId}`),
        runtimeArtifactInspectionResponseSchema
      );
    },

    async getRuntimeArtifactPreview(
      nodeId: string,
      artifactId: string
    ): Promise<RuntimeArtifactPreviewResponse> {
      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/artifacts/${artifactId}/preview`
        ),
        runtimeArtifactPreviewResponseSchema
      );
    },

    async getRuntimeMemory(
      nodeId: string
    ): Promise<RuntimeMemoryInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/memory`),
        runtimeMemoryInspectionResponseSchema
      );
    },

    async getRuntimeMemoryPage(
      nodeId: string,
      pagePath: string
    ): Promise<RuntimeMemoryPageInspectionResponse> {
      const url = new URL(`${baseUrl}/v1/runtimes/${nodeId}/memory/page`);
      url.searchParams.set("path", pagePath);

      return parseResponse(
        await hostFetch(url.toString()),
        runtimeMemoryPageInspectionResponseSchema
      );
    },

    async listRuntimeApprovals(nodeId: string): Promise<RuntimeApprovalListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/approvals`),
        runtimeApprovalListResponseSchema
      );
    },

    async getRuntimeApproval(
      nodeId: string,
      approvalId: string
    ): Promise<RuntimeApprovalInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/approvals/${approvalId}`),
        runtimeApprovalInspectionResponseSchema
      );
    },

    async listRuntimeSourceChangeCandidates(
      nodeId: string
    ): Promise<RuntimeSourceChangeCandidateListResponse> {
      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/source-change-candidates`
        ),
        runtimeSourceChangeCandidateListResponseSchema
      );
    },

    async getRuntimeSourceChangeCandidate(
      nodeId: string,
      candidateId: string
    ): Promise<RuntimeSourceChangeCandidateInspectionResponse> {
      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/source-change-candidates/${candidateId}`
        ),
        runtimeSourceChangeCandidateInspectionResponseSchema
      );
    },

    async getRuntimeSourceChangeCandidateDiff(
      nodeId: string,
      candidateId: string
    ): Promise<RuntimeSourceChangeCandidateDiffResponse> {
      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/source-change-candidates/${candidateId}/diff`
        ),
        runtimeSourceChangeCandidateDiffResponseSchema
      );
    },

    async getRuntimeSourceChangeCandidateFilePreview(
      nodeId: string,
      candidateId: string,
      filePath: string
    ): Promise<RuntimeSourceChangeCandidateFilePreviewResponse> {
      const query = new URLSearchParams({ path: filePath });

      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/source-change-candidates/${candidateId}/file?${query.toString()}`
        ),
        runtimeSourceChangeCandidateFilePreviewResponseSchema
      );
    },

    async reviewRuntimeSourceChangeCandidate(
      nodeId: string,
      candidateId: string,
      review: RuntimeSourceChangeCandidateReviewMutationRequest
    ): Promise<RuntimeSourceChangeCandidateInspectionResponse> {
      const request =
        runtimeSourceChangeCandidateReviewMutationRequestSchema.parse(review);

      return parseResponse(
        await hostFetch(
          `${baseUrl}/v1/runtimes/${nodeId}/source-change-candidates/${candidateId}/review`,
          {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify(request)
          }
        ),
        runtimeSourceChangeCandidateInspectionResponseSchema
      );
    },

    async getRuntimeRecovery(
      nodeId: string,
      limit = 50
    ): Promise<RuntimeRecoveryInspectionResponse> {
      const url = new URL(`${baseUrl}/v1/runtimes/${nodeId}/recovery`);
      url.searchParams.set("limit", String(limit));

      return parseResponse(
        await hostFetch(url.toString()),
        runtimeRecoveryInspectionResponseSchema
      );
    },

    async setRuntimeRecoveryPolicy(
      nodeId: string,
      policy: RuntimeRecoveryPolicyMutationRequest
    ): Promise<RuntimeRecoveryInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/recovery-policy`, {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(
            runtimeRecoveryPolicyMutationRequestSchema.parse(policy)
          )
        }),
        runtimeRecoveryInspectionResponseSchema
      );
    },

    async listSessions(): Promise<SessionListResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/sessions`),
        sessionListResponseSchema
      );
    },

    async getSession(sessionId: string): Promise<SessionInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/sessions/${sessionId}`),
        sessionInspectionResponseSchema
      );
    },

    async launchSession(
      request: SessionLaunchRequest
    ): Promise<SessionLaunchResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/sessions/launch`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(sessionLaunchRequestSchema.parse(request))
        }),
        sessionLaunchResponseSchema
      );
    },

    async startRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/start`, {
          method: "POST"
        }),
        runtimeInspectionResponseSchema
      );
    },

    async stopRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/stop`, {
          method: "POST"
        }),
        runtimeInspectionResponseSchema
      );
    },

    async restartRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await hostFetch(`${baseUrl}/v1/runtimes/${nodeId}/restart`, {
          method: "POST"
        }),
        runtimeInspectionResponseSchema
      );
    },

    subscribeToEvents(
      options: HostEventSubscriptionOptions
    ): HostEventSubscription {
      const socket = webSocketFactory(
        buildEventStreamUrl(baseUrl, options.replay ?? 0, authToken)
      );

      socket.addEventListener("open", () => {
        options.onOpen?.();
      });
      socket.addEventListener("message", (event: WebSocketMessageEvent) => {
        try {
          options.onEvent(
            hostEventRecordSchema.parse(
              parseResponseBody(normalizeWebSocketMessageData(event.data))
            )
          );
        } catch (error: unknown) {
          options.onError?.(
            error instanceof Error
              ? error
              : new Error("Failed to parse host event payload.")
          );
        }
      });
      socket.addEventListener("error", (event: WebSocketErrorEvent) => {
        options.onError?.(normalizeWebSocketError(event));
      });
      socket.addEventListener("close", (event: WebSocketCloseEvent) => {
        options.onClose?.(normalizeWebSocketCloseEvent(event));
      });

      return {
        close(code?: number, reason?: string) {
          socket.close(code, reason);
        }
      };
    }
  };
}

export {
  filterHostEvents,
  hostEventMatchesFilter,
  runtimeRecoveryEventTypePrefixes,
  runtimeTraceEventTypePrefixes,
  type HostEventFilter
} from "./event-inspection.js";
export {
  formatHostStatusDetailLines,
  formatHostStatusLabel,
  formatHostStatusReconciliationSummary,
  formatHostStatusSessionDiagnosticsSummary
} from "./host-status.js";
export {
  buildGraphDiff,
  type ChangedGraphEdgeSummary,
  type ChangedGraphNodeSummary,
  type GraphDiffSummary,
  type GraphEdgeSummary,
  type GraphEntityChangeSummary,
  type GraphNodeSummary
} from "./graph-diff.js";
export {
  formatGraphEdgeDetail,
  formatGraphEdgeLabel,
  formatGraphRevisionDetail,
  formatGraphRevisionInspectionSummary,
  formatGraphRevisionLabel,
  formatManagedNodeDetail,
  formatManagedNodeLabel,
  sortGraphEdges,
  sortGraphRevisions,
  sortManagedGraphNodes,
  sortNodeInspectionsForPresentation
} from "./graph-presentation.js";
export {
  filterRuntimeApprovalsForPresentation,
  formatRuntimeApprovalDetailLines,
  formatRuntimeApprovalLabel,
  formatRuntimeApprovalStatus,
  sortRuntimeApprovalsForPresentation,
  type RuntimeApprovalPresentationFilterOptions
} from "./runtime-approval.js";
export {
  filterRuntimeArtifactsForPresentation,
  formatRuntimeArtifactDetailLines,
  formatRuntimeArtifactLabel,
  formatRuntimeArtifactLocator,
  formatRuntimeArtifactStatus,
  sortRuntimeArtifactsForPresentation,
  type RuntimeArtifactPresentationFilterOptions
} from "./runtime-artifact.js";
export {
  collectRuntimeRecoveryEvents,
  describeRuntimeRecoveryController,
  describeRuntimeRecoveryPolicy,
  formatRuntimeRecoveryEventLabel,
  formatRuntimeRecoveryRecordDetailLines,
  formatRuntimeRecoveryRecordLabel
} from "./runtime-recovery.js";
export {
  formatRuntimeInspectionDetailLines,
  formatRuntimeInspectionLabel,
  formatRuntimeInspectionStatus,
  formatRuntimeWorkspaceHealthSummary,
  sortRuntimeInspectionsForPresentation
} from "./runtime-inspection.js";
export {
  formatRuntimeMemoryPageDetail,
  formatRuntimeMemoryPageLabel,
  sortRuntimeMemoryPagesForPresentation
} from "./runtime-memory.js";
export {
  collectExternalPrincipalReferenceNodeIds,
  collectPackageSourceReferenceNodeIds,
  formatExternalPrincipalDetail,
  formatExternalPrincipalLabel,
  formatExternalPrincipalReferenceSummary,
  formatPackageSourceDetail,
  formatPackageSourceOptionLabel,
  formatPackageSourceReferenceSummary,
  sortExternalPrincipalInspections,
  sortPackageSourceInspections
} from "./resource-inventory.js";
export {
  collectRuntimeTraceEvents,
  describeRuntimeTraceEvent,
  formatRuntimeTraceEventLabel,
  type RuntimeTraceEventPresentation
} from "./runtime-trace.js";
export {
  collectHostSessionInspectionTraceIds,
  countHostSessionApprovalStatusRecords,
  countHostSessionConsistencyFindings,
  countHostSessionConversationStatusRecords,
  filterHostSessionsForNode,
  formatHostSessionDetail,
  formatHostSessionApprovalStatusDetail,
  formatHostSessionApprovalStatusSummary,
  formatHostSessionConsistencyFinding,
  formatHostSessionConsistencySummary,
  formatHostSessionConversationStatusDetail,
  formatHostSessionConversationStatusSummary,
  formatHostSessionInspectionNodeDetail,
  formatHostSessionInspectionNodeLabel,
  formatHostSessionLabel,
  resolveHostSessionApprovalStatusCounts,
  resolveHostSessionConversationStatusCounts,
  sessionInspectionReferencesNode,
  sortHostSessionInspectionNodes,
  sortHostSessionSummariesForPresentation
} from "./runtime-session.js";
export {
  formatSourceChangeSummary,
  formatRuntimeTurnArtifactSummary,
  formatRuntimeTurnDetailLines,
  formatRuntimeTurnLabel,
  formatRuntimeTurnStatus,
  sortRuntimeTurnsForPresentation
} from "./runtime-turn.js";
export {
  filterRuntimeSourceChangeCandidatesForPresentation,
  formatRuntimeSourceChangeCandidateDetailLines,
  formatRuntimeSourceChangeCandidateDiffStatus,
  formatRuntimeSourceChangeCandidateFilePreviewStatus,
  formatRuntimeSourceChangeCandidateLabel,
  formatRuntimeSourceChangeCandidateStatus,
  sortRuntimeSourceChangeCandidatesForPresentation,
  type RuntimeSourceChangeCandidateFilter
} from "./runtime-source-change-candidate.js";
