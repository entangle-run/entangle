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

export const engineToolDefinitionSchema = z.object({
  id: identifierSchema,
  description: nonEmptyStringSchema,
  inputSchema: z.record(z.string(), z.unknown()).default({})
});

export const engineToolRequestSchema = z.object({
  toolId: identifierSchema,
  input: z.record(z.string(), z.unknown()).default({})
});

export const engineArtifactInputSchema = z.object({
  artifactId: identifierSchema,
  backend: artifactBackendSchema,
  localPath: filesystemPathSchema,
  repoPath: filesystemPathSchema.optional(),
  sourceRef: artifactRefSchema
});

export const agentEngineTurnRequestSchema = z.object({
  sessionId: identifierSchema,
  nodeId: identifierSchema,
  systemPromptParts: z.array(nonEmptyStringSchema).min(1),
  interactionPromptParts: z.array(nonEmptyStringSchema).min(1),
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

export const agentEngineTurnResultSchema = z.object({
  assistantMessages: z.array(nonEmptyStringSchema).default([]),
  toolRequests: z.array(engineToolRequestSchema).default([]),
  stopReason: z.enum([
    "completed",
    "tool_call_requested",
    "max_turns_reached",
    "error"
  ]),
  usage: z
    .object({
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative()
    })
    .optional()
});

export type EngineToolDefinition = z.infer<typeof engineToolDefinitionSchema>;
export type EngineToolRequest = z.infer<typeof engineToolRequestSchema>;
export type EngineArtifactInput = z.infer<typeof engineArtifactInputSchema>;
export type AgentEngineTurnRequest = z.infer<typeof agentEngineTurnRequestSchema>;
export type AgentEngineTurnResult = z.infer<typeof agentEngineTurnResultSchema>;
