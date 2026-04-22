import { hostStatusResponseSchema, type HostStatusResponse } from "@entangle/types";

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

export function createHostClient(options: HostClientOptions) {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl =
    options.fetchImpl ?? ((globalThis.fetch as FetchLike | undefined) ?? null);

  if (!fetchImpl) {
    throw new Error("A fetch implementation is required to create an Entangle host client.");
  }

  return {
    async getHostStatus(): Promise<HostStatusResponse> {
      const response = await fetchImpl(`${baseUrl}/v1/host/status`);

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Host status request failed with ${response.status}: ${body}`
        );
      }

      return hostStatusResponseSchema.parse(await response.json());
    }
  };
}
