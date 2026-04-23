import {
  catalogInspectionResponseSchema,
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
  packageSourceAdmissionRequestSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeListResponseSchema,
  type CatalogInspectionResponse,
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
  type PackageSourceAdmissionRequest,
  type PackageSourceInspectionResponse,
  type PackageSourceListResponse,
  type RuntimeArtifactListResponse,
  type RuntimeContextInspectionResponse,
  type RuntimeInspectionResponse,
  type RuntimeListResponse,
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

function buildEventStreamUrl(baseUrl: string, replay: number): string {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/v1/events`;
  url.searchParams.set("replay", String(replay));
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
    acceptErrorStatus?: boolean;
  } = {}
): Promise<T> {
  const rawBody = await response.text();
  const body = parseResponseBody(rawBody);

  if (!response.ok && !options.acceptErrorStatus) {
    throw new Error(formatErrorBody(response.status, body));
  }

  return parser.parse(body);
}

export function createHostClient(options: HostClientOptions) {
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

  return {
    async getHostStatus(): Promise<HostStatusResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/host/status`),
        hostStatusResponseSchema
      );
    },

    async listHostEvents(limit = 100): Promise<HostEventListResponse> {
      const url = new URL(`${baseUrl}/v1/events`);
      url.searchParams.set("limit", String(limit));

      return parseResponse(
        await fetchImpl(url.toString()),
        hostEventListResponseSchema
      );
    },

    async getCatalog(): Promise<CatalogInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/catalog`),
        catalogInspectionResponseSchema
      );
    },

    async validateCatalog(catalog: unknown): Promise<CatalogInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/catalog/validate`, {
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
        await fetchImpl(`${baseUrl}/v1/catalog`, {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(catalog)
        }),
        catalogInspectionResponseSchema,
        { acceptErrorStatus: true }
      );
    },

    async listPackageSources(): Promise<PackageSourceListResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/package-sources`),
        packageSourceListResponseSchema
      );
    },

    async listExternalPrincipals(): Promise<ExternalPrincipalListResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/external-principals`),
        externalPrincipalListResponseSchema
      );
    },

    async getExternalPrincipal(
      principalId: string
    ): Promise<ExternalPrincipalInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/external-principals/${principalId}`),
        externalPrincipalInspectionResponseSchema
      );
    },

    async upsertExternalPrincipal(
      principal: ExternalPrincipalMutationRequest
    ): Promise<ExternalPrincipalInspectionResponse> {
      const canonicalPrincipal = externalPrincipalMutationRequestSchema.parse(principal);

      return parseResponse(
        await fetchImpl(
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

    async getPackageSource(
      packageSourceId: string
    ): Promise<PackageSourceInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/package-sources/${packageSourceId}`),
        packageSourceInspectionResponseSchema
      );
    },

    async admitPackageSource(
      request: PackageSourceAdmissionRequest
    ): Promise<PackageSourceInspectionResponse> {
      const canonicalRequest = packageSourceAdmissionRequestSchema.parse(request);

      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/package-sources/admit`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(canonicalRequest)
        }),
        packageSourceInspectionResponseSchema,
        { acceptErrorStatus: true }
      );
    },

    async getGraph(): Promise<GraphInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/graph`),
        graphInspectionResponseSchema
      );
    },

    async listGraphRevisions(): Promise<GraphRevisionListResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/graph/revisions`),
        graphRevisionListResponseSchema
      );
    },

    async getGraphRevision(
      revisionId: string
    ): Promise<GraphRevisionInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/graph/revisions/${revisionId}`),
        graphRevisionInspectionResponseSchema
      );
    },

    async validateGraph(graph: unknown): Promise<GraphMutationResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/graph/validate`, {
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
        await fetchImpl(`${baseUrl}/v1/graph`, {
          method: "PUT",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(graph)
        }),
        graphMutationResponseSchema,
        { acceptErrorStatus: true }
      );
    },

    async listRuntimes(): Promise<RuntimeListResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes`),
        runtimeListResponseSchema
      );
    },

    async getRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes/${nodeId}`),
        runtimeInspectionResponseSchema
      );
    },

    async getRuntimeContext(
      nodeId: string
    ): Promise<RuntimeContextInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes/${nodeId}/context`),
        runtimeContextInspectionResponseSchema
      );
    },

    async listRuntimeArtifacts(nodeId: string): Promise<RuntimeArtifactListResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes/${nodeId}/artifacts`),
        runtimeArtifactListResponseSchema
      );
    },

    async startRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes/${nodeId}/start`, {
          method: "POST"
        }),
        runtimeInspectionResponseSchema
      );
    },

    async stopRuntime(nodeId: string): Promise<RuntimeInspectionResponse> {
      return parseResponse(
        await fetchImpl(`${baseUrl}/v1/runtimes/${nodeId}/stop`, {
          method: "POST"
        }),
        runtimeInspectionResponseSchema
      );
    },

    subscribeToEvents(
      options: HostEventSubscriptionOptions
    ): HostEventSubscription {
      const socket = webSocketFactory(
        buildEventStreamUrl(baseUrl, options.replay ?? 0)
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
