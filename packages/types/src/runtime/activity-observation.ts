import { z } from "zod";
import { nostrEventIdSchema } from "../common/crypto.js";
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { engineTurnOutcomeSchema } from "../engine/turn-contract.js";
import {
  artifactBackendSchema,
  artifactKindSchema,
  artifactLifecycleStateSchema,
  artifactPublicationStateSchema,
  artifactRetrievalStateSchema
} from "../artifacts/artifact-ref.js";
import {
  approvalLifecycleStateSchema,
  conversationLifecycleStateSchema,
  engineTurnRequestSummarySchema,
  memoryRepositorySyncOutcomeSchema,
  memorySynthesisOutcomeSchema,
  runnerPhaseSchema,
  runnerTriggerKindSchema,
  sessionLifecycleStateSchema,
  sourceChangeSummarySchema
} from "./session-state.js";
import { entangleA2AMessageTypeSchema } from "../protocol/a2a.js";

export const observedSessionActivityRecordSchema = z.object({
  activeConversationIds: z.array(identifierSchema).default([]),
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  lastMessageType: entangleA2AMessageTypeSchema.optional(),
  nodeId: identifierSchema,
  ownerNodeId: identifierSchema,
  rootArtifactIds: z.array(identifierSchema).default([]),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema,
  status: sessionLifecycleStateSchema,
  traceId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export const observedRunnerTurnActivityRecordSchema = z.object({
  consumedArtifactIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema.optional(),
  engineOutcome: engineTurnOutcomeSchema.optional(),
  engineRequestSummary: engineTurnRequestSummarySchema.optional(),
  emittedHandoffMessageIds: z.array(nostrEventIdSchema).default([]),
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  memoryRepositorySyncOutcome: memoryRepositorySyncOutcomeSchema.optional(),
  memorySynthesisOutcome: memorySynthesisOutcomeSchema.optional(),
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema).default([]),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema.optional(),
  sourceChangeCandidateIds: z.array(identifierSchema).default([]),
  sourceChangeSummary: sourceChangeSummarySchema.optional(),
  startedAt: nonEmptyStringSchema,
  triggerKind: runnerTriggerKindSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export const observedConversationActivityRecordSchema = z.object({
  artifactIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema,
  fingerprint: nonEmptyStringSchema,
  followupCount: z.number().int().nonnegative(),
  graphId: identifierSchema,
  initiator: z.enum(["local", "remote"]),
  lastMessageType: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  peerNodeId: identifierSchema,
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema,
  status: conversationLifecycleStateSchema,
  updatedAt: nonEmptyStringSchema
});

export const observedApprovalActivityRecordSchema = z.object({
  approvalId: identifierSchema,
  approverNodeIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema.optional(),
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  nodeId: identifierSchema,
  operation: policyOperationSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  requestedByNodeId: identifierSchema,
  resource: policyResourceScopeSchema.optional(),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema,
  status: approvalLifecycleStateSchema,
  updatedAt: nonEmptyStringSchema
});

export const observedArtifactActivityRecordSchema = z.object({
  artifactId: identifierSchema,
  backend: artifactBackendSchema,
  conversationId: identifierSchema.optional(),
  fingerprint: nonEmptyStringSchema,
  graphId: identifierSchema.optional(),
  artifactKind: artifactKindSchema.optional(),
  lifecycleState: artifactLifecycleStateSchema.optional(),
  nodeId: identifierSchema,
  publicationState: artifactPublicationStateSchema.optional(),
  retrievalState: artifactRetrievalStateSchema.optional(),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema.optional(),
  turnId: identifierSchema.optional(),
  updatedAt: nonEmptyStringSchema
});

export type ObservedSessionActivityRecord = z.infer<
  typeof observedSessionActivityRecordSchema
>;
export type ObservedRunnerTurnActivityRecord = z.infer<
  typeof observedRunnerTurnActivityRecordSchema
>;
export type ObservedConversationActivityRecord = z.infer<
  typeof observedConversationActivityRecordSchema
>;
export type ObservedApprovalActivityRecord = z.infer<
  typeof observedApprovalActivityRecordSchema
>;
export type ObservedArtifactActivityRecord = z.infer<
  typeof observedArtifactActivityRecordSchema
>;
