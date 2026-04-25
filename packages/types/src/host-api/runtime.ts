import { z } from "zod";
import { artifactRecordSchema } from "../artifacts/artifact-ref.js";
import { gitRepositoryProvisioningRecordSchema } from "../artifacts/git-repository-provisioning.js";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
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

export const runtimeInspectionResponseSchema = z
  .object({
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
    statusMessage: nonEmptyStringSchema.optional()
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

export type RuntimeInspectionResponse = z.infer<typeof runtimeInspectionResponseSchema>;
export type RuntimeListResponse = z.infer<typeof runtimeListResponseSchema>;
export type RuntimeIntentMutationRequest = z.infer<typeof runtimeIntentMutationRequestSchema>;
export type RuntimeContextInspectionResponse = z.infer<typeof runtimeContextInspectionResponseSchema>;
export type RuntimeArtifactListResponse = z.infer<typeof runtimeArtifactListResponseSchema>;
export type RuntimeArtifactInspectionResponse = z.infer<typeof runtimeArtifactInspectionResponseSchema>;
export type RuntimeApprovalListResponse = z.infer<typeof runtimeApprovalListResponseSchema>;
export type RuntimeApprovalInspectionResponse = z.infer<typeof runtimeApprovalInspectionResponseSchema>;
export type RuntimeTurnListResponse = z.infer<typeof runtimeTurnListResponseSchema>;
export type RuntimeTurnInspectionResponse = z.infer<
  typeof runtimeTurnInspectionResponseSchema
>;
