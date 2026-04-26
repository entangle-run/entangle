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
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
import { entangleA2AResponsePolicySchema } from "../protocol/a2a.js";
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
  "cancelled",
  "error"
]);

export const agentEngineFailureClassificationSchema = z.enum([
  "auth_error",
  "quota_error",
  "rate_limit",
  "bad_request",
  "policy_denied",
  "provider_unavailable",
  "tool_protocol_error",
  "context_limit_error",
  "configuration_error",
  "cancelled",
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
  message: nonEmptyStringSchema.optional(),
  outcome: z.enum(["success", "error"]),
  sequence: z.number().int().positive(),
  toolCallId: nonEmptyStringSchema,
  toolId: nonEmptyStringSchema
});

export const enginePolicyOperationSchema = policyOperationSchema;

export const enginePermissionDecisionSchema = z.enum([
  "allowed",
  "denied",
  "pending",
  "rejected"
]);

export const enginePermissionObservationSchema = z.object({
  decision: enginePermissionDecisionSchema,
  operation: enginePolicyOperationSchema,
  patterns: z.array(nonEmptyStringSchema).default([]),
  permission: nonEmptyStringSchema,
  reason: nonEmptyStringSchema.optional()
});

function refineEngineFailureConsistency(
  value: {
    failure?: unknown;
    stopReason: z.infer<typeof agentEngineStopReasonSchema>;
  },
  context: z.RefinementCtx
): void {
  if (
    value.failure &&
    value.stopReason !== "error" &&
    value.stopReason !== "cancelled"
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Engine failures can only be recorded when stopReason is 'error' or 'cancelled'.",
      path: ["failure"]
    });
  }

  if (
    !value.failure &&
    (value.stopReason === "error" || value.stopReason === "cancelled")
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Engine stopReason 'error' or 'cancelled' must include a bounded failure payload.",
      path: ["failure"]
    });
  }
}

export const engineTurnOutcomeSchema = z
  .object({
    engineSessionId: nonEmptyStringSchema.optional(),
    engineVersion: nonEmptyStringSchema.optional(),
    failure: engineTurnFailureSchema.optional(),
    permissionObservations: z.array(enginePermissionObservationSchema).optional(),
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

export const engineHandoffArtifactInclusionSchema = z.enum([
  "none",
  "produced",
  "all"
]);

export const engineHandoffDirectiveSchema = z
  .object({
    edgeId: identifierSchema.optional(),
    includeArtifacts: engineHandoffArtifactInclusionSchema.default("produced"),
    intent: nonEmptyStringSchema.optional(),
    responsePolicy: entangleA2AResponsePolicySchema.default({
      closeOnResult: true,
      maxFollowups: 1,
      responseRequired: true
    }),
    summary: nonEmptyStringSchema,
    targetNodeId: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if (!value.edgeId && !value.targetNodeId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Engine handoff directives must specify edgeId or targetNodeId.",
        path: ["targetNodeId"]
      });
    }
  });

export const engineApprovalRequestDirectiveSchema = z.object({
  approvalId: identifierSchema.optional(),
  approverNodeIds: z.array(identifierSchema).default([]),
  operation: enginePolicyOperationSchema,
  reason: nonEmptyStringSchema,
  resource: policyResourceScopeSchema.optional()
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
    approvalRequestDirectives: z
      .array(engineApprovalRequestDirectiveSchema)
      .default([]),
    engineSessionId: nonEmptyStringSchema.optional(),
    engineVersion: nonEmptyStringSchema.optional(),
    failure: engineTurnFailureSchema.optional(),
    handoffDirectives: z.array(engineHandoffDirectiveSchema).default([]),
    permissionObservations: z.array(enginePermissionObservationSchema).optional(),
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
export type EnginePolicyOperation = z.infer<typeof enginePolicyOperationSchema>;
export type EnginePermissionDecision = z.infer<
  typeof enginePermissionDecisionSchema
>;
export type EnginePermissionObservation = z.infer<
  typeof enginePermissionObservationSchema
>;
export type EngineTurnOutcome = z.infer<typeof engineTurnOutcomeSchema>;
export type EngineToolExecutionRequest = z.infer<
  typeof engineToolExecutionRequestSchema
>;
export type EngineToolExecutionResult = z.infer<
  typeof engineToolExecutionResultSchema
>;
export type EngineHandoffArtifactInclusion = z.infer<
  typeof engineHandoffArtifactInclusionSchema
>;
export type EngineHandoffDirective = z.infer<typeof engineHandoffDirectiveSchema>;
export type EngineApprovalRequestDirective = z.infer<
  typeof engineApprovalRequestDirectiveSchema
>;
export type EngineArtifactInput = z.infer<typeof engineArtifactInputSchema>;
export type AgentEngineTurnRequest = z.infer<typeof agentEngineTurnRequestSchema>;
export type AgentEngineTurnResult = z.infer<typeof agentEngineTurnResultSchema>;
