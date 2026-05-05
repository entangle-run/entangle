import { z } from "zod";
import {
  artifactContentPreviewSchema,
  artifactRecordSchema,
  artifactRefSchema
} from "../artifacts/artifact-ref.js";
import {
  nostrEventIdSchema,
  nostrPublicKeySchema,
  sha256DigestSchema
} from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { entangleRuntimeCommandEventTypeSchema } from "../protocol/control.js";
import { runtimeAssignmentStatusSchema } from "../federation/assignment.js";
import {
  runnerOperationalStateSchema,
  runnerTrustStateSchema
} from "../federation/runner.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema,
  runtimeRestartGenerationSchema
} from "../runtime/runtime-state.js";
import {
  conversationLifecycleStateSchema,
  sourceChangeCandidateRecordSchema,
  sourceChangeCandidateStatusSchema,
  sourceHistoryRecordSchema,
  sourceHistoryReplayRecordSchema,
  sourceChangeSummarySchema
} from "../runtime/session-state.js";

export const projectionSourceKindSchema = z.enum([
  "desired_state",
  "control_event",
  "observation_event",
  "local_import"
]);

export const projectionFreshnessSchema = z.enum([
  "current",
  "stale",
  "unknown"
]);

export const projectionMetadataSchema = z.object({
  lastEventId: nostrEventIdSchema.optional(),
  source: projectionSourceKindSchema,
  updatedAt: nonEmptyStringSchema
});

export const runnerProjectionRecordSchema = z.object({
  assignmentIds: z.array(identifierSchema).default([]),
  hostAuthorityPubkey: nostrPublicKeySchema,
  lastSeenAt: nonEmptyStringSchema.optional(),
  operationalState: runnerOperationalStateSchema.default("unknown"),
  projection: projectionMetadataSchema,
  publicKey: nostrPublicKeySchema,
  runnerId: identifierSchema,
  trustState: runnerTrustStateSchema
});

export const assignmentProjectionRecordSchema = z.object({
  assignmentId: identifierSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  leaseExpiresAt: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  projection: projectionMetadataSchema,
  runnerId: identifierSchema,
  status: runtimeAssignmentStatusSchema
});

export const assignmentReceiptProjectionRecordSchema = z.object({
  assignmentId: identifierSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  observedAt: nonEmptyStringSchema,
  projection: projectionMetadataSchema,
  receiptKind: z.enum([
    "received",
    "materialized",
    "started",
    "stopped",
    "failed"
  ]),
  receiptMessage: nonEmptyStringSchema.optional(),
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema
});

export const runtimeProjectionRecordSchema = z.object({
  assignmentId: identifierSchema.optional(),
  backendKind: runtimeBackendKindSchema,
  clientUrl: nonEmptyStringSchema.optional(),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  lastSeenAt: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  projection: projectionMetadataSchema,
  restartGeneration: runtimeRestartGenerationSchema,
  runnerId: identifierSchema.optional(),
  runtimeHandle: nonEmptyStringSchema.optional(),
  statusMessage: nonEmptyStringSchema.optional()
});

export const userConversationProjectionRecordSchema = z.object({
  artifactIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema,
  graphId: identifierSchema,
  lastMessageAt: nonEmptyStringSchema.optional(),
  lastReadAt: nonEmptyStringSchema.optional(),
  lastMessageType: nonEmptyStringSchema.optional(),
  peerNodeId: identifierSchema,
  pendingApprovalIds: z.array(identifierSchema).default([]),
  projection: projectionMetadataSchema,
  sessionId: identifierSchema.optional(),
  status: conversationLifecycleStateSchema.default("opened"),
  unreadCount: z.number().int().nonnegative().default(0),
  userNodeId: identifierSchema
});

const runnerObservationProjectionBaseSchema = z.object({
  graphId: identifierSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  nodeId: identifierSchema,
  projection: projectionMetadataSchema,
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema
});

export const artifactRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactId: identifierSchema,
    artifactRecord: artifactRecordSchema.optional(),
    artifactPreview: artifactContentPreviewSchema.optional(),
    artifactRef: artifactRefSchema
  });

export const sourceChangeRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactRefs: z.array(artifactRefSchema).default([]),
    candidate: sourceChangeCandidateRecordSchema.optional(),
    candidateId: identifierSchema,
    sourceChangeSummary: sourceChangeSummarySchema.optional(),
    status: sourceChangeCandidateStatusSchema
  });

export const sourceHistoryRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    history: sourceHistoryRecordSchema,
    sourceHistoryId: identifierSchema
  });

export const sourceHistoryReplayProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    replay: sourceHistoryReplayRecordSchema,
    replayId: identifierSchema,
    sourceHistoryId: identifierSchema
  });

export const wikiRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactId: identifierSchema,
    artifactPreview: artifactContentPreviewSchema.optional(),
    artifactRef: artifactRefSchema
  });

export const runtimeCommandReceiptProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactId: identifierSchema.optional(),
    assignmentId: identifierSchema.optional(),
    cancellationId: identifierSchema.optional(),
    candidateId: identifierSchema.optional(),
    commandEventType: entangleRuntimeCommandEventTypeSchema,
    commandId: identifierSchema,
    observedAt: nonEmptyStringSchema,
    proposalId: identifierSchema.optional(),
    receiptMessage: nonEmptyStringSchema.optional(),
    receiptStatus: z.enum(["received", "completed", "failed"]),
    replayId: identifierSchema.optional(),
    requestedBy: identifierSchema.optional(),
    restoreId: identifierSchema.optional(),
    sessionId: identifierSchema.optional(),
    sourceHistoryId: identifierSchema.optional(),
    targetPath: nonEmptyStringSchema.optional(),
    wikiArtifactId: identifierSchema.optional(),
    wikiPageCount: z.number().int().min(1).max(16).optional(),
    wikiPageExpectedSha256: sha256DigestSchema.optional(),
    wikiPageNextSha256: sha256DigestSchema.optional(),
    wikiPagePath: nonEmptyStringSchema.optional(),
    wikiPagePreviousSha256: sha256DigestSchema.optional()
  });

export const hostProjectionSnapshotSchema = z.object({
  artifactRefs: z.array(artifactRefProjectionRecordSchema).default([]),
  assignmentReceipts: z
    .array(assignmentReceiptProjectionRecordSchema)
    .default([]),
  assignments: z.array(assignmentProjectionRecordSchema).default([]),
  freshness: projectionFreshnessSchema.default("unknown"),
  generatedAt: nonEmptyStringSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  runtimes: z.array(runtimeProjectionRecordSchema).default([]),
  runtimeCommandReceipts: z
    .array(runtimeCommandReceiptProjectionRecordSchema)
    .default([]),
  runners: z.array(runnerProjectionRecordSchema).default([]),
  schemaVersion: z.literal("1"),
  sourceChangeRefs: z.array(sourceChangeRefProjectionRecordSchema).default([]),
  sourceHistoryRefs: z.array(sourceHistoryRefProjectionRecordSchema).default([]),
  sourceHistoryReplays: z
    .array(sourceHistoryReplayProjectionRecordSchema)
    .default([]),
  userConversations: z
    .array(userConversationProjectionRecordSchema)
    .default([]),
  wikiRefs: z.array(wikiRefProjectionRecordSchema).default([])
});

export type ProjectionSourceKind = z.infer<typeof projectionSourceKindSchema>;
export type ProjectionFreshness = z.infer<typeof projectionFreshnessSchema>;
export type ProjectionMetadata = z.infer<typeof projectionMetadataSchema>;
export type RunnerProjectionRecord = z.infer<
  typeof runnerProjectionRecordSchema
>;
export type AssignmentProjectionRecord = z.infer<
  typeof assignmentProjectionRecordSchema
>;
export type AssignmentReceiptProjectionRecord = z.infer<
  typeof assignmentReceiptProjectionRecordSchema
>;
export type RuntimeProjectionRecord = z.infer<
  typeof runtimeProjectionRecordSchema
>;
export type RuntimeCommandReceiptProjectionRecord = z.infer<
  typeof runtimeCommandReceiptProjectionRecordSchema
>;
export type UserConversationProjectionRecord = z.infer<
  typeof userConversationProjectionRecordSchema
>;
export type ArtifactRefProjectionRecord = z.infer<
  typeof artifactRefProjectionRecordSchema
>;
export type SourceChangeRefProjectionRecord = z.infer<
  typeof sourceChangeRefProjectionRecordSchema
>;
export type SourceHistoryRefProjectionRecord = z.infer<
  typeof sourceHistoryRefProjectionRecordSchema
>;
export type SourceHistoryReplayProjectionRecord = z.infer<
  typeof sourceHistoryReplayProjectionRecordSchema
>;
export type WikiRefProjectionRecord = z.infer<
  typeof wikiRefProjectionRecordSchema
>;
export type HostProjectionSnapshot = z.infer<typeof hostProjectionSnapshotSchema>;
