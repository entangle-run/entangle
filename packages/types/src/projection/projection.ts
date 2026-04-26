import { z } from "zod";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeAssignmentStatusSchema } from "../federation/assignment.js";
import {
  runnerOperationalStateSchema,
  runnerTrustStateSchema
} from "../federation/runner.js";

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

export const userConversationProjectionRecordSchema = z.object({
  conversationId: identifierSchema,
  graphId: identifierSchema,
  lastMessageAt: nonEmptyStringSchema.optional(),
  peerNodeId: identifierSchema,
  pendingApprovalIds: z.array(identifierSchema).default([]),
  projection: projectionMetadataSchema,
  unreadCount: z.number().int().nonnegative().default(0),
  userNodeId: identifierSchema
});

export const hostProjectionSnapshotSchema = z.object({
  assignments: z.array(assignmentProjectionRecordSchema).default([]),
  freshness: projectionFreshnessSchema.default("unknown"),
  generatedAt: nonEmptyStringSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  runners: z.array(runnerProjectionRecordSchema).default([]),
  schemaVersion: z.literal("1"),
  userConversations: z
    .array(userConversationProjectionRecordSchema)
    .default([])
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
export type UserConversationProjectionRecord = z.infer<
  typeof userConversationProjectionRecordSchema
>;
export type HostProjectionSnapshot = z.infer<typeof hostProjectionSnapshotSchema>;
