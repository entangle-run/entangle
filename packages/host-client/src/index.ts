import {
  catalogInspectionResponseSchema,
  graphInspectionResponseSchema,
  graphMutationResponseSchema,
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
  type GraphInspectionResponse,
  type GraphMutationResponse,
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

export interface HostClientOptions {
  baseUrl: string;
  fetchImpl?: FetchLike;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
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
    }
  };
}
