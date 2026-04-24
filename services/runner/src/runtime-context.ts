import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  agentEngineTurnRequestSchema,
  type EngineArtifactInput,
  type EngineToolDefinition,
  type EntangleA2AMessage,
  effectiveRuntimeContextSchema,
  packageToolCatalogSchema,
  type AgentEngineTurnRequest,
  type EffectiveRuntimeContext,
  type PackageToolCatalog
} from "@entangle/types";

type RuntimeConfigDocument = {
  toolBudget?: {
    maxOutputTokens?: number;
    maxToolTurns?: number;
  };
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readTextFileIfPresent(filePath: string): Promise<string | undefined> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }

  return readFile(filePath, "utf8");
}

async function readRuntimeConfig(
  context: EffectiveRuntimeContext
): Promise<RuntimeConfigDocument | undefined> {
  const configPath = path.join(
    context.workspace.packageRoot,
    context.packageManifest?.runtime.configPath ?? "runtime/config.json"
  );

  if (!(await pathExists(configPath))) {
    return undefined;
  }

  try {
    return await readJsonFile<RuntimeConfigDocument>(configPath);
  } catch {
    return undefined;
  }
}

export async function collectMemoryRefs(
  context: EffectiveRuntimeContext
): Promise<string[]> {
  const recentTaskRefs = await collectRecentTaskMemoryRefs(context);
  const candidatePaths = [
    path.join(context.workspace.memoryRoot, "schema", "AGENTS.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "working-context.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "stable-facts.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "open-questions.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "decisions.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "next-actions.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "recent-work.md"),
    path.join(context.workspace.memoryRoot, "wiki", "log.md"),
    path.join(context.workspace.memoryRoot, "wiki", "index.md"),
    ...recentTaskRefs
  ];
  const resolvedRefs: string[] = [];

  for (const candidatePath of candidatePaths) {
    if (
      (await pathExists(candidatePath)) &&
      !resolvedRefs.includes(candidatePath)
    ) {
      resolvedRefs.push(candidatePath);
    }
  }

  return resolvedRefs;
}

async function collectMarkdownFilesRecursively(
  rootPath: string
): Promise<string[]> {
  if (!(await pathExists(rootPath))) {
    return [];
  }

  const entries = await readdir(rootPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(rootPath, entry.name);

      if (entry.isDirectory()) {
        return collectMarkdownFilesRecursively(absolutePath);
      }

      return absolutePath.endsWith(".md") ? [absolutePath] : [];
    })
  );

  return nestedFiles.flat();
}

async function collectRecentTaskMemoryRefs(
  context: EffectiveRuntimeContext,
  limit = 3
): Promise<string[]> {
  const taskFiles = await collectMarkdownFilesRecursively(
    path.join(context.workspace.memoryRoot, "wiki", "tasks")
  );
  const filesWithTimestamps = await Promise.all(
    taskFiles.map(async (filePath) => ({
      filePath,
      modifiedAt: (await stat(filePath)).mtimeMs
    }))
  );

  return filesWithTimestamps
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
    .slice(0, limit)
    .map((entry) => entry.filePath);
}

export function resolveRuntimeContextPath(explicitPath?: string): string {
  return (
    explicitPath ??
    process.env.ENTANGLE_RUNTIME_CONTEXT_PATH ??
    path.join(process.cwd(), "injected", "effective-runtime-context.json")
  );
}

export async function loadRuntimeContext(
  explicitPath?: string
): Promise<EffectiveRuntimeContext> {
  const runtimeContextPath = resolveRuntimeContextPath(explicitPath);
  return effectiveRuntimeContextSchema.parse(
    await readJsonFile(runtimeContextPath)
  );
}

function resolvePackageToolCatalogPath(context: EffectiveRuntimeContext): string {
  return path.join(
    context.workspace.packageRoot,
    context.packageManifest?.runtime.toolsPath ?? "runtime/tools.json"
  );
}

export async function loadPackageToolCatalog(
  context: EffectiveRuntimeContext
): Promise<PackageToolCatalog> {
  const toolCatalogPath = resolvePackageToolCatalogPath(context);

  if (!(await pathExists(toolCatalogPath))) {
    throw new Error(
      `Package tool catalog is missing at '${toolCatalogPath}' for node '${context.binding.node.nodeId}'.`
    );
  }

  return packageToolCatalogSchema.parse(
    await readJsonFile<unknown>(toolCatalogPath)
  );
}

export function mapPackageToolCatalogToEngineToolDefinitions(
  toolCatalog: PackageToolCatalog
): EngineToolDefinition[] {
  return toolCatalog.tools.map((toolDefinition) => ({
    description: toolDefinition.description,
    id: toolDefinition.id,
    inputSchema: toolDefinition.inputSchema
  }));
}

export async function buildAgentEngineTurnRequest(
  context: EffectiveRuntimeContext,
  input: {
    artifactInputs?: EngineArtifactInput[];
    inboundMessage?: EntangleA2AMessage;
    toolDefinitions?: EngineToolDefinition[];
  } = {}
): Promise<AgentEngineTurnRequest> {
  const systemPromptPath = path.join(
    context.workspace.packageRoot,
    context.packageManifest?.entryPrompts.system ?? "prompts/system.md"
  );
  const interactionPromptPath = path.join(
    context.workspace.packageRoot,
    context.packageManifest?.entryPrompts.interaction ?? "prompts/interaction.md"
  );
  const [systemPrompt, interactionPrompt, runtimeConfig, memoryRefs] =
    await Promise.all([
      readTextFileIfPresent(systemPromptPath),
      readTextFileIfPresent(interactionPromptPath),
      readRuntimeConfig(context),
      collectMemoryRefs(context)
    ]);

  return agentEngineTurnRequestSchema.parse({
    sessionId:
      input.inboundMessage?.sessionId ??
      `${context.binding.graphRevisionId}-${context.binding.node.nodeId}`,
    nodeId: context.binding.node.nodeId,
    systemPromptParts: [
      systemPrompt?.trim() || "You are an Entangle runtime node.",
      `Graph: ${context.binding.graphId}`,
      `Node: ${context.binding.node.displayName} (${context.binding.node.nodeId})`,
      `Runtime profile: ${context.binding.runtimeProfile}`
    ],
    interactionPromptParts: [
      interactionPrompt?.trim() ||
        "Process the assigned task using the injected runtime context.",
      `Model adapter: ${context.modelContext.modelEndpointProfile?.adapterKind ?? "unbound"}`,
      `Primary relay: ${context.relayContext.primaryRelayProfileRef ?? "none"}`,
      `Primary git service: ${context.artifactContext.primaryGitServiceRef ?? "none"}`,
      `Primary git repository: ${
        context.artifactContext.primaryGitRepositoryTarget
          ? `${context.artifactContext.primaryGitRepositoryTarget.namespace}/${context.artifactContext.primaryGitRepositoryTarget.repositoryName}`
          : "none"
      }`,
      ...(input.inboundMessage
        ? [
            `Inbound intent: ${input.inboundMessage.intent}`,
            `Inbound summary: ${input.inboundMessage.work.summary}`,
            `Inbound sender: ${input.inboundMessage.fromNodeId} (${input.inboundMessage.fromPubkey})`
          ]
        : [])
    ],
    toolDefinitions:
      input.toolDefinitions ??
      mapPackageToolCatalogToEngineToolDefinitions(
        await loadPackageToolCatalog(context)
      ),
    artifactRefs: input.inboundMessage?.work.artifactRefs ?? [],
    artifactInputs: input.artifactInputs ?? [],
    memoryRefs,
    executionLimits: {
      maxToolTurns: runtimeConfig?.toolBudget?.maxToolTurns ?? 8,
      maxOutputTokens: runtimeConfig?.toolBudget?.maxOutputTokens ?? 4096
    }
  });
}
