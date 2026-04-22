import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type EffectiveRuntimeContext } from "@entangle/types";
import {
  buildAgentEngineTurnRequest,
  loadRuntimeContext
} from "./runtime-context.js";
import { runRunnerOnce } from "./index.js";

const createdDirectories: string[] = [];

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createRuntimeFixture(): Promise<{
  context: EffectiveRuntimeContext;
  contextPath: string;
}> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "entangle-runner-"));
  createdDirectories.push(tempRoot);

  const packageRoot = path.join(tempRoot, "package-source");
  const workspaceRoot = path.join(tempRoot, "workspace");
  const injectedRoot = path.join(workspaceRoot, "injected");
  const memoryRoot = path.join(workspaceRoot, "memory");

  await Promise.all([
    mkdir(path.join(packageRoot, "prompts"), { recursive: true }),
    mkdir(path.join(packageRoot, "runtime"), { recursive: true }),
    mkdir(path.join(memoryRoot, "schema"), { recursive: true }),
    mkdir(path.join(memoryRoot, "wiki"), { recursive: true }),
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

  const context: EffectiveRuntimeContext = {
    artifactContext: {
      backends: ["git"],
      defaultNamespace: "team-alpha",
      gitServices: [
        {
          id: "local-gitea",
          displayName: "Local Gitea",
          baseUrl: "http://gitea:3000",
          transportKind: "ssh",
          authMode: "ssh_key",
          defaultNamespace: "team-alpha"
        }
      ],
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
      publicKey: "4f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
      secretDelivery: {
        envVar: "ENTANGLE_NOSTR_SECRET_KEY",
        mode: "env_var"
      }
    },
    modelContext: {
      modelEndpointProfile: {
        id: "shared-model",
        displayName: "Shared Model",
        adapterKind: "anthropic",
        baseUrl: "https://api.anthropic.com",
        authMode: "api_key_bearer",
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
        capabilitiesPath: "runtime/capabilities.json"
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
      runtimeRoot: path.join(workspaceRoot, "runtime")
    }
  };

  const contextPath = path.join(injectedRoot, "effective-runtime-context.json");
  await writeJsonFile(contextPath, context);

  return {
    context,
    contextPath
  };
}

afterEach(async () => {
  delete process.env.ENTANGLE_NOSTR_SECRET_KEY;

  await Promise.all(
    createdDirectories.splice(0).map((directoryPath) =>
      rm(directoryPath, { force: true, recursive: true })
    )
  );
});

describe("runner runtime context", () => {
  it("loads runtime context and builds the first engine turn request from package files", async () => {
    const fixture = await createRuntimeFixture();

    const context = await loadRuntimeContext(fixture.contextPath);
    const request = await buildAgentEngineTurnRequest(context);

    expect(request.nodeId).toBe("worker-it");
    expect(request.executionLimits).toEqual({
      maxToolTurns: 5,
      maxOutputTokens: 1536
    });
    expect(request.systemPromptParts[0]).toContain("System prompt from package.");
    expect(request.interactionPromptParts[0]).toContain(
      "Interaction prompt from package."
    );
    expect(request.memoryRefs).toContain(
      path.join(context.workspace.memoryRoot, "schema", "AGENTS.md")
    );
  });

  it("executes one stub-engine turn from an injected runtime context", async () => {
    const fixture = await createRuntimeFixture();
    process.env.ENTANGLE_NOSTR_SECRET_KEY =
      "1111111111111111111111111111111111111111111111111111111111111111";

    const result = await runRunnerOnce(fixture.contextPath);

    expect(result.graphId).toBe("graph-alpha");
    expect(result.nodeId).toBe("worker-it");
    expect(result.packageId).toBe("worker-it");
    expect(result.publicKey).toBe(
      "4f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa"
    );
    expect(result.result.assistantMessages[0]).toContain("worker-it");
  });
});
