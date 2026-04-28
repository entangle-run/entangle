import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

type DockerHttpMethod = "DELETE" | "GET" | "POST";

export type DockerEngineConnection =
  | {
      kind: "socket";
      socketPath: string;
    }
  | {
      baseUrl: URL;
      kind: "url";
    };

export type DockerContainerInspect = {
  Config: {
    Env: string[];
    Image: string;
    Labels: Record<string, string>;
  };
  Id: string;
  Name: string;
  State: {
    ExitCode: number;
    OOMKilled: boolean;
    Running: boolean;
    StartedAt: string;
    Status: string;
  };
};

export type DockerContainerMount =
  | {
      readOnly?: boolean;
      source: string;
      target: string;
      type: "bind";
    }
  | {
      readOnly?: boolean;
      source: string;
      target: string;
      type: "volume";
    };

export type DockerContainerPortBinding = {
  containerPort: number;
  hostIp?: string | undefined;
  hostPort: number;
  protocol: "tcp";
};

export type DockerCreateContainerInput = {
  containerName: string;
  env: string[];
  image: string;
  labels: Record<string, string>;
  mounts: DockerContainerMount[];
  networkName: string | undefined;
  ports?: DockerContainerPortBinding[] | undefined;
};

type DockerApiVersionResponse = {
  ApiVersion?: string;
};

type DockerCreateContainerResponse = {
  Id: string;
};

type DockerErrorPayload = {
  message?: string;
};

type DockerRequestOptions = {
  allowNotFound?: boolean;
  body?: unknown;
  method: DockerHttpMethod;
  path: string;
  query?: Record<string, boolean | number | string | undefined>;
  skipApiVersionPrefix?: boolean;
};

export interface DockerEngineApi {
  createContainer(input: DockerCreateContainerInput): Promise<string>;
  inspectContainer(containerName: string): Promise<DockerContainerInspect | undefined>;
  inspectImage(imageName: string): Promise<boolean>;
  removeContainer(containerName: string): Promise<void>;
  startContainer(containerName: string): Promise<void>;
}

export class DockerEngineError extends Error {
  readonly responseBody: unknown;
  readonly statusCode: number;

  constructor(
    message: string,
    options: {
      responseBody: unknown;
      statusCode: number;
    }
  ) {
    super(message);
    this.name = "DockerEngineError";
    this.responseBody = options.responseBody;
    this.statusCode = options.statusCode;
  }
}

function normalizeDockerApiVersion(input: string | undefined): string | undefined {
  if (!input) {
    return undefined;
  }

  const normalized = input.trim().replace(/^v/i, "");
  return normalized.length > 0 ? normalized : undefined;
}

function parseDockerHostUrl(input: string | undefined): URL | undefined {
  if (!input) {
    return undefined;
  }

  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

function resolveDockerEngineConnection(): DockerEngineConnection {
  const explicitSocket = process.env.ENTANGLE_DOCKER_SOCKET_PATH?.trim();

  if (explicitSocket) {
    return {
      kind: "socket",
      socketPath: explicitSocket
    };
  }

  const dockerHostUrl =
    parseDockerHostUrl(process.env.ENTANGLE_DOCKER_HOST_URL?.trim()) ??
    parseDockerHostUrl(process.env.DOCKER_HOST?.trim());

  if (dockerHostUrl) {
    if (dockerHostUrl.protocol === "unix:") {
      return {
        kind: "socket",
        socketPath:
          decodeURIComponent(dockerHostUrl.pathname) || "/var/run/docker.sock"
      };
    }

    if (
      dockerHostUrl.protocol === "http:" ||
      dockerHostUrl.protocol === "https:" ||
      dockerHostUrl.protocol === "tcp:"
    ) {
      const baseUrl =
        dockerHostUrl.protocol === "tcp:"
          ? new URL(
              dockerHostUrl.href.replace(/^tcp:/, "http:")
            )
          : dockerHostUrl;
      return {
        baseUrl,
        kind: "url"
      };
    }
  }

  return {
    kind: "socket",
    socketPath: "/var/run/docker.sock"
  };
}

function buildQueryString(
  query: Record<string, boolean | number | string | undefined> | undefined
): string {
  if (!query) {
    return "";
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "undefined") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const encoded = searchParams.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

function parseDockerResponseBody(bodyText: string): unknown {
  if (bodyText.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
}

function formatDockerErrorMessage(
  statusCode: number,
  body: unknown,
  fallbackMessage: string
): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const dockerMessage = (body as DockerErrorPayload).message;

    if (typeof dockerMessage === "string" && dockerMessage.trim().length > 0) {
      return dockerMessage;
    }
  }

  return `${fallbackMessage} (status ${statusCode})`;
}

export class DockerEngineClient implements DockerEngineApi {
  private apiVersionPrefixPromise: Promise<string> | undefined;
  private readonly configuredApiVersion = normalizeDockerApiVersion(
    process.env.ENTANGLE_DOCKER_API_VERSION?.trim()
  );
  private readonly connection: DockerEngineConnection;

  constructor(connection: DockerEngineConnection = resolveDockerEngineConnection()) {
    this.connection = connection;
  }

  async inspectImage(imageName: string): Promise<boolean> {
    const inspection = await this.request<unknown>({
      allowNotFound: true,
      method: "GET",
      path: `/images/${encodeURIComponent(imageName)}/json`
    });

    return typeof inspection !== "undefined";
  }

  inspectContainer(
    containerName: string
  ): Promise<DockerContainerInspect | undefined> {
    return this.request<DockerContainerInspect>({
      allowNotFound: true,
      method: "GET",
      path: `/containers/${encodeURIComponent(containerName)}/json`
    });
  }

  async createContainer(input: DockerCreateContainerInput): Promise<string> {
    const portEntries =
      input.ports?.map((port) => {
        const key = `${port.containerPort}/${port.protocol}`;

        return [
          key,
          [
            {
              HostIp: port.hostIp ?? "",
              HostPort: String(port.hostPort)
            }
          ]
        ] as const;
      }) ?? [];
    const portBindings =
      portEntries.length > 0 ? Object.fromEntries(portEntries) : undefined;
    const exposedPorts =
      portEntries.length > 0
        ? Object.fromEntries(portEntries.map(([key]) => [key, {}]))
        : undefined;

    const response = await this.request<DockerCreateContainerResponse>({
      body: {
        ...(exposedPorts ? { ExposedPorts: exposedPorts } : {}),
        Env: input.env,
        HostConfig: {
          Mounts: input.mounts.map((mount) => ({
            ReadOnly: mount.readOnly ?? false,
            Source: mount.source,
            Target: mount.target,
            Type: mount.type
          })),
          NetworkMode: input.networkName,
          ...(portBindings ? { PortBindings: portBindings } : {})
        },
        Image: input.image,
        Labels: input.labels
      },
      method: "POST",
      path: "/containers/create",
      query: {
        name: input.containerName
      }
    });

    return response.Id;
  }

  startContainer(containerName: string): Promise<void> {
    return this.request<void>({
      method: "POST",
      path: `/containers/${encodeURIComponent(containerName)}/start`
    });
  }

  removeContainer(containerName: string): Promise<void> {
    return this.request<void>({
      allowNotFound: true,
      method: "DELETE",
      path: `/containers/${encodeURIComponent(containerName)}`,
      query: {
        force: true
      }
    });
  }

  private async getApiVersionPrefix(): Promise<string> {
    if (this.configuredApiVersion) {
      return `/v${this.configuredApiVersion}`;
    }

    if (!this.apiVersionPrefixPromise) {
      this.apiVersionPrefixPromise = (async () => {
        const version = await this.request<DockerApiVersionResponse>({
          method: "GET",
          path: "/version",
          skipApiVersionPrefix: true
        });
        const normalized = normalizeDockerApiVersion(version.ApiVersion);
        return normalized ? `/v${normalized}` : "";
      })();
    }

    return this.apiVersionPrefixPromise;
  }

  private async request<T>(options: DockerRequestOptions): Promise<T> {
    const prefix = options.skipApiVersionPrefix
      ? ""
      : await this.getApiVersionPrefix();
    const requestPath = `${prefix}${options.path}${buildQueryString(options.query)}`;
    const bodyText =
      typeof options.body === "undefined"
        ? undefined
        : JSON.stringify(options.body);

    const response = await new Promise<{
      body: string;
      statusCode: number;
    }>((resolve, reject) => {
      const requestOptions =
        this.connection.kind === "socket"
          ? {
              headers: bodyText
                ? {
                    "content-length": Buffer.byteLength(bodyText).toString(),
                    "content-type": "application/json"
                  }
                : undefined,
              method: options.method,
              path: requestPath,
              socketPath: this.connection.socketPath
            }
          : {
              headers: bodyText
                ? {
                    "content-length": Buffer.byteLength(bodyText).toString(),
                    "content-type": "application/json"
                  }
                : undefined,
              hostname: this.connection.baseUrl.hostname,
              method: options.method,
              path: requestPath,
              port:
                this.connection.baseUrl.port.length > 0
                  ? Number(this.connection.baseUrl.port)
                  : this.connection.baseUrl.protocol === "https:"
                    ? 443
                    : 80,
              protocol:
                this.connection.baseUrl.protocol === "https:"
                  ? "https:"
                  : "http:"
            };

      const requestFactory =
        this.connection.kind === "socket" ||
        this.connection.baseUrl.protocol === "http:"
          ? http.request
          : https.request;

      const request = requestFactory(requestOptions, (responseStream) => {
        const buffers: Buffer[] = [];
        responseStream.on("data", (chunk: Buffer | string) => {
          buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        responseStream.on("end", () => {
          resolve({
            body: Buffer.concat(buffers).toString("utf8"),
            statusCode: responseStream.statusCode ?? 500
          });
        });
      });

      request.on("error", reject);

      if (bodyText) {
        request.write(bodyText);
      }

      request.end();
    });

    if (options.allowNotFound && response.statusCode === 404) {
      return undefined as T;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const parsedBody = parseDockerResponseBody(response.body);
      throw new DockerEngineError(
        formatDockerErrorMessage(
          response.statusCode,
          parsedBody,
          `Docker API request ${options.method} ${options.path} failed`
        ),
        {
          responseBody: parsedBody,
          statusCode: response.statusCode
        }
      );
    }

    return parseDockerResponseBody(response.body) as T;
  }
}
