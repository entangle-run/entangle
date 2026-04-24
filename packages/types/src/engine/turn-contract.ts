import { z } from "zod";
import {
  artifactBackendSchema,
  artifactRefSchema
} from "../artifacts/artifact-ref.js";
import {
  filesystemPathSchema,
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";
import { modelEndpointAdapterKindSchema } from "../resources/catalog.js";

export const engineToolDefinitionSchema = z.object({
  id: identifierSchema,
  description: nonEmptyStringSchema,
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  strict: z.boolean().optional()
});

export const engineToolChoiceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("auto")
  }),
  z.object({
    type: z.literal("tool"),
    toolId: identifierSchema
  })
]);

export const engineToolRequestSchema = z.object({
  toolId: nonEmptyStringSchema,
  input: z.record(z.string(), z.unknown()).default({})
});

export const agentEngineStopReasonSchema = z.enum([
  "completed",
  "tool_call_requested",
  "max_turns_reached",
  "error"
]);

export const agentEngineFailureClassificationSchema = z.enum([
  "auth_error",
  "quota_error",
  "rate_limit",
  "bad_request",
  "provider_unavailable",
  "tool_protocol_error",
  "context_limit_error",
  "configuration_error",
  "unknown_provider_error"
]);

export const engineTokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative()
});

export const engineProviderMetadataSchema = z.object({
  adapterKind: modelEndpointAdapterKindSchema,
  modelId: nonEmptyStringSchema.optional(),
  profileId: identifierSchema
});

export const engineTurnFailureSchema = z.object({
  classification: agentEngineFailureClassificationSchema,
  message: nonEmptyStringSchema
});

export const engineToolExecutionObservationSchema = z.object({
  errorCode: z
    .enum([
      "invalid_input",
      "tool_execution_failed",
      "tool_not_declared",
      "tool_result_error"
    ])
    .optional(),
  outcome: z.enum(["success", "error"]),
  sequence: z.number().int().positive(),
  toolCallId: nonEmptyStringSchema,
  toolId: nonEmptyStringSchema
});

function refineEngineFailureConsistency(
  value: {
    failure?: unknown;
    stopReason: z.infer<typeof agentEngineStopReasonSchema>;
  },
  context: z.RefinementCtx
): void {
  if (value.failure && value.stopReason !== "error") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Engine failures can only be recorded when stopReason is 'error'.",
      path: ["failure"]
    });
  }

  if (!value.failure && value.stopReason === "error") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Engine stopReason 'error' must include a bounded failure payload.",
      path: ["failure"]
    });
  }
}

export const engineTurnOutcomeSchema = z
  .object({
    failure: engineTurnFailureSchema.optional(),
    providerMetadata: engineProviderMetadataSchema.optional(),
    providerStopReason: nonEmptyStringSchema.optional(),
    stopReason: agentEngineStopReasonSchema,
    toolExecutions: z.array(engineToolExecutionObservationSchema).default([]),
    usage: engineTokenUsageSchema.optional()
  })
  .superRefine(refineEngineFailureConsistency);

export const engineArtifactInputSchema = z.object({
  artifactId: identifierSchema,
  backend: artifactBackendSchema,
  localPath: filesystemPathSchema,
  repoPath: filesystemPathSchema.optional(),
  sourceRef: artifactRefSchema
});

export const engineToolExecutionRequestSchema = z.object({
  artifactInputs: z.array(engineArtifactInputSchema).default([]),
  input: z.record(z.string(), z.unknown()).default({}),
  memoryRefs: z.array(nonEmptyStringSchema).default([]),
  nodeId: identifierSchema,
  sessionId: identifierSchema,
  tool: engineToolDefinitionSchema,
  toolCallId: nonEmptyStringSchema
});

export const engineToolExecutionResultSchema = z.object({
  content: z.union([
    nonEmptyStringSchema,
    z.record(z.string(), z.unknown())
  ]),
  isError: z.boolean().default(false)
});

export const agentEngineTurnRequestSchema = z.object({
  sessionId: identifierSchema,
  nodeId: identifierSchema,
  systemPromptParts: z.array(nonEmptyStringSchema).min(1),
  interactionPromptParts: z.array(nonEmptyStringSchema).min(1),
  toolChoice: engineToolChoiceSchema.optional(),
  toolDefinitions: z.array(engineToolDefinitionSchema).default([]),
  artifactRefs: z.array(artifactRefSchema).default([]),
  artifactInputs: z.array(engineArtifactInputSchema).default([]),
  memoryRefs: z.array(nonEmptyStringSchema).default([]),
  executionLimits: z
    .object({
      maxToolTurns: z.number().int().positive().default(8),
      maxOutputTokens: z.number().int().positive().default(4096)
    })
    .default({
      maxToolTurns: 8,
      maxOutputTokens: 4096
    })
});

export const agentEngineTurnResultSchema = z
  .object({
    assistantMessages: z.array(nonEmptyStringSchema).default([]),
    failure: engineTurnFailureSchema.optional(),
    providerMetadata: engineProviderMetadataSchema.optional(),
    providerStopReason: nonEmptyStringSchema.optional(),
    toolRequests: z.array(engineToolRequestSchema).default([]),
    stopReason: agentEngineStopReasonSchema,
    toolExecutions: z.array(engineToolExecutionObservationSchema).default([]),
    usage: engineTokenUsageSchema.optional()
  })
  .superRefine(refineEngineFailureConsistency);

export type EngineToolDefinition = z.infer<typeof engineToolDefinitionSchema>;
export type EngineToolChoice = z.infer<typeof engineToolChoiceSchema>;
export type EngineToolRequest = z.infer<typeof engineToolRequestSchema>;
export type AgentEngineStopReason = z.infer<typeof agentEngineStopReasonSchema>;
export type AgentEngineFailureClassification = z.infer<
  typeof agentEngineFailureClassificationSchema
>;
export type EngineTokenUsage = z.infer<typeof engineTokenUsageSchema>;
export type EngineProviderMetadata = z.infer<typeof engineProviderMetadataSchema>;
export type EngineTurnFailure = z.infer<typeof engineTurnFailureSchema>;
export type EngineToolExecutionObservation = z.infer<
  typeof engineToolExecutionObservationSchema
>;
export type EngineTurnOutcome = z.infer<typeof engineTurnOutcomeSchema>;
export type EngineToolExecutionRequest = z.infer<
  typeof engineToolExecutionRequestSchema
>;
export type EngineToolExecutionResult = z.infer<
  typeof engineToolExecutionResultSchema
>;
export type EngineArtifactInput = z.infer<typeof engineArtifactInputSchema>;
export type AgentEngineTurnRequest = z.infer<typeof agentEngineTurnRequestSchema>;
export type AgentEngineTurnResult = z.infer<typeof agentEngineTurnResultSchema>;
