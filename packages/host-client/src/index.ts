import {
  catalogInspectionResponseSchema,
  graphInspectionResponseSchema,
  graphMutationResponseSchema,
  hostStatusResponseSchema,
  packageSourceAdmissionRequestSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema,
  type CatalogInspectionResponse,
  type GraphInspectionResponse,
  type GraphMutationResponse,
  type HostStatusResponse,
  type PackageSourceAdmissionRequest,
  type PackageSourceInspectionResponse,
  type PackageSourceListResponse,
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

async function parseResponse<T>(
  response: FetchResponse,
  parser: { parse(input: unknown): T },
  options: {
    acceptErrorStatus?: boolean;
  } = {}
): Promise<T> {
  const body = await response.json();

  if (!response.ok && !options.acceptErrorStatus) {
    throw new Error(
      `Host request failed with ${response.status}: ${JSON.stringify(body, null, 2)}`
    );
  }

  return parser.parse(body);
}

export function createHostClient(options: HostClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl =
    options.fetchImpl ?? ((globalThis.fetch as FetchLike | undefined) ?? null);

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
    }
  };
}
