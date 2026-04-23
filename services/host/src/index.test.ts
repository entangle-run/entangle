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
import {
  artifactRecordSchema,
  externalPrincipalInspectionResponseSchema,
  hostErrorResponseSchema,
  packageSourceInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeListResponseSchema
} from "@entangle/types";

const createdDirectories: string[] = [];

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
  options: { includeModelEndpoint?: boolean; includeModelSecret?: boolean } = {}
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

  await stateModule.initializeHostState();

  return hostModule.buildHostServer();
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
          failedRuntimeCount: 0,
          managedRuntimeCount: 1,
          runningRuntimeCount: 1,
          stoppedRuntimeCount: 0
        }
      });
    } finally {
      await server.close();
    }
  });
});
