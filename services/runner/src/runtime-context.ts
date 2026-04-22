import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  agentEngineTurnRequestSchema,
  type EntangleA2AMessage,
  effectiveRuntimeContextSchema,
  type AgentEngineTurnRequest,
  type EffectiveRuntimeContext
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

async function collectMemoryRefs(
  context: EffectiveRuntimeContext
): Promise<string[]> {
  const candidatePaths = [
    path.join(context.workspace.memoryRoot, "schema", "AGENTS.md"),
    path.join(context.workspace.memoryRoot, "wiki", "index.md"),
    context.workspace.memoryRoot
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

export async function buildAgentEngineTurnRequest(
  context: EffectiveRuntimeContext,
  input: {
    inboundMessage?: EntangleA2AMessage;
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
      ...(input.inboundMessage
        ? [
            `Inbound intent: ${input.inboundMessage.intent}`,
            `Inbound summary: ${input.inboundMessage.work.summary}`,
            `Inbound sender: ${input.inboundMessage.fromNodeId} (${input.inboundMessage.fromPubkey})`
          ]
        : [])
    ],
    toolDefinitions: [],
    artifactRefs: input.inboundMessage?.work.artifactRefs ?? [],
    memoryRefs,
    executionLimits: {
      maxToolTurns: runtimeConfig?.toolBudget?.maxToolTurns ?? 8,
      maxOutputTokens: runtimeConfig?.toolBudget?.maxOutputTokens ?? 4096
    }
  });
}
