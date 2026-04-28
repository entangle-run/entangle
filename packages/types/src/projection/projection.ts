import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
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
  sourceChangeCandidateStatusSchema,
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
    artifactRef: artifactRefSchema
  });

export const sourceChangeRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactRefs: z.array(artifactRefSchema).default([]),
    candidateId: identifierSchema,
    sourceChangeSummary: sourceChangeSummarySchema.optional(),
    status: sourceChangeCandidateStatusSchema
  });

export const wikiRefProjectionRecordSchema =
  runnerObservationProjectionBaseSchema.extend({
    artifactId: identifierSchema,
    artifactRef: artifactRefSchema
  });

export const hostProjectionSnapshotSchema = z.object({
  artifactRefs: z.array(artifactRefProjectionRecordSchema).default([]),
  assignments: z.array(assignmentProjectionRecordSchema).default([]),
  freshness: projectionFreshnessSchema.default("unknown"),
  generatedAt: nonEmptyStringSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  runtimes: z.array(runtimeProjectionRecordSchema).default([]),
  runners: z.array(runnerProjectionRecordSchema).default([]),
  schemaVersion: z.literal("1"),
  sourceChangeRefs: z.array(sourceChangeRefProjectionRecordSchema).default([]),
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
export type RuntimeProjectionRecord = z.infer<
  typeof runtimeProjectionRecordSchema
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
export type WikiRefProjectionRecord = z.infer<
  typeof wikiRefProjectionRecordSchema
>;
export type HostProjectionSnapshot = z.infer<typeof hostProjectionSnapshotSchema>;
