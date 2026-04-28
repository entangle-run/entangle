import {
  lstat,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import type { RuntimeBackend } from "./runtime-backend.js";
import {
  approvalRecordSchema,
  artifactRecordSchema,
  edgeDeletionResponseSchema,
  edgeListResponseSchema,
  edgeMutationResponseSchema,
  externalPrincipalDeletionResponseSchema,
  externalPrincipalInspectionResponseSchema,
  graphRevisionInspectionResponseSchema,
  graphRevisionListResponseSchema,
  gitRepositoryProvisioningRecordSchema,
  hostAuthorityExportResponseSchema,
  hostAuthorityImportResponseSchema,
  hostAuthorityInspectionResponseSchema,
  hostEventListResponseSchema,
  hostEventRecordSchema,
  hostErrorResponseSchema,
  hostProjectionSnapshotSchema,
  hostStatusResponseSchema,
  nodeDeletionResponseSchema,
  nodeInspectionResponseSchema,
  nodeListResponseSchema,
  nodeMutationResponseSchema,
  packageSourceDeletionResponseSchema,
  packageSourceInspectionResponseSchema,
  packageSourceListResponseSchema,
  runtimeAssignmentInspectionResponseSchema,
  runtimeAssignmentListResponseSchema,
  runtimeAssignmentOfferResponseSchema,
  runtimeAssignmentRevokeResponseSchema,
  runtimeApprovalInspectionResponseSchema,
  runtimeApprovalListResponseSchema,
  runtimeArtifactDiffResponseSchema,
  runtimeArtifactHistoryResponseSchema,
  runtimeArtifactInspectionResponseSchema,
  runtimeArtifactListResponseSchema,
  runtimeArtifactPreviewResponseSchema,
  runtimeArtifactPromotionListResponseSchema,
  runtimeArtifactPromotionResponseSchema,
  runtimeArtifactRestoreListResponseSchema,
  runtimeArtifactRestoreResponseSchema,
  runtimeBootstrapBundleResponseSchema,
  runtimeContextInspectionResponseSchema,
  runtimeIdentitySecretResponseSchema,
  runtimeInspectionResponseSchema,
  runtimeMemoryInspectionResponseSchema,
  runtimeMemoryPageInspectionResponseSchema,
  runtimeWikiRepositoryPublicationListResponseSchema,
  runtimeWikiRepositoryPublicationResponseSchema,
  runtimeRecoveryInspectionResponseSchema,
  runtimeListResponseSchema,
  runtimeSourceChangeCandidateDiffResponseSchema,
  runtimeSourceChangeCandidateFilePreviewResponseSchema,
  runtimeSourceChangeCandidateInspectionResponseSchema,
  runtimeSourceChangeCandidateListResponseSchema,
  runtimeSourceHistoryInspectionResponseSchema,
  runtimeSourceHistoryListResponseSchema,
  runtimeSourceHistoryPublicationResponseSchema,
  runtimeSourceHistoryReplayListResponseSchema,
  runtimeSourceHistoryReplayResponseSchema,
  runtimeTurnInspectionResponseSchema,
  runtimeTurnListResponseSchema,
  runnerRegistryInspectionResponseSchema,
  runnerRegistryListResponseSchema,
  runnerJoinConfigSchema,
  runnerRevokeMutationResponseSchema,
  runnerTrustMutationResponseSchema,
  sessionCancellationResponseSchema,
  sessionInspectionResponseSchema,
  sessionListResponseSchema,
  userNodeConversationReadResponseSchema,
  userNodeConversationResponseSchema,
  userNodeInboxResponseSchema,
  userNodeIdentityListResponseSchema,
  userNodeMessageInspectionResponseSchema,
  userNodeMessageRecordSchema,
  sourceChangeCandidateRecordSchema,
  sourceHistoryRecordSchema,
  type RuntimeAssignmentRecord,
  type RuntimeContextInspectionResponse
} from "@entangle/types";

const createdDirectories: string[] = [];
const gzipAsync = promisify(gzip);

type TestSocketPayload = ArrayBuffer | Buffer | Buffer[];

type TestWebSocket = {
  close(): void;
  once(event: "error", listener: (error: Error) => void): void;
  once(event: "message", listener: (payload: TestSocketPayload) => void): void;
  terminate(): void;
};

type InjectableWebSocketServer = {
  injectWS(path: string): Promise<unknown>;
};

type MockFetchInput = string | URL | { url: string };

type MockFetchInit = {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
};

type MockFetchResponse = {
  json(): Promise<unknown>;
  status: number;
  text(): Promise<string>;
};

type TestFederatedAssignmentPublisher = {
  publishRuntimeAssignmentOffer(input: {
    assignment: RuntimeAssignmentRecord;
    relayUrls: string[];
  }): Promise<unknown>;
  publishRuntimeAssignmentRevoke(input: {
    assignment: RuntimeAssignmentRecord;
    reason?: string;
    relayUrls: string[];
  }): Promise<unknown>;
};

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runGitCommand(input: {
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", input.args, {
      cwd: input.cwd,
      env: {
        ...process.env,
        ...input.env
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          stderr.trim() || stdout.trim() || `git exited with ${code ?? "unknown"}`
        )
      );
    });
  });
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
      runtimeProfile: "federated",
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

function writeTarString(input: {
  buffer: Buffer;
  length: number;
  offset: number;
  value: string;
}): void {
  input.buffer.write(input.value, input.offset, input.length, "utf8");
}

function writeTarOctal(input: {
  buffer: Buffer;
  length: number;
  offset: number;
  value: number;
}): void {
  const encoded = input.value.toString(8).padStart(input.length - 1, "0");
  input.buffer.write(
    encoded.slice(-(input.length - 1)),
    input.offset,
    input.length - 1,
    "ascii"
  );
  input.buffer[input.offset + input.length - 1] = 0;
}

function buildTarEntry(input: {
  data: Buffer;
  relativePath: string;
}): Buffer {
  if (Buffer.byteLength(input.relativePath, "utf8") > 100) {
    throw new Error("Test tar writer only supports short relative paths.");
  }

  const header = Buffer.alloc(512);
  writeTarString({
    buffer: header,
    length: 100,
    offset: 0,
    value: input.relativePath
  });
  writeTarOctal({ buffer: header, length: 8, offset: 100, value: 0o644 });
  writeTarOctal({ buffer: header, length: 8, offset: 108, value: 0 });
  writeTarOctal({ buffer: header, length: 8, offset: 116, value: 0 });
  writeTarOctal({
    buffer: header,
    length: 12,
    offset: 124,
    value: input.data.length
  });
  writeTarOctal({ buffer: header, length: 12, offset: 136, value: 0 });
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeTarString({ buffer: header, length: 6, offset: 257, value: "ustar" });
  writeTarString({ buffer: header, length: 2, offset: 263, value: "00" });

  let checksum = 0;

  for (const byte of header) {
    checksum += byte;
  }

  const encodedChecksum = checksum.toString(8).padStart(6, "0");
  header.write(encodedChecksum, 148, 6, "ascii");
  header[154] = 0;
  header[155] = 0x20;

  const padding = Buffer.alloc(
    Math.ceil(input.data.length / 512) * 512 - input.data.length
  );
  return Buffer.concat([header, input.data, padding]);
}

async function listRelativeFiles(rootPath: string): Promise<string[]> {
  const relativeFiles: string[] = [];

  async function visit(directoryPath: string, relativeRoot: string): Promise<void> {
    const entries = (await readdir(directoryPath, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name)
    );

    for (const entry of entries) {
      const absolutePath = path.join(directoryPath, entry.name);
      const relativePath =
        relativeRoot.length > 0 ? `${relativeRoot}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
        continue;
      }

      if ((await stat(absolutePath)).isFile()) {
        relativeFiles.push(relativePath);
      }
    }
  }

  await visit(rootPath, "");
  return relativeFiles;
}

async function createPackageTarGzArchive(input: {
  archivePath: string;
  packageDirectory: string;
  rootDirectoryName?: string;
}): Promise<void> {
  const entries = await Promise.all(
    (
      await listRelativeFiles(input.packageDirectory)
    ).map(async (relativePath) =>
      buildTarEntry({
        data: await readFile(path.join(input.packageDirectory, relativePath)),
        relativePath: input.rootDirectoryName
          ? `${input.rootDirectoryName}/${relativePath}`
          : relativePath
      })
    )
  );
  const archive = Buffer.concat([...entries, Buffer.alloc(1024)]);

  await writeFile(input.archivePath, await gzipAsync(archive));
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
    gitServiceRef: overrides.gitServiceRef ?? "gitea",
    subject: overrides.subject ?? "worker-it",
    transportAuthMode: "ssh_key" as const,
    secretRef: overrides.secretRef ?? "secret://git/worker-it/ssh",
    attribution: {
      displayName: "Worker IT",
      email: overrides.attributionEmail ?? "worker-it@entangle.example"
    },
    signing: {
      mode: "none" as const
    }
  };
}

function resolveFetchUrl(input: MockFetchInput): URL {
  if (typeof input === "string" || input instanceof URL) {
    return new URL(input);
  }

  return new URL(input.url);
}

function coerceMockFetchBody(body: unknown): string | undefined {
  if (typeof body === "undefined" || body === null) {
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  throw new Error("The test Gitea fetch mock only supports string request bodies.");
}

function coerceMockFetchHeaders(
  headers: MockFetchInit["headers"]
): Record<string, string> {
  return headers ?? {};
}

function buildMockFetchResponse(input: {
  body: string;
  statusCode: number;
}): MockFetchResponse {
  return {
    status: input.statusCode,
    json: () => Promise.resolve(JSON.parse(input.body) as unknown),
    text: () => Promise.resolve(input.body)
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

  await server.ready();

  const origin = "http://gitea.test";

  vi.stubGlobal("fetch", async (input: MockFetchInput, init?: MockFetchInit) => {
    const url = resolveFetchUrl(input);

    if (url.origin !== origin) {
      throw new Error(`Unexpected test fetch target: ${url.toString()}`);
    }

    const response = await server.inject({
      headers: coerceMockFetchHeaders(init?.headers),
      method: init?.method ?? "GET",
      payload: coerceMockFetchBody(init?.body),
      url: `${url.pathname}${url.search}`
    });

    return buildMockFetchResponse(response as { body: string; statusCode: number });
  });

  return {
    close: () => server.close(),
    requests,
    url: origin
  };
}

function buildProvisioningCatalog(input: {
  apiBaseUrl: string;
  provisioningSecretRef?: string;
}) {
  return {
    schemaVersion: "1",
    catalogId: "default-catalog",
    relays: [
      {
        id: "preview-relay",
        displayName: "Preview Relay",
        readUrls: ["ws://relay.example"],
        writeUrls: ["ws://relay.example"],
        authMode: "none"
      }
    ],
    gitServices: [
      {
        id: "gitea",
        displayName: "Gitea",
        baseUrl: input.apiBaseUrl,
        remoteBase: "ssh://git@gitea.example:22",
        transportKind: "ssh",
        authMode: "ssh_key",
        defaultNamespace: "team-alpha",
        provisioning: {
          mode: "gitea_api",
          apiBaseUrl: `${input.apiBaseUrl}/api/v1`,
          secretRef:
            input.provisioningSecretRef ??
            "secret://git-services/gitea/provisioning"
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
      relayProfileRefs: ["preview-relay"],
      gitServiceRef: "gitea",
      modelEndpointRef: "shared-model"
    }
  };
}

async function createTestServer(
  options: {
    federatedControlPlane?: TestFederatedAssignmentPublisher;
    federatedControlRelayUrls?: string[];
    includeModelEndpoint?: boolean;
    includeModelSecret?: boolean;
    runtimeBackend?: RuntimeBackend;
    stateLayoutRecord?: unknown;
  } = {}
) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-host-"));
  createdDirectories.push(tempRoot);
  process.env.ENTANGLE_HOME = tempRoot;
  process.env.ENTANGLE_SECRETS_HOME = path.join(tempRoot, ".entangle-secrets");
  process.env.ENTANGLE_RUNTIME_BACKEND = "memory";
  process.env.ENTANGLE_HOST_LOGGER = "false";
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

  if (options.stateLayoutRecord) {
    await mkdir(path.join(tempRoot, "host"), { recursive: true });
    await writeFile(
      path.join(tempRoot, "host", "state-layout.json"),
      `${JSON.stringify(options.stateLayoutRecord, null, 2)}\n`,
      "utf8"
    );
  }

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

  return await hostModule.buildHostServer({
    ...(options.federatedControlPlane
      ? { federatedControlPlane: options.federatedControlPlane }
      : {}),
    ...(options.federatedControlRelayUrls
      ? { federatedControlRelayUrls: options.federatedControlRelayUrls }
      : {})
  });
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
    ...(process.env.ENTANGLE_HOST_OPERATOR_TOKEN
      ? {
          headers: {
            authorization: `Bearer ${process.env.ENTANGLE_HOST_OPERATOR_TOKEN}`
          }
        }
      : {}),
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
      const payloadText = Array.isArray(payload)
        ? Buffer.concat(payload).toString("utf8")
        : Buffer.from(payload).toString("utf8");
      resolve(JSON.parse(payloadText) as unknown);
    });
    socket.once("error", reject);
  });
}

async function injectTestSocket(
  server: InjectableWebSocketServer,
  path = "/v1/events"
): Promise<TestWebSocket> {
  return (await server.injectWS(path)) as TestWebSocket;
}

async function applySingleWorkerGraph(input: {
  externalPrincipalRefs?: string[];
  packageSourceId: string;
  server: Awaited<ReturnType<typeof createTestServer>>;
  workerPolicy?: unknown;
}) {
  const response = await input.server.inject({
    ...(process.env.ENTANGLE_HOST_OPERATOR_TOKEN
      ? {
          headers: {
            authorization: `Bearer ${process.env.ENTANGLE_HOST_OPERATOR_TOKEN}`
          }
        }
      : {}),
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
          ...(input.workerPolicy ? { policy: input.workerPolicy } : {}),
          resourceBindings: {
            externalPrincipalRefs: input.externalPrincipalRefs ?? [],
            relayProfileRefs: [],
            gitServiceRefs: ["gitea"],
            primaryGitServiceRef: "gitea"
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

async function writeAppliedSourceHistoryFixture(input: {
  candidateId: string;
  runtimeContext: RuntimeContextInspectionResponse;
  sourceHistoryId: string;
}): Promise<void> {
  const sourceWorkspaceRoot = input.runtimeContext.workspace.sourceWorkspaceRoot;

  if (!sourceWorkspaceRoot) {
    throw new Error("Expected source workspace root in runtime context.");
  }

  const gitDir = path.join(
    input.runtimeContext.workspace.runtimeRoot,
    "source-snapshot.git"
  );
  const gitEnv = {
    GIT_DIR: gitDir,
    GIT_WORK_TREE: sourceWorkspaceRoot
  };

  await runGitCommand({
    args: ["init"],
    cwd: sourceWorkspaceRoot,
    env: gitEnv
  });
  await writeFile(
    path.join(sourceWorkspaceRoot, "worker.ts"),
    "export const generated = false;\n",
    "utf8"
  );
  await runGitCommand({
    args: ["add", "--all", "--", "."],
    cwd: sourceWorkspaceRoot,
    env: gitEnv
  });
  const baseTree = await runGitCommand({
    args: ["write-tree"],
    cwd: sourceWorkspaceRoot,
    env: gitEnv
  });

  await writeFile(
    path.join(sourceWorkspaceRoot, "worker.ts"),
    "export const generated = true;\n",
    "utf8"
  );
  await runGitCommand({
    args: ["add", "--all", "--", "."],
    cwd: sourceWorkspaceRoot,
    env: gitEnv
  });
  const headTree = await runGitCommand({
    args: ["write-tree"],
    cwd: sourceWorkspaceRoot,
    env: gitEnv
  });
  const commit = await runGitCommand({
    args: ["commit-tree", headTree, "-m", `Apply ${input.candidateId}`],
    cwd: sourceWorkspaceRoot,
    env: {
      ...gitEnv,
      GIT_AUTHOR_EMAIL: "worker-it@entangle.invalid",
      GIT_AUTHOR_NAME: "Worker IT",
      GIT_COMMITTER_EMAIL: "worker-it@entangle.invalid",
      GIT_COMMITTER_NAME: "Worker IT"
    }
  });
  const timestamp = "2026-04-24T10:08:00.000Z";
  const historyRecord = sourceHistoryRecordSchema.parse({
    appliedAt: timestamp,
    baseTree,
    branch: "entangle/source-history",
    candidateId: input.candidateId,
    commit,
    graphId: input.runtimeContext.binding.graphId,
    graphRevisionId: input.runtimeContext.binding.graphRevisionId,
    headTree,
    mode: "applied_to_workspace",
    nodeId: input.runtimeContext.binding.node.nodeId,
    sessionId: "session-alpha",
    sourceChangeSummary: {
      additions: 9,
      checkedAt: timestamp,
      deletions: 2,
      fileCount: 1,
      files: [
        {
          additions: 9,
          deletions: 2,
          path: "worker.ts",
          status: "modified"
        }
      ],
      status: "changed",
      truncated: false
    },
    sourceHistoryId: input.sourceHistoryId,
    turnId: "turn-alpha",
    updatedAt: timestamp
  });

  await writeJsonFile(
    path.join(
      input.runtimeContext.workspace.runtimeRoot,
      "source-history",
      `${input.sourceHistoryId}.json`
    ),
    historyRecord
  );
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
  delete process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT;
  delete process.env.ENTANGLE_HOST_OPERATOR_TOKEN;
  delete process.env.ENTANGLE_HOST_OPERATOR_ID;
  delete process.env.ENTANGLE_HOST_LOGGER;
  vi.unstubAllGlobals();
  vi.resetModules();

  await Promise.all(
    createdDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
});

describe("buildHostServer", () => {
  it("requires the configured operator token before serving host routes", async () => {
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN = "host-secret";
    const server = await createTestServer();

    try {
      const missingTokenResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(missingTokenResponse.statusCode).toBe(401);
      expect(hostErrorResponseSchema.parse(missingTokenResponse.json())).toEqual({
        code: "unauthorized",
        message: "Entangle host operator token is required."
      });
      expect(missingTokenResponse.headers["www-authenticate"]).toBe(
        "Bearer realm=\"entangle-host\""
      );

      const invalidTokenResponse = await server.inject({
        headers: {
          authorization: "Bearer wrong-secret"
        },
        method: "GET",
        url: "/v1/host/status"
      });

      expect(invalidTokenResponse.statusCode).toBe(401);

      const authorizedResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/host/status"
      });

      expect(authorizedResponse.statusCode).toBe(200);
      const status = hostStatusResponseSchema.parse(authorizedResponse.json());
      expect(status.service).toBe("entangle-host");
      expect(status.stateLayout).toMatchObject({
        currentLayoutVersion: 1,
        recordedLayoutVersion: 1,
        status: "current"
      });
      const layoutRecord = JSON.parse(
        await readFile(
          path.join(createdDirectories[0]!, "host", "state-layout.json"),
          "utf8"
        )
      ) as { layoutVersion?: number; product?: string };
      expect(layoutRecord).toMatchObject({
        layoutVersion: 1,
        product: "entangle"
      });
    } finally {
      await server.close();
    }
  });

  it("refuses to start against a newer Entangle state layout", async () => {
    await expect(
      createTestServer({
        stateLayoutRecord: {
          createdAt: "2026-04-25T00:00:00.000Z",
          layoutVersion: 99,
          product: "entangle",
          schemaVersion: "1",
          updatedAt: "2026-04-25T00:00:00.000Z"
        }
      })
    ).rejects.toThrow("newer than the supported layout 1");
  });

  it("materializes, exports, imports, and reports Host Authority state", async () => {
    const server = await createTestServer();

    try {
      const authorityResponse = await server.inject({
        method: "GET",
        url: "/v1/authority"
      });

      expect(authorityResponse.statusCode).toBe(200);
      const authorityInspection = hostAuthorityInspectionResponseSchema.parse(
        authorityResponse.json()
      );
      expect(authorityInspection.authority.status).toBe("active");
      expect(authorityInspection.secret.status).toBe("available");

      const statusResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });
      const status = hostStatusResponseSchema.parse(statusResponse.json());
      expect(status.authority).toMatchObject({
        authorityId: authorityInspection.authority.authorityId,
        publicKey: authorityInspection.authority.publicKey,
        secretStatus: "available",
        status: "active"
      });

      const exportResponse = await server.inject({
        method: "GET",
        url: "/v1/authority/export"
      });
      expect(exportResponse.statusCode).toBe(200);
      const authorityExport = hostAuthorityExportResponseSchema.parse(
        exportResponse.json()
      );
      expect(authorityExport.secretKey).toMatch(/^[0-9a-f]{64}$/);

      const importResponse = await server.inject({
        method: "PUT",
        payload: authorityExport,
        url: "/v1/authority/import"
      });
      expect(importResponse.statusCode).toBe(200);
      expect(
        hostAuthorityImportResponseSchema.parse(importResponse.json()).authority
          .publicKey
      ).toBe(authorityExport.authority.publicKey);

      const mismatchedImportResponse = await server.inject({
        method: "PUT",
        payload: {
          ...authorityExport,
          secretKey:
            "1111111111111111111111111111111111111111111111111111111111111111"
        },
        url: "/v1/authority/import"
      });
      expect(mismatchedImportResponse.statusCode).toBe(400);
      expect(hostErrorResponseSchema.parse(mismatchedImportResponse.json())).toMatchObject({
        code: "bad_request"
      });
    } finally {
      await server.close();
    }
  });

  it("lists, trusts, revokes, and projects registered runners", async () => {
    const server = await createTestServer();

    try {
      const [{ recordRunnerHeartbeat, recordRunnerHello }] = await Promise.all([
        import("./state.js")
      ]);
      const authorityResponse = await server.inject({
        method: "GET",
        url: "/v1/authority"
      });
      const authorityInspection = hostAuthorityInspectionResponseSchema.parse(
        authorityResponse.json()
      );
      const hostAuthorityPubkey = authorityInspection.authority.publicKey;
      const runnerPubkey =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const runnerId = "runner-alpha";
      const issuedAt = new Date().toISOString();

      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt,
        nonce: "nonce-alpha",
        protocol: "entangle.observe.v1",
        runnerId,
        runnerPubkey
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/runners"
      });
      expect(listResponse.statusCode).toBe(200);
      const runnerList = runnerRegistryListResponseSchema.parse(
        listResponse.json()
      );
      expect(runnerList.runners[0]).toMatchObject({
        liveness: "online",
        registration: {
          runnerId,
          trustState: "pending"
        }
      });

      const trustResponse = await server.inject({
        method: "POST",
        payload: {
          reason: "Lab runner approved.",
          trustedBy: "operator-alpha"
        },
        url: `/v1/runners/${runnerId}/trust`
      });
      expect(trustResponse.statusCode).toBe(200);
      expect(
        runnerTrustMutationResponseSchema.parse(trustResponse.json()).runner
          .registration.trustState
      ).toBe("trusted");

      await recordRunnerHeartbeat({
        assignmentIds: ["assignment-alpha"],
        eventType: "runner.heartbeat",
        hostAuthorityPubkey,
        observedAt: new Date().toISOString(),
        operationalState: "busy",
        protocol: "entangle.observe.v1",
        runnerId,
        runnerPubkey,
        statusMessage: "Working"
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: `/v1/runners/${runnerId}`
      });
      expect(inspectionResponse.statusCode).toBe(200);
      const inspection = runnerRegistryInspectionResponseSchema.parse(
        inspectionResponse.json()
      );
      expect(inspection.runner.heartbeat).toMatchObject({
        assignmentIds: ["assignment-alpha"],
        operationalState: "busy"
      });

      const revokeResponse = await server.inject({
        method: "POST",
        payload: {
          reason: "Maintenance"
        },
        url: `/v1/runners/${runnerId}/revoke`
      });
      expect(revokeResponse.statusCode).toBe(200);
      expect(
        runnerRevokeMutationResponseSchema.parse(revokeResponse.json()).runner
          .registration.trustState
      ).toBe("revoked");

      const missingResponse = await server.inject({
        method: "GET",
        url: "/v1/runners/runner-missing"
      });
      expect(missingResponse.statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });

  it("offers, accepts, lists, inspects, and revokes runtime assignments", async () => {
    const publishedOffers: Array<{
      assignment: RuntimeAssignmentRecord;
      relayUrls: string[];
    }> = [];
    const publishedRevokes: Array<{
      assignment: RuntimeAssignmentRecord;
      reason?: string;
      relayUrls: string[];
    }> = [];
    const server = await createTestServer({
      federatedControlPlane: {
        publishRuntimeAssignmentOffer: (input) => {
          publishedOffers.push({
            assignment: input.assignment,
            relayUrls: input.relayUrls
          });
          return Promise.resolve();
        },
        publishRuntimeAssignmentRevoke: (input) => {
          publishedRevokes.push({
            assignment: input.assignment,
            ...(input.reason ? { reason: input.reason } : {}),
            relayUrls: input.relayUrls
          });
          return Promise.resolve();
        }
      },
      federatedControlRelayUrls: ["ws://relay.example"]
    });

    try {
      const [
        {
          recordRunnerHello,
          recordRuntimeAssignmentAccepted
        }
      ] = await Promise.all([import("./state.js")]);
      const packageDirectory = await createAdmittedPackageDirectory(
        createdDirectories[0]!
      );
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const authorityResponse = await server.inject({
        method: "GET",
        url: "/v1/authority"
      });
      const hostAuthorityPubkey = hostAuthorityInspectionResponseSchema.parse(
        authorityResponse.json()
      ).authority.publicKey;
      const runnerPubkey =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const runnerId = "runner-alpha";

      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt: new Date().toISOString(),
        nonce: "nonce-alpha",
        protocol: "entangle.observe.v1",
        runnerId,
        runnerPubkey
      });

      const trustResponse = await server.inject({
        method: "POST",
        url: `/v1/runners/${runnerId}/trust`
      });
      expect(trustResponse.statusCode).toBe(200);

      const offerResponse = await server.inject({
        method: "POST",
        payload: {
          assignmentId: "assignment-alpha",
          leaseDurationSeconds: 600,
          nodeId: "worker-it",
          runnerId
        },
        url: "/v1/assignments"
      });
      expect(offerResponse.statusCode).toBe(200);
      const offered = runtimeAssignmentOfferResponseSchema.parse(
        offerResponse.json()
      ).assignment;
      expect(offered).toMatchObject({
        assignmentId: "assignment-alpha",
        nodeId: "worker-it",
        runnerId,
        runtimeKind: "agent_runner",
        status: "offered"
      });
      expect(offered.lease?.expiresAt).toBeDefined();
      expect(publishedOffers).toHaveLength(1);
      expect(publishedOffers[0]).toMatchObject({
        assignment: {
          assignmentId: "assignment-alpha",
          runnerId
        },
        relayUrls: ["ws://relay.example"]
      });

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/assignments"
      });
      expect(
        runtimeAssignmentListResponseSchema.parse(listResponse.json())
          .assignments[0]?.assignmentId
      ).toBe("assignment-alpha");

      await recordRuntimeAssignmentAccepted({
        acceptedAt: new Date().toISOString(),
        assignmentId: "assignment-alpha",
        eventType: "assignment.accepted",
        hostAuthorityPubkey,
        lease: offered.lease,
        protocol: "entangle.observe.v1",
        runnerId,
        runnerPubkey
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/assignments/assignment-alpha"
      });
      expect(
        runtimeAssignmentInspectionResponseSchema.parse(
          inspectionResponse.json()
        ).assignment.status
      ).toBe("accepted");

      const projectionResponse = await server.inject({
        method: "GET",
        url: "/v1/projection"
      });
      expect(projectionResponse.statusCode).toBe(200);
      const projection = hostProjectionSnapshotSchema.parse(
        projectionResponse.json()
      );
      expect(projection.runners[0]).toMatchObject({
        publicKey: runnerPubkey,
        runnerId,
        trustState: "trusted"
      });
      expect(projection.assignments[0]).toMatchObject({
        assignmentId: "assignment-alpha",
        projection: {
          source: "observation_event"
        },
        status: "accepted"
      });

      const revokeResponse = await server.inject({
        method: "POST",
        payload: {
          reason: "Operator reassignment"
        },
        url: "/v1/assignments/assignment-alpha/revoke"
      });
      expect(revokeResponse.statusCode).toBe(200);
      expect(
        runtimeAssignmentRevokeResponseSchema.parse(revokeResponse.json())
          .assignment.status
      ).toBe("revoked");
      expect(publishedRevokes).toHaveLength(1);
      expect(publishedRevokes[0]).toMatchObject({
        assignment: {
          assignmentId: "assignment-alpha",
          status: "revoked"
        },
        reason: "Operator reassignment",
        relayUrls: ["ws://relay.example"]
      });
    } finally {
      await server.close();
    }
  });

  it("offers User Node assignments as human_interface only to compatible runners", async () => {
    const publishedOffers: Array<{
      assignment: RuntimeAssignmentRecord;
      relayUrls: string[];
    }> = [];
    const server = await createTestServer({
      federatedControlPlane: {
        publishRuntimeAssignmentOffer: (input) => {
          publishedOffers.push({
            assignment: input.assignment,
            relayUrls: input.relayUrls
          });
          return Promise.resolve();
        },
        publishRuntimeAssignmentRevoke: () => Promise.resolve()
      },
      federatedControlRelayUrls: ["ws://relay.example"]
    });

    try {
      const [{ recordRunnerHello }] = await Promise.all([import("./state.js")]);
      const packageDirectory = await createAdmittedPackageDirectory(
        createdDirectories[0]!
      );
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      const graphResponse = await server.inject({
        method: "PUT",
        payload: {
          schemaVersion: "1",
          graphId: "team-alpha",
          name: "Team Alpha",
          nodes: [
            {
              nodeId: "user-main",
              displayName: "User Main",
              nodeKind: "user"
            },
            {
              nodeId: "user-reviewer",
              displayName: "User Reviewer",
              nodeKind: "user"
            },
            {
              nodeId: "worker-it",
              displayName: "Worker IT",
              nodeKind: "worker",
              packageSourceRef: packageSourceId
            }
          ],
          edges: [
            {
              edgeId: "user-main-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            },
            {
              edgeId: "user-reviewer-to-worker",
              fromNodeId: "user-reviewer",
              toNodeId: "worker-it",
              relation: "reviews"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const authorityResponse = await server.inject({
        method: "GET",
        url: "/v1/authority"
      });
      const hostAuthorityPubkey = hostAuthorityInspectionResponseSchema.parse(
        authorityResponse.json()
      ).authority.publicKey;
      const humanRunnerPubkey =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const agentRunnerPubkey =
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
      const reviewerRunnerPubkey =
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: [],
          runtimeKinds: ["human_interface"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt: new Date().toISOString(),
        nonce: "nonce-human",
        protocol: "entangle.observe.v1",
        runnerId: "runner-human",
        runnerPubkey: humanRunnerPubkey
      });
      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: [],
          runtimeKinds: ["human_interface"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt: new Date().toISOString(),
        nonce: "nonce-human-reviewer",
        protocol: "entangle.observe.v1",
        runnerId: "runner-human-reviewer",
        runnerPubkey: reviewerRunnerPubkey
      });
      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt: new Date().toISOString(),
        nonce: "nonce-agent",
        protocol: "entangle.observe.v1",
        runnerId: "runner-agent",
        runnerPubkey: agentRunnerPubkey
      });

      expect(
        (
          await server.inject({
            method: "POST",
            url: "/v1/runners/runner-human/trust"
          })
        ).statusCode
      ).toBe(200);
      expect(
        (
          await server.inject({
            method: "POST",
            url: "/v1/runners/runner-human-reviewer/trust"
          })
        ).statusCode
      ).toBe(200);
      expect(
        (
          await server.inject({
            method: "POST",
            url: "/v1/runners/runner-agent/trust"
          })
        ).statusCode
      ).toBe(200);

      const offerResponse = await server.inject({
        method: "POST",
        payload: {
          assignmentId: "assignment-user-main",
          leaseDurationSeconds: 600,
          nodeId: "user-main",
          runnerId: "runner-human"
        },
        url: "/v1/assignments"
      });
      expect(offerResponse.statusCode).toBe(200);
      const offered = runtimeAssignmentOfferResponseSchema.parse(
        offerResponse.json()
      ).assignment;
      expect(offered).toMatchObject({
        assignmentId: "assignment-user-main",
        nodeId: "user-main",
        runnerId: "runner-human",
        runtimeKind: "human_interface",
        status: "offered"
      });
      expect(publishedOffers[0]?.assignment.runtimeKind).toBe("human_interface");

      const reviewerOfferResponse = await server.inject({
        method: "POST",
        payload: {
          assignmentId: "assignment-user-reviewer",
          leaseDurationSeconds: 600,
          nodeId: "user-reviewer",
          runnerId: "runner-human-reviewer"
        },
        url: "/v1/assignments"
      });
      expect(reviewerOfferResponse.statusCode).toBe(200);
      expect(
        runtimeAssignmentOfferResponseSchema.parse(
          reviewerOfferResponse.json()
        ).assignment
      ).toMatchObject({
        assignmentId: "assignment-user-reviewer",
        nodeId: "user-reviewer",
        runnerId: "runner-human-reviewer",
        runtimeKind: "human_interface",
        status: "offered"
      });

      const incompatibleOfferResponse = await server.inject({
        method: "POST",
        payload: {
          assignmentId: "assignment-user-main-agent",
          leaseDurationSeconds: 600,
          nodeId: "user-main",
          runnerId: "runner-agent"
        },
        url: "/v1/assignments"
      });
      expect(incompatibleOfferResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(incompatibleOfferResponse.json()))
        .toMatchObject({
          code: "conflict"
        });
    } finally {
      await server.close();
    }
  });

  it("projects artifact, source-change, and wiki refs from runner observations", async () => {
    const server = await createTestServer();

    try {
      const [
        {
          recordArtifactRefObservation,
          recordRunnerHello,
          recordSourceChangeRefObservation,
          recordWikiRefObservation
        }
      ] = await Promise.all([import("./state.js")]);
      const authorityResponse = await server.inject({
        method: "GET",
        url: "/v1/authority"
      });
      const hostAuthorityPubkey = hostAuthorityInspectionResponseSchema.parse(
        authorityResponse.json()
      ).authority.publicKey;
      const runnerPubkey =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const observedAt = new Date().toISOString();

      await recordRunnerHello({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        eventType: "runner.hello",
        hostAuthorityPubkey,
        issuedAt: observedAt,
        nonce: "nonce-alpha",
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      });
      const artifactRef = {
        artifactId: "artifact-alpha",
        artifactKind: "report_file",
        backend: "git",
        locator: {
          branch: "artifact-artifact-alpha",
          commit: "abc123",
          path: "report.md"
        },
        status: "published"
      };

      await recordArtifactRefObservation({
        artifactPreview: {
          available: true,
          bytesRead: 16,
          content: "# Report\n\nReady.",
          contentEncoding: "utf8",
          contentType: "text/markdown",
          truncated: false
        },
        artifactRef,
        eventType: "artifact.ref",
        graphId: "team-alpha",
        hostAuthorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      });
      await recordSourceChangeRefObservation({
        artifactRefs: [artifactRef],
        candidateId: "candidate-alpha",
        eventType: "source_change.ref",
        graphId: "team-alpha",
        hostAuthorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey,
        sourceChangeSummary: {
          additions: 4,
          checkedAt: observedAt,
          deletions: 1,
          fileCount: 1,
          files: [
            {
              additions: 4,
              deletions: 1,
              path: "src/app.ts",
              status: "modified"
            }
          ],
          status: "changed",
          truncated: false
        },
        status: "pending_review"
      });
      await recordWikiRefObservation({
        artifactPreview: {
          available: true,
          bytesRead: 24,
          content: "# Working Context\nReady.",
          contentEncoding: "utf8",
          contentType: "text/markdown",
          truncated: false
        },
        artifactRef: {
          artifactId: "wiki-alpha",
          artifactKind: "knowledge_summary",
          backend: "wiki",
          locator: {
            nodeId: "worker-it",
            path: "/wiki/summaries/working-context.md"
          },
          status: "published"
        },
        eventType: "wiki.ref",
        graphId: "team-alpha",
        hostAuthorityPubkey,
        nodeId: "worker-it",
        observedAt,
        protocol: "entangle.observe.v1",
        runnerId: "runner-alpha",
        runnerPubkey
      });

      const projectionResponse = await server.inject({
        method: "GET",
        url: "/v1/projection"
      });
      expect(projectionResponse.statusCode).toBe(200);
      const projection = hostProjectionSnapshotSchema.parse(
        projectionResponse.json()
      );

      expect(projection.artifactRefs[0]).toMatchObject({
        artifactId: "artifact-alpha",
        artifactPreview: {
          available: true,
          content: "# Report\n\nReady."
        },
        nodeId: "worker-it",
        projection: {
          source: "observation_event",
          updatedAt: observedAt
        },
        runnerId: "runner-alpha"
      });
      expect(projection.sourceChangeRefs[0]).toMatchObject({
        candidateId: "candidate-alpha",
        sourceChangeSummary: {
          additions: 4,
          fileCount: 1,
          status: "changed"
        },
        status: "pending_review"
      });
      expect(projection.wikiRefs[0]).toMatchObject({
        artifactId: "wiki-alpha",
        artifactPreview: {
          available: true,
          content: "# Working Context\nReady."
        },
        nodeId: "worker-it"
      });
    } finally {
      await server.close();
    }
  });

  it("records audit events for token-protected operator mutation requests", async () => {
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN = "host-secret";
    process.env.ENTANGLE_HOST_OPERATOR_ID = "ops-lead";
    const server = await createTestServer();

    try {
      const principal = buildGitPrincipalRecord({
        principalId: "worker-it-git-audit"
      });

      const unauthorizedResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: "/v1/external-principals/worker-it-git-audit"
      });

      expect(unauthorizedResponse.statusCode).toBe(401);

      const authorizedResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "PUT",
        payload: principal,
        url: "/v1/external-principals/worker-it-git-audit"
      });

      expect(authorizedResponse.statusCode).toBe(200);

      const eventsResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/events?limit=20"
      });
      const events = hostEventListResponseSchema.parse(eventsResponse.json()).events;

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authMode: "bootstrap_operator_token",
            category: "security",
            method: "PUT",
            operatorId: "ops-lead",
            path: "/v1/external-principals/worker-it-git-audit",
            statusCode: 401,
            type: "host.operator_request.completed"
          }),
          expect.objectContaining({
            authMode: "bootstrap_operator_token",
            category: "security",
            method: "PUT",
            operatorId: "ops-lead",
            path: "/v1/external-principals/worker-it-git-audit",
            statusCode: 200,
            type: "host.operator_request.completed"
          })
        ])
      );
    } finally {
      await server.close();
    }
  });

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

  it("admits local_archive package sources through host-managed package storage", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);
    const archivePath = path.join(createdDirectories[0]!, "worker-it.tar.gz");

    await createPackageTarGzArchive({
      archivePath,
      packageDirectory,
      rootDirectoryName: "worker-it"
    });

    try {
      const admitResponse = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_archive",
          archivePath
        },
        url: "/v1/package-sources/admit"
      });

      expect(admitResponse.statusCode).toBe(200);
      const inspection = packageSourceInspectionResponseSchema.parse(
        admitResponse.json()
      );

      expect(inspection.validation.ok).toBe(true);
      expect(inspection.manifest?.packageId).toBe("worker-it");
      expect(inspection.packageSource).toMatchObject({
        sourceKind: "local_archive",
        archivePath,
        materialization: {
          materializationKind: "immutable_store"
        }
      });

      const packageRoot = inspection.packageSource.materialization?.packageRoot;
      expect(packageRoot).toBeDefined();
      await expect(
        readFile(path.join(packageRoot!, "manifest.json"), "utf8")
      ).resolves.toContain('"packageId": "worker-it"');

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/package-sources"
      });
      expect(listResponse.statusCode).toBe(200);
      const listedInspection = packageSourceListResponseSchema
        .parse(listResponse.json())
        .packageSources.find(
          (candidate) =>
            candidate.packageSource.packageSourceId ===
            inspection.packageSource.packageSourceId
        );

      expect(listedInspection?.validation.ok).toBe(true);
      expect(listedInspection?.manifest?.packageId).toBe("worker-it");
    } finally {
      await server.close();
    }
  });

  it("rejects invalid local_archive package admission without persisting it", async () => {
    const server = await createTestServer();
    const archivePath = path.join(createdDirectories[0]!, "invalid.tar.gz");

    await writeFile(archivePath, "not a tar archive", "utf8");

    try {
      const response = await server.inject({
        method: "POST",
        payload: {
          sourceKind: "local_archive",
          archivePath
        },
        url: "/v1/package-sources/admit"
      });

      expect(response.statusCode).toBe(400);
      const inspection = packageSourceInspectionResponseSchema.parse(
        response.json()
      );
      expect(inspection.packageSource.sourceKind).toBe("local_archive");
      expect(inspection.validation.ok).toBe(false);
      expect(inspection.validation.findings).toContainEqual(
        expect.objectContaining({
          code: "archive_package_extract_failed",
          path: ["archivePath"]
        })
      );

      const listResponse = await server.inject({
        method: "GET",
        url: "/v1/package-sources"
      });
      expect(listResponse.statusCode).toBe(200);
      expect(
        packageSourceListResponseSchema.parse(listResponse.json()).packageSources
      ).toHaveLength(0);
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

  it("deletes unused package sources through the host surface", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/v1/package-sources/${packageSourceId}`
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(
        packageSourceDeletionResponseSchema.parse(deleteResponse.json())
      ).toEqual({
        deletedPackageSourceId: packageSourceId
      });

      const deletedInspectionResponse = await server.inject({
        method: "GET",
        url: `/v1/package-sources/${packageSourceId}`
      });
      expect(deletedInspectionResponse.statusCode).toBe(404);

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=10"
      });
      expect(
        hostEventListResponseSchema
          .parse(eventsResponse.json())
          .events.some(
            (event) =>
              event.type === "package_source.deleted" &&
              event.packageSourceId === packageSourceId
          )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("rejects package-source deletion while active graph nodes reference it", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/v1/package-sources/${packageSourceId}`
      });

      expect(deleteResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(deleteResponse.json())).toMatchObject({
        code: "conflict",
        details: {
          nodeIds: ["worker-it"]
        }
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: `/v1/package-sources/${packageSourceId}`
      });
      expect(inspectionResponse.statusCode).toBe(200);
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
          gitServiceRef: "gitea"
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

  it("deletes unused external principals through the host surface", async () => {
    const server = await createTestServer();

    try {
      const principal = buildGitPrincipalRecord();
      const upsertResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(upsertResponse.statusCode).toBe(200);

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/v1/external-principals/${principal.principalId}`
      });

      expect(deleteResponse.statusCode).toBe(200);
      expect(
        externalPrincipalDeletionResponseSchema.parse(deleteResponse.json())
      ).toEqual({
        deletedPrincipalId: principal.principalId
      });

      const deletedInspectionResponse = await server.inject({
        method: "GET",
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(deletedInspectionResponse.statusCode).toBe(404);

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=10"
      });
      expect(
        hostEventListResponseSchema
          .parse(eventsResponse.json())
          .events.some(
            (event) =>
              event.type === "external_principal.deleted" &&
              event.principalId === principal.principalId
          )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("rejects external-principal deletion while active graph nodes reference it", async () => {
    const server = await createTestServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const principal = buildGitPrincipalRecord();
      const upsertResponse = await server.inject({
        method: "PUT",
        payload: principal,
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(upsertResponse.statusCode).toBe(200);

      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        externalPrincipalRefs: [principal.principalId],
        packageSourceId,
        server
      });

      const deleteResponse = await server.inject({
        method: "DELETE",
        url: `/v1/external-principals/${principal.principalId}`
      });

      expect(deleteResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(deleteResponse.json())).toMatchObject({
        code: "conflict",
        details: {
          nodeIds: ["worker-it"]
        }
      });

      const inspectionResponse = await server.inject({
        method: "GET",
        url: `/v1/external-principals/${principal.principalId}`
      });
      expect(inspectionResponse.statusCode).toBe(200);
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

      const socket = await injectTestSocket(server);

      try {
        const liveEventPromise = readNextSocketEvent(socket);
        const upsertResponse = await server.inject({
          method: "PUT",
          payload: buildGitPrincipalRecord({
            principalId: "worker-it-git-stream"
          }),
          url: "/v1/external-principals/worker-it-git-stream"
        });

        expect(upsertResponse.statusCode).toBe(200);

        const liveEvent = hostEventRecordSchema.parse(await liveEventPromise);
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
            gitServiceRefs: ["gitea"],
            primaryGitServiceRef: "gitea"
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
            gitServiceRefs: ["gitea"],
            primaryGitServiceRef: "gitea"
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
            gitServiceRefs: ["gitea"],
            primaryGitServiceRef: "gitea",
            relayProfileRefs: ["preview-relay"]
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
      const runtimeList = runtimeListResponseSchema.parse(runtimesResponse.json());
      expect(runtimeList).toMatchObject({
        runtimes: [
          {
            backendKind: "memory",
            nodeId: "worker-it",
            desiredState: "running",
            contextAvailable: true,
            observedState: "running",
            packageSourceId: admittedPackageSourceId,
            workspaceHealth: {
              layoutVersion: "entangle-workspace-v1",
              status: "ready"
            }
          }
        ]
      });
      const workspaceHealth = runtimeList.runtimes[0]?.workspaceHealth;
      expect(
        workspaceHealth?.surfaces.some(
          (surface) =>
            surface.surface === "source_workspace" &&
            surface.status === "ready"
        )
      ).toBe(true);
      expect(
        workspaceHealth?.surfaces.some(
          (surface) =>
            surface.surface === "engine_state" && surface.status === "ready"
        )
      ).toBe(true);
      expect(
        workspaceHealth?.surfaces.some(
          (surface) =>
            surface.surface === "wiki_repository" &&
            surface.status === "ready"
        )
      ).toBe(true);

      const contextResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });
      expect(contextResponse.statusCode).toBe(200);
      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        contextResponse.json()
      );
      expect(runtimeContext).toMatchObject({
        agentRuntimeContext: {
          engineProfile: {
            id: "opencode-default",
            kind: "opencode_server"
          },
          engineProfileRef: "opencode-default",
          mode: "coding_agent"
        },
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
      expect(runtimeContext.workspace.engineStateRoot).toContain("engine-state");
      expect(runtimeContext.workspace.sourceWorkspaceRoot).toContain("source");
      expect(runtimeContext.workspace.wikiRepositoryRoot).toContain(
        "wiki-repository"
      );

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
      const runnerJoinConfig = runnerJoinConfigSchema.parse(
        JSON.parse(
          await readFile(path.join(contextPath, "runner-join.json"), "utf8")
        ) as unknown
      );
      expect(runnerJoinConfig).toMatchObject({
        capabilities: {
          agentEngineKinds: ["opencode_server"],
          runtimeKinds: ["agent_runner"]
        },
        identity: {
          publicKey: runtimeContext.identityContext.publicKey,
          secretDelivery: {
            envVar: "ENTANGLE_NOSTR_SECRET_KEY",
            mode: "env_var"
          }
        },
        runnerId: "worker-it"
      });
      expect(runnerJoinConfig.hostAuthorityPubkey).toHaveLength(64);
      expect(runnerJoinConfig.relayUrls.length).toBeGreaterThan(0);
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

  it("exports portable runtime bootstrap bundles only through authenticated Host API", async () => {
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN = "host-secret";
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(
      createdDirectories[0]!
    );

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({ packageSourceId, server });

      const unauthorizedResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/bootstrap-bundle"
      });
      expect(unauthorizedResponse.statusCode).toBe(401);

      const bundleResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/runtimes/worker-it/bootstrap-bundle"
      });
      expect(bundleResponse.statusCode).toBe(200);
      const bootstrapBundle = runtimeBootstrapBundleResponseSchema.parse(
        bundleResponse.json()
      );
      const serializedBundle = JSON.stringify(bootstrapBundle);

      expect(bootstrapBundle).toMatchObject({
        graphId: "team-alpha",
        nodeId: "worker-it",
        runtimeContext: {
          workspace: {
            packageRoot: "/entangle/runtime/workspace/package",
            runtimeRoot: "/entangle/runtime/workspace/runtime"
          }
        }
      });
      expect(serializedBundle).not.toContain(packageDirectory);

      const packageSnapshot = bootstrapBundle.snapshots.find(
        (snapshot) => snapshot.root === "package"
      );
      const manifestFile = packageSnapshot?.files.find(
        (file) => file.path === "manifest.json"
      );
      expect(manifestFile).toBeDefined();
      expect(
        JSON.parse(
          Buffer.from(manifestFile?.contentBase64 ?? "", "base64").toString("utf8")
        )
      ).toMatchObject({
        packageId: "worker-it"
      });
    } finally {
      await server.close();
    }
  });

  it("exports runtime identity secret material only through authenticated Host API", async () => {
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN = "host-secret";
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(
      createdDirectories[0]!
    );

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({ packageSourceId, server });

      const unauthorizedResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/identity-secret"
      });
      expect(unauthorizedResponse.statusCode).toBe(401);

      const contextResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/runtimes/worker-it/context"
      });
      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        contextResponse.json()
      );

      const secretResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/runtimes/worker-it/identity-secret"
      });
      expect(secretResponse.statusCode).toBe(200);
      const identitySecret = runtimeIdentitySecretResponseSchema.parse(
        secretResponse.json()
      );
      expect(identitySecret).toMatchObject({
        graphId: "team-alpha",
        nodeId: "worker-it",
        publicKey: runtimeContext.identityContext.publicKey,
        secretDelivery: {
          envVar: "ENTANGLE_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      });
      expect(identitySecret.secretKey).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      await server.close();
    }
  });

  it("exports User Node bootstrap bundles and identity secrets for Human Interface Runtime", async () => {
    process.env.ENTANGLE_HOST_OPERATOR_TOKEN = "host-secret";
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(
      createdDirectories[0]!
    );

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({ packageSourceId, server });

      const unauthorizedResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/user-main/bootstrap-bundle"
      });
      expect(unauthorizedResponse.statusCode).toBe(401);

      const bundleResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/runtimes/user-main/bootstrap-bundle"
      });
      expect(bundleResponse.statusCode).toBe(200);
      const bootstrapBundle = runtimeBootstrapBundleResponseSchema.parse(
        bundleResponse.json()
      );
      expect(bootstrapBundle).toMatchObject({
        graphId: "team-alpha",
        nodeId: "user-main",
        runtimeContext: {
          agentRuntimeContext: {
            mode: "disabled"
          },
          binding: {
            node: {
              nodeId: "user-main",
              nodeKind: "user"
            }
          }
        }
      });
      expect(
        bootstrapBundle.runtimeContext.relayContext.edgeRoutes.find(
          (route) => route.peerNodeId === "worker-it"
        )?.peerPubkey
      ).toHaveLength(64);

      const userNodesResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes"
      });
      const userNodeIdentity = userNodeIdentityListResponseSchema
        .parse(userNodesResponse.json())
        .userNodes.find((userNode) => userNode.nodeId === "user-main");
      expect(userNodeIdentity?.publicKey).toBe(
        bootstrapBundle.runtimeContext.identityContext.publicKey
      );

      const inboxResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox"
      });
      expect(inboxResponse.statusCode).toBe(200);
      expect(userNodeInboxResponseSchema.parse(inboxResponse.json())).toMatchObject({
        conversations: [],
        userNodeId: "user-main"
      });

      const conversationResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox/conversation-alpha"
      });
      expect(conversationResponse.statusCode).toBe(200);
      expect(
        userNodeConversationResponseSchema.parse(conversationResponse.json())
      ).toMatchObject({
        conversationId: "conversation-alpha",
        messages: [],
        userNodeId: "user-main"
      });

      const workerPubkey =
        bootstrapBundle.runtimeContext.relayContext.edgeRoutes.find(
          (route) => route.peerNodeId === "worker-it"
        )?.peerPubkey;
      if (!workerPubkey) {
        throw new Error("Expected worker peer pubkey in User Node bootstrap.");
      }
      expect(workerPubkey).toHaveLength(64);
      const inboundResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "POST",
        payload: {
          eventId:
            "abababababababababababababababababababababababababababababababab",
          message: {
            constraints: {
              approvalRequiredBeforeAction: false
            },
            conversationId: "conversation-alpha",
            fromNodeId: "worker-it",
            fromPubkey: workerPubkey,
            graphId: "team-alpha",
            intent: "Report back to the User Node.",
            messageType: "task.result",
            parentMessageId:
              "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
            protocol: "entangle.a2a.v1",
            responsePolicy: {
              closeOnResult: true,
              maxFollowups: 0,
              responseRequired: false
            },
            sessionId: "session-alpha",
            toNodeId: "user-main",
            toPubkey: bootstrapBundle.runtimeContext.identityContext.publicKey,
            turnId: "turn-result",
            work: {
              artifactRefs: [],
              metadata: {},
              summary: "The worker completed the task."
            }
          },
          receivedAt: new Date().toISOString()
        },
        url: "/v1/user-nodes/user-main/messages/inbound"
      });
      expect(inboundResponse.statusCode).toBe(200);
      expect(userNodeMessageRecordSchema.parse(inboundResponse.json()))
        .toMatchObject({
          conversationId: "conversation-alpha",
          direction: "inbound",
          fromNodeId: "worker-it",
          peerNodeId: "worker-it",
          summary: "The worker completed the task.",
          userNodeId: "user-main"
        });

      const inboxWithInboundResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox"
      });
      expect(
        userNodeInboxResponseSchema.parse(inboxWithInboundResponse.json())
          .conversations[0]
      ).toMatchObject({
        conversationId: "conversation-alpha",
        lastMessageType: "task.result",
        peerNodeId: "worker-it",
        unreadCount: 1,
        userNodeId: "user-main"
      });

      const conversationWithInboundResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox/conversation-alpha"
      });
      expect(
        userNodeConversationResponseSchema.parse(
          conversationWithInboundResponse.json()
        ).messages[0]
      ).toMatchObject({
        direction: "inbound",
        summary: "The worker completed the task."
      });

      const readResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "POST",
        url: "/v1/user-nodes/user-main/inbox/conversation-alpha/read"
      });
      expect(readResponse.statusCode).toBe(200);
      const readResult = userNodeConversationReadResponseSchema.parse(
        readResponse.json()
      );
      expect(readResult).toMatchObject({
        conversation: {
          conversationId: "conversation-alpha",
          unreadCount: 0
        },
        read: {
          conversationId: "conversation-alpha",
          userNodeId: "user-main"
        }
      });
      expect(readResult.conversation?.lastReadAt).toEqual(expect.any(String));

      const inboxAfterReadResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox"
      });
      const inboxAfterRead = userNodeInboxResponseSchema.parse(
        inboxAfterReadResponse.json()
      ).conversations[0];
      expect(inboxAfterRead).toMatchObject({
        conversationId: "conversation-alpha",
        unreadCount: 0
      });
      expect(inboxAfterRead?.lastReadAt).toEqual(expect.any(String));

      const inboundApprovalResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "POST",
        payload: {
          eventId:
            "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
          message: {
            constraints: {
              approvalRequiredBeforeAction: false
            },
            conversationId: "conversation-alpha",
            fromNodeId: "worker-it",
            fromPubkey: workerPubkey,
            graphId: "team-alpha",
            intent: "Request approval from the User Node.",
            messageType: "approval.request",
            parentMessageId:
              "abababababababababababababababababababababababababababababababab",
            protocol: "entangle.a2a.v1",
            responsePolicy: {
              closeOnResult: false,
              maxFollowups: 1,
              responseRequired: true
            },
            sessionId: "session-alpha",
            toNodeId: "user-main",
            toPubkey: bootstrapBundle.runtimeContext.identityContext.publicKey,
            turnId: "turn-approval",
            work: {
              artifactRefs: [],
              metadata: {
                approval: {
                  approvalId: "approval-alpha",
                  approverNodeIds: ["user-main"],
                  operation: "source_application"
                }
              },
              summary: "Approve source application."
            }
          },
          receivedAt: new Date().toISOString()
        },
        url: "/v1/user-nodes/user-main/messages/inbound"
      });
      expect(inboundApprovalResponse.statusCode).toBe(200);
      expect(userNodeMessageRecordSchema.parse(inboundApprovalResponse.json()))
        .toMatchObject({
          approval: {
            approvalId: "approval-alpha",
            operation: "source_application"
          },
          messageType: "approval.request"
        });

      const messageInspectionResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/messages/efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef"
      });
      expect(messageInspectionResponse.statusCode).toBe(200);
      expect(
        userNodeMessageInspectionResponseSchema.parse(
          messageInspectionResponse.json()
        ).message
      ).toMatchObject({
        approval: {
          approvalId: "approval-alpha",
          operation: "source_application"
        },
        conversationId: "conversation-alpha",
        messageType: "approval.request"
      });

      const inboxWithApprovalResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/user-nodes/user-main/inbox"
      });
      expect(
        userNodeInboxResponseSchema.parse(inboxWithApprovalResponse.json())
          .conversations[0]
      ).toMatchObject({
        pendingApprovalIds: ["approval-alpha"]
      });

      const secretResponse = await server.inject({
        headers: {
          authorization: "Bearer host-secret"
        },
        method: "GET",
        url: "/v1/runtimes/user-main/identity-secret"
      });
      expect(secretResponse.statusCode).toBe(200);
      const identitySecret = runtimeIdentitySecretResponseSchema.parse(
        secretResponse.json()
      );
      expect(identitySecret).toMatchObject({
        graphId: "team-alpha",
        nodeId: "user-main",
        publicKey: userNodeIdentity?.publicKey,
        secretDelivery: {
          envVar: "ENTANGLE_NOSTR_SECRET_KEY",
          mode: "env_var"
        }
      });
      expect(identitySecret.secretKey).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      await server.close();
    }
  });

  it("injects non-secret peer runtime identities into non-user edge routes", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
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
              packageSourceRef: packageSourceId
            },
            {
              nodeId: "reviewer-it",
              displayName: "Reviewer IT",
              nodeKind: "reviewer",
              packageSourceRef: packageSourceId
            }
          ],
          edges: [
            {
              edgeId: "user-to-worker",
              fromNodeId: "user-main",
              toNodeId: "worker-it",
              relation: "delegates_to"
            },
            {
              edgeId: "worker-to-reviewer",
              fromNodeId: "worker-it",
              toNodeId: "reviewer-it",
              relation: "reviews"
            }
          ]
        },
        url: "/v1/graph"
      });
      expect(graphResponse.statusCode).toBe(200);

      const workerContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );
      const reviewerContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/reviewer-it/context"
          })
        ).json()
      );
      const reviewerRoute = workerContext.relayContext.edgeRoutes.find(
        (route) => route.peerNodeId === "reviewer-it"
      );
      const userRoute = workerContext.relayContext.edgeRoutes.find(
        (route) => route.peerNodeId === "user-main"
      );
      const userNodesResponse = await server.inject({
        method: "GET",
        url: "/v1/user-nodes"
      });
      const userNodeIdentity = userNodeIdentityListResponseSchema
        .parse(userNodesResponse.json())
        .userNodes.find((userNode) => userNode.nodeId === "user-main");

      expect(userNodeIdentity).toBeDefined();

      expect(reviewerRoute).toMatchObject({
        edgeId: "worker-to-reviewer",
        peerNodeId: "reviewer-it",
        peerPubkey: reviewerContext.identityContext.publicKey,
        relation: "reviews"
      });
      expect(userRoute).toMatchObject({
        edgeId: "user-to-worker",
        peerNodeId: "user-main",
        peerPubkey: userNodeIdentity?.publicKey,
        relation: "delegates_to"
      });
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
                gitServiceRefs: ["gitea"],
                primaryGitServiceRef: "gitea",
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
                gitServiceRef: "gitea"
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
                gitServiceRefs: ["gitea"],
                primaryGitServiceRef: "gitea",
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
        gitServiceRef: "gitea",
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
    const server = await createTestServer({ includeModelEndpoint: true });
    const giteaApi = await createTestGiteaApiServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/gitea/provisioning",
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
            gitServiceRef: "gitea",
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
    const server = await createTestServer({ includeModelEndpoint: true });
    const giteaApi = await createTestGiteaApiServer({
      currentUserLogin: "team-alpha"
    });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/gitea/provisioning",
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
    const server = await createTestServer({ includeModelEndpoint: true });
    const giteaApi = await createTestGiteaApiServer({
      existingRepositories: [
        {
          owner: "team-alpha",
          repositoryName: "team-alpha"
        }
      ]
    });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/gitea/provisioning",
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
    const server = await createTestServer({ includeModelEndpoint: true });
    const giteaApi = await createTestGiteaApiServer();
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
            gitServiceRef: "gitea",
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

  it("provisions a non-primary gitea_api publication target before git push", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const giteaApi = await createTestGiteaApiServer();
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      await writeSecretRefFile(
        "secret://git-services/gitea/provisioning",
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
        server,
        workerPolicy: {
          sourceMutation: {
            applyRequiresApproval: false,
            nonPrimaryPublishRequiresApproval: false,
            publishRequiresApproval: false
          }
        }
      });

      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );
      await writeAppliedSourceHistoryFixture({
        candidateId: "source-change-gitea-target",
        runtimeContext,
        sourceHistoryId: "source-history-gitea-target"
      });

      const publishResponse = await server.inject({
        method: "POST",
        payload: {
          publishedBy: "operator-alpha",
          reason: "Publish source history to a provisioned non-primary target.",
          targetRepositoryName: "secondary-target"
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-gitea-target/publish"
      });

      expect(publishResponse.statusCode).toBe(200);
      const publication = runtimeSourceHistoryPublicationResponseSchema.parse(
        publishResponse.json()
      );
      expect(publication.entry.publication).toMatchObject({
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "secondary-target"
      });
      expect(publication.artifact).toMatchObject({
        publication: {
          state: "failed"
        },
        ref: {
          locator: {
            repositoryName: "secondary-target"
          }
        }
      });
      expect(publication.artifact.publication?.lastError).toContain(
        "Remote git operations require a git principal binding"
      );

      expect(
        giteaApi.requests.some(
          (request) =>
            request.method === "POST" &&
            request.url === "/api/v1/orgs/team-alpha/repos" &&
            request.authorization === "token gitea-provisioning-token" &&
            JSON.stringify(request.body) ===
              JSON.stringify({
                auto_init: false,
                name: "secondary-target",
                private: true
              })
        )
      ).toBe(true);

      const provisioningRecordPath = path.join(
        process.env.ENTANGLE_HOME!,
        "host",
        "observed",
        "git-repository-targets",
        "gitea-team-alpha-secondary-target.json"
      );
      const provisioningRecord = gitRepositoryProvisioningRecordSchema.parse(
        JSON.parse(await readFile(provisioningRecordPath, "utf8"))
      );
      expect(provisioningRecord).toMatchObject({
        created: true,
        state: "ready",
        target: {
          gitServiceRef: "gitea",
          namespace: "team-alpha",
          repositoryName: "secondary-target"
        }
      });

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });

      expect(runtimeResponse.statusCode).toBe(200);
      await expect(readFile(provisioningRecordPath, "utf8")).resolves.toContain(
        "secondary-target"
      );
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
          catalogId: "default-catalog",
          relays: [
            {
              id: "preview-relay",
              displayName: "Preview Relay",
              readUrls: ["ws://relay.example"],
              writeUrls: ["ws://relay.example"],
              authMode: "none"
            }
          ],
          gitServices: [
            {
              id: "gitea",
              displayName: "Gitea",
              baseUrl: "https://gitea.example",
              remoteBase: "ssh://git@gitea.example:22",
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
              baseUrl: "https://backup.gitea.example",
              remoteBase: "ssh://git@backup.gitea.example:22",
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
            relayProfileRefs: ["preview-relay"],
            modelEndpointRef: "shared-model"
          }
        },
        url: "/v1/catalog"
      });
      expect(catalogResponse.statusCode).toBe(200);

      for (const principal of [
        buildGitPrincipalRecord({
          principalId: "worker-it-git-main",
          gitServiceRef: "gitea",
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
                gitServiceRefs: ["gitea", "backup-gitea"],
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
      const reportPath = path.join(
        runtimeContext.workspace.artifactWorkspaceRoot,
        "reports",
        "session-alpha",
        "turn-001.md"
      );
      const artifactRecord = artifactRecordSchema.parse({
        createdAt: "2026-04-22T00:00:00.000Z",
        materialization: {
          localPath: reportPath,
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
            gitServiceRef: "gitea",
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
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, "# Turn Report\n\nPrepared the report.\n", "utf8");
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

      const artifactResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifacts/report-turn-001"
      });

      expect(artifactResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactInspectionResponseSchema.parse(artifactResponse.json())
      ).toEqual({
        artifact: artifactRecord
      });

      const previewResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifacts/report-turn-001/preview"
      });

      expect(previewResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactPreviewResponseSchema.parse(previewResponse.json())
      ).toMatchObject({
        artifact: {
          ref: {
            artifactId: "report-turn-001"
          }
        },
        preview: {
          available: true,
          content: "# Turn Report\n\nPrepared the report.\n",
          contentType: "text/markdown",
          truncated: false
        }
      });

      const workingContextPath = path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "summaries",
        "working-context.md"
      );
      const taskPagePath = path.join(
        runtimeContext.workspace.memoryRoot,
        "wiki",
        "tasks",
        "session-alpha",
        "turn-001.md"
      );
      await mkdir(path.dirname(workingContextPath), { recursive: true });
      await mkdir(path.dirname(taskPagePath), { recursive: true });
      await writeFile(
        workingContextPath,
        "# Working Context Summary\n\nCurrent focus.\n",
        "utf8"
      );
      await writeFile(
        taskPagePath,
        "# Task Memory session-alpha / turn-001\n\nCompleted task.\n",
        "utf8"
      );

      const memoryResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/memory"
      });

      expect(memoryResponse.statusCode).toBe(200);
      expect(
        runtimeMemoryInspectionResponseSchema.parse(memoryResponse.json())
      ).toMatchObject({
        focusedRegisters: [
          {
            kind: "summary",
            path: "wiki/summaries/working-context.md"
          }
        ],
        nodeId: "worker-it",
        taskPages: [
          {
            kind: "task",
            path: "wiki/tasks/session-alpha/turn-001.md"
          }
        ]
      });

      const memoryPageResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/memory/page?path=" +
          encodeURIComponent("wiki/summaries/working-context.md")
      });

      expect(memoryPageResponse.statusCode).toBe(200);
      expect(
        runtimeMemoryPageInspectionResponseSchema.parse(
          memoryPageResponse.json()
        )
      ).toMatchObject({
        nodeId: "worker-it",
        page: {
          kind: "summary",
          path: "wiki/summaries/working-context.md"
        },
        preview: {
          available: true,
          content: "# Working Context Summary\n\nCurrent focus.\n",
          contentType: "text/markdown",
          truncated: false
        }
      });

      const escapedMemoryPageResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/memory/page?path=" +
          encodeURIComponent("../outside.md")
      });

      expect(escapedMemoryPageResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(escapedMemoryPageResponse.json())).toEqual({
        code: "not_found",
        message: "Memory page '../outside.md' was not found for runtime 'worker-it'."
      });

      const missingArtifactResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifacts/missing-artifact"
      });

      expect(missingArtifactResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(missingArtifactResponse.json())).toEqual({
        code: "not_found",
        message: "Artifact 'missing-artifact' was not found for runtime 'worker-it'."
      });
    } finally {
      await server.close();
    }
  });

  it("lists and inspects persisted runtime turns through the host surface", async () => {
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
      const turnRecord = {
        consumedArtifactIds: ["artifact-inbound-001"],
        conversationId: "conv-alpha",
        emittedHandoffMessageIds: [],
        engineOutcome: {
          providerStopReason: "end_turn",
          stopReason: "completed",
          toolExecutions: [
            {
              outcome: "success",
              sequence: 1,
              toolCallId: "toolu_alpha",
              toolId: "inspect_artifact_input"
            }
          ],
          usage: {
            inputTokens: 42,
            outputTokens: 12
          }
        },
        graphId: "team-alpha",
        nodeId: "worker-it",
        phase: "emitting",
        producedArtifactIds: ["report-turn-001"],
        requestedApprovalIds: ["approval-source-publication"],
        sessionId: "session-alpha",
        sourceChangeCandidateIds: [],
        startedAt: "2026-04-24T10:00:00.000Z",
        triggerKind: "message",
        turnId: "turn-alpha",
        updatedAt: "2026-04-24T10:05:00.000Z"
      };
      const approvalRecord = approvalRecordSchema.parse({
        approvalId: "approval-source-publication",
        approverNodeIds: ["user-main"],
        conversationId: "conv-alpha",
        graphId: "team-alpha",
        operation: "source_publication",
        reason: "Publish the source history artifact.",
        requestedAt: "2026-04-24T10:04:00.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-history-alpha",
          kind: "source_history"
        },
        sessionId: "session-alpha",
        status: "pending",
        updatedAt: "2026-04-24T10:04:30.000Z"
      });
      await writeJsonFile(
        path.join(runtimeContext.workspace.runtimeRoot, "turns", "turn-alpha.json"),
        turnRecord
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-source-publication.json"
        ),
        approvalRecord
      );

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });

      expect(runtimeResponse.statusCode).toBe(200);
      expect(
        runtimeInspectionResponseSchema.parse(runtimeResponse.json()).agentRuntime
      ).toMatchObject({
        lastProducedArtifactIds: ["report-turn-001"],
        lastRequestedApprovalIds: ["approval-source-publication"],
        pendingApprovalIds: ["approval-source-publication"]
      });

      const turnsResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/turns"
      });

      expect(turnsResponse.statusCode).toBe(200);
      expect(runtimeTurnListResponseSchema.parse(turnsResponse.json())).toEqual({
        turns: [turnRecord]
      });

      const turnResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/turns/turn-alpha"
      });

      expect(turnResponse.statusCode).toBe(200);
      expect(runtimeTurnInspectionResponseSchema.parse(turnResponse.json())).toEqual({
        turn: turnRecord
      });

      const missingTurnResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/turns/missing-turn"
      });

      expect(missingTurnResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(missingTurnResponse.json())).toEqual({
        code: "not_found",
        message: "Turn 'missing-turn' was not found for runtime 'worker-it'."
      });
    } finally {
      await server.close();
    }
  });

  it("lists and inspects persisted source change candidates through the host surface", async () => {
    const remoteSourceRepositoryBasePath = await mkdtemp(
      path.join(os.tmpdir(), "entangle-source-history-remote-")
    );
    createdDirectories.push(remoteSourceRepositoryBasePath);
    const remoteSourceRepositoryPath = path.join(
      remoteSourceRepositoryBasePath,
      "team-alpha",
      "team-alpha.git"
    );
    await mkdir(path.dirname(remoteSourceRepositoryPath), { recursive: true });
    await runGitCommand({
      args: ["init", "--bare", remoteSourceRepositoryPath],
      cwd: remoteSourceRepositoryBasePath
    });
    process.env.ENTANGLE_DEFAULT_GIT_NAMESPACE = "team-alpha";
    process.env.ENTANGLE_DEFAULT_GIT_REMOTE_BASE = pathToFileURL(
      remoteSourceRepositoryBasePath
    ).toString();
    process.env.ENTANGLE_DEFAULT_GIT_TRANSPORT = "file";
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server,
        workerPolicy: {
          sourceMutation: {
            applyRequiresApproval: true,
            nonPrimaryPublishRequiresApproval: true,
            publishRequiresApproval: false
          }
        }
      });

      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        (
          await server.inject({
            method: "GET",
            url: "/v1/runtimes/worker-it/context"
          })
        ).json()
      );

      const gitDir = path.join(
        runtimeContext.workspace.runtimeRoot,
        "source-snapshot.git"
      );
      const sourceWorkspaceRoot = runtimeContext.workspace.sourceWorkspaceRoot;

      if (!sourceWorkspaceRoot) {
        throw new Error("Expected source workspace root in runtime context.");
      }

      const sourceApplicationApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-application-alpha",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_application",
        reason: "Approve accepted source application.",
        requestedAt: "2026-04-24T00:00:00.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-turn-alpha",
          kind: "source_change_candidate",
          label: "source-change-turn-alpha"
        },
        sessionId: "session-alpha",
        status: "approved",
        updatedAt: "2026-04-24T00:00:01.000Z"
      });
      const sourceApplicationWrongSessionApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-application-other-session",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_application",
        reason: "Approve a different source application session.",
        requestedAt: "2026-04-24T00:00:30.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-turn-alpha",
          kind: "source_change_candidate",
          label: "source-change-turn-alpha"
        },
        sessionId: "session-other",
        status: "approved",
        updatedAt: "2026-04-24T00:00:31.000Z"
      });
      const sourceApplicationWrongOperationApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-application-wrong-operation",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_publication",
        reason: "Approve a different source mutation operation.",
        requestedAt: "2026-04-24T00:00:40.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-turn-alpha",
          kind: "source_change_candidate",
          label: "source-change-turn-alpha"
        },
        sessionId: "session-alpha",
        status: "approved",
        updatedAt: "2026-04-24T00:00:41.000Z"
      });
      const sourceApplicationWrongResourceApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-application-wrong-resource",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_application",
        reason: "Approve a different source change candidate.",
        requestedAt: "2026-04-24T00:00:50.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-other",
          kind: "source_change_candidate",
          label: "source-change-other"
        },
        sessionId: "session-alpha",
        status: "approved",
        updatedAt: "2026-04-24T00:00:51.000Z"
      });
      const sourcePublicationApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-publication-alpha",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_publication",
        reason: "Approve source publication to a non-primary target.",
        requestedAt: "2026-04-24T00:01:00.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id:
            "source-history-source-change-turn-alpha|gitea|team-alpha|missing-target",
          kind: "source_history_publication",
          label:
            "source-history-source-change-turn-alpha -> gitea/team-alpha/missing-target"
        },
        sessionId: "session-alpha",
        status: "approved",
        updatedAt: "2026-04-24T00:01:01.000Z"
      });
      const sourcePublicationWrongResourceApproval = approvalRecordSchema.parse({
        approvalId: "approval-source-publication-wrong-resource",
        approverNodeIds: ["operator-alpha"],
        graphId: runtimeContext.binding.graphId,
        operation: "source_publication",
        reason: "Approve source publication to a different target.",
        requestedAt: "2026-04-24T00:01:20.000Z",
        requestedByNodeId: "worker-it",
        resource: {
          id:
            "source-history-source-change-turn-alpha|gitea|team-alpha|other-target",
          kind: "source_history_publication",
          label:
            "source-history-source-change-turn-alpha -> gitea/team-alpha/other-target"
        },
        sessionId: "session-alpha",
        status: "approved",
        updatedAt: "2026-04-24T00:01:21.000Z"
      });
      await mkdir(path.join(runtimeContext.workspace.runtimeRoot, "approvals"), {
        recursive: true
      });
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourceApplicationApproval.approvalId}.json`
        ),
        JSON.stringify(sourceApplicationApproval, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourceApplicationWrongSessionApproval.approvalId}.json`
        ),
        JSON.stringify(sourceApplicationWrongSessionApproval, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourcePublicationApproval.approvalId}.json`
        ),
        JSON.stringify(sourcePublicationApproval, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourceApplicationWrongOperationApproval.approvalId}.json`
        ),
        JSON.stringify(sourceApplicationWrongOperationApproval, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourceApplicationWrongResourceApproval.approvalId}.json`
        ),
        JSON.stringify(sourceApplicationWrongResourceApproval, null, 2),
        "utf8"
      );
      await writeFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          `${sourcePublicationWrongResourceApproval.approvalId}.json`
        ),
        JSON.stringify(sourcePublicationWrongResourceApproval, null, 2),
        "utf8"
      );

      const gitEnv = {
        GIT_DIR: gitDir,
        GIT_WORK_TREE: sourceWorkspaceRoot
      };
      await runGitCommand({
        args: ["init"],
        cwd: sourceWorkspaceRoot,
        env: gitEnv
      });
      await writeFile(
        path.join(sourceWorkspaceRoot, "worker.ts"),
        "export const generated = false;\n",
        "utf8"
      );
      await runGitCommand({
        args: ["add", "--all", "--", "."],
        cwd: sourceWorkspaceRoot,
        env: gitEnv
      });
      const baseTree = await runGitCommand({
        args: ["write-tree"],
        cwd: sourceWorkspaceRoot,
        env: gitEnv
      });
      await writeFile(
        path.join(sourceWorkspaceRoot, "worker.ts"),
        "export const generated = true;\n",
        "utf8"
      );
      await runGitCommand({
        args: ["add", "--all", "--", "."],
        cwd: sourceWorkspaceRoot,
        env: gitEnv
      });
      const headTree = await runGitCommand({
        args: ["write-tree"],
        cwd: sourceWorkspaceRoot,
        env: gitEnv
      });
      const candidateRecord = {
        candidateId: "source-change-turn-alpha",
        conversationId: "conv-alpha",
        createdAt: "2026-04-24T10:05:00.000Z",
        graphId: "team-alpha",
        nodeId: "worker-it",
        sessionId: "session-alpha",
        snapshot: {
          baseTree,
          headTree,
          kind: "shadow_git_tree"
        },
        sourceChangeSummary: {
          additions: 9,
          checkedAt: "2026-04-24T10:05:00.000Z",
          deletions: 2,
          fileCount: 1,
          files: [
            {
              additions: 9,
              deletions: 2,
              path: "worker.ts",
              status: "modified"
            }
          ],
          status: "changed",
          truncated: false
        },
        status: "pending_review",
        turnId: "turn-alpha",
        updatedAt: "2026-04-24T10:05:00.000Z"
      };
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "source-change-candidates",
          "source-change-turn-alpha.json"
        ),
        candidateRecord
      );

      const candidatesResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/source-change-candidates"
      });

      expect(candidatesResponse.statusCode).toBe(200);
      expect(
        runtimeSourceChangeCandidateListResponseSchema.parse(
          candidatesResponse.json()
        )
      ).toEqual({
        candidates: [candidateRecord]
      });

      const candidateResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha"
      });

      expect(candidateResponse.statusCode).toBe(200);
      expect(
        runtimeSourceChangeCandidateInspectionResponseSchema.parse(
          candidateResponse.json()
        )
      ).toEqual({
        candidate: candidateRecord
      });

      const diffResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/diff"
      });

      expect(diffResponse.statusCode).toBe(200);
      const parsedDiffResponse =
        runtimeSourceChangeCandidateDiffResponseSchema.parse(diffResponse.json());
      expect(parsedDiffResponse).toMatchObject({
        candidate: candidateRecord,
        diff: {
          available: true,
          contentEncoding: "utf8",
          contentType: "text/x-diff",
          truncated: false
        }
      });
      expect(parsedDiffResponse.diff.available).toBe(true);
      if (parsedDiffResponse.diff.available) {
        expect(parsedDiffResponse.diff.content).toContain(
          "export const generated = true;"
        );
      }

      const filePreviewResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/file?path=worker.ts"
      });

      expect(filePreviewResponse.statusCode).toBe(200);
      expect(
        runtimeSourceChangeCandidateFilePreviewResponseSchema.parse(
          filePreviewResponse.json()
        )
      ).toMatchObject({
        candidate: candidateRecord,
        path: "worker.ts",
        preview: {
          available: true,
          content: "export const generated = true;\n",
          contentEncoding: "utf8",
          contentType: "text/plain",
          truncated: false
        }
      });

      const unavailableFilePreviewResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/file?path=other.ts"
      });

      expect(unavailableFilePreviewResponse.statusCode).toBe(200);
      expect(
        runtimeSourceChangeCandidateFilePreviewResponseSchema.parse(
          unavailableFilePreviewResponse.json()
        ).preview
      ).toMatchObject({
        available: false
      });

      const reviewResponse = await server.inject({
        method: "PATCH",
        payload: {
          reason: "Reviewed by the operator.",
          reviewedBy: "operator-alpha",
          status: "accepted"
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/review"
      });

      expect(reviewResponse.statusCode).toBe(200);
      const reviewedCandidate =
        runtimeSourceChangeCandidateInspectionResponseSchema.parse(
          reviewResponse.json()
        ).candidate;
      expect(reviewedCandidate).toMatchObject({
        candidateId: "source-change-turn-alpha",
        review: {
          decidedBy: "operator-alpha",
          decision: "accepted",
          reason: "Reviewed by the operator."
        },
        status: "accepted"
      });

      const reviewedCandidateFile = sourceChangeCandidateRecordSchema.parse(
        JSON.parse(
          await readFile(
            path.join(
              runtimeContext.workspace.runtimeRoot,
              "source-change-candidates",
              "source-change-turn-alpha.json"
            ),
            "utf8"
          )
        ) as unknown
      );
      expect(reviewedCandidateFile.status).toBe("accepted");
      expect(reviewedCandidateFile.review?.decision).toBe("accepted");

      await writeFile(
        path.join(sourceWorkspaceRoot, "worker.ts"),
        "export const generated = false;\n",
        "utf8"
      );

      const policyBlockedApplyResponse = await server.inject({
        method: "POST",
        payload: {
          appliedBy: "operator-alpha",
          reason: "Try applying without the node-required approval."
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(policyBlockedApplyResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(policyBlockedApplyResponse.json()).message
      ).toContain("requires an approved approvalId");

      const wrongSessionApplyResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-application-other-session",
          appliedBy: "operator-alpha",
          reason: "Try applying with an approval from another session."
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(wrongSessionApplyResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(wrongSessionApplyResponse.json()).message
      ).toContain("not session 'session-alpha'");

      const wrongOperationApplyResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-application-wrong-operation",
          appliedBy: "operator-alpha",
          reason: "Try applying with an approval for another operation."
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(wrongOperationApplyResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(wrongOperationApplyResponse.json()).message
      ).toContain("requires 'source_application'");

      const wrongResourceApplyResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-application-wrong-resource",
          appliedBy: "operator-alpha",
          reason: "Try applying with an approval for another resource."
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(wrongResourceApplyResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(wrongResourceApplyResponse.json()).message
      ).toContain("requires 'source_change_candidate:source-change-turn-alpha");

      const applyResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-application-alpha",
          appliedBy: "operator-alpha",
          reason: "Promote the accepted change into source history."
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(applyResponse.statusCode).toBe(200);
      const sourceHistoryEntry =
        runtimeSourceHistoryInspectionResponseSchema.parse(
          applyResponse.json()
        ).entry;
      expect(sourceHistoryEntry).toMatchObject({
        appliedBy: "operator-alpha",
        applicationApprovalId: "approval-source-application-alpha",
        candidateId: "source-change-turn-alpha",
        mode: "applied_to_workspace",
        nodeId: "worker-it",
        reason: "Promote the accepted change into source history.",
        sourceHistoryId: "source-history-source-change-turn-alpha"
      });
      expect(sourceHistoryEntry.commit).toMatch(/^[0-9a-f]{40}$/);

      const appliedCandidateFile = sourceChangeCandidateRecordSchema.parse(
        JSON.parse(
          await readFile(
            path.join(
              runtimeContext.workspace.runtimeRoot,
              "source-change-candidates",
              "source-change-turn-alpha.json"
            ),
            "utf8"
          )
        ) as unknown
      );
      expect(appliedCandidateFile.application).toMatchObject({
        approvalId: "approval-source-application-alpha",
        mode: "applied_to_workspace",
        sourceHistoryId: "source-history-source-change-turn-alpha"
      });
      await expect(
        readFile(path.join(sourceWorkspaceRoot, "worker.ts"), "utf8")
      ).resolves.toBe("export const generated = true;\n");

      const sourceHistoryListResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/source-history"
      });

      expect(sourceHistoryListResponse.statusCode).toBe(200);
      expect(
        runtimeSourceHistoryListResponseSchema.parse(
          sourceHistoryListResponse.json()
        ).history
      ).toHaveLength(1);

      const sourceHistoryInspectionResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha"
      });

      expect(sourceHistoryInspectionResponse.statusCode).toBe(200);
      expect(
        runtimeSourceHistoryInspectionResponseSchema.parse(
          sourceHistoryInspectionResponse.json()
        ).entry.commit
      ).toBe(sourceHistoryEntry.commit);

      const policyBlockedPublishResponse = await server.inject({
        method: "POST",
        payload: {
          publishedBy: "operator-alpha",
          reason: "Try a non-primary target without an approval.",
          targetRepositoryName: "missing-target"
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(policyBlockedPublishResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(policyBlockedPublishResponse.json()).message
      ).toContain("requires an approved approvalId");

      const wrongResourcePublishResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-publication-wrong-resource",
          publishedBy: "operator-alpha",
          reason: "Try a non-primary target with an approval for another target.",
          targetRepositoryName: "missing-target"
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(wrongResourcePublishResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(wrongResourcePublishResponse.json()).message
      ).toContain(
        "source_history_publication:source-history-source-change-turn-alpha|gitea|team-alpha|missing-target"
      );

      const failedPublishResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-publication-alpha",
          publishedBy: "operator-alpha",
          reason: "Try a missing repository target before retrying.",
          targetRepositoryName: "missing-target"
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(failedPublishResponse.statusCode).toBe(200);
      const failedPublication =
        runtimeSourceHistoryPublicationResponseSchema.parse(
          failedPublishResponse.json()
        );
      expect(failedPublication.entry.publication).toMatchObject({
        artifactId: "source-source-history-source-change-turn-alpha",
        approvalId: "approval-source-publication-alpha",
        publication: {
          state: "failed"
        },
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "missing-target"
      });
      expect(failedPublication.artifact).toMatchObject({
        publication: {
          state: "failed"
        },
        ref: {
          locator: {
            repositoryName: "missing-target"
          }
        }
      });

      const retryRequiredPublishResponse = await server.inject({
        method: "POST",
        payload: {},
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(retryRequiredPublishResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(retryRequiredPublishResponse.json()).message
      ).toContain("retry");

      const publishResponse = await server.inject({
        method: "POST",
        payload: {
          publishedBy: "operator-alpha",
          reason: "Publish accepted source for downstream handoff.",
          retry: true,
          targetGitServiceRef: "gitea",
          targetNamespace: "team-alpha",
          targetRepositoryName: "team-alpha"
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(publishResponse.statusCode).toBe(200);
      const publishedSourceHistory =
        runtimeSourceHistoryPublicationResponseSchema.parse(
          publishResponse.json()
        );
      expect(publishedSourceHistory.entry.publication).toMatchObject({
        artifactId: "source-source-history-source-change-turn-alpha",
        publication: {
          state: "published"
        },
        requestedBy: "operator-alpha",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "team-alpha"
      });
      expect(publishedSourceHistory.artifact).toMatchObject({
        publication: {
          remoteUrl: pathToFileURL(remoteSourceRepositoryPath).toString(),
          state: "published"
        },
        ref: {
          artifactKind: "commit",
          backend: "git",
          locator: {
            repositoryName: "team-alpha"
          },
          status: "published"
        }
      });
      await expect(
        runGitCommand({
          args: [
            "rev-parse",
            "refs/heads/worker-it/source-history/source-history-source-change-turn-alpha"
          ],
          cwd: remoteSourceRepositoryPath
        })
      ).resolves.toMatch(/^[0-9a-f]{40}$/);

      const sourceArtifactResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha"
      });

      expect(sourceArtifactResponse.statusCode).toBe(200);
      const sourceArtifactInspection =
        runtimeArtifactInspectionResponseSchema.parse(
          sourceArtifactResponse.json()
        );
      expect(sourceArtifactInspection.artifact.publication?.state).toBe(
        "published"
      );
      expect(sourceArtifactInspection.artifact.ref.backend).toBe("git");
      if (sourceArtifactInspection.artifact.ref.backend !== "git") {
        throw new Error("Expected the published source artifact to be git-backed.");
      }
      const sourceArtifactCommit =
        sourceArtifactInspection.artifact.ref.locator.commit;

      const sourceArtifactHistoryResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/history?limit=5"
      });

      expect(sourceArtifactHistoryResponse.statusCode).toBe(200);
      const sourceArtifactHistory =
        runtimeArtifactHistoryResponseSchema.parse(
          sourceArtifactHistoryResponse.json()
        );
      expect(sourceArtifactHistory.history).toMatchObject({
        available: true,
        inspectedPath: ".",
        truncated: false
      });
      expect(
        sourceArtifactHistory.history.available
          ? sourceArtifactHistory.history.commits[0]?.commit
          : undefined
      ).toBe(sourceArtifactCommit);

      const sourceArtifactDiffResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/diff"
      });

      expect(sourceArtifactDiffResponse.statusCode).toBe(200);
      const sourceArtifactDiff = runtimeArtifactDiffResponseSchema.parse(
        sourceArtifactDiffResponse.json()
      );
      expect(sourceArtifactDiff.diff).toMatchObject({
        available: true,
        contentType: "text/x-diff",
        toCommit: sourceArtifactCommit,
        truncated: false
      });
      expect(
        sourceArtifactDiff.diff.available
          ? sourceArtifactDiff.diff.content
          : undefined
      ).toContain("generated = true");

      const sourceArtifactRestoreResponse = await server.inject({
        method: "POST",
        payload: {
          requestedBy: "user-main",
          restoreId: "restore-source-history-alpha"
        },
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/restore"
      });

      expect(sourceArtifactRestoreResponse.statusCode).toBe(200);
      const sourceArtifactRestore = runtimeArtifactRestoreResponseSchema.parse(
        sourceArtifactRestoreResponse.json()
      );
      expect(sourceArtifactRestore.restore).toMatchObject({
        artifactId: "source-source-history-source-change-turn-alpha",
        mode: "restore_workspace",
        nodeId: "worker-it",
        requestedBy: "user-main",
        restoredFileCount: 1,
        restoreId: "restore-source-history-alpha",
        status: "restored"
      });
      await expect(
        readFile(
          path.join(
            runtimeContext.workspace.artifactWorkspaceRoot,
            "restores",
            "restore-source-history-alpha",
            "worker.ts"
          ),
          "utf8"
        )
      ).resolves.toBe("export const generated = true;\n");

      const repeatedSourceArtifactRestoreResponse = await server.inject({
        method: "POST",
        payload: {
          restoreId: "restore-source-history-alpha"
        },
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/restore"
      });

      expect(repeatedSourceArtifactRestoreResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactRestoreResponseSchema.parse(
          repeatedSourceArtifactRestoreResponse.json()
        ).restore
      ).toMatchObject({
        restoreId: "restore-source-history-alpha",
        status: "unavailable"
      });

      const sourceArtifactRestoreListResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/restores"
      });

      expect(sourceArtifactRestoreListResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactRestoreListResponseSchema.parse(
          sourceArtifactRestoreListResponse.json()
        ).restores.map((restore) => restore.status)
      ).toEqual(expect.arrayContaining(["restored", "unavailable"]));

      const allArtifactRestoresResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifact-restores"
      });

      expect(allArtifactRestoresResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactRestoreListResponseSchema.parse(
          allArtifactRestoresResponse.json()
        ).restores
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            artifactId: "source-source-history-source-change-turn-alpha",
            restoreId: "restore-source-history-alpha"
          })
        ])
      );

      await writeFile(
        path.join(sourceWorkspaceRoot, "worker.ts"),
        "export const generated = false;\n",
        "utf8"
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-artifact-promotion-alpha.json"
        ),
        approvalRecordSchema.parse({
          approvalId: "approval-artifact-promotion-alpha",
          approverNodeIds: ["operator-alpha"],
          graphId: runtimeContext.binding.graphId,
          operation: "source_application",
          reason: "Approve artifact promotion into the source workspace.",
          requestedAt: "2026-04-24T00:02:00.000Z",
          requestedByNodeId: "worker-it",
          resource: {
            id:
              "source-source-history-source-change-turn-alpha|restore-source-history-alpha",
            kind: "artifact",
            label:
              "source-source-history-source-change-turn-alpha from restore restore-source-history-alpha"
          },
          sessionId: "session-alpha",
          status: "approved",
          updatedAt: "2026-04-24T00:02:01.000Z"
        })
      );

      const sourceArtifactPromotionResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-artifact-promotion-alpha",
          overwrite: true,
          promotedBy: "operator-alpha",
          promotionId: "promotion-source-history-alpha",
          reason: "Promote restored source artifact into the source workspace.",
          restoreId: "restore-source-history-alpha"
        },
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/promote"
      });

      expect(sourceArtifactPromotionResponse.statusCode).toBe(200);
      const sourceArtifactPromotion =
        runtimeArtifactPromotionResponseSchema.parse(
          sourceArtifactPromotionResponse.json()
        );
      expect(sourceArtifactPromotion.promotion).toMatchObject({
        approvalId: "approval-artifact-promotion-alpha",
        artifactId: "source-source-history-source-change-turn-alpha",
        promotedBy: "operator-alpha",
        promotedFileCount: 1,
        promotionId: "promotion-source-history-alpha",
        restoreId: "restore-source-history-alpha",
        status: "promoted",
        target: "source_workspace"
      });
      await expect(
        readFile(path.join(sourceWorkspaceRoot, "worker.ts"), "utf8")
      ).resolves.toBe("export const generated = true;\n");
      await expect(
        readFile(
          path.join(
            runtimeContext.workspace.runtimeRoot,
            "artifact-promotions",
            "promotion-source-history-alpha.json"
          ),
          "utf8"
        )
      ).resolves.toContain("approval-artifact-promotion-alpha");

      const sourceArtifactPromotionListResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/artifacts/source-source-history-source-change-turn-alpha/promotions"
      });

      expect(sourceArtifactPromotionListResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactPromotionListResponseSchema.parse(
          sourceArtifactPromotionListResponse.json()
        ).promotions
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            approvalId: "approval-artifact-promotion-alpha",
            promotionId: "promotion-source-history-alpha"
          })
        ])
      );

      const allArtifactPromotionsResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/artifact-promotions"
      });

      expect(allArtifactPromotionsResponse.statusCode).toBe(200);
      expect(
        runtimeArtifactPromotionListResponseSchema.parse(
          allArtifactPromotionsResponse.json()
        ).promotions
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            artifactId: "source-source-history-source-change-turn-alpha",
            promotionId: "promotion-source-history-alpha"
          })
        ])
      );

      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-source-history-replay-alpha.json"
        ),
        approvalRecordSchema.parse({
          approvalId: "approval-source-history-replay-alpha",
          approverNodeIds: ["operator-alpha"],
          graphId: runtimeContext.binding.graphId,
          operation: "source_application",
          reason: "Approve source history replay into the source workspace.",
          requestedAt: "2026-04-24T00:05:00.000Z",
          requestedByNodeId: "worker-it",
          resource: {
            id: "source-history-source-change-turn-alpha",
            kind: "source_history",
            label: "source-history-source-change-turn-alpha"
          },
          sessionId: "session-alpha",
          status: "approved",
          updatedAt: "2026-04-24T00:05:01.000Z"
        })
      );

      const sourceHistoryReplayResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-source-history-replay-alpha",
          replayedBy: "operator-alpha",
          replayId: "replay-source-history-alpha",
          reason: "Replay the accepted source history."
        },
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/replay"
      });

      expect(sourceHistoryReplayResponse.statusCode).toBe(200);
      const sourceHistoryReplay = runtimeSourceHistoryReplayResponseSchema.parse(
        sourceHistoryReplayResponse.json()
      );
      expect(sourceHistoryReplay.replay).toMatchObject({
        approvalId: "approval-source-history-replay-alpha",
        replayId: "replay-source-history-alpha",
        sourceHistoryId: "source-history-source-change-turn-alpha",
        status: "already_in_workspace"
      });

      const sourceHistoryReplayListResponse = await server.inject({
        method: "GET",
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/replays"
      });

      expect(sourceHistoryReplayListResponse.statusCode).toBe(200);
      expect(
        runtimeSourceHistoryReplayListResponseSchema.parse(
          sourceHistoryReplayListResponse.json()
        ).replays
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            replayId: "replay-source-history-alpha"
          })
        ])
      );

      const allSourceHistoryReplaysResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/source-history-replays"
      });

      expect(allSourceHistoryReplaysResponse.statusCode).toBe(200);
      expect(
        runtimeSourceHistoryReplayListResponseSchema.parse(
          allSourceHistoryReplaysResponse.json()
        ).replays
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceHistoryId: "source-history-source-change-turn-alpha"
          })
        ])
      );

      const wikiRepositoryRoot = runtimeContext.workspace.wikiRepositoryRoot;
      if (!wikiRepositoryRoot) {
        throw new Error("Expected wiki repository root in runtime context.");
      }

      await runGitCommand({
        args: ["init", "--initial-branch=entangle-wiki"],
        cwd: wikiRepositoryRoot
      });
      await runGitCommand({
        args: ["config", "user.name", "Worker IT"],
        cwd: wikiRepositoryRoot
      });
      await runGitCommand({
        args: ["config", "user.email", "worker-it@entangle.invalid"],
        cwd: wikiRepositoryRoot
      });
      await writeFile(
        path.join(wikiRepositoryRoot, "index.md"),
        "# Wiki Index\n\n- [Summary](summaries/working-context.md)\n",
        "utf8"
      );
      await mkdir(path.join(wikiRepositoryRoot, "summaries"), {
        recursive: true
      });
      await writeFile(
        path.join(wikiRepositoryRoot, "summaries", "working-context.md"),
        "# Working Context\n\nGenerated memory snapshot.\n",
        "utf8"
      );
      await runGitCommand({
        args: ["add", "--all"],
        cwd: wikiRepositoryRoot
      });
      await runGitCommand({
        args: ["commit", "-m", "Update wiki memory for turn-alpha"],
        cwd: wikiRepositoryRoot
      });
      const wikiHeadCommit = await runGitCommand({
        args: ["rev-parse", "HEAD"],
        cwd: wikiRepositoryRoot
      });

      const wikiPublicationResponse = await server.inject({
        method: "POST",
        payload: {
          publishedBy: "operator-alpha",
          publicationId: "wiki-publication-alpha",
          reason: "Publish node wiki repository.",
          targetGitServiceRef: "gitea",
          targetNamespace: "team-alpha",
          targetRepositoryName: "team-alpha"
        },
        url: "/v1/runtimes/worker-it/wiki-repository/publish"
      });

      expect(wikiPublicationResponse.statusCode).toBe(200);
      const wikiPublication =
        runtimeWikiRepositoryPublicationResponseSchema.parse(
          wikiPublicationResponse.json()
        );
      expect(wikiPublication.publication).toMatchObject({
        artifactId: `wiki-repository-worker-it-${wikiHeadCommit.slice(0, 12)}`,
        branch: "worker-it/wiki-repository/entangle-wiki",
        commit: wikiHeadCommit,
        nodeId: "worker-it",
        publication: {
          state: "published"
        },
        publicationId: "wiki-publication-alpha",
        requestedBy: "operator-alpha",
        targetGitServiceRef: "gitea",
        targetNamespace: "team-alpha",
        targetRepositoryName: "team-alpha"
      });
      expect(wikiPublication.artifact).toMatchObject({
        publication: {
          remoteUrl: pathToFileURL(remoteSourceRepositoryPath).toString(),
          state: "published"
        },
        ref: {
          artifactKind: "knowledge_summary",
          backend: "git",
          locator: {
            branch: "worker-it/wiki-repository/entangle-wiki",
            repositoryName: "team-alpha"
          },
          status: "published"
        }
      });
      await expect(
        runGitCommand({
          args: ["rev-parse", "refs/heads/worker-it/wiki-repository/entangle-wiki"],
          cwd: remoteSourceRepositoryPath
        })
      ).resolves.toMatch(/^[0-9a-f]{40}$/);

      const wikiPublicationListResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/wiki-repository/publications"
      });

      expect(wikiPublicationListResponse.statusCode).toBe(200);
      expect(
        runtimeWikiRepositoryPublicationListResponseSchema.parse(
          wikiPublicationListResponse.json()
        ).publications
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            commit: wikiHeadCommit,
            publicationId: "wiki-publication-alpha"
          })
        ])
      );

      const repeatedWikiPublicationResponse = await server.inject({
        method: "POST",
        payload: {},
        url: "/v1/runtimes/worker-it/wiki-repository/publish"
      });

      expect(repeatedWikiPublicationResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(
          repeatedWikiPublicationResponse.json()
        ).message
      ).toContain("already published");

      const repeatedPublishResponse = await server.inject({
        method: "POST",
        payload: {},
        url:
          "/v1/runtimes/worker-it/source-history/source-history-source-change-turn-alpha/publish"
      });

      expect(repeatedPublishResponse.statusCode).toBe(409);

      const repeatedApplyResponse = await server.inject({
        method: "POST",
        payload: {},
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/apply"
      });

      expect(repeatedApplyResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(repeatedApplyResponse.json())
      ).toMatchObject({
        code: "conflict"
      });

      const repeatedReviewResponse = await server.inject({
        method: "PATCH",
        payload: {
          status: "rejected"
        },
        url:
          "/v1/runtimes/worker-it/source-change-candidates/source-change-turn-alpha/review"
      });

      expect(repeatedReviewResponse.statusCode).toBe(409);
      expect(
        hostErrorResponseSchema.parse(repeatedReviewResponse.json())
      ).toMatchObject({
        code: "conflict"
      });

      const reviewEvents = hostEventListResponseSchema
        .parse(
          (
            await server.inject({
              method: "GET",
              url: "/v1/events?limit=20"
            })
          ).json()
        )
        .events.filter(
          (event) => event.type === "source_change_candidate.reviewed"
        );
      expect(reviewEvents).toHaveLength(1);
      expect(reviewEvents[0]).toMatchObject({
        candidateId: "source-change-turn-alpha",
        previousStatus: "pending_review",
        status: "accepted"
      });
      const sourceHistoryEvents = hostEventListResponseSchema
        .parse(
          (
            await server.inject({
              method: "GET",
              url: "/v1/events?limit=20"
            })
          ).json()
        )
        .events.filter((event) => event.type === "source_history.updated");
      expect(sourceHistoryEvents).toHaveLength(1);
      expect(sourceHistoryEvents[0]).toMatchObject({
        approvalId: "approval-source-application-alpha",
        candidateId: "source-change-turn-alpha",
        historyId: "source-history-source-change-turn-alpha",
        mode: "applied_to_workspace"
      });
      const sourceHistoryPublishedEvents = hostEventListResponseSchema
        .parse(
          (
            await server.inject({
              method: "GET",
              url: "/v1/events?limit=20"
            })
          ).json()
        )
        .events.filter((event) => event.type === "source_history.published");
      expect(sourceHistoryPublishedEvents).toHaveLength(2);
      expect(sourceHistoryPublishedEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            approvalId: "approval-source-publication-alpha",
            artifactId: "source-source-history-source-change-turn-alpha",
            historyId: "source-history-source-change-turn-alpha",
            publicationState: "failed",
            targetRepositoryName: "missing-target"
          }),
          expect.objectContaining({
            artifactId: "source-source-history-source-change-turn-alpha",
            historyId: "source-history-source-change-turn-alpha",
            publicationState: "published",
            targetRepositoryName: "team-alpha"
          })
        ])
      );
      const sourceHistoryReplayedEvents = hostEventListResponseSchema
        .parse(
          (
            await server.inject({
              method: "GET",
              url: "/v1/events?limit=20"
            })
          ).json()
        )
        .events.filter((event) => event.type === "source_history.replayed");
      expect(sourceHistoryReplayedEvents).toHaveLength(1);
      expect(sourceHistoryReplayedEvents[0]).toMatchObject({
        approvalId: "approval-source-history-replay-alpha",
        historyId: "source-history-source-change-turn-alpha",
        replayId: "replay-source-history-alpha",
        replayStatus: "already_in_workspace"
      });
      const wikiRepositoryPublishedEvents = hostEventListResponseSchema
        .parse(
          (
            await server.inject({
              method: "GET",
              url: "/v1/events?limit=20"
            })
          ).json()
        )
        .events.filter((event) => event.type === "wiki_repository.published");
      expect(wikiRepositoryPublishedEvents).toHaveLength(1);
      expect(wikiRepositoryPublishedEvents[0]).toMatchObject({
        artifactId: `wiki-repository-worker-it-${wikiHeadCommit.slice(0, 12)}`,
        branch: "worker-it/wiki-repository/entangle-wiki",
        commit: wikiHeadCommit,
        publicationId: "wiki-publication-alpha",
        publicationState: "published",
        targetRepositoryName: "team-alpha"
      });

      const missingCandidateResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/source-change-candidates/missing-candidate"
      });

      expect(missingCandidateResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(missingCandidateResponse.json())).toEqual({
        code: "not_found",
        message:
          "Source change candidate 'missing-candidate' was not found for runtime 'worker-it'."
      });
    } finally {
      await server.close();
    }
  });

  it("lists and inspects persisted runtime approvals through the host surface", async () => {
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
      const approvalRecord = {
        approvalId: "approval-alpha",
        approverNodeIds: ["supervisor-it"],
        conversationId: "conv-alpha",
        graphId: "team-alpha",
        reason: "Supervisor approval is required before final publication.",
        requestedAt: "2026-04-24T10:00:00.000Z",
        requestedByNodeId: "worker-it",
        sessionId: "session-alpha",
        status: "pending",
        updatedAt: "2026-04-24T10:05:00.000Z"
      };
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-alpha.json"
        ),
        approvalRecord
      );

      const approvalsResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/approvals"
      });

      expect(approvalsResponse.statusCode).toBe(200);
      expect(runtimeApprovalListResponseSchema.parse(approvalsResponse.json())).toEqual({
        approvals: [approvalRecord]
      });

      const approvalResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/approvals/approval-alpha"
      });

      expect(approvalResponse.statusCode).toBe(200);
      expect(
        runtimeApprovalInspectionResponseSchema.parse(approvalResponse.json())
      ).toEqual({
        approval: approvalRecord
      });

      const missingApprovalResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it/approvals/missing-approval"
      });

      expect(missingApprovalResponse.statusCode).toBe(404);
      expect(hostErrorResponseSchema.parse(missingApprovalResponse.json())).toEqual({
        code: "not_found",
        message: "Approval 'missing-approval' was not found for runtime 'worker-it'."
      });
    } finally {
      await server.close();
    }
  });

  it("records scoped runtime approval decisions through the host surface", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(createdDirectories[0]!);

    try {
      const packageSourceId = await admitPackageSource(server, packageDirectory);
      await applySingleWorkerGraph({
        packageSourceId,
        server
      });

      const decisionResponse = await server.inject({
        method: "POST",
        payload: {
          approverNodeIds: ["operator-alpha"],
          operation: "source_application",
          reason: "Approve source application from host API.",
          resource: {
            id: "source-change-alpha",
            kind: "source_change_candidate",
            label: "source-change-alpha"
          },
          sessionId: "session-alpha",
          status: "approved"
        },
        url: "/v1/runtimes/worker-it/approvals"
      });

      expect(decisionResponse.statusCode).toBe(200);
      const decision = runtimeApprovalInspectionResponseSchema.parse(
        decisionResponse.json()
      );
      expect(decision.approval).toMatchObject({
        approverNodeIds: ["operator-alpha"],
        graphId: "team-alpha",
        operation: "source_application",
        requestedByNodeId: "worker-it",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate",
          label: "source-change-alpha"
        },
        sessionId: "session-alpha",
        status: "approved"
      });

      const approvalResponse = await server.inject({
        method: "GET",
        url: `/v1/runtimes/worker-it/approvals/${decision.approval.approvalId}`
      });

      expect(approvalResponse.statusCode).toBe(200);
      expect(
        runtimeApprovalInspectionResponseSchema.parse(approvalResponse.json())
          .approval
      ).toMatchObject({
        approvalId: decision.approval.approvalId,
        operation: "source_application",
        status: "approved"
      });

      const eventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      const approvalEvents = hostEventListResponseSchema
        .parse(eventsResponse.json())
        .events.filter(
          (event) =>
            event.type === "approval.trace.event" &&
            event.approvalId === decision.approval.approvalId
        );

      expect(approvalEvents).toHaveLength(1);
      expect(approvalEvents[0]).toMatchObject({
        operation: "source_application",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate"
        },
        status: "approved"
      });
    } finally {
      await server.close();
    }
  });

  it("decides an existing pending runtime approval without changing its scope", async () => {
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
          "approvals",
          "approval-pending-alpha.json"
        ),
        {
          approvalId: "approval-pending-alpha",
          approverNodeIds: [],
          graphId: runtimeContext.binding.graphId,
          operation: "source_application",
          requestedAt: "2026-04-24T10:00:00.000Z",
          requestedByNodeId: "worker-it",
          resource: {
            id: "source-change-alpha",
            kind: "source_change_candidate",
            label: "source-change-alpha"
          },
          sessionId: "session-alpha",
          status: "pending",
          updatedAt: "2026-04-24T10:00:00.000Z"
        }
      );

      const decisionResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-pending-alpha",
          approverNodeIds: ["operator-alpha"],
          status: "rejected"
        },
        url: "/v1/runtimes/worker-it/approvals"
      });

      expect(decisionResponse.statusCode).toBe(200);
      expect(
        runtimeApprovalInspectionResponseSchema.parse(decisionResponse.json())
          .approval
      ).toMatchObject({
        approvalId: "approval-pending-alpha",
        approverNodeIds: ["operator-alpha"],
        operation: "source_application",
        resource: {
          id: "source-change-alpha",
          kind: "source_change_candidate"
        },
        status: "rejected"
      });

      const staleDecisionResponse = await server.inject({
        method: "POST",
        payload: {
          approvalId: "approval-pending-alpha",
          status: "approved"
        },
        url: "/v1/runtimes/worker-it/approvals"
      });

      expect(staleDecisionResponse.statusCode).toBe(409);
      expect(hostErrorResponseSchema.parse(staleDecisionResponse.json()).message).toContain(
        "cannot transition"
      );
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
          activeConversationIds: ["conv-alpha", "conv-closed", "conv-missing"],
          graphId: "team-alpha",
          intent: "Review the latest patch set.",
          lastMessageType: "task.request",
          openedAt: "2026-04-24T10:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          status: "active",
          traceId: "trace-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z",
          waitingApprovalIds: ["approval-alpha"]
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "conversations",
          "conv-alpha.json"
        ),
        {
          artifactIds: ["report-turn-001"],
          conversationId: "conv-alpha",
          followupCount: 1,
          graphId: "team-alpha",
          initiator: "peer",
          lastInboundMessageId:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          lastMessageType: "task.request",
          localNodeId: "worker-it",
          localPubkey: runtimeContext.identityContext.publicKey,
          openedAt: "2026-04-24T10:00:00.000Z",
          peerNodeId: "supervisor-it",
          peerPubkey:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: "session-alpha",
          status: "working",
          updatedAt: "2026-04-24T10:05:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "conversations",
          "conv-closed.json"
        ),
        {
          artifactIds: [],
          conversationId: "conv-closed",
          followupCount: 1,
          graphId: "team-alpha",
          initiator: "peer",
          lastInboundMessageId:
            "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          lastMessageType: "task.result",
          localNodeId: "worker-it",
          localPubkey: runtimeContext.identityContext.publicKey,
          openedAt: "2026-04-24T10:00:00.000Z",
          peerNodeId: "supervisor-it",
          peerPubkey:
            "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: "session-alpha",
          status: "closed",
          updatedAt: "2026-04-24T10:04:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "conversations",
          "conv-extra.json"
        ),
        {
          artifactIds: [],
          conversationId: "conv-extra",
          followupCount: 0,
          graphId: "team-alpha",
          initiator: "self",
          lastOutboundMessageId:
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          lastMessageType: "task.handoff",
          localNodeId: "worker-it",
          localPubkey: runtimeContext.identityContext.publicKey,
          openedAt: "2026-04-24T10:02:00.000Z",
          peerNodeId: "reviewer-it",
          peerPubkey:
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: "session-alpha",
          status: "working",
          updatedAt: "2026-04-24T10:06:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-alpha.json"
        ),
        {
          approvalId: "approval-alpha",
          approverNodeIds: ["supervisor-it"],
          conversationId: "conv-alpha",
          graphId: "team-alpha",
          reason: "Supervisor approval is required before final publication.",
          requestedAt: "2026-04-24T10:03:00.000Z",
          requestedByNodeId: "worker-it",
          sessionId: "session-alpha",
          status: "pending",
          updatedAt: "2026-04-24T10:03:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-closed.json"
        ),
        {
          approvalId: "approval-closed",
          approverNodeIds: ["supervisor-it"],
          conversationId: "conv-closed",
          graphId: "team-alpha",
          requestedAt: "2026-04-24T10:01:00.000Z",
          requestedByNodeId: "worker-it",
          sessionId: "session-alpha",
          status: "approved",
          updatedAt: "2026-04-24T10:02:00.000Z"
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
            activeConversationIds: ["conv-alpha", "conv-closed", "conv-missing"],
            approvalStatusCounts: {
              approved: 1,
              expired: 0,
              not_required: 0,
              pending: 1,
              rejected: 0,
              withdrawn: 0
            },
            conversationStatusCounts: {
              acknowledged: 0,
              awaiting_approval: 0,
              blocked: 0,
              closed: 1,
              expired: 0,
              opened: 0,
              rejected: 0,
              resolved: 0,
              working: 2
            },
            graphId: "team-alpha",
            latestMessageType: "task.request",
            nodeIds: ["worker-it"],
            nodeStatuses: [
              {
                nodeId: "worker-it",
                status: "active"
              }
            ],
            rootArtifactIds: ["report-turn-001"],
            sessionConsistencyFindings: [
              {
                code: "terminal_conversation_still_active",
                conversationId: "conv-closed",
                message:
                  "Session 'session-alpha' on node 'worker-it' still references conversation 'conv-closed' as active after it reached 'closed'.",
                nodeId: "worker-it",
                severity: "error"
              },
              {
                code: "open_conversation_missing_active_reference",
                conversationId: "conv-extra",
                message:
                  "Session 'session-alpha' on node 'worker-it' has open conversation 'conv-extra' in 'working' but it is missing from activeConversationIds.",
                nodeId: "worker-it",
                severity: "warning"
              },
              {
                code: "active_conversation_missing_record",
                conversationId: "conv-missing",
                message:
                  "Session 'session-alpha' on node 'worker-it' references active conversation 'conv-missing', but no conversation record exists.",
                nodeId: "worker-it",
                severity: "error"
              }
            ],
            sessionId: "session-alpha",
            traceIds: ["trace-alpha"],
            waitingApprovalIds: ["approval-alpha"],
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
            approvalStatusCounts: {
              approved: 1,
              pending: 1
            },
            conversationStatusCounts: {
              closed: 1,
              working: 2
            },
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
            },
            sessionConsistencyFindings: [
              {
                code: "terminal_conversation_still_active",
                conversationId: "conv-closed",
                nodeId: "worker-it",
                severity: "error"
              },
              {
                code: "open_conversation_missing_active_reference",
                conversationId: "conv-extra",
                nodeId: "worker-it",
                severity: "warning"
              },
              {
                code: "active_conversation_missing_record",
                conversationId: "conv-missing",
                nodeId: "worker-it",
                severity: "error"
              }
            ]
          }
        ],
        sessionId: "session-alpha"
      });

      const hostStatusWithSessionFindingsResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(hostStatusWithSessionFindingsResponse.statusCode).toBe(200);
      expect(
        hostStatusResponseSchema.parse(
          hostStatusWithSessionFindingsResponse.json()
        )
      ).toMatchObject({
        service: "entangle-host",
        sessionDiagnostics: {
          consistencyFindingCount: 3,
          inspectedSessionCount: 1,
          sessionsWithConsistencyFindings: 1
        },
        status: "degraded"
      });

      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "sessions",
          "session-empty.json"
        ),
        {
          activeConversationIds: [],
          graphId: "team-alpha",
          intent: "Inspect an active session with no open work.",
          lastMessageType: "task.result",
          openedAt: "2026-04-24T10:10:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: [],
          sessionId: "session-empty",
          status: "active",
          traceId: "trace-empty",
          updatedAt: "2026-04-24T10:11:00.000Z",
          waitingApprovalIds: []
        }
      );

      const emptySessionInspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions/session-empty"
      });

      expect(emptySessionInspectionResponse.statusCode).toBe(200);
      expect(
        sessionInspectionResponseSchema.parse(
          emptySessionInspectionResponse.json()
        )
      ).toMatchObject({
        nodes: [
          {
            nodeId: "worker-it",
            sessionConsistencyFindings: [
              {
                code: "active_session_without_open_conversations",
                nodeId: "worker-it",
                severity: "warning"
              }
            ]
          }
        ],
        sessionId: "session-empty"
      });

      const hostStatusWithEmptyActiveSessionResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(hostStatusWithEmptyActiveSessionResponse.statusCode).toBe(200);
      expect(
        hostStatusResponseSchema.parse(
          hostStatusWithEmptyActiveSessionResponse.json()
        )
      ).toMatchObject({
        sessionDiagnostics: {
          consistencyFindingCount: 4,
          inspectedSessionCount: 2,
          sessionsWithConsistencyFindings: 2
        },
        status: "degraded"
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

  it("records external session cancellation requests for runtime runners", async () => {
    const server = await createTestServer({ includeModelEndpoint: true });
    const packageDirectory = await createAdmittedPackageDirectory(
      createdDirectories[0]!
    );

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
          "session-cancel-alpha.json"
        ),
        {
          activeConversationIds: ["conv-cancel-alpha"],
          graphId: "team-alpha",
          intent: "Cancel this active session.",
          lastMessageId:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          lastMessageType: "task.request",
          openedAt: "2026-04-24T10:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: [],
          sessionId: "session-cancel-alpha",
          status: "active",
          traceId: "session-cancel-alpha",
          updatedAt: "2026-04-24T10:01:00.000Z",
          waitingApprovalIds: []
        }
      );

      const cancelResponse = await server.inject({
        method: "POST",
        payload: {
          cancellationId: "cancel-alpha",
          reason: "Operator stopped the run.",
          requestedBy: "operator-main"
        },
        url: "/v1/sessions/session-cancel-alpha/cancel"
      });

      expect(cancelResponse.statusCode).toBe(200);
      expect(
        sessionCancellationResponseSchema.parse(cancelResponse.json())
      ).toMatchObject({
        cancellations: [
          {
            cancellationId: "cancel-alpha",
            graphId: "team-alpha",
            nodeId: "worker-it",
            reason: "Operator stopped the run.",
            requestedBy: "operator-main",
            sessionId: "session-cancel-alpha",
            status: "requested"
          }
        ],
        sessionId: "session-cancel-alpha"
      });
      const cancellationRecord = JSON.parse(
        await readFile(
          path.join(
            runtimeContext.workspace.runtimeRoot,
            "session-cancellations",
            "cancel-alpha.json"
          ),
          "utf8"
        )
      ) as unknown;
      expect(cancellationRecord).toMatchObject({
        cancellationId: "cancel-alpha",
        nodeId: "worker-it",
        sessionId: "session-cancel-alpha",
        status: "requested"
      });

      const runtimeBoundCancelResponse = await server.inject({
        method: "POST",
        payload: {
          cancellationId: "cancel-before-intake",
          reason: "Stop queued work."
        },
        url: "/v1/runtimes/worker-it/sessions/session-before-intake/cancel"
      });

      expect(runtimeBoundCancelResponse.statusCode).toBe(200);
      expect(
        sessionCancellationResponseSchema.parse(
          runtimeBoundCancelResponse.json()
        )
      ).toMatchObject({
        cancellations: [
          {
            cancellationId: "cancel-before-intake",
            nodeId: "worker-it",
            sessionId: "session-before-intake",
            status: "requested"
          }
        ],
        sessionId: "session-before-intake"
      });
    } finally {
      await server.close();
    }
  });

  it("reports approval consistency findings on host session inspection", async () => {
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
          "session-approval-drift.json"
        ),
        {
          activeConversationIds: [],
          graphId: "team-alpha",
          intent: "Inspect approval drift.",
          openedAt: "2026-04-24T11:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: [],
          sessionId: "session-approval-drift",
          status: "waiting_approval",
          traceId: "trace-approval-drift",
          updatedAt: "2026-04-24T11:05:00.000Z",
          waitingApprovalIds: ["approval-missing", "approval-approved"]
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-approved.json"
        ),
        {
          approvalId: "approval-approved",
          approverNodeIds: ["supervisor-it"],
          graphId: "team-alpha",
          requestedAt: "2026-04-24T11:01:00.000Z",
          requestedByNodeId: "worker-it",
          sessionId: "session-approval-drift",
          status: "approved",
          updatedAt: "2026-04-24T11:02:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-orphan.json"
        ),
        {
          approvalId: "approval-orphan",
          approverNodeIds: ["supervisor-it"],
          graphId: "team-alpha",
          requestedAt: "2026-04-24T11:03:00.000Z",
          requestedByNodeId: "worker-it",
          sessionId: "session-approval-drift",
          status: "pending",
          updatedAt: "2026-04-24T11:04:00.000Z"
        }
      );

      const sessionInspectionResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions/session-approval-drift"
      });

      expect(sessionInspectionResponse.statusCode).toBe(200);
      expect(
        sessionInspectionResponseSchema.parse(sessionInspectionResponse.json())
      ).toMatchObject({
        nodes: [
          {
            nodeId: "worker-it",
            sessionConsistencyFindings: [
              {
                code: "waiting_approval_session_without_pending_approval",
                nodeId: "worker-it",
                severity: "error"
              },
              {
                approvalId: "approval-approved",
                code: "waiting_approval_not_pending",
                nodeId: "worker-it",
                severity: "warning"
              },
              {
                approvalId: "approval-missing",
                code: "waiting_approval_missing_record",
                nodeId: "worker-it",
                severity: "error"
              },
              {
                approvalId: "approval-orphan",
                code: "pending_approval_missing_waiting_reference",
                nodeId: "worker-it",
                severity: "warning"
              }
            ],
            session: {
              sessionId: "session-approval-drift",
              status: "waiting_approval"
            }
          }
        ]
      });

      const listedSessionsResponse = await server.inject({
        method: "GET",
        url: "/v1/sessions"
      });

      expect(listedSessionsResponse.statusCode).toBe(200);
      expect(
        sessionListResponseSchema.parse(listedSessionsResponse.json())
          .sessions[0]?.sessionConsistencyFindings
      ).toHaveLength(4);

      const hostStatusResponse = await server.inject({
        method: "GET",
        url: "/v1/host/status"
      });

      expect(hostStatusResponse.statusCode).toBe(200);
      expect(hostStatusResponseSchema.parse(hostStatusResponse.json())).toMatchObject({
        sessionDiagnostics: {
          consistencyFindingCount: 4,
          inspectedSessionCount: 1,
          sessionsWithConsistencyFindings: 1
        },
        status: "degraded"
      });
    } finally {
      await server.close();
    }
  });

  it("emits typed session-trace and runner activity events without duplicating unchanged records", async () => {
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
          lastMessageType: "task.request",
          openedAt: "2026-04-24T10:00:00.000Z",
          ownerNodeId: "worker-it",
          rootArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          status: "active",
          traceId: "trace-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z",
          waitingApprovalIds: ["approval-alpha"]
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "conversations",
          "conv-alpha.json"
        ),
        {
          artifactIds: ["report-turn-001"],
          conversationId: "conv-alpha",
          followupCount: 1,
          graphId: "team-alpha",
          initiator: "peer",
          lastInboundMessageId:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          lastMessageType: "task.request",
          localNodeId: "worker-it",
          localPubkey: runtimeContext.identityContext.publicKey,
          openedAt: "2026-04-24T10:00:00.000Z",
          peerNodeId: "supervisor-it",
          peerPubkey:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          responsePolicy: {
            closeOnResult: true,
            maxFollowups: 1,
            responseRequired: true
          },
          sessionId: "session-alpha",
          status: "working",
          updatedAt: "2026-04-24T10:05:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-alpha.json"
        ),
        {
          approvalId: "approval-alpha",
          approverNodeIds: ["supervisor-it"],
          conversationId: "conv-alpha",
          graphId: "team-alpha",
          operation: "artifact_publication",
          requestedAt: "2026-04-24T10:01:00.000Z",
          requestedByNodeId: "worker-it",
          resource: {
            id: "report-turn-001",
            kind: "artifact",
            label: "report-turn-001"
          },
          sessionId: "session-alpha",
          status: "pending",
          updatedAt: "2026-04-24T10:05:00.000Z"
        }
      );
      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "artifacts",
          "report-turn-001.json"
        ),
        artifactRecordSchema.parse({
          createdAt: "2026-04-24T10:04:00.000Z",
          materialization: {
            localPath: path.join(
              runtimeContext.workspace.artifactWorkspaceRoot,
              "reports",
              "turn-alpha.md"
            ),
            repoPath: runtimeContext.workspace.artifactWorkspaceRoot
          },
          publication: {
            publishedAt: "2026-04-24T10:05:00.000Z",
            remoteName: "entangle-gitea",
            remoteUrl: "file:///tmp/entangle-gitea.git",
            state: "published"
          },
          ref: {
            artifactId: "report-turn-001",
            artifactKind: "report_file",
            backend: "git",
            contentSummary: "Turn report",
            conversationId: "conv-alpha",
            createdByNodeId: "worker-it",
            locator: {
              branch: "entangle/session-alpha/turn-alpha",
              commit: "abcdef1234567890",
              path: "reports/turn-alpha.md"
            },
            preferred: true,
            sessionId: "session-alpha",
            status: "published"
          },
          turnId: "turn-alpha",
          updatedAt: "2026-04-24T10:05:00.000Z"
        })
      );
      await writeJsonFile(
        path.join(runtimeContext.workspace.runtimeRoot, "turns", "turn-alpha.json"),
        {
          consumedArtifactIds: ["artifact-inbound-001"],
          conversationId: "conv-alpha",
          engineOutcome: {
            providerStopReason: "end_turn",
            stopReason: "completed",
            toolExecutions: [
              {
                outcome: "success",
                sequence: 1,
                toolCallId: "toolu_alpha",
                toolId: "inspect_artifact_input"
              }
            ],
            usage: {
              inputTokens: 42,
              outputTokens: 12
            }
          },
          memorySynthesisOutcome: {
            status: "succeeded",
            updatedAt: "2026-04-24T10:05:30.000Z",
            updatedSummaryPagePaths: [
              "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
              "/tmp/entangle-runner/memory/wiki/summaries/decisions.md",
              "/tmp/entangle-runner/memory/wiki/summaries/stable-facts.md",
              "/tmp/entangle-runner/memory/wiki/summaries/open-questions.md",
              "/tmp/entangle-runner/memory/wiki/summaries/next-actions.md",
              "/tmp/entangle-runner/memory/wiki/summaries/resolutions.md"
            ],
            workingContextPagePath:
              "/tmp/entangle-runner/memory/wiki/summaries/working-context.md"
          },
          graphId: "team-alpha",
          nodeId: "worker-it",
          phase: "persisting",
          producedArtifactIds: ["report-turn-001"],
          sessionId: "session-alpha",
          sourceChangeSummary: {
            additions: 2,
            checkedAt: "2026-04-24T10:05:00.000Z",
            deletions: 0,
            fileCount: 1,
            files: [
              {
                additions: 2,
                deletions: 0,
                path: "src/worker.ts",
                status: "modified"
              }
            ],
            status: "changed",
            truncated: false
          },
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
            artifactIds: ["report-turn-001"],
            category: "session",
            conversationId: "conv-alpha",
            nodeId: "worker-it",
            sessionId: "session-alpha",
            status: "working",
            type: "conversation.trace.event"
          }),
          expect.objectContaining({
            approvalId: "approval-alpha",
            category: "session",
            conversationId: "conv-alpha",
            nodeId: "worker-it",
            operation: "artifact_publication",
            resource: {
              id: "report-turn-001",
              kind: "artifact",
              label: "report-turn-001"
            },
            sessionId: "session-alpha",
            status: "pending",
            type: "approval.trace.event"
          }),
          expect.objectContaining({
            artifactId: "report-turn-001",
            category: "session",
            lifecycleState: "published",
            nodeId: "worker-it",
            publicationState: "published",
            sessionId: "session-alpha",
            turnId: "turn-alpha",
            type: "artifact.trace.event"
          }),
          expect.objectContaining({
            activeConversationIds: ["conv-alpha"],
            approvalStatusCounts: {
              approved: 0,
              expired: 0,
              not_required: 0,
              pending: 1,
              rejected: 0,
              withdrawn: 0
            },
            category: "session",
            conversationStatusCounts: {
              acknowledged: 0,
              awaiting_approval: 0,
              blocked: 0,
              closed: 0,
              expired: 0,
              opened: 0,
              rejected: 0,
              resolved: 0,
              working: 1
            },
            lastMessageType: "task.request",
            nodeId: "worker-it",
            rootArtifactIds: ["report-turn-001"],
            sessionConsistencyFindingCodes: [],
            sessionConsistencyFindingCount: 0,
            sessionId: "session-alpha",
            status: "active",
            type: "session.updated"
          }),
          expect.objectContaining({
            category: "runner",
            engineOutcome: {
              providerStopReason: "end_turn",
              stopReason: "completed",
              toolExecutions: [
                {
                  outcome: "success",
                  sequence: 1,
                  toolCallId: "toolu_alpha",
                  toolId: "inspect_artifact_input"
                }
              ],
              usage: {
                inputTokens: 42,
                outputTokens: 12
              }
            },
            nodeId: "worker-it",
            phase: "persisting",
            sessionId: "session-alpha",
            sourceChangeSummary: {
              additions: 2,
              checkedAt: "2026-04-24T10:05:00.000Z",
              deletions: 0,
              fileCount: 1,
              files: [
                {
                  additions: 2,
                  deletions: 0,
                  path: "src/worker.ts",
                  status: "modified"
                }
              ],
              status: "changed",
              truncated: false
            },
            memorySynthesisOutcome: {
              status: "succeeded",
              updatedAt: "2026-04-24T10:05:30.000Z",
              updatedSummaryPagePaths: [
                "/tmp/entangle-runner/memory/wiki/summaries/working-context.md",
                "/tmp/entangle-runner/memory/wiki/summaries/decisions.md",
                "/tmp/entangle-runner/memory/wiki/summaries/stable-facts.md",
                "/tmp/entangle-runner/memory/wiki/summaries/open-questions.md",
                "/tmp/entangle-runner/memory/wiki/summaries/next-actions.md",
                "/tmp/entangle-runner/memory/wiki/summaries/resolutions.md"
              ],
              workingContextPagePath:
                "/tmp/entangle-runner/memory/wiki/summaries/working-context.md"
            },
            turnId: "turn-alpha",
            type: "runner.turn.updated"
          })
        ])
      );

      const firstSessionEventCount = firstEvents.filter(
        (event) => event.type === "session.updated"
      ).length;
      const firstConversationEventCount = firstEvents.filter(
        (event) => event.type === "conversation.trace.event"
      ).length;
      const firstApprovalEventCount = firstEvents.filter(
        (event) => event.type === "approval.trace.event"
      ).length;
      const firstArtifactEventCount = firstEvents.filter(
        (event) => event.type === "artifact.trace.event"
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
        secondEvents.filter((event) => event.type === "conversation.trace.event").length
      ).toBe(firstConversationEventCount);
      expect(
        secondEvents.filter((event) => event.type === "approval.trace.event").length
      ).toBe(firstApprovalEventCount);
      expect(
        secondEvents.filter((event) => event.type === "artifact.trace.event").length
      ).toBe(firstArtifactEventCount);
      expect(
        secondEvents.filter((event) => event.type === "runner.turn.updated").length
      ).toBe(firstRunnerTurnEventCount);

      await writeJsonFile(
        path.join(
          runtimeContext.workspace.runtimeRoot,
          "approvals",
          "approval-alpha.json"
        ),
        {
          approvalId: "approval-alpha",
          approverNodeIds: ["supervisor-it"],
          conversationId: "conv-alpha",
          graphId: "team-alpha",
          operation: "artifact_publication",
          requestedAt: "2026-04-24T10:01:00.000Z",
          requestedByNodeId: "worker-it",
          resource: {
            id: "report-turn-001",
            kind: "artifact",
            label: "report-turn-001"
          },
          sessionId: "session-alpha",
          status: "approved",
          updatedAt: "2026-04-24T10:06:00.000Z"
        }
      );

      await server.inject({
        method: "GET",
        url: "/v1/sessions"
      });

      const thirdEventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=40"
      });
      const thirdEvents = hostEventListResponseSchema.parse(
        thirdEventsResponse.json()
      ).events;

      expect(
        thirdEvents.filter((event) => event.type === "session.updated").length
      ).toBe(firstSessionEventCount + 1);
      expect(
        thirdEvents.filter((event) => event.type === "approval.trace.event").length
      ).toBe(firstApprovalEventCount + 1);
      expect(thirdEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            approvalStatusCounts: {
              approved: 1,
              expired: 0,
              not_required: 0,
              pending: 0,
              rejected: 0,
              withdrawn: 0
            },
            sessionId: "session-alpha",
            type: "session.updated"
          })
        ])
      );
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

      const firstEventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=20"
      });
      expect(firstEventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(firstEventsResponse.json()).events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.recovery.recorded",
            nodeId: "worker-it",
            observedState: "running"
          })
        ])
      );

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

      const thirdEventsResponse = await server.inject({
        method: "GET",
        url: "/v1/events?limit=30"
      });
      expect(thirdEventsResponse.statusCode).toBe(200);
      expect(hostEventListResponseSchema.parse(thirdEventsResponse.json()).events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "runtime.recovery.recorded",
            nodeId: "worker-it",
            observedState: "stopped"
          })
        ])
      );
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
      const recordedEvents = hostEventListResponseSchema.parse(
        eventsResponse.json()
      );
      expect(
        recordedEvents.events.some(
          (event) =>
            event.type === "runtime.recovery_controller.updated" &&
            event.nodeId === "worker-it" &&
            event.controller.state === "manual_required"
        )
      ).toBe(true);
      expect(
        recordedEvents.events.some(
          (event) =>
            event.type === "runtime.recovery.recorded" &&
            event.nodeId === "worker-it" &&
            event.observedState === "failed"
        )
      ).toBe(true);
      expect(
        recordedEvents.events.some(
          (event) => event.type === "runtime.recovery.attempted"
        )
      ).toBe(false);
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
      const recoveryEvents = hostEventListResponseSchema.parse(
        eventsResponse.json()
      );
      expect(
        recoveryEvents.events.some(
          (event) =>
            event.type === "runtime.recovery_controller.updated" &&
            event.nodeId === "worker-it" &&
            event.controller.attemptsUsed === 1 &&
            event.controller.state === "exhausted"
        )
      ).toBe(true);
      expect(
        recoveryEvents.events.some(
          (event) =>
            event.type === "runtime.restart.requested" &&
            event.nodeId === "worker-it" &&
            event.restartGeneration === 1
        )
      ).toBe(true);
      expect(
        recoveryEvents.events.some(
          (event) =>
            event.type === "runtime.recovery.attempted" &&
            event.nodeId === "worker-it" &&
            event.attemptNumber === 1 &&
            event.maxAttempts === 1
        )
      ).toBe(true);
      expect(
        recoveryEvents.events.some(
          (event) =>
            event.type === "runtime.recovery.exhausted" &&
            event.nodeId === "worker-it" &&
            event.attemptsUsed === 1 &&
            event.maxAttempts === 1
        )
      ).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("returns a structured 409 response when runtime context is unavailable", async () => {
    const server = await createTestServer({ includeModelEndpoint: false });

    try {
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
              nodeKind: "worker"
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

  it("does not block an OpenCode-backed runtime context on Entangle model secrets", async () => {
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

      expect(response.statusCode).toBe(200);
      const runtimeContext = runtimeContextInspectionResponseSchema.parse(
        response.json()
      );
      expect(runtimeContext.agentRuntimeContext).toMatchObject({
        engineProfileRef: "opencode-default",
        mode: "coding_agent"
      });
      expect(runtimeContext.modelContext.auth?.status).toBe("missing");

      const runtimeResponse = await server.inject({
        method: "GET",
        url: "/v1/runtimes/worker-it"
      });
      expect(runtimeResponse.statusCode).toBe(200);
      expect(
        runtimeInspectionResponseSchema.parse(runtimeResponse.json()).agentRuntime
      ).toMatchObject({
        engineKind: "opencode_server",
        engineProfileRef: "opencode-default",
        mode: "coding_agent",
        stateScope: "node"
      });
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

    try {
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
              nodeKind: "worker"
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

    try {
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
              nodeKind: "worker"
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
