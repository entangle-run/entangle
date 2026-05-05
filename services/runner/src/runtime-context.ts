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
  type EngineTurnRequestSummary,
  type PackageToolCatalog
} from "@entangle/types";

type RuntimeConfigDocument = {
  toolBudget?: {
    maxOutputTokens?: number;
    maxToolTurns?: number;
  };
};

type MemoryBriefCandidate = {
  label: string;
  relativePath: string;
};

const maxMemoryBriefCharactersPerFile = 1200;
const maxMemoryBriefCharactersTotal = 4200;
const minMemoryBriefSectionCharacters = 160;
const memoryBriefCandidates: MemoryBriefCandidate[] = [
  {
    label: "Next actions",
    relativePath: "summaries/next-actions.md"
  },
  {
    label: "Source change ledger",
    relativePath: "summaries/source-change-ledger.md"
  },
  {
    label: "Coordination map",
    relativePath: "summaries/coordination-map.md"
  },
  {
    label: "Open questions",
    relativePath: "summaries/open-questions.md"
  },
  {
    label: "Decisions",
    relativePath: "summaries/decisions.md"
  },
  {
    label: "Stable facts",
    relativePath: "summaries/stable-facts.md"
  },
  {
    label: "Working context",
    relativePath: "summaries/working-context.md"
  }
];

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

function truncateMemoryBriefContent(value: string, maxCharacters: number): string {
  const normalized = value.trim().replace(/\n{3,}/g, "\n\n");

  if (normalized.length <= maxCharacters) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxCharacters - 15)).trimEnd()}\n[truncated]`;
}

async function collectMemoryBriefPromptPart(
  context: EffectiveRuntimeContext
): Promise<string | undefined> {
  const wikiRoot = path.join(context.workspace.memoryRoot, "wiki");
  const sections: string[] = [];
  let remainingCharacters = maxMemoryBriefCharactersTotal;

  for (const candidate of memoryBriefCandidates) {
    if (remainingCharacters <= 0) {
      break;
    }

    const content = await readTextFileIfPresent(
      path.join(wikiRoot, candidate.relativePath)
    );

    if (!content?.trim()) {
      continue;
    }

    const heading = `### ${candidate.label} (${candidate.relativePath})`;
    const sectionBudget = Math.min(
      maxMemoryBriefCharactersPerFile,
      remainingCharacters
    );
    const contentBudget = sectionBudget - heading.length - 1;

    if (contentBudget < minMemoryBriefSectionCharacters) {
      break;
    }

    const boundedContent = truncateMemoryBriefContent(content, contentBudget);
    const renderedSection = [heading, boundedContent].join("\n");

    sections.push(renderedSection);
    remainingCharacters -= renderedSection.length;
  }

  if (sections.length === 0) {
    return undefined;
  }

  return [
    "Memory brief:",
    "Use this bounded brief as the current node memory baseline; consult memory refs for complete source pages.",
    ...sections
  ].join("\n\n");
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
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "coordination-map.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "stable-facts.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "open-questions.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "decisions.md"),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "next-actions.md"),
    path.join(
      context.workspace.memoryRoot,
      "wiki",
      "summaries",
      "source-change-ledger.md"
    ),
    path.join(context.workspace.memoryRoot, "wiki", "summaries", "resolutions.md"),
    path.join(
      context.workspace.memoryRoot,
      "wiki",
      "summaries",
      "focused-register-transition-history.md"
    ),
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

function buildPeerRoutePromptPart(
  context: EffectiveRuntimeContext
): string | undefined {
  const maxRoutes = 8;

  if (context.relayContext.edgeRoutes.length === 0) {
    return undefined;
  }

  const routeSummaries = context.relayContext.edgeRoutes
    .slice(0, maxRoutes)
    .map((route) => {
      const relaySummary =
        route.relayProfileRefs.length > 0
          ? route.relayProfileRefs.join(",")
          : "none";
      const peerIdentitySummary = route.peerPubkey
        ? `pubkey=${route.peerPubkey}`
        : "pubkey=unresolved";

      return (
        `${route.peerNodeId} ` +
        `(edge=${route.edgeId}, relation=${route.relation}, ` +
        `channel=${route.channel}, relays=${relaySummary}, ${peerIdentitySummary})`
      );
    });
  const omittedRouteCount = context.relayContext.edgeRoutes.length - routeSummaries.length;

  return [
    `Peer routes: ${routeSummaries.join("; ")}`,
    omittedRouteCount > 0 ? `Omitted peer routes: ${omittedRouteCount}` : undefined
  ]
    .filter((part): part is string => part !== undefined)
    .join("\n");
}

function formatBoolean(value: boolean): string {
  return value ? "yes" : "no";
}

function buildAgentRuntimePromptPart(context: EffectiveRuntimeContext): string {
  const engineProfile = context.agentRuntimeContext.engineProfile;

  return (
    `Agent runtime: mode=${context.agentRuntimeContext.mode}, ` +
    `engineProfile=${engineProfile.id} (${engineProfile.kind}), ` +
    `defaultAgent=${context.agentRuntimeContext.defaultAgent ?? "none"}, ` +
    `stateScope=${engineProfile.stateScope}`
  );
}

function buildWorkspaceBoundaryPromptPart(
  context: EffectiveRuntimeContext
): string {
  return [
    "Workspace boundaries:",
    `- source workspace: ${
      context.workspace.sourceWorkspaceRoot
        ? "configured for node-owned code edits"
        : "not configured"
    }`,
    "- artifact workspace: runner-owned materialization and outbound handoff surface",
    "- memory wiki: runner-owned durable memory; use provided memory refs as context",
    `- wiki repository: ${
      context.workspace.wikiRepositoryRoot
        ? "configured as runner-owned memory snapshot"
        : "not configured"
    }`,
    "- outbound work must use Entangle artifact refs or messages, not runtime-owned filesystem paths"
  ].join("\n");
}

function buildPolicyPromptPart(context: EffectiveRuntimeContext): string {
  const { autonomy, notes, sourceMutation } = context.policyContext;
  const noteSummaries = notes.slice(0, 5).map((note) => `- note: ${note}`);

  return [
    "Policy context:",
    `- can initiate sessions: ${formatBoolean(autonomy.canInitiateSessions)}`,
    `- can mutate graph: ${formatBoolean(autonomy.canMutateGraph)}`,
    `- source application requires approval: ${formatBoolean(sourceMutation.applyRequiresApproval)}`,
    `- source publication requires approval: ${formatBoolean(sourceMutation.publishRequiresApproval)}`,
    `- non-primary source publication requires approval: ${formatBoolean(sourceMutation.nonPrimaryPublishRequiresApproval)}`,
    ...noteSummaries
  ].join("\n");
}

function buildInboundControlPromptPart(
  message: EntangleA2AMessage
): string {
  return [
    "Inbound controls:",
    `- message type: ${message.messageType}`,
    `- conversation id: ${message.conversationId}`,
    `- turn id: ${message.turnId}`,
    `- parent message id: ${message.parentMessageId ?? "none"}`,
    `- from node: ${message.fromNodeId}`,
    `- to node: ${message.toNodeId}`,
    `- response required: ${formatBoolean(message.responsePolicy.responseRequired)}`,
    `- close on result: ${formatBoolean(message.responsePolicy.closeOnResult)}`,
    `- max followups: ${message.responsePolicy.maxFollowups}`,
    `- approval required before action: ${formatBoolean(message.constraints.approvalRequiredBeforeAction)}`,
    `- inbound artifact refs: ${message.work.artifactRefs.length}`
  ].join("\n");
}

function buildEntangleActionContractPromptPart(
  context: EffectiveRuntimeContext
): string {
  const peerRouteCount = context.relayContext.edgeRoutes.filter(
    (route) => route.peerNodeId && route.peerPubkey
  ).length;

  return [
    "Entangle action contract:",
    "- Do not message peers, publish artifacts, mutate the graph, or apply source changes directly.",
    "- Propose Entangle side effects only through a single fenced ```entangle-actions JSON block in the final answer.",
    "- Supported shape: {\"handoffDirectives\":[{\"targetNodeId\":\"peer-node-id\",\"summary\":\"bounded task summary\",\"includeArtifacts\":\"produced\"}],\"approvalRequestDirectives\":[{\"operation\":\"source_publication\",\"reason\":\"bounded approval reason\",\"resource\":{\"kind\":\"source_history\",\"id\":\"resource-id\"}}]}",
    "- Entangle validates every directive against graph routes and policy before performing the side effect.",
    "- Approval request directives create pending Entangle approval gates; do not perform the gated action yourself.",
    `- materialized peer handoff routes available: ${peerRouteCount}`
  ].join("\n");
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
  const [
    systemPrompt,
    interactionPrompt,
    runtimeConfig,
    memoryRefs,
    memoryBriefPromptPart
  ] =
    await Promise.all([
      readTextFileIfPresent(systemPromptPath),
      readTextFileIfPresent(interactionPromptPath),
      readRuntimeConfig(context),
      collectMemoryRefs(context),
      collectMemoryBriefPromptPart(context)
    ]);
  const peerRoutePromptPart = buildPeerRoutePromptPart(context);

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
      buildAgentRuntimePromptPart(context),
      buildWorkspaceBoundaryPromptPart(context),
      buildPolicyPromptPart(context),
      ...(memoryBriefPromptPart ? [memoryBriefPromptPart] : []),
      buildEntangleActionContractPromptPart(context),
      ...(peerRoutePromptPart ? [peerRoutePromptPart] : []),
      ...(input.inboundMessage
        ? [
            `Inbound intent: ${input.inboundMessage.intent}`,
            `Inbound summary: ${input.inboundMessage.work.summary}`,
            `Inbound sender: ${input.inboundMessage.fromNodeId} (${input.inboundMessage.fromPubkey})`,
            buildInboundControlPromptPart(input.inboundMessage)
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

function sumCharacterCount(parts: string[]): number {
  return parts.reduce((total, part) => total + part.length, 0);
}

export function summarizeAgentEngineTurnRequest(
  request: AgentEngineTurnRequest,
  input: { generatedAt: string }
): EngineTurnRequestSummary {
  return {
    actionContractContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Entangle action contract:")
    ),
    agentRuntimeContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Agent runtime:")
    ),
    artifactInputCount: request.artifactInputs.length,
    artifactRefCount: request.artifactRefs.length,
    executionLimits: request.executionLimits,
    generatedAt: input.generatedAt,
    inboundMessageContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Inbound controls:")
    ),
    interactionPromptCharacterCount: sumCharacterCount(
      request.interactionPromptParts
    ),
    interactionPromptPartCount: request.interactionPromptParts.length,
    memoryBriefContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Memory brief:")
    ),
    memoryRefCount: request.memoryRefs.length,
    peerRouteContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Peer routes:")
    ),
    policyContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Policy context:")
    ),
    systemPromptCharacterCount: sumCharacterCount(request.systemPromptParts),
    systemPromptPartCount: request.systemPromptParts.length,
    toolDefinitionCount: request.toolDefinitions.length,
    workspaceBoundaryContextIncluded: request.interactionPromptParts.some((part) =>
      part.startsWith("Workspace boundaries:")
    )
  };
}
