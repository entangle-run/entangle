import { EventEmitter } from "node:events";
import http, {
  type ClientRequest,
  type IncomingMessage,
  type RequestOptions
} from "node:http";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DockerEngineClient,
  type DockerEngineConnection
} from "./docker-engine-client.js";

type CapturedDockerRequest = {
  body: unknown;
  method: string | undefined;
  path: string | undefined;
  socketPath: string | undefined;
};

type DockerMockResponse = {
  body?: unknown;
  statusCode: number;
};

function installDockerRequestMock(
  handler: (request: CapturedDockerRequest) => DockerMockResponse
): CapturedDockerRequest[] {
  const requests: CapturedDockerRequest[] = [];

  vi.spyOn(http, "request").mockImplementation(
    ((
      options: RequestOptions,
      callback?: (response: IncomingMessage) => void
    ) => {
      const requestBodyChunks: Buffer[] = [];
      const request = new EventEmitter() as EventEmitter & {
        end: () => void;
        write: (chunk: Buffer | string) => boolean;
      };

      request.write = (chunk) => {
        requestBodyChunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        );
        return true;
      };

      request.end = () => {
        const bodyText = Buffer.concat(requestBodyChunks).toString("utf8");
        const capturedRequest: CapturedDockerRequest = {
          body: bodyText.length > 0 ? (JSON.parse(bodyText) as unknown) : undefined,
          method: options.method,
          path: typeof options.path === "string" ? options.path : undefined,
          socketPath: options.socketPath
        };
        requests.push(capturedRequest);

        const mockResponse = handler(capturedRequest);
        const responseStream = new PassThrough() as PassThrough & {
          statusCode: number;
        };
        responseStream.statusCode = mockResponse.statusCode;

        queueMicrotask(() => {
          callback?.(responseStream as IncomingMessage);
          responseStream.end(
            typeof mockResponse.body === "undefined"
              ? undefined
              : typeof mockResponse.body === "string"
                ? mockResponse.body
                : JSON.stringify(mockResponse.body)
          );
        });
      };

      return request as unknown as ClientRequest;
    }) as typeof http.request
  );

  return requests;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DockerEngineClient", () => {
  it("talks to the Docker Engine API over a unix socket with version discovery", async () => {
    const requests = installDockerRequestMock((request) => {
      expect(request.socketPath).toBe("/tmp/entangle-test-docker.sock");

      if (request.path === "/version" && request.method === "GET") {
        return {
          body: {
            ApiVersion: "1.51"
          },
          statusCode: 200
        };
      }

      if (request.path === "/v1.51/images/entangle-runner%3Afederated-dev/json") {
        return {
          body: {
            Id: "sha256:image"
          },
          statusCode: 200
        };
      }

      if (request.path === "/v1.51/containers/runner/json") {
        return {
          body: {
            Config: {
              Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/state/context.json"],
              Image: "entangle-runner:federated-dev",
              Labels: {
                "io.entangle.graph_revision_id": "rev-1",
                "io.entangle.runtime_context_path": "/state/context.json"
              }
            },
            Id: "container-123",
            Name: "/runner",
            State: {
              ExitCode: 0,
              OOMKilled: false,
              Running: true,
              StartedAt: "2026-04-22T00:00:00.000Z",
              Status: "running"
            }
          },
          statusCode: 200
        };
      }

      if (request.path === "/v1.51/containers/create?name=runner") {
        return {
          body: {
            Id: "container-123"
          },
          statusCode: 201
        };
      }

      if (request.path === "/v1.51/containers/runner/start") {
        return {
          statusCode: 204
        };
      }

      if (request.path === "/v1.51/containers/runner?force=true") {
        return {
          statusCode: 204
        };
      }

      return {
        body: {
          message: "not found"
        },
        statusCode: 404
      };
    });

    const connection: DockerEngineConnection = {
      kind: "socket",
      socketPath: "/tmp/entangle-test-docker.sock"
    };
    const client = new DockerEngineClient(connection);

    await expect(client.inspectImage("entangle-runner:federated-dev")).resolves.toBe(true);
    await expect(client.inspectContainer("runner")).resolves.toMatchObject({
      Id: "container-123"
    });
    await expect(
      client.createContainer({
        containerName: "runner",
        env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/state/context.json"],
        image: "entangle-runner:federated-dev",
        labels: {
          "io.entangle.graph_revision_id": "rev-1"
        },
        mounts: [
          {
            source: "entangle-state",
            target: "/entangle-state",
            type: "volume"
          }
        ],
        networkName: "entangle"
      })
    ).resolves.toBe("container-123");
    await expect(client.startContainer("runner")).resolves.toBeUndefined();
    await expect(client.removeContainer("runner")).resolves.toBeUndefined();

    expect(requests.map((entry) => entry.path)).toEqual([
      "/version",
      "/v1.51/images/entangle-runner%3Afederated-dev/json",
      "/v1.51/containers/runner/json",
      "/v1.51/containers/create?name=runner",
      "/v1.51/containers/runner/start",
      "/v1.51/containers/runner?force=true"
    ]);
    expect(requests[3]?.body).toMatchObject({
      Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/state/context.json"],
      HostConfig: {
        Mounts: [
          {
            Source: "entangle-state",
            Target: "/entangle-state",
            Type: "volume"
          }
        ],
        NetworkMode: "entangle"
      },
      Image: "entangle-runner:federated-dev",
      Labels: {
        "io.entangle.graph_revision_id": "rev-1"
      }
    });
  });
});
