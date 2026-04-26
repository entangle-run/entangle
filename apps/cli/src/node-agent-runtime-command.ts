import {
  managedNodeKindSchema,
  nodeAgentRuntimeModeSchema,
  nodeReplacementRequestSchema,
  type NodeAgentRuntime,
  type NodeAgentRuntimeMode,
  type NodeInspectionResponse,
  type NodeReplacementRequest
} from "@entangle/types";

export type NodeAgentRuntimeConfigurationOptions = {
  clearDefaultAgent?: boolean;
  clearEngineProfileRef?: boolean;
  defaultAgent?: string;
  dryRun?: boolean;
  engineProfileRef?: string;
  inheritMode?: boolean;
  mode?: string;
  summary?: boolean;
};

function hasAgentRuntimeMutation(
  options: NodeAgentRuntimeConfigurationOptions
): boolean {
  return Boolean(
    options.mode ||
      options.inheritMode ||
      options.engineProfileRef ||
      options.clearEngineProfileRef ||
      options.defaultAgent ||
      options.clearDefaultAgent
  );
}

function parseAgentRuntimeMode(
  mode: string | undefined
): NodeAgentRuntimeMode | undefined {
  return mode === undefined ? undefined : nodeAgentRuntimeModeSchema.parse(mode);
}

export function buildNodeAgentRuntimeReplacementRequest(
  inspection: NodeInspectionResponse,
  options: NodeAgentRuntimeConfigurationOptions
): NodeReplacementRequest {
  if (!hasAgentRuntimeMutation(options)) {
    throw new Error(
      "At least one agent-runtime configuration option is required."
    );
  }

  if (options.mode && options.inheritMode) {
    throw new Error("Use either --mode or --inherit-mode, not both.");
  }

  if (options.engineProfileRef && options.clearEngineProfileRef) {
    throw new Error(
      "Use either --engine-profile-ref or --clear-engine-profile-ref, not both."
    );
  }

  if (options.defaultAgent && options.clearDefaultAgent) {
    throw new Error(
      "Use either --default-agent or --clear-default-agent, not both."
    );
  }

  const node = inspection.binding.node;
  const nodeKind = managedNodeKindSchema.parse(node.nodeKind);
  const agentRuntime: NodeAgentRuntime = {
    ...node.agentRuntime
  };
  const mode = parseAgentRuntimeMode(options.mode);

  if (mode) {
    agentRuntime.mode = mode;
  }

  if (options.inheritMode) {
    delete agentRuntime.mode;
  }

  if (options.engineProfileRef) {
    agentRuntime.engineProfileRef = options.engineProfileRef;
  }

  if (options.clearEngineProfileRef) {
    delete agentRuntime.engineProfileRef;
  }

  if (options.defaultAgent) {
    agentRuntime.defaultAgent = options.defaultAgent;
  }

  if (options.clearDefaultAgent) {
    delete agentRuntime.defaultAgent;
  }

  return nodeReplacementRequestSchema.parse({
    agentRuntime,
    autonomy: node.autonomy,
    displayName: node.displayName,
    nodeKind,
    ...(node.packageSourceRef ? { packageSourceRef: node.packageSourceRef } : {}),
    resourceBindings: node.resourceBindings
  });
}
