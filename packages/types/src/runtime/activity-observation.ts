import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  runnerPhaseSchema,
  runnerTriggerKindSchema,
  sessionLifecycleStateSchema
} from "./session-state.js";

export const observedSessionActivityRecordSchema = z.object({
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  nodeId: identifierSchema,
  ownerNodeId: identifierSchema,
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema,
  status: sessionLifecycleStateSchema,
  traceId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export const observedRunnerTurnActivityRecordSchema = z.object({
  consumedArtifactIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema.optional(),
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema).default([]),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema.optional(),
  startedAt: nonEmptyStringSchema,
  triggerKind: runnerTriggerKindSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export type ObservedSessionActivityRecord = z.infer<
  typeof observedSessionActivityRecordSchema
>;
export type ObservedRunnerTurnActivityRecord = z.infer<
  typeof observedRunnerTurnActivityRecordSchema
>;
