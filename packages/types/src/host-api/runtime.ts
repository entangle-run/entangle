import { z } from "zod";
import { artifactRecordSchema } from "../artifacts/artifact-ref.js";
import { gitRepositoryProvisioningRecordSchema } from "../artifacts/git-repository-provisioning.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  agentEngineFailureClassificationSchema,
  agentEngineStopReasonSchema,
  enginePermissionDecisionSchema,
  enginePolicyOperationSchema
} from "../engine/turn-contract.js";
import { nodeAgentRuntimeModeSchema } from "../graph/graph-spec.js";
import { agentEngineProfileKindSchema } from "../resources/catalog.js";
import { effectiveRuntimeContextSchema } from "../runtime/runtime-context.js";
import {
  classifyRuntimeReconciliation,
  runtimeReconciliationSummarySchema
} from "../runtime/reconciliation.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema,
  runtimeRestartGenerationSchema
} from "../runtime/runtime-state.js";
import {
  approvalRecordSchema,
  runnerTurnRecordSchema
} from "../runtime/session-state.js";

export const runtimeAgentRuntimeInspectionSchema = z.object({
  defaultAgent: identifierSchema.optional(),
  engineKind: agentEngineProfileKindSchema.optional(),
  engineProfileDisplayName: nonEmptyStringSchema.optional(),
  engineProfileRef: identifierSchema.optional(),
  lastEngineFailureClassification:
    agentEngineFailureClassificationSchema.optional(),
  lastEngineFailureMessage: nonEmptyStringSchema.optional(),
  lastEngineSessionId: nonEmptyStringSchema.optional(),
  lastEngineStopReason: agentEngineStopReasonSchema.optional(),
  lastEngineVersion: nonEmptyStringSchema.optional(),
  lastPermissionDecision: enginePermissionDecisionSchema.optional(),
  lastPermissionOperation: enginePolicyOperationSchema.optional(),
  lastPermissionReason: nonEmptyStringSchema.optional(),
  lastTurnId: identifierSchema.optional(),
  lastTurnUpdatedAt: nonEmptyStringSchema.optional(),
  mode: nodeAgentRuntimeModeSchema,
  stateScope: z.enum(["node", "shared"]).optional()
});

export const runtimeWorkspaceSurfaceKindSchema = z.enum([
  "root",
  "package",
  "injected",
  "memory",
  "artifact_workspace",
  "runtime_state",
  "retrieval_cache",
  "source_workspace",
  "engine_state",
  "wiki_repository"
]);

export const runtimeWorkspaceSurfaceStatusSchema = z.enum([
  "ready",
  "missing",
  "not_directory",
  "unreadable",
  "unwritable"
]);

export const runtimeWorkspaceAccessModeSchema = z.enum(["read", "write"]);

export const runtimeWorkspaceSurfaceHealthSchema = z.object({
  access: z.array(runtimeWorkspaceAccessModeSchema).default([]),
  required: z.boolean(),
  status: runtimeWorkspaceSurfaceStatusSchema,
  surface: runtimeWorkspaceSurfaceKindSchema,
  reason: nonEmptyStringSchema.optional()
});

export const runtimeWorkspaceHealthSchema = z.object({
  checkedAt: nonEmptyStringSchema,
  layoutVersion: nonEmptyStringSchema,
  status: z.enum(["ready", "degraded"]),
  surfaces: z.array(runtimeWorkspaceSurfaceHealthSchema)
});

export const runtimeInspectionResponseSchema = z
  .object({
    agentRuntime: runtimeAgentRuntimeInspectionSchema.optional(),
    backendKind: runtimeBackendKindSchema,
    contextAvailable: z.boolean(),
    contextPath: filesystemPathSchema.optional(),
    desiredState: runtimeDesiredStateSchema,
    graphId: identifierSchema,
    graphRevisionId: identifierSchema,
    nodeId: identifierSchema,
    observedState: runtimeObservedStateSchema,
    packageSourceId: identifierSchema.optional(),
    primaryGitRepositoryProvisioning:
      gitRepositoryProvisioningRecordSchema.optional(),
    reason: nonEmptyStringSchema.optional(),
    reconciliation: runtimeReconciliationSummarySchema.optional(),
    restartGeneration: runtimeRestartGenerationSchema,
    runtimeHandle: nonEmptyStringSchema.optional(),
    statusMessage: nonEmptyStringSchema.optional(),
    workspaceHealth: runtimeWorkspaceHealthSchema.optional()
  })
  .transform((value) => ({
    ...value,
    reconciliation:
      value.reconciliation ??
      classifyRuntimeReconciliation({
        contextAvailable: value.contextAvailable,
        desiredState: value.desiredState,
        observedState: value.observedState
      })
  }));

export const runtimeListResponseSchema = z.object({
  runtimes: z.array(runtimeInspectionResponseSchema)
});

export const runtimeIntentMutationRequestSchema = z.object({
  desiredState: runtimeDesiredStateSchema
});

export const runtimeContextInspectionResponseSchema = effectiveRuntimeContextSchema;

export const runtimeArtifactListResponseSchema = z.object({
  artifacts: z.array(artifactRecordSchema)
});

export const runtimeArtifactInspectionResponseSchema = z.object({
  artifact: artifactRecordSchema
});

export const runtimeArtifactPreviewSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    bytesRead: z.number().int().nonnegative(),
    content: z.string(),
    contentEncoding: z.literal("utf8"),
    contentType: z.enum(["text/markdown", "text/plain"]),
    sourcePath: filesystemPathSchema,
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    reason: nonEmptyStringSchema
  })
]);

export const runtimeArtifactPreviewResponseSchema = z.object({
  artifact: artifactRecordSchema,
  preview: runtimeArtifactPreviewSchema
});

export const runtimeMemoryPageKindSchema = z.enum([
  "schema",
  "summary",
  "task",
  "wiki_index",
  "wiki_log",
  "wiki_page"
]);

export const runtimeMemoryPageSummarySchema = z.object({
  kind: runtimeMemoryPageKindSchema,
  path: nonEmptyStringSchema,
  sizeBytes: z.number().int().nonnegative(),
  updatedAt: nonEmptyStringSchema
});

export const runtimeMemoryInspectionResponseSchema = z.object({
  focusedRegisters: z.array(runtimeMemoryPageSummarySchema),
  memoryRoot: filesystemPathSchema,
  nodeId: identifierSchema,
  pages: z.array(runtimeMemoryPageSummarySchema),
  taskPages: z.array(runtimeMemoryPageSummarySchema)
});

export const runtimeMemoryPageQuerySchema = z.object({
  path: nonEmptyStringSchema
});

export const runtimeMemoryPagePreviewSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    bytesRead: z.number().int().nonnegative(),
    content: z.string(),
    contentEncoding: z.literal("utf8"),
    contentType: z.enum(["text/markdown", "text/plain"]),
    sourcePath: filesystemPathSchema,
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    reason: nonEmptyStringSchema
  })
]);

export const runtimeMemoryPageInspectionResponseSchema = z.object({
  nodeId: identifierSchema,
  page: runtimeMemoryPageSummarySchema,
  preview: runtimeMemoryPagePreviewSchema
});

export const runtimeApprovalListResponseSchema = z.object({
  approvals: z.array(approvalRecordSchema)
});

export const runtimeApprovalInspectionResponseSchema = z.object({
  approval: approvalRecordSchema
});

export const runtimeTurnListResponseSchema = z.object({
  turns: z.array(runnerTurnRecordSchema)
});

export const runtimeTurnInspectionResponseSchema = z.object({
  turn: runnerTurnRecordSchema
});

export type RuntimeAgentRuntimeInspection = z.infer<
  typeof runtimeAgentRuntimeInspectionSchema
>;
export type RuntimeWorkspaceSurfaceKind = z.infer<
  typeof runtimeWorkspaceSurfaceKindSchema
>;
export type RuntimeWorkspaceSurfaceStatus = z.infer<
  typeof runtimeWorkspaceSurfaceStatusSchema
>;
export type RuntimeWorkspaceAccessMode = z.infer<
  typeof runtimeWorkspaceAccessModeSchema
>;
export type RuntimeWorkspaceSurfaceHealth = z.infer<
  typeof runtimeWorkspaceSurfaceHealthSchema
>;
export type RuntimeWorkspaceHealth = z.infer<typeof runtimeWorkspaceHealthSchema>;
export type RuntimeInspectionResponse = z.infer<typeof runtimeInspectionResponseSchema>;
export type RuntimeListResponse = z.infer<typeof runtimeListResponseSchema>;
export type RuntimeIntentMutationRequest = z.infer<typeof runtimeIntentMutationRequestSchema>;
export type RuntimeContextInspectionResponse = z.infer<typeof runtimeContextInspectionResponseSchema>;
export type RuntimeArtifactListResponse = z.infer<typeof runtimeArtifactListResponseSchema>;
export type RuntimeArtifactInspectionResponse = z.infer<typeof runtimeArtifactInspectionResponseSchema>;
export type RuntimeArtifactPreview = z.infer<typeof runtimeArtifactPreviewSchema>;
export type RuntimeArtifactPreviewResponse = z.infer<typeof runtimeArtifactPreviewResponseSchema>;
export type RuntimeMemoryPageKind = z.infer<typeof runtimeMemoryPageKindSchema>;
export type RuntimeMemoryPageSummary = z.infer<typeof runtimeMemoryPageSummarySchema>;
export type RuntimeMemoryInspectionResponse = z.infer<
  typeof runtimeMemoryInspectionResponseSchema
>;
export type RuntimeMemoryPageQuery = z.infer<typeof runtimeMemoryPageQuerySchema>;
export type RuntimeMemoryPagePreview = z.infer<
  typeof runtimeMemoryPagePreviewSchema
>;
export type RuntimeMemoryPageInspectionResponse = z.infer<
  typeof runtimeMemoryPageInspectionResponseSchema
>;
export type RuntimeApprovalListResponse = z.infer<typeof runtimeApprovalListResponseSchema>;
export type RuntimeApprovalInspectionResponse = z.infer<typeof runtimeApprovalInspectionResponseSchema>;
export type RuntimeTurnListResponse = z.infer<typeof runtimeTurnListResponseSchema>;
export type RuntimeTurnInspectionResponse = z.infer<
  typeof runtimeTurnInspectionResponseSchema
>;
