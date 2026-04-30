import { z } from "zod";
import { artifactRecordSchema } from "../artifacts/artifact-ref.js";
import { gitRepositoryProvisioningRecordSchema } from "../artifacts/git-repository-provisioning.js";
import { gitRepositoryTargetSelectorSchema } from "../artifacts/git-repository-target.js";
import {
  nostrPublicKeySchema,
  nostrSecretKeySchema,
  sha256DigestSchema
} from "../common/crypto.js";
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
import { runtimeSecretDeliverySchema } from "../runtime/secret-delivery.js";
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
  sourceChangeCandidateRecordSchema,
  sourceHistoryRecordSchema,
  sourceHistoryPublicationTargetSchema,
  sourceHistoryReplayRecordSchema,
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

export const runtimeBootstrapSnapshotRootSchema = z.enum(["package", "memory"]);

export const runtimeBootstrapRelativePathSchema = z
  .string()
  .min(1)
  .superRefine((value, context) => {
    const segments = value.split("/");

    if (
      value.startsWith("/") ||
      value.includes("\\") ||
      segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Runtime bootstrap file paths must be relative POSIX paths without empty, '.', or '..' segments."
      });
    }
  });

export const runtimeBootstrapFileSnapshotSchema = z.object({
  contentBase64: z.string(),
  path: runtimeBootstrapRelativePathSchema,
  sha256: sha256DigestSchema,
  sizeBytes: z.number().int().nonnegative()
});

export const runtimeBootstrapDirectorySnapshotSchema = z.object({
  capturedAt: nonEmptyStringSchema,
  files: z.array(runtimeBootstrapFileSnapshotSchema).default([]),
  root: runtimeBootstrapSnapshotRootSchema,
  schemaVersion: z.literal("1")
});

export const runtimeBootstrapBundleResponseSchema = z.object({
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  runtimeContext: effectiveRuntimeContextSchema,
  schemaVersion: z.literal("1"),
  snapshots: z.array(runtimeBootstrapDirectorySnapshotSchema).default([])
});

export const runtimeIdentitySecretResponseSchema = z.object({
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  publicKey: nostrPublicKeySchema,
  schemaVersion: z.literal("1"),
  secretDelivery: runtimeSecretDeliverySchema,
  secretKey: nostrSecretKeySchema
});

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
    sourcePath: filesystemPathSchema.optional(),
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

export const runtimeArtifactRestoreRequestSchema = z.object({
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  restoreId: identifierSchema.optional()
});

export const runtimeArtifactRestoreResponseSchema = z.object({
  artifactId: identifierSchema,
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  nodeId: identifierSchema,
  requestedAt: nonEmptyStringSchema,
  status: z.literal("requested")
});

export const runtimeArtifactSourceChangeProposalRequestSchema = z.object({
  overwrite: z.boolean().default(false),
  proposalId: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  targetPath: nonEmptyStringSchema.optional()
});

export const runtimeArtifactSourceChangeProposalResponseSchema = z.object({
  artifactId: identifierSchema,
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  nodeId: identifierSchema,
  proposalId: identifierSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  status: z.literal("requested"),
  targetPath: nonEmptyStringSchema.optional()
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
    sourcePath: filesystemPathSchema.optional(),
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

export const runtimeSourceHistoryReplayListQuerySchema = z.object({
  sourceHistoryId: identifierSchema.optional()
});

export const runtimeSourceHistoryReplayListResponseSchema = z.object({
  replays: z.array(sourceHistoryReplayRecordSchema)
});

export const runtimeSourceHistoryReplayInspectionResponseSchema = z.object({
  replay: sourceHistoryReplayRecordSchema
});

export const runtimeSourceHistoryPublishRequestSchema = z.object({
  approvalId: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  retryFailedPublication: z.boolean().default(false),
  target: sourceHistoryPublicationTargetSchema.optional()
});

export const runtimeSourceHistoryPublishResponseSchema = z.object({
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  nodeId: identifierSchema,
  requestedAt: nonEmptyStringSchema,
  sourceHistoryId: identifierSchema,
  status: z.literal("requested")
});

export const runtimeWikiPublishRequestSchema = z.object({
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  retryFailedPublication: z.boolean().default(false),
  target: gitRepositoryTargetSelectorSchema.optional()
});

export const runtimeWikiPublishResponseSchema = z.object({
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  nodeId: identifierSchema,
  requestedAt: nonEmptyStringSchema,
  status: z.literal("requested")
});

export const runtimeWikiUpsertPageRequestSchema = z.object({
  content: z.string().max(128 * 1024),
  expectedCurrentSha256: sha256DigestSchema.optional(),
  mode: z.enum(["append", "replace"]).default("replace"),
  path: nonEmptyStringSchema,
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional()
});

export const runtimeWikiUpsertPageResponseSchema = z.object({
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  expectedCurrentSha256: sha256DigestSchema.optional(),
  mode: z.enum(["append", "replace"]),
  nodeId: identifierSchema,
  path: nonEmptyStringSchema,
  requestedAt: nonEmptyStringSchema,
  status: z.literal("requested")
});

export const runtimeSourceHistoryReplayRequestSchema = z.object({
  approvalId: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  replayedBy: identifierSchema.optional(),
  replayId: identifierSchema.optional()
});

export const runtimeSourceHistoryReplayResponseSchema = z.object({
  assignmentId: identifierSchema,
  commandId: identifierSchema,
  nodeId: identifierSchema,
  requestedAt: nonEmptyStringSchema,
  sourceHistoryId: identifierSchema,
  status: z.literal("requested")
});

export const runtimeSourceHistoryReconcileRequestSchema =
  runtimeSourceHistoryReplayRequestSchema;

export const runtimeSourceHistoryReconcileResponseSchema =
  runtimeSourceHistoryReplayResponseSchema;

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
export type RuntimeBootstrapSnapshotRoot = z.infer<typeof runtimeBootstrapSnapshotRootSchema>;
export type RuntimeBootstrapFileSnapshot = z.infer<typeof runtimeBootstrapFileSnapshotSchema>;
export type RuntimeBootstrapDirectorySnapshot = z.infer<typeof runtimeBootstrapDirectorySnapshotSchema>;
export type RuntimeBootstrapBundleResponse = z.infer<typeof runtimeBootstrapBundleResponseSchema>;
export type RuntimeIdentitySecretResponse = z.infer<typeof runtimeIdentitySecretResponseSchema>;
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
export type RuntimeArtifactRestoreRequest = z.input<
  typeof runtimeArtifactRestoreRequestSchema
>;
export type RuntimeArtifactRestoreResponse = z.infer<
  typeof runtimeArtifactRestoreResponseSchema
>;
export type RuntimeArtifactSourceChangeProposalRequest = z.input<
  typeof runtimeArtifactSourceChangeProposalRequestSchema
>;
export type RuntimeArtifactSourceChangeProposalResponse = z.infer<
  typeof runtimeArtifactSourceChangeProposalResponseSchema
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
export type RuntimeSourceHistoryReplayListQuery = z.input<
  typeof runtimeSourceHistoryReplayListQuerySchema
>;
export type RuntimeSourceHistoryReplayListResponse = z.infer<
  typeof runtimeSourceHistoryReplayListResponseSchema
>;
export type RuntimeSourceHistoryReplayInspectionResponse = z.infer<
  typeof runtimeSourceHistoryReplayInspectionResponseSchema
>;
export type RuntimeSourceHistoryPublishRequest = z.input<
  typeof runtimeSourceHistoryPublishRequestSchema
>;
export type RuntimeSourceHistoryPublishResponse = z.infer<
  typeof runtimeSourceHistoryPublishResponseSchema
>;
export type RuntimeWikiPublishRequest = z.input<
  typeof runtimeWikiPublishRequestSchema
>;
export type RuntimeWikiPublishResponse = z.infer<
  typeof runtimeWikiPublishResponseSchema
>;
export type RuntimeWikiUpsertPageRequest = z.input<
  typeof runtimeWikiUpsertPageRequestSchema
>;
export type RuntimeWikiUpsertPageResponse = z.infer<
  typeof runtimeWikiUpsertPageResponseSchema
>;
export type RuntimeSourceHistoryReplayRequest = z.input<
  typeof runtimeSourceHistoryReplayRequestSchema
>;
export type RuntimeSourceHistoryReplayResponse = z.infer<
  typeof runtimeSourceHistoryReplayResponseSchema
>;
export type RuntimeSourceHistoryReconcileRequest = z.input<
  typeof runtimeSourceHistoryReconcileRequestSchema
>;
export type RuntimeSourceHistoryReconcileResponse = z.infer<
  typeof runtimeSourceHistoryReconcileResponseSchema
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
