import { z } from "zod";
import {
  artifactBackendSchema,
  artifactRecordSchema
} from "../artifacts/artifact-ref.js";
import { gitRepositoryProvisioningRecordSchema } from "../artifacts/git-repository-provisioning.js";
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
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
  runnerTurnRecordSchema,
  sourceChangeCandidateReviewDecisionSchema,
  sourceChangeCandidateRecordSchema,
  sourceHistoryRecordSchema,
  sourceChangeSummarySchema
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
  lastProducedArtifactIds: z.array(identifierSchema).default([]),
  lastRequestedApprovalIds: z.array(identifierSchema).default([]),
  lastSourceChangeCandidateId: identifierSchema.optional(),
  lastSourceChangeSummary: sourceChangeSummarySchema.optional(),
  lastTurnId: identifierSchema.optional(),
  lastTurnUpdatedAt: nonEmptyStringSchema.optional(),
  mode: nodeAgentRuntimeModeSchema,
  pendingApprovalIds: z.array(identifierSchema).default([]),
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

export const runtimeArtifactHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const runtimeArtifactHistoryCommitSchema = z.object({
  abbreviatedCommit: nonEmptyStringSchema,
  authorEmail: nonEmptyStringSchema.optional(),
  authorName: nonEmptyStringSchema.optional(),
  commit: nonEmptyStringSchema,
  committedAt: nonEmptyStringSchema,
  subject: z.string()
});

export const runtimeArtifactHistorySchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    commits: z.array(runtimeArtifactHistoryCommitSchema),
    inspectedPath: nonEmptyStringSchema,
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    reason: nonEmptyStringSchema
  })
]);

export const runtimeArtifactHistoryResponseSchema = z.object({
  artifact: artifactRecordSchema,
  history: runtimeArtifactHistorySchema
});

export const runtimeArtifactDiffQuerySchema = z.object({
  fromCommit: nonEmptyStringSchema.optional()
});

export const runtimeArtifactDiffSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    bytesRead: z.number().int().nonnegative(),
    content: z.string(),
    contentEncoding: z.literal("utf8"),
    contentType: z.literal("text/x-diff"),
    fromCommit: nonEmptyStringSchema,
    toCommit: nonEmptyStringSchema,
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    reason: nonEmptyStringSchema
  })
]);

export const runtimeArtifactDiffResponseSchema = z.object({
  artifact: artifactRecordSchema,
  diff: runtimeArtifactDiffSchema
});

export const runtimeArtifactRestoreModeSchema = z.enum(["restore_workspace"]);

export const runtimeArtifactRestoreRequestSchema = z.object({
  mode: runtimeArtifactRestoreModeSchema.default("restore_workspace"),
  overwrite: z.boolean().default(false),
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  restoreId: identifierSchema.optional()
});

export const runtimeArtifactRestoreStatusSchema = z.enum([
  "restored",
  "unavailable"
]);

export const runtimeArtifactRestoreRecordSchema = z
  .object({
    artifactId: identifierSchema,
    createdAt: nonEmptyStringSchema,
    mode: runtimeArtifactRestoreModeSchema,
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    requestedBy: identifierSchema.optional(),
    restoreId: identifierSchema,
    restoredFileCount: z.number().int().nonnegative().optional(),
    restoredPath: filesystemPathSchema.optional(),
    source: z.object({
      backend: artifactBackendSchema,
      commit: nonEmptyStringSchema.optional(),
      path: nonEmptyStringSchema.optional()
    }),
    status: runtimeArtifactRestoreStatusSchema,
    unavailableReason: nonEmptyStringSchema.optional(),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.status === "restored") {
      if (value.restoredFileCount === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Restored artifact restore records must include restoredFileCount.",
          path: ["restoredFileCount"]
        });
      }

      if (!value.restoredPath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Restored artifact restore records must include restoredPath.",
          path: ["restoredPath"]
        });
      }
    }

    if (value.status === "unavailable" && !value.unavailableReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Unavailable artifact restore records must include unavailableReason.",
        path: ["unavailableReason"]
      });
    }
  });

export const runtimeArtifactRestoreResponseSchema = z.object({
  artifact: artifactRecordSchema,
  restore: runtimeArtifactRestoreRecordSchema
});

export const runtimeArtifactRestoreListResponseSchema = z.object({
  restores: z.array(runtimeArtifactRestoreRecordSchema)
});

export const runtimeArtifactPromotionTargetSchema = z.enum(["source_workspace"]);

export const runtimeArtifactPromotionRequestSchema = z.object({
  approvalId: identifierSchema,
  overwrite: z.boolean().default(false),
  promotedBy: identifierSchema.optional(),
  promotionId: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  restoreId: identifierSchema,
  target: runtimeArtifactPromotionTargetSchema.default("source_workspace")
});

export const runtimeArtifactPromotionStatusSchema = z.enum([
  "promoted",
  "unavailable"
]);

export const runtimeArtifactPromotionRecordSchema = z
  .object({
    approvalId: identifierSchema,
    artifactId: identifierSchema,
    createdAt: nonEmptyStringSchema,
    nodeId: identifierSchema,
    promotedBy: identifierSchema.optional(),
    promotedFileCount: z.number().int().nonnegative().optional(),
    promotedPath: filesystemPathSchema.optional(),
    promotionId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    restoreId: identifierSchema,
    status: runtimeArtifactPromotionStatusSchema,
    target: runtimeArtifactPromotionTargetSchema,
    unavailableReason: nonEmptyStringSchema.optional(),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.status === "promoted") {
      if (value.promotedFileCount === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Promoted artifact promotion records must include promotedFileCount.",
          path: ["promotedFileCount"]
        });
      }

      if (!value.promotedPath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Promoted artifact promotion records must include promotedPath.",
          path: ["promotedPath"]
        });
      }
    }

    if (value.status === "unavailable" && !value.unavailableReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Unavailable artifact promotion records must include unavailableReason.",
        path: ["unavailableReason"]
      });
    }
  });

export const runtimeArtifactPromotionResponseSchema = z.object({
  artifact: artifactRecordSchema,
  promotion: runtimeArtifactPromotionRecordSchema,
  restore: runtimeArtifactRestoreRecordSchema
});

export const runtimeArtifactPromotionListResponseSchema = z.object({
  promotions: z.array(runtimeArtifactPromotionRecordSchema)
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

export const runtimeApprovalDecisionMutationRequestSchema = z.object({
  approvalId: identifierSchema.optional(),
  approverNodeIds: z.array(identifierSchema).min(1).default(["user"]),
  operation: policyOperationSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  resource: policyResourceScopeSchema.optional(),
  sessionId: identifierSchema.optional(),
  status: z.enum(["approved", "rejected"]).default("approved")
});

export const runtimeSourceChangeCandidateListResponseSchema = z.object({
  candidates: z.array(sourceChangeCandidateRecordSchema)
});

export const runtimeSourceChangeCandidateInspectionResponseSchema = z.object({
  candidate: sourceChangeCandidateRecordSchema
});

export const runtimeSourceHistoryListResponseSchema = z.object({
  history: z.array(sourceHistoryRecordSchema)
});

export const runtimeSourceHistoryInspectionResponseSchema = z.object({
  entry: sourceHistoryRecordSchema
});

export const runtimeSourceHistoryPublishMutationRequestSchema = z.object({
  approvalId: identifierSchema.optional(),
  publishedBy: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  retry: z.boolean().default(false),
  targetGitServiceRef: identifierSchema.optional(),
  targetNamespace: identifierSchema.optional(),
  targetRepositoryName: identifierSchema.optional()
});

export const runtimeSourceHistoryPublicationResponseSchema = z.object({
  artifact: artifactRecordSchema,
  entry: sourceHistoryRecordSchema
});

export const runtimeSourceChangeCandidateReviewMutationRequestSchema = z
  .object({
    reason: nonEmptyStringSchema.optional(),
    reviewedBy: identifierSchema.optional(),
    status: sourceChangeCandidateReviewDecisionSchema,
    supersededByCandidateId: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.status === "superseded" && !value.supersededByCandidateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Superseded source change candidate reviews must include supersededByCandidateId.",
        path: ["supersededByCandidateId"]
      });
    }

    if (value.status !== "superseded" && value.supersededByCandidateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only superseded source change candidate reviews may include supersededByCandidateId.",
        path: ["supersededByCandidateId"]
      });
    }
  });

export const runtimeSourceChangeCandidateApplyMutationRequestSchema = z.object({
  approvalId: identifierSchema.optional(),
  appliedBy: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional()
});

export const runtimeSourceChangeCandidateDiffSchema = z.discriminatedUnion(
  "available",
  [
    z.object({
      available: z.literal(true),
      bytesRead: z.number().int().nonnegative(),
      content: z.string(),
      contentEncoding: z.literal("utf8"),
      contentType: z.literal("text/x-diff"),
      truncated: z.boolean()
    }),
    z.object({
      available: z.literal(false),
      reason: nonEmptyStringSchema
    })
  ]
);

export const runtimeSourceChangeCandidateDiffResponseSchema = z.object({
  candidate: sourceChangeCandidateRecordSchema,
  diff: runtimeSourceChangeCandidateDiffSchema
});

export const runtimeSourceChangeCandidateFilePreviewQuerySchema = z.object({
  path: nonEmptyStringSchema
});

export const runtimeSourceChangeCandidateFilePreviewSchema = z.discriminatedUnion(
  "available",
  [
    z.object({
      available: z.literal(true),
      bytesRead: z.number().int().nonnegative(),
      content: z.string(),
      contentEncoding: z.literal("utf8"),
      contentType: z.enum(["text/markdown", "text/plain"]),
      truncated: z.boolean()
    }),
    z.object({
      available: z.literal(false),
      reason: nonEmptyStringSchema
    })
  ]
);

export const runtimeSourceChangeCandidateFilePreviewResponseSchema = z.object({
  candidate: sourceChangeCandidateRecordSchema,
  path: nonEmptyStringSchema,
  preview: runtimeSourceChangeCandidateFilePreviewSchema
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
export type RuntimeArtifactHistoryQuery = z.infer<
  typeof runtimeArtifactHistoryQuerySchema
>;
export type RuntimeArtifactHistoryCommit = z.infer<
  typeof runtimeArtifactHistoryCommitSchema
>;
export type RuntimeArtifactHistory = z.infer<
  typeof runtimeArtifactHistorySchema
>;
export type RuntimeArtifactHistoryResponse = z.infer<
  typeof runtimeArtifactHistoryResponseSchema
>;
export type RuntimeArtifactDiffQuery = z.infer<
  typeof runtimeArtifactDiffQuerySchema
>;
export type RuntimeArtifactDiff = z.infer<typeof runtimeArtifactDiffSchema>;
export type RuntimeArtifactDiffResponse = z.infer<
  typeof runtimeArtifactDiffResponseSchema
>;
export type RuntimeArtifactRestoreMode = z.infer<
  typeof runtimeArtifactRestoreModeSchema
>;
export type RuntimeArtifactRestoreRequest = z.input<
  typeof runtimeArtifactRestoreRequestSchema
>;
export type RuntimeArtifactRestoreRecord = z.infer<
  typeof runtimeArtifactRestoreRecordSchema
>;
export type RuntimeArtifactRestoreResponse = z.infer<
  typeof runtimeArtifactRestoreResponseSchema
>;
export type RuntimeArtifactRestoreListResponse = z.infer<
  typeof runtimeArtifactRestoreListResponseSchema
>;
export type RuntimeArtifactPromotionTarget = z.infer<
  typeof runtimeArtifactPromotionTargetSchema
>;
export type RuntimeArtifactPromotionRequest = z.infer<
  typeof runtimeArtifactPromotionRequestSchema
>;
export type RuntimeArtifactPromotionRecord = z.infer<
  typeof runtimeArtifactPromotionRecordSchema
>;
export type RuntimeArtifactPromotionResponse = z.infer<
  typeof runtimeArtifactPromotionResponseSchema
>;
export type RuntimeArtifactPromotionListResponse = z.infer<
  typeof runtimeArtifactPromotionListResponseSchema
>;
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
export type RuntimeApprovalDecisionMutationRequest = z.infer<
  typeof runtimeApprovalDecisionMutationRequestSchema
>;
export type RuntimeSourceChangeCandidateListResponse = z.infer<
  typeof runtimeSourceChangeCandidateListResponseSchema
>;
export type RuntimeSourceChangeCandidateInspectionResponse = z.infer<
  typeof runtimeSourceChangeCandidateInspectionResponseSchema
>;
export type RuntimeSourceHistoryListResponse = z.infer<
  typeof runtimeSourceHistoryListResponseSchema
>;
export type RuntimeSourceHistoryInspectionResponse = z.infer<
  typeof runtimeSourceHistoryInspectionResponseSchema
>;
export type RuntimeSourceHistoryPublishMutationRequest = z.input<
  typeof runtimeSourceHistoryPublishMutationRequestSchema
>;
export type RuntimeSourceHistoryPublicationResponse = z.infer<
  typeof runtimeSourceHistoryPublicationResponseSchema
>;
export type RuntimeSourceChangeCandidateReviewMutationRequest = z.infer<
  typeof runtimeSourceChangeCandidateReviewMutationRequestSchema
>;
export type RuntimeSourceChangeCandidateApplyMutationRequest = z.infer<
  typeof runtimeSourceChangeCandidateApplyMutationRequestSchema
>;
export type RuntimeSourceChangeCandidateDiff = z.infer<
  typeof runtimeSourceChangeCandidateDiffSchema
>;
export type RuntimeSourceChangeCandidateDiffResponse = z.infer<
  typeof runtimeSourceChangeCandidateDiffResponseSchema
>;
export type RuntimeSourceChangeCandidateFilePreviewQuery = z.infer<
  typeof runtimeSourceChangeCandidateFilePreviewQuerySchema
>;
export type RuntimeSourceChangeCandidateFilePreview = z.infer<
  typeof runtimeSourceChangeCandidateFilePreviewSchema
>;
export type RuntimeSourceChangeCandidateFilePreviewResponse = z.infer<
  typeof runtimeSourceChangeCandidateFilePreviewResponseSchema
>;
export type RuntimeTurnListResponse = z.infer<typeof runtimeTurnListResponseSchema>;
export type RuntimeTurnInspectionResponse = z.infer<
  typeof runtimeTurnInspectionResponseSchema
>;
