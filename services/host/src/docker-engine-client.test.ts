import http, { type RequestListener } from "node:http";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  DockerEngineClient,
  type DockerEngineConnection
} from "./docker-engine-client.js";

const tempDirectories: string[] = [];

async function createSocketServer(handler: RequestListener): Promise<{
  close: () => Promise<void>;
  socketPath: string;
}> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-docker-api-"));
  tempDirectories.push(tempRoot);
  const socketPath = path.join(tempRoot, "docker.sock");
  const server = http.createServer(handler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
    socketPath
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
});

describe("DockerEngineClient", () => {
  it("talks to the Docker Engine API over a unix socket with version discovery", async () => {
    const requests: Array<{
      body: unknown;
      method: string | undefined;
      url: string | undefined;
    }> = [];
    const server = await createSocketServer((request, response) => {
      const buffers: Buffer[] = [];
      request.on("data", (chunk: Buffer | string) => {
        buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      request.on("end", () => {
        const bodyText = Buffer.concat(buffers).toString("utf8");
        requests.push({
          body: bodyText.length > 0 ? JSON.parse(bodyText) : undefined,
          method: request.method,
          url: request.url
        });

        if (request.url === "/version" && request.method === "GET") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ ApiVersion: "1.51" }));
          return;
        }

        if (request.url === "/v1.51/images/entangle-runner%3Alocal/json") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ Id: "sha256:image" }));
          return;
        }

        if (request.url === "/v1.51/containers/runner/json") {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              Config: {
                Env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/state/context.json"],
                Image: "entangle-runner:local",
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
            })
          );
          return;
        }

        if (request.url === "/v1.51/containers/create?name=runner") {
          response.writeHead(201, { "content-type": "application/json" });
          response.end(JSON.stringify({ Id: "container-123" }));
          return;
        }

        if (request.url === "/v1.51/containers/runner/start") {
          response.writeHead(204);
          response.end();
          return;
        }

        if (request.url === "/v1.51/containers/runner?force=true") {
          response.writeHead(204);
          response.end();
          return;
        }

        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ message: "not found" }));
      });
    });

    try {
      const connection: DockerEngineConnection = {
        kind: "socket",
        socketPath: server.socketPath
      };
      const client = new DockerEngineClient(connection);

      await expect(client.inspectImage("entangle-runner:local")).resolves.toBe(true);
      await expect(client.inspectContainer("runner")).resolves.toMatchObject({
        Id: "container-123"
      });
      await expect(
        client.createContainer({
          containerName: "runner",
          env: ["ENTANGLE_RUNTIME_CONTEXT_PATH=/state/context.json"],
          image: "entangle-runner:local",
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
          networkName: "entangle-local"
        })
      ).resolves.toBe("container-123");
      await expect(client.startContainer("runner")).resolves.toBeUndefined();
      await expect(client.removeContainer("runner")).resolves.toBeUndefined();
    } finally {
      await server.close();
    }

    expect(requests.map((entry) => entry.url)).toEqual([
      "/version",
      "/v1.51/images/entangle-runner%3Alocal/json",
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
        NetworkMode: "entangle-local"
      },
      Image: "entangle-runner:local",
      Labels: {
        "io.entangle.graph_revision_id": "rev-1"
      }
    });
  });
});
