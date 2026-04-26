import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  type ApprovalLifecycleState,
  type ConversationLifecycleState,
  sessionLifecycleStateSchema,
  sessionCancellationRequestRecordSchema,
  sessionRecordSchema
} from "../runtime/session-state.js";
import { entangleA2AMessageTypeSchema } from "../protocol/a2a.js";
import { runtimeInspectionResponseSchema } from "./runtime.js";

export const conversationStatusCountsSchema = z.object({
  acknowledged: z.number().int().nonnegative().default(0),
  awaiting_approval: z.number().int().nonnegative().default(0),
  blocked: z.number().int().nonnegative().default(0),
  closed: z.number().int().nonnegative().default(0),
  expired: z.number().int().nonnegative().default(0),
  opened: z.number().int().nonnegative().default(0),
  rejected: z.number().int().nonnegative().default(0),
  resolved: z.number().int().nonnegative().default(0),
  working: z.number().int().nonnegative().default(0)
}) satisfies z.ZodType<Record<ConversationLifecycleState, number>>;

export const approvalStatusCountsSchema = z.object({
  approved: z.number().int().nonnegative().default(0),
  expired: z.number().int().nonnegative().default(0),
  not_required: z.number().int().nonnegative().default(0),
  pending: z.number().int().nonnegative().default(0),
  rejected: z.number().int().nonnegative().default(0),
  withdrawn: z.number().int().nonnegative().default(0)
}) satisfies z.ZodType<Record<ApprovalLifecycleState, number>>;

export const hostSessionConsistencyFindingCodeSchema = z.enum([
  "active_conversation_missing_record",
  "active_session_without_open_conversations",
  "open_conversation_missing_active_reference",
  "pending_approval_missing_waiting_reference",
  "waiting_approval_missing_record",
  "waiting_approval_not_pending",
  "waiting_approval_session_without_pending_approval",
  "terminal_conversation_still_active"
]);

export const hostSessionConsistencyFindingSchema = z.object({
  approvalId: identifierSchema.optional(),
  code: hostSessionConsistencyFindingCodeSchema,
  conversationId: identifierSchema.optional(),
  message: nonEmptyStringSchema,
  nodeId: identifierSchema,
  severity: z.enum(["warning", "error"])
});

export const hostSessionNodeStatusSchema = z.object({
  nodeId: identifierSchema,
  status: sessionLifecycleStateSchema
});

export const hostSessionSummarySchema = z.object({
  activeConversationIds: z.array(identifierSchema).default([]),
  approvalStatusCounts: approvalStatusCountsSchema.optional(),
  conversationStatusCounts: conversationStatusCountsSchema.optional(),
  graphId: identifierSchema,
  latestMessageType: entangleA2AMessageTypeSchema.optional(),
  nodeIds: z.array(identifierSchema),
  nodeStatuses: z.array(hostSessionNodeStatusSchema),
  rootArtifactIds: z.array(identifierSchema).default([]),
  sessionConsistencyFindings: z
    .array(hostSessionConsistencyFindingSchema)
    .optional(),
  sessionId: identifierSchema,
  traceIds: z.array(identifierSchema),
  waitingApprovalIds: z.array(identifierSchema).default([]),
  updatedAt: nonEmptyStringSchema
});

export const hostSessionNodeInspectionSchema = z.object({
  approvalStatusCounts: approvalStatusCountsSchema.optional(),
  conversationStatusCounts: conversationStatusCountsSchema.optional(),
  nodeId: identifierSchema,
  runtime: runtimeInspectionResponseSchema,
  sessionConsistencyFindings: z
    .array(hostSessionConsistencyFindingSchema)
    .optional(),
  session: sessionRecordSchema
});

export const sessionListResponseSchema = z.object({
  sessions: z.array(hostSessionSummarySchema)
});

export const sessionInspectionResponseSchema = z.object({
  graphId: identifierSchema,
  nodes: z.array(hostSessionNodeInspectionSchema),
  sessionId: identifierSchema
});

export const sessionLaunchRequestSchema = z.object({
  artifactRefs: z.array(artifactRefSchema).default([]),
  conversationId: identifierSchema.optional(),
  fromNodeId: identifierSchema.optional(),
  intent: nonEmptyStringSchema.optional(),
  sessionId: identifierSchema.optional(),
  summary: nonEmptyStringSchema,
  targetNodeId: identifierSchema,
  turnId: identifierSchema.optional()
});

export const sessionLaunchResponseSchema = z.object({
  conversationId: identifierSchema,
  eventId: identifierSchema,
  fromNodeId: identifierSchema,
  fromPubkey: nostrPublicKeySchema.optional(),
  publishedRelays: z.array(nonEmptyStringSchema),
  relayUrls: z.array(nonEmptyStringSchema),
  sessionId: identifierSchema,
  targetNodeId: identifierSchema,
  turnId: identifierSchema
});

export const sessionCancellationMutationRequestSchema = z.object({
  cancellationId: identifierSchema.optional(),
  nodeIds: z.array(identifierSchema).default([]),
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional()
});

export const sessionCancellationResponseSchema = z.object({
  cancellations: z.array(sessionCancellationRequestRecordSchema).min(1),
  inspection: sessionInspectionResponseSchema.optional(),
  sessionId: identifierSchema
});

export type HostSessionNodeStatus = z.infer<typeof hostSessionNodeStatusSchema>;
export type ApprovalStatusCounts = z.infer<typeof approvalStatusCountsSchema>;
export type ConversationStatusCounts = z.infer<
  typeof conversationStatusCountsSchema
>;
export type HostSessionConsistencyFindingCode = z.infer<
  typeof hostSessionConsistencyFindingCodeSchema
>;
export type HostSessionConsistencyFinding = z.infer<
  typeof hostSessionConsistencyFindingSchema
>;
export type HostSessionSummary = z.infer<typeof hostSessionSummarySchema>;
export type HostSessionNodeInspection = z.infer<
  typeof hostSessionNodeInspectionSchema
>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type SessionInspectionResponse = z.infer<
  typeof sessionInspectionResponseSchema
>;
export type ParsedSessionLaunchRequest = z.infer<
  typeof sessionLaunchRequestSchema
>;
export type SessionLaunchRequest = z.input<typeof sessionLaunchRequestSchema>;
export type SessionLaunchResponse = z.infer<typeof sessionLaunchResponseSchema>;
export type ParsedSessionCancellationMutationRequest = z.infer<
  typeof sessionCancellationMutationRequestSchema
>;
export type SessionCancellationMutationRequest = z.input<
  typeof sessionCancellationMutationRequestSchema
>;
export type SessionCancellationResponse = z.infer<
  typeof sessionCancellationResponseSchema
>;
