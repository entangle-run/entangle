import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  type ConversationLifecycleState,
  sessionLifecycleStateSchema,
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

export const hostSessionNodeStatusSchema = z.object({
  nodeId: identifierSchema,
  status: sessionLifecycleStateSchema
});

export const hostSessionSummarySchema = z.object({
  activeConversationIds: z.array(identifierSchema).default([]),
  conversationStatusCounts: conversationStatusCountsSchema.optional(),
  graphId: identifierSchema,
  latestMessageType: entangleA2AMessageTypeSchema.optional(),
  nodeIds: z.array(identifierSchema),
  nodeStatuses: z.array(hostSessionNodeStatusSchema),
  rootArtifactIds: z.array(identifierSchema).default([]),
  sessionId: identifierSchema,
  traceIds: z.array(identifierSchema),
  waitingApprovalIds: z.array(identifierSchema).default([]),
  updatedAt: nonEmptyStringSchema
});

export const hostSessionNodeInspectionSchema = z.object({
  conversationStatusCounts: conversationStatusCountsSchema.optional(),
  nodeId: identifierSchema,
  runtime: runtimeInspectionResponseSchema,
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

export type HostSessionNodeStatus = z.infer<typeof hostSessionNodeStatusSchema>;
export type ConversationStatusCounts = z.infer<
  typeof conversationStatusCountsSchema
>;
export type HostSessionSummary = z.infer<typeof hostSessionSummarySchema>;
export type HostSessionNodeInspection = z.infer<
  typeof hostSessionNodeInspectionSchema
>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type SessionInspectionResponse = z.infer<
  typeof sessionInspectionResponseSchema
>;
