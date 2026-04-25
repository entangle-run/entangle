import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  sessionLifecycleStateSchema,
  sessionRecordSchema
} from "../runtime/session-state.js";
import { entangleA2AMessageTypeSchema } from "../protocol/a2a.js";
import { runtimeInspectionResponseSchema } from "./runtime.js";

export const hostSessionNodeStatusSchema = z.object({
  nodeId: identifierSchema,
  status: sessionLifecycleStateSchema
});

export const hostSessionSummarySchema = z.object({
  activeConversationIds: z.array(identifierSchema).default([]),
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
export type HostSessionSummary = z.infer<typeof hostSessionSummarySchema>;
export type HostSessionNodeInspection = z.infer<
  typeof hostSessionNodeInspectionSchema
>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type SessionInspectionResponse = z.infer<
  typeof sessionInspectionResponseSchema
>;
