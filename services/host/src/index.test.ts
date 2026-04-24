import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import { WebSocket } from "ws";
import type { RuntimeBackend } from "./runtime-backend.js";
import {
  artifactRecordSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  externalPrincipalInspectionResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostErrorResponseSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  packageSourceInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeListResponseSchema,
  sessionInspectionResponseSchema,
  sessionListResponseSchema
} from "@entangle/types";

const createdDirectories: string[] = [];

type TestWebSocket = {
  close(code?: number, reason?: string): void;
  once(event: "error", listener: (error: Error) => void): void;
  once(event: "open", listener: () => void): void;
  once(event: "message", listener: (payload: Buffer) => void): void;
  terminate(): void;
};

type TestWebSocketConstructor = new (url: string) => TestWebSocket;

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function secretRefStoragePath(secretRef: string): string {
  const parsed = new URL(secretRef);
  return path.join(
    process.env.ENTANGLE_SECRETS_HOME ?? "",
    "refs",
    parsed.hostname,
    ...parsed.pathname.split("/").filter(Boolean)
  );
}

async function writeSecretRefFile(
  secretRef: string,
  value = "secret-material\n"
): Promise<void> {
  const filePath = secretRefStoragePath(secretRef);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, {
    encoding: "utf8",
    mode: 0o600
  });
}

async function createAdmittedPackageDirectory(rootPath: string): Promise<string> {
  const packageRoot = path.join(rootPath, "packages", "worker-it");

  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "seed", "wiki"), { recursive: true }),
    mkdir(path.join(packageRoot, "memory", "schema"), { recursive: true })
  ]);

  await Promise.all([
    writeJsonFile(path.join(packageRoot, "manifest.json"), {
      schemaVersion: "1",
      packageId: "worker-it",
      name: "Worker IT",
      version: "0.1.0",
      packageKind: "template",
      defaultNodeKind: "worker",
      capabilities: [],
      entryPrompts: {
        system: "prompts/system.md",
        interaction: "prompts/interaction.md"
      },
      memoryProfile: {
        wikiSeedPath: "memory/seed/wiki",
        schemaPath: "memory/schema/AGENTS.md"
      },
      runtime: {
        configPath: "runtime/config.json",
        capabilitiesPath: "runtime/capabilities.json",
        toolsPath: "runtime/tools.json"
      },
      metadata: {
        description: "Worker package",
        tags: []
      }
    }),
    writeFile(path.join(packageRoot, "prompts", "system.md"), "# System\n", "utf8"),
    writeFile(
      path.join(packageRoot, "prompts", "interaction.md"),
      "# Interaction\n",
      "utf8"
    ),
    writeJsonFile(path.join(packageRoot, "runtime", "config.json"), {
      runtimeProfile: "hackathon_local",
      toolBudget: {
        maxToolTurns: 8,
        maxOutputTokens: 4096
      }
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "capabilities.json"), {
      capabilities: []
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "tools.json"), {
      schemaVersion: "1",
      tools: []
    }),
    writeFile(
      path.join(packageRoot, "memory", "seed", "wiki", "index.md"),
      "# Wiki Index\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "memory", "schema", "AGENTS.md"),
      "# Memory Rules\n",
      "utf8"
    )
  ]);

  return packageRoot;
}

function buildGitPrincipalRecord(
  overrides: Partial<{
    attributionEmail: string;
    displayName: string;
    gitServiceRef: string;
    principalId: string;
    secretRef: string;
    subject: string;
  }> = {}
) {
  return {
    principalId: overrides.principalId ?? "worker-it-git",
    displayName: overrides.displayName ?? "Worker IT Git Principal",
    systemKind: "git" as const,
    gitServiceRef: overrides.gitServiceRef ?? "local-gitea",
    subject: overrides.subject ?? "worker-it",
    transportAuthMode: "ssh_key" as const,
    secretRef: overrides.secretRef ?? "secret://git/worker-it/ssh",
    attribution: {
      displayName: "Worker IT",
      email: overrides.attributionEmail ?? "worker-it@entangle.local"
    },
    signing: {
      mode: "none" as const
    }
  };
}

async function createTestGiteaApiServer(options: {
  currentUserLogin?: string;
  existingRepositories?: Array<{
    owner: string;
    repositoryName: string;
  }>;
} = {}) {
  const server = Fastify();
  const repositories = new Set(
    (options.existingRepositories ?? []).map(
      ({ owner, repositoryName }) => `${owner}/${repositoryName}`
    )
  );
  const requests: Array<{
    authorization: string | undefined;
    body?: unknown;
    method: string;
    url: string;
  }> = [];
  const currentUserLogin = options.currentUserLogin ?? "operator";

  server.get("/api/v1/user", (request) => {
    requests.push({
      authorization:
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      method: "GET",
      url: request.url
    });

    return {
      login: currentUserLogin
    };
  });

  server.get("/api/v1/repos/:owner/:repo", async (request, reply) => {
    const params = request.params as { owner: string; repo: string };
    requests.push({
      authorization:
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      method: "GET",
      url: request.url
    });

    if (!repositories.has(`${params.owner}/${params.repo}`)) {
      reply.status(404);
      return {
        message: "repository not found"
      };
    }

    return {
      name: params.repo,
      owner: {
        login: params.owner
      }
    };
  });

  server.post("/api/v1/user/repos", async (request, reply) => {
    const body = request.body as { name: string };
    requests.push({
      authorization:
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      body,
      method: "POST",
      url: request.url
    });

    const repositoryKey = `${currentUserLogin}/${body.name}`;

    if (repositories.has(repositoryKey)) {
      reply.status(409);
      return {
        message: "repository already exists"
      };
    }

    repositories.add(repositoryKey);
    reply.status(201);
    return {
      name: body.name,
      owner: {
        login: currentUserLogin
      }
    };
  });

  server.post("/api/v1/orgs/:org/repos", async (request, reply) => {
    const params = request.params as { org: string };
    const body = request.body as { name: string };
    requests.push({
      authorization:
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined,
      body,
      method: "POST",
      url: request.url
    });

    const repositoryKey = `${params.org}/${body.name}`;

    if (repositories.has(repositoryKey)) {
      reply.status(409);
      return {
        message: "repository already exists"
      };
    }

    repositories.add(repositoryKey);
    reply.status(201);
    return {
      name: body.name,
      owner: {
        login: params.org
      }
    };
  });

  await server.listen({
    host: "127.0.0.1",
    port: 0
  });

  return {
    close: () => server.close(),
    requests,
    url: server.listeningOrigin
  };
}

function buildProvisioningCatalog(input: {
  apiBaseUrl: string;
  provisioningSecretRef?: string;
}) {
  return {
    schemaVersion: "1",
    catalogId: "local-catalog",
    relays: [
      {
        id: "local-relay",
        displayName: "Local Relay",
        readUrls: ["ws://relay.local"],
        writeUrls: ["ws://relay.local"],
        authMode: "none"
      }
    ],
    gitServices: [
      {
        id: "local-gitea",
        displayName: "Local Gitea",
        baseUrl: input.apiBaseUrl,
        remoteBase: "ssh://git@gitea.local:22",
        transportKind: "ssh",
        authMode: "ssh_key",
        defaultNamespace: "team-alpha",
        provisioning: {
          mode: "gitea_api",
          apiBaseUrl: `${input.apiBaseUrl}/api/v1`,
          secretRef:
            input.provisioningSecretRef ??
            "secret://git-services/local-gitea/provisioning"
        }
      }
    ],
    modelEndpoints: [
      {
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        authMode: "header_secret",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus"
      }
    ],
    defaults: {
      relayProfileRefs: ["local-relay"],
      gitServiceRef: "local-gitea",
      modelEndpointRef: "shared-model"
    }
  };
}

async function createTestServer(
  options: {
    includeModelEndpoint?: boolean;
    includeModelSecret?: boolean;
    runtimeBackend?: RuntimeBackend;
  } = {}
) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-host-"));
  createdDirectories.push(tempRoot);
  process.env.ENTANGLE_HOME = tempRoot;
  process.env.ENTANGLE_SECRETS_HOME = path.join(tempRoot, ".entangle-secrets");
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  const includeModelEndpoint = options.includeModelEndpoint ?? false;
  const includeModelSecret = options.includeModelSecret ?? includeModelEndpoint;
  process.env.ENTANGLE_DEFAULT_MODEL_ENDPOINT_ID = options.includeModelEndpoint
    ? "shared-model"
    : "";
  process.env.ENTANGLE_DEFAULT_MODEL_BASE_URL = options.includeModelEndpoint
    ? "https://api.anthropic.com"
    : "";
  process.env.ENTANGLE_DEFAULT_MODEL_SECRET_REF = options.includeModelEndpoint
    ? "secret://shared-model"
    : "";
  process.env.ENTANGLE_DEFAULT_MODEL_DEFAULT_MODEL = options.includeModelEndpoint
    ? "claude-opus"
    : "";

  if (includeModelSecret) {
    await writeSecretRefFile("secret://shared-model", "test-model-secret\n");
  }

  vi.resetModules();
  const [hostModule, stateModule] = await Promise.all([
    import("./index.js"),
    import("./state.js")
  ]);

  stateModule.configureRuntimeBackendForProcess(
    options.runtimeBackend ? () => options.runtimeBackend! : undefined
  );
  await stateModule.initializeHostState();

  return await hostModule.buildHostServer();
}

function createMockRuntimeBackend(
  reconcile: RuntimeBackend["reconcileRuntime"]
): RuntimeBackend {
  return {
    kind: "memory",
    reconcileRuntime: reconcile,
    removeInactiveRuntime: vi.fn(async () => {})
  };
}

async function admitPackageSource(
  server: Awaited<ReturnType<typeof createTestServer>>,
  packageDirectory: string
): Promise<string> {
  const admitResponse = await server.inject({
    method: "POST",
    payload: {
      sourceKind: "local_path",
      absolutePath: packageDirectory
    },
    url: "/v1/package-sources/admit"
  });

  expect(admitResponse.statusCode).toBe(200);

  return packageSourceInspectionResponseSchema.parse(admitResponse.json()).packageSource
    .packageSourceId;
}

async function readNextSocketEvent(
  socket: TestWebSocket
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    socket.once("message", (payload) => {
      resolve(JSON.parse(payload.toString("utf8")) as unknown);
    });
    socket.once("error", reject);
  });
}

async function openSocket(url: string): Promise<TestWebSocket> {
  const socket = new (WebSocket as unknown as TestWebSocketConstructor)(url);

  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => {
      resolve();
    });
    socket.once("error", reject);
  });

  return socket;
}

async function applySingleWorkerGraph(input: {
  packageSourceId: string;
  server: Awaited<ReturnType<typeof createTestServer>>;
}) {
  const response = await input.server.inject({
    method: "PUT",
    payload: {
      schemaVersion: "1",
      graphId: "team-alpha",
      name: "Team Alpha",
      nodes: [
        {
          nodeId: "user-main",
          displayName: "User",
          nodeKind: "user"
        },
        {
          nodeId: "worker-it",
          displayName: "Worker IT",
          nodeKind: "worker",
          packageSourceRef: input.packageSourceId,
          resourceBindings: {
            relayProfileRefs: [],
            gitServiceRefs: ["local-gitea"],
            primaryGitServiceRef: "local-gitea"
          }
        }
      ],
      edges: [
        {
          edgeId: "user-to-worker",
          fromNodeId: "user-main",
          toNodeId: "worker-it",
          relation: "delegates_to"
        }
      ]
    },
    url: "/v1/graph"
  });

  expect(response.statusCode).toBe(200);
}

afterEach(async () => {
  delete process.env.ENTANGLE_HOME;
  delete process.env.ENTANGLE_SECRETS_HOME;
  delete process.env.ENTANGLE_RUNTIME_BACKEND;
  delete process.env.ENTANGLE_DEFAULT_MODEL_ENDPOINT_ID;
  delete process.env.ENTANGLE_DEFAULT_MODEL_BASE_URL;
  delete process.env.ENTANGLE_DEFAULT_MODEL_SECRET_REF;
  delete process.env.ENTANGLE_DEFAULT_MODEL_DEFAULT_MODEL;
  delete process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE;
  delete process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE;
  vi.resetModules();

  await Promise.all(
    createdDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
});

describe("buildHostServer", () => {
  it("returns a structured 400 response for invalid package-source admission payloads", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path"
        },
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      expect(hostErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "bad_request"
      });
    } finally {
      await server.close();
    }
  });

  it("preserves malformed JSON body errors as 400 instead of collapsing them into 500", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        headers: {
          "content-type": "application/json"
        },
        method: "POST",
        payload: "{",
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      expect(hostErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "bad_request"
      });
    } finally {
      await server.close();
    }
  });

  it("rejects package admission when the required tool catalog file is missing", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await rm(path.join(packageDirectory, "runtime", "tools.json"));

      const response = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      const inspection = packageSourceInspectionResponseSchema.parse(response.json());
      expect(inspection.validation.ok).toBe(false);
      expect(inspection.validation.findings).toContainEqual(
        expect.objectContaining({
          code: "missing_package_file",
          path: ["runtime/tools.json"]
        })
      );
    } finally {
      await server.close();
    }
  });

  it("returns a structured 404 response when the requested package source does not exist", async () => {
    const server = await createTestServer();

    try {
      const response = await server.inject({
        method: "GET",
        url: "/v1/package-sources/missing-source"
      });

      expect(response.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "not_found",
        message: "Package source 'missing-source' was not found."
      });
    } finally {
      await server.close();
    }
  });

  it("creates and lists external principals through the host surface", async () => {
    const server = await createTestServer();

    try {
      const principal = buildGitPrincipalRecord();
      const upsertResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: `/v1/external-principals/${principal.principalId}`
      });

      expect(upsertResponse.statusCode).toBe(200);
      expect(
        externalPrincipalInspectionResponseSchema.parse(upsertResponse.json())
      ).toMatchObject({
        principal: {
          principalId: "worker-it-git",
          gitServiceRef: "local-gitea"
        }
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/external-principals"
      });

      expect(listResponse.statusCode).toBe(200);
      expect(listResponse.json()).toMatchObject({
        principals: [
          {
            principal: {
              principalId: "worker-it-git"
            }
          }
        ]
      });
    } finally {
      await server.close();
    }
  });

  it("lists typed host events over HTTP and streams them over the websocket surface", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=10"
      });

      expect(listResponse.statusCode).toBe(200);
      const listedEvents = hostEventListResponseSchema.parse(listResponse.json());
      expect(listedEvents.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "package_source.admitted"
          }),
          expect.objectContaining({
            type: "graph.revision.applied"
          })
        ])
      );

      const address = await server.listen({
        host: "127.0.0.1",
        port: 0
      });
      const socket = await openSocket(`${address.replace(/^http/, "ws")}/v1/events`);

      try {
        const upsertResponse = await server.inject({
          method: "PUT",
          payload: buildGitPrincipalRecord({
            principalId: "worker-it-git-stream"
          }),
          url: "/v1/external-principals/worker-it-git-stream"
        });

        expect(upsertResponse.statusCode).toBe(200);

        const liveEvent = hostEventRecordSchema.parse(
          await readNextSocketEvent(socket)
        );
        expect(liveEvent).toMatchObject({
          category: "control_plane",
          principalId: "worker-it-git-stream",
          type: "external_principal.updated"
        });
      } finally {
        socket.close();
      }
    } finally {
      await server.close();
    }
  });

  it("lists and inspects persisted graph revisions through the host boundary", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/graph/revisions"
      });

      expect(listResponse.statusCode).toBe(200);
      const listResponseBody: unknown = listResponse.json();
      const listedRevisions = graphRevisionListResponseSchema.parse(
        listResponseBody
      );
      expect(listedRevisions.revisions).toHaveLength(1);
      const [activeRevision] = listedRevisions.revisions;
      expect(activeRevision).toBeDefined();
      if (!activeRevision) {
        throw new Error("Expected one active graph revision.");
      }
      expect(activeRevision).toMatchObject({
        graphId: "team-alpha",
        isActive: true
      });

      const revisionId = activeRevision.revisionId;
      const revisionResponse = await server.inject({
        method: "GET",
        url: `/v1/graph/revisions/${revisionId}`
      });

      expect(revisionResponse.statusCode).toBe(200);
      const revisionResponseBody: unknown = revisionResponse.json();
      const revisionInspection = graphRevisionInspectionResponseSchema.parse(
        revisionResponseBody
      );
      expect(revisionInspection).toMatchObject({
        graph: {
          graphId: "team-alpha"
        },
        revision: {
          isActive: true,
          revisionId
        }
      });

      const missingRevisionResponse = await server.inject({
        method: "GET",
        url: "/v1/graph/revisions/missing-revision"
      });

      expect(missingRevisionResponse.statusCode).toBe(404);
      const missingRevisionErrorBody: unknown = missingRevisionResponse.json();
      const missingRevisionError = hostErrorResponseSchema.parse(
        missingRevisionErrorBody
      );
      expect(missingRevisionError).toMatchObject({
        code: "not_found"
      });
    } finally {
      await server.close();
    }
  });

  it("lists and inspects applied non-user node bindings through the host boundary", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes"
      });

      expect(listResponse.statusCode).toBe(200);
      const listResponseBody: unknown = listResponse.json();
      const listedNodes = nodeListResponseSchema.parse(listResponseBody);
      expect(listedNodes.nodes).toHaveLength(1);
      const [activeNode] = listedNodes.nodes;
      expect(activeNode).toBeDefined();
      if (!activeNode) {
        throw new Error("Expected one applied non-user node binding.");
      }
      expect(activeNode).toMatchObject({
        binding: {
          graphId: "team-alpha",
          node: {
            nodeId: "worker-it"
          }
        },
        runtime: {
          nodeId: "worker-it"
        }
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes/worker-it"
      });

      expect(inspectionResponse.statusCode).toBe(200);
      const inspectionResponseBody: unknown = inspectionResponse.json();
      const nodeInspection = nodeInspectionResponseSchema.parse(
        inspectionResponseBody
      );
      expect(nodeInspection.binding.bindingId).toContain("worker-it");
      expect(nodeInspection).toMatchObject({
        binding: {
          node: {
            displayName: "Worker IT",
            nodeId: "worker-it"
          }
        },
        runtime: {
          graphId: "team-alpha",
          nodeId: "worker-it"
        }
      });

      const missingNodeResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes/missing-node"
      });

      expect(missingNodeResponse.statusCode).toBe(404);
      const missingNodeBody: unknown = missingNodeResponse.json();
      const missingNodeError = hostErrorResponseSchema.parse(missingNodeBody);
      expect(missingNodeError).toMatchObject({
        code: "not_found"
      });
    } finally {
      await server.close();
    }
  });

  it("creates and deletes managed non-user nodes through resource-oriented host routes", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const createResponse = await server.inject({
        method: "POST",
        payload: {
          nodeId: "reviewer-it",
          displayName: "Reviewer IT",
          nodeKind: "reviewer",
          packageSourceRef: packageSourceId,
          resourceBindings: {
            relayProfileRefs: [],
            gitServiceRefs: ["local-gitea"],
            primaryGitServiceRef: "local-gitea"
          },
          autonomy: {
            canInitiateSessions: false,
            canMutateGraph: false
          }
        },
        url: "/v1/nodes"
      });

      expect(createResponse.statusCode).toBe(200);
      const createdNode = nodeMutationResponseSchema.parse(createResponse.json());
      expect(createdNode.validation.ok).toBe(true);
      expect(createdNode).toMatchObject({
        node: {
          binding: {
            node: {
              displayName: "Reviewer IT",
              nodeId: "reviewer-it"
            }
          }
        }
      });

      const createdListResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes"
      });

      expect(createdListResponse.statusCode).toBe(200);
      expect(nodeListResponseSchema.parse(createdListResponse.json()).nodes).toHaveLength(2);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: "/v1/nodes/reviewer-it"
      });

      expect(deleteResponse.statusCode).toBe(200);
      const deletedNode = nodeDeletionResponseSchema.parse(deleteResponse.json());
      expect(deletedNode.validation.ok).toBe(true);
      expect(deletedNode.deletedNodeId).toBe("reviewer-it");

      const deletedInspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes/reviewer-it"
      });

      expect(deletedInspectionResponse.statusCode).toBe(404);
      const deletedError = hostErrorResponseSchema.parse(
        deletedInspectionResponse.json()
      );
      expect(deletedError).toMatchObject({
        code: "not_found",
        message: "Managed node 'reviewer-it' was not found in the active graph."
      });

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      const events = hostEventListResponseSchema.parse(eventsResponse.json()).events;
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mutationKind: "created",
            nodeId: "reviewer-it",
            type: "node.binding.updated"
          }),
          expect.objectContaining({
            mutationKind: "deleted",
            nodeId: "reviewer-it",
            type: "node.binding.updated"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("replaces managed non-user node bindings through the host boundary", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const replaceResponse = await server.inject({
        method: "PATCH",
        payload: {
          displayName: "Worker IT Updated",
          nodeKind: "worker",
          packageSourceRef: packageSourceId,
          resourceBindings: {
            relayProfileRefs: [],
            gitServiceRefs: ["local-gitea"],
            primaryGitServiceRef: "local-gitea"
          },
          autonomy: {
            canInitiateSessions: true,
            canMutateGraph: false
          }
        },
        url: "/v1/nodes/worker-it"
      });

      expect(replaceResponse.statusCode).toBe(200);
      const replacedNode = nodeMutationResponseSchema.parse(replaceResponse.json());
      expect(replacedNode.validation.ok).toBe(true);
      expect(replacedNode).toMatchObject({
        node: {
          binding: {
            node: {
              displayName: "Worker IT Updated",
              nodeId: "worker-it"
            }
          }
        }
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/nodes/worker-it"
      });
      const inspection = nodeInspectionResponseSchema.parse(inspectionResponse.json());
      expect(inspection.binding.node.autonomy.canInitiateSessions).toBe(true);

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      const events = hostEventListResponseSchema.parse(eventsResponse.json()).events;
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mutationKind: "replaced",
            nodeId: "worker-it",
            type: "node.binding.updated"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("rejects managed node deletion while graph edges still reference the node", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: "/v1/nodes/worker-it"
      });

      expect(deleteResponse.statusCode).toBe(409);
      const conflict = hostErrorResponseSchema.parse(deleteResponse.json());
      expect(conflict).toMatchObject({
        code: "conflict",
        details: {
          edgeIds: ["user-to-worker"]
        }
      });
    } finally {
      await server.close();
    }
  });

  it("rejects managed node mutations when no active graph exists", async () => {
    const server = await createTestServer();

    try {
      const createResponse = await server.inject({
        method: "POST",
        payload: {
          nodeId: "worker-new",
          displayName: "Worker New",
          nodeKind: "worker"
        },
        url: "/v1/nodes"
      });

      expect(createResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(createResponse.json())).toMatchObject({
        code: "conflict"
      });
    } finally {
      await server.close();
    }
  });

  it("lists and mutates graph edges through the host boundary", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const createNodeResponse = await server.inject({
        method: "POST",
        payload: {
          autonomy: {
            canInitiateSessions: false,
            canMutateGraph: false
          },
          displayName: "Reviewer IT",
          nodeId: "reviewer-it",
          nodeKind: "reviewer",
          packageSourceRef: packageSourceId,
          resourceBindings: {
            gitServiceRefs: ["local-gitea"],
            primaryGitServiceRef: "local-gitea",
            relayProfileRefs: ["local-relay"]
          }
        },
        url: "/v1/nodes"
      });

      expect(createNodeResponse.statusCode).toBe(200);

      const initialEdgesResponse = await server.inject({
        method: "GET",
        url: "/v1/edges"
      });
      const initialEdges = edgeListResponseSchema.parse(initialEdgesResponse.json());
      expect(initialEdges.edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            edgeId: "user-to-worker",
            relation: "delegates_to"
          })
        ])
      );

      const createEdgeResponse = await server.inject({
        method: "POST",
        payload: {
          edgeId: "user-to-reviewer",
          fromNodeId: "user-main",
          relation: "consults",
          toNodeId: "reviewer-it"
        },
        url: "/v1/edges"
      });

      expect(createEdgeResponse.statusCode).toBe(200);
      const createdEdge = edgeMutationResponseSchema.parse(createEdgeResponse.json());
      expect(createdEdge.validation.ok).toBe(true);
      expect(createdEdge).toMatchObject({
        edge: {
          edgeId: "user-to-reviewer",
          relation: "consults"
        }
      });

      const replaceEdgeResponse = await server.inject({
        method: "PATCH",
        payload: {
          enabled: false,
          fromNodeId: "user-main",
          relation: "reviews",
          toNodeId: "reviewer-it",
          transportPolicy: {
            channel: "review",
            mode: "bidirectional_shared_set",
            relayProfileRefs: []
          }
        },
        url: "/v1/edges/user-to-reviewer"
      });

      expect(replaceEdgeResponse.statusCode).toBe(200);
      const replacedEdge = edgeMutationResponseSchema.parse(
        replaceEdgeResponse.json()
      );
      expect(replacedEdge.validation.ok).toBe(true);
      expect(replacedEdge).toMatchObject({
        edge: {
          edgeId: "user-to-reviewer",
          enabled: false,
          relation: "reviews",
          transportPolicy: {
            channel: "review"
          }
        }
      });

      const deleteEdgeResponse = await server.inject({
        method: "DELETE",
        url: "/v1/edges/user-to-reviewer"
      });

      expect(deleteEdgeResponse.statusCode).toBe(200);
      const deletedEdge = edgeDeletionResponseSchema.parse(deleteEdgeResponse.json());
      expect(deletedEdge).toMatchObject({
        deletedEdgeId: "user-to-reviewer",
        validation: {
          ok: true
        }
      });

      const finalEdgesResponse = await server.inject({
        method: "GET",
        url: "/v1/edges"
      });
      const finalEdges = edgeListResponseSchema.parse(finalEdgesResponse.json());
      expect(finalEdges.edges.find((edge) => edge.edgeId === "user-to-reviewer")).toBe(
        undefined
      );

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=30"
      });
      const events = hostEventListResponseSchema.parse(eventsResponse.json()).events;
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            edgeId: "user-to-reviewer",
            mutationKind: "created",
            type: "edge.updated"
          }),
          expect.objectContaining({
            edgeId: "user-to-reviewer",
            mutationKind: "replaced",
            type: "edge.updated"
          }),
          expect.objectContaining({
            edgeId: "user-to-reviewer",
            mutationKind: "deleted",
            type: "edge.updated"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("rejects invalid edge candidates through the host boundary", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const createEdgeResponse = await server.inject({
        method: "POST",
        payload: {
          edgeId: "user-to-missing",
          fromNodeId: "user-main",
          relation: "consults",
          toNodeId: "missing-node"
        },
        url: "/v1/edges"
      });

      expect(createEdgeResponse.statusCode).toBe(400);
      const mutation = edgeMutationResponseSchema.parse(createEdgeResponse.json());
      expect(mutation.validation.ok).toBe(false);
      expect(mutation.validation.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unknown_edge_target"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("materializes runtime intent and effective context after graph apply", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      expect(admitResponse.statusCode).toBe(200);
      const admittedPackageSource = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource;
      const admittedPackageSourceId = admittedPackageSource.packageSourceId;
      expect(admittedPackageSource).toMatchObject({
        materialization: {
          materializationKind: "immutable_store"
        },
        sourceKind: "local_path"
      });

      const graphResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const runtimesResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes"
      });
      expect(runtimesResponse.statusCode).toBe(200);
      expect(runtimeListResponseSchema.parse(runtimesResponse.json())).toMatchObject({
        runtimes: [
          {
            backendKind: "memory",
            nodeId: "worker-it",
            desiredState: "running",
            contextAvailable: true,
            observedState: "running",
            packageSourceId: admittedPackageSourceId
          }
        ]
      });

      const contextResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });
      expect(contextResponse.statusCode).toBe(200);
      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        contextResponse.json()
      );
      expect(runtimeContext).toMatchObject({
        binding: {
          graphId: "team-alpha",
          node: {
            nodeId: "worker-it"
          }
        },
        identityContext: {
          algorithm: "nostr_secp256k1",
          secretDelivery: {
            envVar: "ENTANGLE_NOSTR_SECRET_KEY",
            mode: "env_var"
          }
        },
        modelContext: {
          auth: {
            secretRef: "secret://shared-model",
            status: "available",
            delivery: {
              mode: "mounted_file"
            }
          },
          modelEndpointProfile: {
            id: "shared-model",
            authMode: "header_secret"
          }
        },
        packageManifest: {
          packageId: "worker-it"
        }
      });
      expect(runtimeContext.identityContext.publicKey).toHaveLength(64);

      const contextPath = runtimeContext.workspace.injectedRoot;
      const storedContext = runtimeContextInspectionResponseSchema.parse(
        JSON.parse(
          await readFile(
            path.join(contextPath, "effective-runtime-context.json"),
            "utf8"
          )
        ) as unknown
      );
      expect(storedContext.binding.node.nodeId).toBe("worker-it");
      expect(
        JSON.parse(
          await readFile(
            path.join(storedContext.workspace.packageRoot, "manifest.json"),
            "utf8"
          )
        ) as unknown
      ).toMatchObject({
        packageId: "worker-it"
      });
      expect((await lstat(storedContext.workspace.packageRoot)).isSymbolicLink()).toBe(
        true
      );
      const packageLinkTarget = await readlink(storedContext.workspace.packageRoot);
      expect(packageLinkTarget).toContain("../");
      expect(
        path.resolve(
          path.dirname(storedContext.workspace.packageRoot),
          packageLinkTarget
        )
      ).toBe(admittedPackageSource.materialization?.packageRoot);
    } finally {
      await server.close();
    }
  });

  it("injects resolved git principals into runtime context when a node binds them", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const principal = buildGitPrincipalRecord();
      await writeSecretRefFile(principal.secretRef);
      const principalResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(principalResponse.statusCode).toBe(200);

      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      expect(admitResponse.statusCode).toBe(200);
      const admittedPackageSource = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource;

      const graphResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSource.packageSourceId,
              resourceBindings: {
                relayProfileRefs: [],
                gitServiceRefs: ["local-gitea"],
                primaryGitServiceRef: "local-gitea",
                externalPrincipalRefs: ["worker-it-git"]
              }
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const contextResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });

      expect(contextResponse.statusCode).toBe(200);
      expect(
        runtimeContextInspectionResponseSchema.parse(contextResponse.json())
      ).toMatchObject({
        artifactContext: {
          primaryGitPrincipalRef: "worker-it-git",
          gitPrincipalBindings: [
            {
              principal: {
                principalId: "worker-it-git",
                gitServiceRef: "local-gitea"
              },
              transport: {
                secretRef: principal.secretRef,
                status: "available",
                delivery: {
                  mode: "mounted_file",
                  filePath: secretRefStoragePath(principal.secretRef)
                }
              }
            }
          ]
        },
        binding: {
          externalPrincipals: [
            {
              principalId: "worker-it-git"
            }
          ],
          resolvedResourceBindings: {
            externalPrincipalRefs: ["worker-it-git"]
          }
        }
      });
    } finally {
      await server.close();
    }
  });

  it("derives a primary git repository target when the git service and namespace are unambiguous", async () => {
    process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE = "team-alpha";
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const principal = buildGitPrincipalRecord();
      await writeSecretRefFile(principal.secretRef);
      const principalResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(principalResponse.statusCode).toBe(200);

      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      expect(admitResponse.statusCode).toBe(200);
      const admittedPackageSource = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource;

      const graphResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSource.packageSourceId,
              resourceBindings: {
                relayProfileRefs: [],
                gitServiceRefs: ["local-gitea"],
                primaryGitServiceRef: "local-gitea",
                externalPrincipalRefs: ["worker-it-git"]
              }
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const contextResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });

      expect(contextResponse.statusCode).toBe(200);
      const context = runtimeContextInspectionResponseSchema.parse(
        contextResponse.json()
      );

      expect(context.artifactContext.primaryGitRepositoryTarget).toEqual({
        gitServiceRef: "local-gitea",
        namespace: "team-alpha",
        provisioningMode: "preexisting",
        remoteUrl: "ssh://git@gitea:22/team-alpha/team-alpha.git",
        repositoryName: "team-alpha",
        transportKind: "ssh"
      });
    } finally {
      await server.close();
    }
  });

  it("provisions an organization-backed primary repository target through the Gitea API when it is missing", async () => {
    const giteaApi = await createTestGiteaApiServer();
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/local-gitea/provisioning",
        "gitea-provisioning-token\n"
      );

      const catalogResponse = await server.inject({
        method: "PUT",
        payload: buildProvisioningCatalog({
          apiBaseUrl: giteaApi.url
        }),
        url: "/v1/catalog"
      });
      expect(catalogResponse.statusCode).toBe(200);

      const admittedPackageSourceId = await admitPackageSource(
        server,
        packageDirectory
      );
      await applySingleWorkerGraph({
        packageSourceId: admittedPackageSourceId,
        server
      });

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });
      expect(runtimeResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(runtimeResponse.json())).toMatchObject({
        contextAvailable: true,
        desiredState: "running",
        observedState: "running",
        primaryGitRepositoryProvisioning: {
          created: true,
          state: "ready",
          target: {
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            provisioningMode: "gitea_api",
            repositoryName: "team-alpha"
          }
        }
      });

      expect(
        giteaApi.requests.filter(
          (request) =>
            request.method === "GET" &&
            request.url === "/api/v1/repos/team-alpha/team-alpha" &&
            request.authorization === "token gitea-provisioning-token"
        ).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        giteaApi.requests.filter(
          (request) =>
            request.method === "GET" &&
            request.url === "/api/v1/user" &&
            request.authorization === "token gitea-provisioning-token"
        ).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        giteaApi.requests.filter(
          (request) =>
            request.method === "POST" &&
            request.url === "/api/v1/orgs/team-alpha/repos" &&
            request.authorization === "token gitea-provisioning-token" &&
            JSON.stringify(request.body) ===
              JSON.stringify({
                auto_init: false,
                name: "team-alpha",
                private: true
              })
        ).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        giteaApi.requests.some(
          (request) =>
            request.method === "POST" && request.url === "/api/v1/user/repos"
        )
      ).toBe(false);
    } finally {
      await Promise.all([server.close(), giteaApi.close()]);
    }
  });

  it("provisions the current user's repository through /user/repos when the namespace matches the authenticated user", async () => {
    const giteaApi = await createTestGiteaApiServer({
      currentUserLogin: "team-alpha"
    });
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/local-gitea/provisioning",
        "gitea-provisioning-token\n"
      );

      await server.inject({
        method: "PUT",
        payload: buildProvisioningCatalog({
          apiBaseUrl: giteaApi.url
        }),
        url: "/v1/catalog"
      });

      const admittedPackageSourceId = await admitPackageSource(
        server,
        packageDirectory
      );
      await applySingleWorkerGraph({
        packageSourceId: admittedPackageSourceId,
        server
      });

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });
      expect(runtimeResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(runtimeResponse.json())).toMatchObject({
        primaryGitRepositoryProvisioning: {
          created: true,
          state: "ready"
        }
      });

      expect(
        giteaApi.requests.filter(
          (request) =>
            request.method === "POST" &&
            request.url === "/api/v1/user/repos" &&
            request.authorization === "token gitea-provisioning-token"
        ).length
      ).toBeGreaterThanOrEqual(1);
      expect(
        giteaApi.requests.some(
          (request) =>
            request.method === "POST" &&
            request.url === "/api/v1/orgs/team-alpha/repos"
        )
      ).toBe(false);
    } finally {
      await Promise.all([server.close(), giteaApi.close()]);
    }
  });

  it("reuses an existing primary repository target without issuing a create call", async () => {
    const giteaApi = await createTestGiteaApiServer({
      existingRepositories: [
        {
          owner: "team-alpha",
          repositoryName: "team-alpha"
        }
      ]
    });
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/local-gitea/provisioning",
        "gitea-provisioning-token\n"
      );

      await server.inject({
        method: "PUT",
        payload: buildProvisioningCatalog({
          apiBaseUrl: giteaApi.url
        }),
        url: "/v1/catalog"
      });

      const admittedPackageSourceId = await admitPackageSource(
        server,
        packageDirectory
      );
      await applySingleWorkerGraph({
        packageSourceId: admittedPackageSourceId,
        server
      });

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });
      expect(runtimeResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(runtimeResponse.json())).toMatchObject({
        primaryGitRepositoryProvisioning: {
          created: false,
          state: "ready"
        }
      });

      expect(
        giteaApi.requests.every((request) => request.method === "GET")
      ).toBe(true);
      expect(
        giteaApi.requests.filter(
          (request) =>
            request.url === "/api/v1/repos/team-alpha/team-alpha" &&
            request.authorization === "token gitea-provisioning-token"
        ).length
      ).toBeGreaterThanOrEqual(1);
    } finally {
      await Promise.all([server.close(), giteaApi.close()]);
    }
  });

  it("keeps the runtime unavailable when a gitea_api target cannot be provisioned", async () => {
    const giteaApi = await createTestGiteaApiServer();
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await server.inject({
        method: "PUT",
        payload: buildProvisioningCatalog({
          apiBaseUrl: giteaApi.url
        }),
        url: "/v1/catalog"
      });

      const admittedPackageSourceId = await admitPackageSource(
        server,
        packageDirectory
      );
      await applySingleWorkerGraph({
        packageSourceId: admittedPackageSourceId,
        server
      });

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });
      expect(runtimeResponse.statusCode).toBe(200);
      const runtimeInspection = runtimeInspectionResponseSchema.parse(
        runtimeResponse.json()
      );
      expect(runtimeInspection).toMatchObject({
        contextAvailable: false,
        desiredState: "stopped",
        observedState: "stopped",
        primaryGitRepositoryProvisioning: {
          state: "failed",
          target: {
            gitServiceRef: "local-gitea",
            namespace: "team-alpha",
            repositoryName: "team-alpha"
          }
        }
      });
      expect(runtimeInspection.reason).toContain("could not be provisioned");
      expect(runtimeInspection.reason).toContain("requires provisioning secret");
      expect(giteaApi.requests).toEqual([]);
    } finally {
      await Promise.all([server.close(), giteaApi.close()]);
    }
  });

  it("does not invent a primary git principal or default namespace when git bindings remain ambiguous", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const catalogResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          catalogId: "local-catalog",
          relays: [
            {
              id: "local-relay",
              displayName: "Local Relay",
              readUrls: ["ws://relay.local"],
              writeUrls: ["ws://relay.local"],
              authMode: "none"
            }
          ],
          gitServices: [
            {
              id: "local-gitea",
              displayName: "Local Gitea",
              baseUrl: "https://gitea.local",
              remoteBase: "ssh://git@gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              defaultNamespace: "main-team",
              provisioning: {
                mode: "preexisting"
              }
            },
            {
              id: "backup-gitea",
              displayName: "Backup Gitea",
              baseUrl: "https://backup.gitea.local",
              remoteBase: "ssh://git@backup.gitea.local:22",
              transportKind: "ssh",
              authMode: "ssh_key",
              defaultNamespace: "backup-team",
              provisioning: {
                mode: "preexisting"
              }
            }
          ],
          modelEndpoints: [
            {
              id: "shared-model",
              displayName: "Shared Model",
              adapterKind: "anthropic",
              baseUrl: "https://api.anthropic.com",
              authMode: "header_secret",
              secretRef: "secret://shared-model",
              defaultModel: "claude-opus"
            }
          ],
          defaults: {
            relayProfileRefs: ["local-relay"],
            modelEndpointRef: "shared-model"
          }
        },
        url: "/v1/catalog"
      });
      expect(catalogResponse.statusCode).toBe(200);

      for (const principal of [
        buildGitPrincipalRecord({
          principalId: "worker-it-git-main",
          gitServiceRef: "local-gitea",
          secretRef: "secret://git/worker-it/main"
        }),
        buildGitPrincipalRecord({
          principalId: "worker-it-git-backup",
          displayName: "Worker IT Backup Git Principal",
          gitServiceRef: "backup-gitea",
          secretRef: "secret://git/worker-it/backup"
        })
      ]) {
        const principalResponse = await server.inject({
          method: "PUT",
          payload: principal,
          url: `/v1/external-principals/${principal.principalId}`
        });
        expect(principalResponse.statusCode).toBe(200);
      }

      await writeSecretRefFile("secret://git/worker-it/main");

      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      expect(admitResponse.statusCode).toBe(200);
      const admittedPackageSource = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource;

      const graphResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSource.packageSourceId,
              resourceBindings: {
                relayProfileRefs: [],
                gitServiceRefs: ["local-gitea", "backup-gitea"],
                externalPrincipalRefs: [
                  "worker-it-git-main",
                  "worker-it-git-backup"
                ]
              }
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const contextResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });

      expect(contextResponse.statusCode).toBe(200);
      const context = runtimeContextInspectionResponseSchema.parse(
        contextResponse.json()
      );

      expect(context.artifactContext.primaryGitPrincipalRef).toBeUndefined();
      expect(context.artifactContext.defaultNamespace).toBeUndefined();
      expect(context.artifactContext.primaryGitRepositoryTarget).toBeUndefined();
      expect(context.artifactContext.gitPrincipalBindings).toHaveLength(2);
      const mainBinding = context.artifactContext.gitPrincipalBindings.find(
        ({ principal }) => principal.principalId === "worker-it-git-main"
      );
      const backupBinding = context.artifactContext.gitPrincipalBindings.find(
        ({ principal }) => principal.principalId === "worker-it-git-backup"
      );

      expect(mainBinding).toBeDefined();
      expect(mainBinding?.transport.secretRef).toBe("secret://git/worker-it/main");
      expect(mainBinding?.transport.status).toBe("available");
      expect(backupBinding).toBeDefined();
      expect(backupBinding?.transport.secretRef).toBe(
        "secret://git/worker-it/backup"
      );
      expect(backupBinding?.transport.status).toBe("missing");
    } finally {
      await server.close();
    }
  });

  it("lists persisted runtime artifacts through the host surface", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            }
          ]
        },
        url: "/v1/graph"
      });

      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );
        const artifactRecord = artifactRecordSchema.parse({
          createdAt: "2026-04-22T00:00:00.000Z",
          materialization: {
            localPath: path.join(
              runtimeContext.workspace.artifactWorkspaceRoot,
              "reports",
              "session-alpha",
              "turn-001.md"
            ),
            repoPath: runtimeContext.workspace.artifactWorkspaceRoot
          },
          ref: {
            artifactId: "report-turn-001",
            artifactKind: "report_file",
          backend: "git",
          contentSummary: "Turn report",
          conversationId: "conv-alpha",
          createdByNodeId: "worker-it",
          locator: {
            branch: "worker-it/session-alpha/review-patch",
              commit: "abc123",
              gitServiceRef: "local-gitea",
              namespace: "team-alpha",
              path: "reports/session-alpha/turn-001.md"
            },
            preferred: true,
            sessionId: "session-alpha",
          status: "materialized"
        },
        turnId: "turn-001",
        updatedAt: "2026-04-22T00:00:00.000Z"
      });
      await mkdir(path.join(runtimeContext.workspace.runtimeRoot, "artifacts"), {
        recursive: true
      });
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "artifacts",
          `${artifactRecord.ref.artifactId}.json`
        ),
        `${JSON.stringify(artifactRecord, null, 2)}\n`,
        "utf8"
      );

      const artifactsResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifacts"
      });

      expect(artifactsResponse.statusCode).toBe(200);
      expect(runtimeArtifactListResponseSchema.parse(artifactsResponse.json())).toEqual({
        artifacts: [artifactRecord]
      });
    } finally {
      await server.close();
    }
  });

  it("lists and inspects persisted runtime sessions through the host surface", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );

      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "sessions",
          "session-alpha.json"
        ),
        {
          activeConversationIds: ["conv-alpha"],
          graphId: "team-alpha",
          intent: "Review the latest patch set.",
          openedAt: "2026-04-24T10:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          status: "active",
          traceId: "trace-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z",
          waitingApprovalIds: []
        }
      );

      const listedSessionsResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions"
      });

      expect(listedSessionsResponse.statusCode).toBe(200);
      expect(
        sessionListResponseSchema.parse(listedSessionsResponse.json())
      ).toEqual({
        sessions: [
          {
            graphId: "team-alpha",
            nodeIds: ["worker-it"],
            nodeStatuses: [
              {
                nodeId: "worker-it",
                status: "active"
              }
            ],
            sessionId: "session-alpha",
            traceIds: ["trace-alpha"],
            updatedAt: "2026-04-24T10:05:00.000Z"
          }
        ]
      });

      const sessionInspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions/session-alpha"
      });

      expect(sessionInspectionResponse.statusCode).toBe(200);
      expect(
        sessionInspectionResponseSchema.parse(sessionInspectionResponse.json())
      ).toMatchObject({
        graphId: "team-alpha",
        nodes: [
          {
            nodeId: "worker-it",
            runtime: {
              nodeId: "worker-it",
              observedState: "running"
            },
            session: {
              graphId: "team-alpha",
              sessionId: "session-alpha",
              status: "active",
              traceId: "trace-alpha"
            }
          }
        ],
        sessionId: "session-alpha"
      });

      const missingSessionResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions/missing-session"
      });

      expect(missingSessionResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(missingSessionResponse.json())).toEqual({
        code: "not_found",
        message:
          "Session 'missing-session' was not found in the current host runtime state."
      });
    } finally {
      await server.close();
    }
  });

  it("emits typed session and runner-turn activity events without duplicating unchanged records", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );

      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "sessions",
          "session-alpha.json"
        ),
        {
          activeConversationIds: ["conv-alpha"],
          graphId: "team-alpha",
          intent: "Review the latest patch set.",
          openedAt: "2026-04-24T10:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          status: "active",
          traceId: "trace-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z",
          waitingApprovalIds: []
        }
      );
      await writeJsonFile(
        path.join(runtimeContext.workspace.runtimeRoot, "turns", "turn-alpha.json"),
        {
          consumedArtifactIds: ["artifact-inbound-001"],
          conversationId: "conv-alpha",
          graphId: "team-alpha",
          nodeId: "worker-it",
          phase: "persisting",
          producedArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          startedAt: "2026-04-24T10:00:00.000Z",
          triggerKind: "message",
          turnId: "turn-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z"
        }
      );

      const firstSessionsResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions"
      });

      expect(firstSessionsResponse.statusCode).toBe(200);

      const firstEventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=40"
      });
      const firstEvents = hostEventListResponseSchema.parse(
        firstEventsResponse.json()
      ).events;

      expect(firstEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: "session",
            nodeId: "worker-it",
            sessionId: "session-alpha",
            status: "active",
            type: "session.updated"
          }),
          expect.objectContaining({
            category: "runner",
            nodeId: "worker-it",
            phase: "persisting",
            sessionId: "session-alpha",
            turnId: "turn-alpha",
            type: "runner.turn.updated"
          })
        ])
      );

      const firstSessionEventCount = firstEvents.filter(
        (event) => event.type === "session.updated"
      ).length;
      const firstRunnerTurnEventCount = firstEvents.filter(
        (event) => event.type === "runner.turn.updated"
      ).length;

      await server.inject({
        method: "GET",
        url: "/v1/sessions"
      });

      const secondEventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=40"
      });
      const secondEvents = hostEventListResponseSchema.parse(
        secondEventsResponse.json()
      ).events;

      expect(
        secondEvents.filter((event) => event.type === "session.updated").length
      ).toBe(firstSessionEventCount);
      expect(
        secondEvents.filter((event) => event.type === "runner.turn.updated").length
      ).toBe(firstRunnerTurnEventCount);
    } finally {
      await server.close();
    }
  });

  it("persists runtime recovery history without duplicating unchanged runtime state", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const firstRecoveryResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/recovery?limit=10"
      });

      expect(firstRecoveryResponse.statusCode).toBe(200);
      const firstRecovery = runtimeRecoveryInspectionResponseSchema.parse(
        firstRecoveryResponse.json()
      );

      expect(firstRecovery.policy.policy).toEqual({
        mode: "manual"
      });
      expect(firstRecovery.controller.state).toBe("idle");
      expect(firstRecovery.currentRuntime).toMatchObject({
        nodeId: "worker-it",
        observedState: "running"
      });
      expect(firstRecovery.entries).toHaveLength(1);
      expect(firstRecovery.entries[0]?.runtime.observedState).toBe("running");

      const secondRecoveryResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/recovery?limit=10"
      });
      const secondRecovery = runtimeRecoveryInspectionResponseSchema.parse(
        secondRecoveryResponse.json()
      );

      expect(secondRecovery.entries).toHaveLength(1);

      const stopResponse = await server.inject({
        method: "POST",
        url: "/v1/runtimes/worker-it/stop"
      });

      expect(stopResponse.statusCode).toBe(200);

      const thirdRecoveryResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/recovery?limit=10"
      });
      const thirdRecovery = runtimeRecoveryInspectionResponseSchema.parse(
        thirdRecoveryResponse.json()
      );

      expect(thirdRecovery.policy.policy).toEqual({
        mode: "manual"
      });
      expect(thirdRecovery.controller.state).toBe("idle");
      expect(thirdRecovery.currentRuntime).toMatchObject({
        desiredState: "stopped",
        nodeId: "worker-it",
        observedState: "stopped"
      });
      expect(thirdRecovery.entries).toHaveLength(2);
      expect(thirdRecovery.entries[0]?.runtime.observedState).toBe("stopped");
      expect(thirdRecovery.entries[1]?.runtime.observedState).toBe("running");
    } finally {
      await server.close();
    }
  });

  it("allows the operator to set a runtime recovery policy and inspect it through the recovery surface", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const applyPolicyResponse = await server.inject({
        method: "PUT",
        payload: {
          cooldownSeconds: 30,
          maxAttempts: 2,
          mode: "restart_on_failure"
        },
        url: "/v1/runtimes/worker-it/recovery-policy"
      });

      expect(applyPolicyResponse.statusCode).toBe(200);
      const inspection = runtimeRecoveryInspectionResponseSchema.parse(
        applyPolicyResponse.json()
      );
      expect(inspection.policy.policy).toEqual({
        cooldownSeconds: 30,
        maxAttempts: 2,
        mode: "restart_on_failure"
      });
      expect(inspection.controller.state).toBe("idle");

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      expect(eventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(eventsResponse.json()).events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.recovery_policy.updated",
            nodeId: "worker-it",
            policy: {
              cooldownSeconds: 30,
              maxAttempts: 2,
              mode: "restart_on_failure"
            },
            previousPolicy: {
              mode: "manual"
            }
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("marks a failed runtime as manual-required when automatic recovery is disabled", async () => {
    const runtimeBackend = createMockRuntimeBackend((input) => {
      if (input.desiredState !== "running") {
        return {
          backendKind: "memory",
          lastError: undefined,
          observedState: "stopped",
          runtimeHandle: undefined,
          statusMessage: input.reason ?? "Runtime intentionally stopped."
        };
      }

      return {
        backendKind: "memory",
        lastError: "Injected runtime failure.",
        observedState: "failed",
        runtimeHandle: undefined,
        statusMessage: "Injected runtime failure."
      };
    });
    const server = await createTestServer({
      includeModelEndpoint: true,
      runtimeBackend
    });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const recoveryResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/recovery?limit=10"
      });

      expect(recoveryResponse.statusCode).toBe(200);
      const recovery = runtimeRecoveryInspectionResponseSchema.parse(
        recoveryResponse.json()
      );
      expect(recovery.currentRuntime).toMatchObject({
        nodeId: "worker-it",
        observedState: "failed",
        restartGeneration: 0
      });
      expect(recovery.policy.policy).toEqual({
        mode: "manual"
      });
      expect(recovery.controller).toMatchObject({
        attemptsUsed: 0,
        state: "manual_required"
      });

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      expect(eventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(eventsResponse.json()).events).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.recovery.attempted"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("automatically retries failed runtimes and records exhaustion when the configured attempt budget is spent", async () => {
    const runtimeBackend = createMockRuntimeBackend((input) => {
      if (input.desiredState !== "running") {
        return {
          backendKind: "memory",
          lastError: undefined,
          observedState: "stopped",
          runtimeHandle: undefined,
          statusMessage: input.reason ?? "Runtime intentionally stopped."
        };
      }

      if (input.restartGeneration >= 1) {
        return {
          backendKind: "memory",
          lastError: "Injected runtime failure after retry.",
          observedState: "failed",
          runtimeHandle: undefined,
          statusMessage: "Injected runtime failure after retry."
        };
      }

      return {
        backendKind: "memory",
        lastError: "Injected runtime failure before retry.",
        observedState: "failed",
        runtimeHandle: undefined,
        statusMessage: "Injected runtime failure before retry."
      };
    });
    const server = await createTestServer({
      includeModelEndpoint: true,
      runtimeBackend
    });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const applyPolicyResponse = await server.inject({
        method: "PUT",
        payload: {
          cooldownSeconds: 0,
          maxAttempts: 1,
          mode: "restart_on_failure"
        },
        url: "/v1/runtimes/worker-it/recovery-policy"
      });

      expect(applyPolicyResponse.statusCode).toBe(200);
      const recoveryInspection = runtimeRecoveryInspectionResponseSchema.parse(
        applyPolicyResponse.json()
      );
      expect(recoveryInspection.currentRuntime).toMatchObject({
        nodeId: "worker-it",
        observedState: "failed",
        restartGeneration: 1
      });
      expect(recoveryInspection.controller).toMatchObject({
        attemptsUsed: 1,
        state: "exhausted"
      });

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=30"
      });
      expect(eventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(eventsResponse.json()).events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.restart.requested",
            nodeId: "worker-it",
            restartGeneration: 1
          }),
          expect.objectContaining({
            type: "runtime.recovery.attempted",
            nodeId: "worker-it",
            attemptNumber: 1,
            maxAttempts: 1
          }),
          expect.objectContaining({
            type: "runtime.recovery.exhausted",
            nodeId: "worker-it",
            attemptsUsed: 1,
            maxAttempts: 1
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("returns a structured 409 response when runtime context is unavailable", async () => {
    const server = await createTestServer({ includeModelEndpoint: false });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const response = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });

      expect(response.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(response.json())).toMatchObject({
        code: "conflict"
      });
    } finally {
      await server.close();
    }
  });

  it("treats a missing model secret as an unavailable runtime context", async () => {
    const server = await createTestServer({
      includeModelEndpoint: true,
      includeModelSecret: false
    });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const response = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });

      expect(response.statusCode).toBe(409);
      const parsedError = hostErrorResponseSchema.parse(response.json());
      expect(parsedError.code).toBe("conflict");
      expect(parsedError.message).toContain(
        "effective model endpoint credential is unavailable"
      );
    } finally {
      await server.close();
    }
  });

  it("allows the operator to stop a runtime without losing its context", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const stopResponse = await server.inject({
        method: "POST",
        url: "/v1/runtimes/worker-it/stop"
      });

      expect(stopResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(stopResponse.json())).toMatchObject({
        backendKind: "memory",
        nodeId: "worker-it",
        desiredState: "stopped",
        contextAvailable: true,
        observedState: "stopped",
        reason: "stopped_by_operator"
      });
    } finally {
      await server.close();
    }
  });

  it("allows the operator to request deterministic runtime recreation without changing the desired state", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const restartResponse = await server.inject({
        method: "POST",
        url: "/v1/runtimes/worker-it/restart"
      });

      expect(restartResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(restartResponse.json())).toMatchObject({
        backendKind: "memory",
        nodeId: "worker-it",
        desiredState: "running",
        contextAvailable: true,
        observedState: "running",
        restartGeneration: 1
      });

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      expect(eventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(eventsResponse.json()).events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.restart.requested",
            nodeId: "worker-it",
            previousRestartGeneration: 0,
            restartGeneration: 1
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

  it("returns a structured 409 response when runtime restart is requested without a realizable context", async () => {
    const server = await createTestServer({ includeModelEndpoint: false });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const restartResponse = await server.inject({
        method: "POST",
        url: "/v1/runtimes/worker-it/restart"
      });

      expect(restartResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(restartResponse.json())).toMatchObject({
        code: "conflict"
      });
    } finally {
      await server.close();
    }
  });

  it("reports reconciliation status through the host status surface", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_path",
          absolutePath: packageDirectory
        },
        url: "/v1/package-sources/admit"
      });
      const admittedPackageSourceId = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      ).packageSource.packageSourceId;

      await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: admittedPackageSourceId
            }
          ],
          edges: []
        },
        url: "/v1/graph"
      });

      const statusResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        service: "entangle-host",
        status: "healthy",
        reconciliation: {
          backendKind: "memory",
          blockedRuntimeCount: 0,
          degradedRuntimeCount: 0,
          failedRuntimeCount: 0,
          findingCodes: [],
          issueCount: 0,
          managedRuntimeCount: 1,
          runningRuntimeCount: 1,
          stoppedRuntimeCount: 0,
          transitioningRuntimeCount: 0
        }
      });
    } finally {
      await server.close();
    }
  });

  it("reports degraded host status when a runtime has no realizable context", async () => {
    const server = await createTestServer({ includeModelEndpoint: false });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const statusResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        service: "entangle-host",
        status: "degraded",
        reconciliation: {
          backendKind: "memory",
          blockedRuntimeCount: 1,
          degradedRuntimeCount: 1,
          failedRuntimeCount: 0,
          findingCodes: ["context_unavailable"],
          issueCount: 1,
          managedRuntimeCount: 1,
          runningRuntimeCount: 0,
          stoppedRuntimeCount: 1,
          transitioningRuntimeCount: 0
        }
      });
    } finally {
      await server.close();
    }
  });

  it("does not report degradation for an intentionally stopped runtime", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const stopResponse = await server.inject({
        method: "POST",
        url: "/v1/runtimes/worker-it/stop"
      });

      expect(stopResponse.statusCode).toBe(200);
      expect(runtimeInspectionResponseSchema.parse(stopResponse.json())).toMatchObject({
        desiredState: "stopped",
        observedState: "stopped",
        reconciliation: {
          findingCodes: [],
          state: "aligned"
        }
      });

      const statusResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        service: "entangle-host",
        status: "healthy",
        reconciliation: {
          blockedRuntimeCount: 0,
          degradedRuntimeCount: 0,
          failedRuntimeCount: 0,
          findingCodes: [],
          issueCount: 0,
          transitioningRuntimeCount: 0
        }
      });
    } finally {
      await server.close();
    }
  });
});
