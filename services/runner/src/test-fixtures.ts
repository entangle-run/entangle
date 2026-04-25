import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  entangleA2AMessageSchema,
  type ArtifactRef,
  type EffectiveRuntimeContext,
  type EntangleA2AResponsePolicy,
  type PackageToolCatalog
} from "@entangle/types";
import { getPublicKey } from "nostr-tools";
import type { RunnerInboundEnvelope } from "./transport.js";

const createdDirectories: string[] = [];

function parseHexSecret(secretHex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(secretHex, "hex"));
}

export const runnerSecretHex =
  "1111111111111111111111111111111111111111111111111111111111111111";
export const remoteSecretHex =
  "2222222222222222222222222222222222222222222222222222222222222222";
export const runnerPublicKey = getPublicKey(parseHexSecret(runnerSecretHex));
export const remotePublicKey = getPublicKey(parseHexSecret(remoteSecretHex));

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runGitCommand(cwd: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Git command failed (${args.join(" ")}): ${stderr.trim() || "unknown error"}`
        )
      );
    });
  });
}

export async function createRuntimeFixture(input: {
  remotePublication?: "bare_repo" | "missing_repo" | "none";
  toolCatalog?: PackageToolCatalog;
} = {}): Promise<{
  context: EffectiveRuntimeContext;
  contextPath: string;
  remoteRepositoryPath?: string;
}> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-runner-"));
  createdDirectories.push(tempRoot);

  const packageRoot = path.join(tempRoot, "package-source");
  const remoteRepositoryPath = path.join(tempRoot, "graph-alpha.git");
  const secretsRoot = path.join(tempRoot, "secrets");
  const workspaceRoot = path.join(tempRoot, "workspace");
  const engineStateRoot = path.join(workspaceRoot, "engine-state");
  const injectedRoot = path.join(workspaceRoot, "injected");
  const memoryRoot = path.join(workspaceRoot, "memory");
  const retrievalRoot = path.join(workspaceRoot, "retrieval");
  const sourceWorkspaceRoot = path.join(workspaceRoot, "source");
  const wikiRepositoryRoot = path.join(workspaceRoot, "wiki-repository");

  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(secretsRoot, "git", "worker-it"), { recursive: true }),
    mkdir(path.join(secretsRoot, "model"), { recursive: true }),
    mkdir(path.join(memoryRoot, "schema"), { recursive: true }),
    mkdir(path.join(memoryRoot, "wiki"), { recursive: true }),
    mkdir(engineStateRoot, { recursive: true }),
    mkdir(retrievalRoot, { recursive: true }),
    mkdir(sourceWorkspaceRoot, { recursive: true }),
    mkdir(wikiRepositoryRoot, { recursive: true }),
    mkdir(path.join(workspaceRoot, "runtime"), { recursive: true }),
    mkdir(path.join(workspaceRoot, "workspace"), { recursive: true }),
    mkdir(injectedRoot, { recursive: true })
  ]);

  await Promise.all([
    writeFile(
      path.join(packageRoot, "prompts", "system.md"),
      "System prompt from package.\n",
      "utf8"
    ),
    writeFile(
      path.join(packageRoot, "prompts", "interaction.md"),
      "Interaction prompt from package.\n",
      "utf8"
    ),
    writeJsonFile(path.join(packageRoot, "runtime", "config.json"), {
      toolBudget: {
        maxToolTurns: 5,
        maxOutputTokens: 1536
      }
    }),
    writeJsonFile(path.join(packageRoot, "runtime", "capabilities.json"), {
      capabilities: []
    }),
    writeJsonFile(
      path.join(packageRoot, "runtime", "tools.json"),
      input.toolCatalog ?? {
        schemaVersion: "1",
        tools: []
      }
    ),
    writeFile(
      path.join(secretsRoot, "git", "worker-it", "ssh"),
      "test-private-key\n",
      "utf8"
    ),
    writeFile(
      path.join(secretsRoot, "model", "shared-model"),
      "test-model-secret\n",
      "utf8"
    ),
    writeFile(
      path.join(memoryRoot, "schema", "AGENTS.md"),
      "# Memory Schema\n",
      "utf8"
    ),
    writeFile(
      path.join(memoryRoot, "wiki", "index.md"),
      "# Wiki Index\n",
      "utf8"
    )
  ]);

  if (input.remotePublication === "bare_repo") {
    await runGitCommand(tempRoot, ["init", "--bare", remoteRepositoryPath]);
  }

  const primaryGitRepositoryTarget =
    input.remotePublication === "bare_repo" ||
    input.remotePublication === "missing_repo"
      ? {
          gitServiceRef: "local-gitea",
          namespace: "team-alpha",
          provisioningMode: "preexisting" as const,
          remoteUrl: remoteRepositoryPath,
          repositoryName: "graph-alpha",
          transportKind: "ssh" as const
        }
      : undefined;

  const context: EffectiveRuntimeContext = {
    agentRuntimeContext: {
      defaultAgent: "general",
      engineProfile: {
        id: "local-opencode",
        displayName: "Local OpenCode",
        kind: "opencode_server",
        executable: "opencode",
        defaultAgent: "general",
        stateScope: "node"
      },
      engineProfileRef: "local-opencode",
      mode: "coding_agent"
    },
    artifactContext: {
      backends: ["git"],
      defaultNamespace: "team-alpha",
      gitPrincipalBindings: [
        {
          principal: {
            principalId: "worker-it-git",
            displayName: "Worker IT Git Principal",
            systemKind: "git",
            gitServiceRef: "local-gitea",
            subject: "worker-it",
            transportAuthMode: "ssh_key",
            secretRef: "secret://git/worker-it/ssh",
            attribution: {
              displayName: "Worker IT Git Principal",
              email: "worker-it@entangle.local"
            },
            signing: {
              mode: "none"
            }
          },
          transport: {
            secretRef: "secret://git/worker-it/ssh",
            status: "available",
            delivery: {
              mode: "mounted_file",
              filePath: path.join(secretsRoot, "git", "worker-it", "ssh")
            }
          }
        }
      ],
      gitServices: [
        {
          id: "local-gitea",
          displayName: "Local Gitea",
          baseUrl: "http://gitea:3000",
          remoteBase: "ssh://git@gitea:22",
          transportKind: "ssh",
          authMode: "ssh_key",
          defaultNamespace: "team-alpha",
          provisioning: {
            mode: "preexisting"
          }
        }
      ],
      primaryGitPrincipalRef: "worker-it-git",
      ...(primaryGitRepositoryTarget
        ? {
            primaryGitRepositoryTarget
          }
        : {}),
      primaryGitServiceRef: "local-gitea"
    },
    binding: {
      bindingId: "graph-revision-alpha.worker-it",
      graphId: "graph-alpha",
      graphRevisionId: "graph-alpha-20260422t000000z",
      node: {
        nodeId: "worker-it",
        displayName: "Worker IT",
        nodeKind: "worker",
        agentRuntime: {
          defaultAgent: "general",
          engineProfileRef: "local-opencode",
          mode: "coding_agent"
        },
        packageSourceRef: "worker-it-source",
        resourceBindings: {
          relayProfileRefs: ["local-relay"],
          gitServiceRefs: ["local-gitea"],
          modelEndpointProfileRef: "shared-model"
        },
        autonomy: {
          canInitiateSessions: false,
          canMutateGraph: false
        }
      },
      packageSource: {
        packageSourceId: "worker-it-source",
        sourceKind: "local_path",
        absolutePath: packageRoot,
        admittedAt: "2026-04-22T00:00:00.000Z"
      },
      resolvedResourceBindings: {
        relayProfileRefs: ["local-relay"],
        primaryRelayProfileRef: "local-relay",
        gitServiceRefs: ["local-gitea"],
        primaryGitServiceRef: "local-gitea",
        modelEndpointProfileRef: "shared-model"
      },
      runtimeProfile: "hackathon_local",
      schemaVersion: "1"
    },
    generatedAt: "2026-04-22T00:00:00.000Z",
    identityContext: {
      algorithm: "nostr_secp256k1",
      publicKey: runnerPublicKey,
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
          mode: "mounted_file",
          filePath: path.join(secretsRoot, "model", "shared-model")
        }
      },
      modelEndpointProfile: {
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        authMode: "header_secret",
        secretRef: "secret://shared-model",
        defaultModel: "claude-opus"
      }
    },
    packageManifest: {
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
    },
    policyContext: {
      autonomy: {
        canInitiateSessions: false,
        canMutateGraph: false
      },
      notes: [],
      runtimeProfile: "hackathon_local"
    },
    relayContext: {
      edgeRoutes: [],
      primaryRelayProfileRef: "local-relay",
      relayProfiles: [
        {
          id: "local-relay",
          displayName: "Local Relay",
          readUrls: ["ws://strfry:7777"],
          writeUrls: ["ws://strfry:7777"],
          authMode: "none"
        }
      ]
    },
    schemaVersion: "1",
    workspace: {
      root: workspaceRoot,
      packageRoot,
      injectedRoot,
      memoryRoot,
      artifactWorkspaceRoot: path.join(workspaceRoot, "workspace"),
      engineStateRoot,
      retrievalRoot,
      runtimeRoot: path.join(workspaceRoot, "runtime"),
      sourceWorkspaceRoot,
      wikiRepositoryRoot
    }
  };

  const contextPath = path.join(injectedRoot, "effective-runtime-context.json");
  await writeJsonFile(contextPath, context);

  return {
    context,
    contextPath,
    remoteRepositoryPath:
      input.remotePublication === "bare_repo" ||
      input.remotePublication === "missing_repo"
        ? remoteRepositoryPath
        : undefined
  };
}

export async function createPublishedGitArtifact(input: {
  artifactId?: string;
  branch?: string;
  filePath?: string;
  remoteRepositoryPath: string;
  repositoryName?: string;
  summary?: string;
}): Promise<ArtifactRef> {
  const workingRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-remote-artifact-"));
  createdDirectories.push(workingRoot);

  const checkoutPath = path.join(workingRoot, "checkout");
  const branch = input.branch ?? "worker-it/session-alpha/review-patch";
  const filePath = input.filePath ?? "reports/session-alpha/input.md";
  const repositoryName = input.repositoryName ?? "graph-alpha";

  await runGitCommand(workingRoot, ["clone", input.remoteRepositoryPath, checkoutPath]);
  await runGitCommand(checkoutPath, ["config", "user.name", "Remote Worker"]);
  await runGitCommand(checkoutPath, ["config", "user.email", "remote-worker@entangle.local"]);
  await runGitCommand(checkoutPath, ["checkout", "-B", branch]);
  await mkdir(path.dirname(path.join(checkoutPath, filePath)), { recursive: true });
  await writeFile(
    path.join(checkoutPath, filePath),
    input.summary ?? "Remote artifact content.\n",
    "utf8"
  );
  await runGitCommand(checkoutPath, ["add", "--", filePath]);
  await runGitCommand(checkoutPath, ["commit", "-m", "Add remote artifact"]);
  await runGitCommand(checkoutPath, ["push", "--set-upstream", "origin", branch]);

  const commit = await new Promise<string>((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "HEAD"], {
      cwd: checkoutPath,
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
          `Git command failed (rev-parse HEAD): ${stderr.trim() || "unknown error"}`
        )
      );
    });
  });

  return {
    artifactId: input.artifactId ?? "input-report",
    artifactKind: "report_file",
    backend: "git",
    contentSummary: input.summary ?? "Remote artifact content.",
    createdByNodeId: "reviewer-it",
    locator: {
      branch,
      commit,
      gitServiceRef: "local-gitea",
      namespace: "team-alpha",
      repositoryName,
      path: filePath
    },
    preferred: true,
    sessionId: "session-alpha",
    status: "published"
  };
}

export function buildInboundTaskRequest(
  input: {
    artifactRefs?: ArtifactRef[];
    conversationId?: string;
    eventId?: string;
    fromNodeId?: string;
    fromPubkey?: string;
    graphId?: string;
    intent?: string;
    receivedAt?: string;
    responsePolicy?: Partial<EntangleA2AResponsePolicy>;
    sessionId?: string;
    summary?: string;
    toNodeId?: string;
    toPubkey?: string;
    turnId?: string;
  } = {}
): RunnerInboundEnvelope {
  const message = entangleA2AMessageSchema.parse({
    constraints: {
      approvalRequiredBeforeAction: false
    },
    conversationId: input.conversationId ?? "conv-alpha",
    fromNodeId: input.fromNodeId ?? "reviewer-it",
    fromPubkey: input.fromPubkey ?? remotePublicKey,
    graphId: input.graphId ?? "graph-alpha",
    intent: input.intent ?? "review_patch",
    messageType: "task.request",
    protocol: "entangle.a2a.v1",
    responsePolicy: {
      closeOnResult: input.responsePolicy?.closeOnResult ?? true,
      maxFollowups: input.responsePolicy?.maxFollowups ?? 1,
      responseRequired: input.responsePolicy?.responseRequired ?? true
    },
    sessionId: input.sessionId ?? "session-alpha",
    toNodeId: input.toNodeId ?? "worker-it",
    toPubkey: input.toPubkey ?? runnerPublicKey,
    turnId: input.turnId ?? "turn-001",
    work: {
      artifactRefs: input.artifactRefs ?? [],
      metadata: {},
      summary:
        input.summary ?? "Review the parser patch and summarize blocking issues."
    }
  });

  return {
    eventId:
      input.eventId ??
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    message,
    receivedAt: input.receivedAt ?? "2026-04-22T00:00:00.000Z"
  };
}

export async function cleanupRuntimeFixtures(): Promise<void> {
  await Promise.all(
    createdDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
}
