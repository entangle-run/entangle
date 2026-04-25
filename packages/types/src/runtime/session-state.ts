import { z } from "zod";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { engineTurnOutcomeSchema } from "../engine/turn-contract.js";
import {
  entangleA2AMessageTypeSchema,
  entangleA2AResponsePolicySchema
} from "../protocol/a2a.js";

export const sessionLifecycleStateSchema = z.enum([
  "requested",
  "accepted",
  "planning",
  "active",
  "waiting_approval",
  "synthesizing",
  "completed",
  "failed",
  "cancelled",
  "timed_out"
]);

export const conversationLifecycleStateSchema = z.enum([
  "opened",
  "acknowledged",
  "working",
  "blocked",
  "awaiting_approval",
  "resolved",
  "rejected",
  "closed",
  "expired"
]);

export const approvalLifecycleStateSchema = z.enum([
  "not_required",
  "pending",
  "approved",
  "rejected",
  "expired",
  "withdrawn"
]);

export const runnerPhaseSchema = z.enum([
  "idle",
  "receiving",
  "validating",
  "contextualizing",
  "reasoning",
  "acting",
  "persisting",
  "emitting",
  "blocked",
  "errored"
]);

export const runnerTriggerKindSchema = z.enum([
  "bootstrap",
  "message",
  "operator",
  "timer"
]);

export const memorySynthesisSuccessOutcomeSchema = z.object({
  status: z.literal("succeeded"),
  updatedAt: nonEmptyStringSchema,
  updatedSummaryPagePaths: z.array(nonEmptyStringSchema).min(1),
  workingContextPagePath: nonEmptyStringSchema
});

export const memorySynthesisFailureOutcomeSchema = z.object({
  errorMessage: nonEmptyStringSchema,
  status: z.literal("failed"),
  updatedAt: nonEmptyStringSchema
});

export const memorySynthesisOutcomeSchema = z.discriminatedUnion("status", [
  memorySynthesisSuccessOutcomeSchema,
  memorySynthesisFailureOutcomeSchema
]);

export const sessionRecordSchema = z.object({
  activeConversationIds: z.array(identifierSchema).default([]),
  entrypointNodeId: identifierSchema.optional(),
  graphId: identifierSchema,
  intent: nonEmptyStringSchema,
  lastMessageId: nostrEventIdSchema.optional(),
  lastMessageType: entangleA2AMessageTypeSchema.optional(),
  openedAt: nonEmptyStringSchema,
  originatingNodeId: identifierSchema.optional(),
  ownerNodeId: identifierSchema,
  rootArtifactIds: z.array(identifierSchema).default([]),
  sessionId: identifierSchema,
  status: sessionLifecycleStateSchema,
  traceId: identifierSchema,
  updatedAt: nonEmptyStringSchema,
  waitingApprovalIds: z.array(identifierSchema).default([])
});

export const conversationRecordSchema = z.object({
  conversationId: identifierSchema,
  followupCount: z.number().int().nonnegative().default(0),
  graphId: identifierSchema,
  initiator: z.enum(["local", "remote"]),
  artifactIds: z.array(identifierSchema).default([]),
  lastInboundMessageId: nostrEventIdSchema.optional(),
  lastMessageType: entangleA2AMessageTypeSchema.optional(),
  lastOutboundMessageId: nostrEventIdSchema.optional(),
  localNodeId: identifierSchema,
  localPubkey: nostrPublicKeySchema,
  openedAt: nonEmptyStringSchema,
  peerNodeId: identifierSchema,
  peerPubkey: nostrPublicKeySchema,
  responsePolicy: entangleA2AResponsePolicySchema,
  sessionId: identifierSchema,
  status: conversationLifecycleStateSchema,
  updatedAt: nonEmptyStringSchema
});

export const approvalRecordSchema = z.object({
  approvalId: identifierSchema,
  approverNodeIds: z.array(identifierSchema).default([]),
  conversationId: identifierSchema.optional(),
  graphId: identifierSchema,
  reason: nonEmptyStringSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  requestedByNodeId: identifierSchema,
  sessionId: identifierSchema,
  status: approvalLifecycleStateSchema,
  updatedAt: nonEmptyStringSchema
});

export const runnerTurnRecordSchema = z.object({
  conversationId: identifierSchema.optional(),
  consumedArtifactIds: z.array(identifierSchema).default([]),
  engineOutcome: engineTurnOutcomeSchema.optional(),
  emittedHandoffMessageIds: z.array(nostrEventIdSchema).default([]),
  graphId: identifierSchema,
  memorySynthesisOutcome: memorySynthesisOutcomeSchema.optional(),
  messageId: nostrEventIdSchema.optional(),
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema).default([]),
  sessionId: identifierSchema.optional(),
  startedAt: nonEmptyStringSchema,
  triggerKind: runnerTriggerKindSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

const sessionTransitionGraph = {
  requested: ["accepted", "failed", "cancelled", "timed_out"],
  accepted: ["planning", "failed", "cancelled", "timed_out"],
  planning: ["active", "failed", "cancelled", "timed_out"],
  active: [
    "waiting_approval",
    "synthesizing",
    "failed",
    "cancelled",
    "timed_out"
  ],
  waiting_approval: ["active", "failed", "cancelled", "timed_out"],
  synthesizing: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
  timed_out: []
} satisfies Record<
  z.infer<typeof sessionLifecycleStateSchema>,
  z.infer<typeof sessionLifecycleStateSchema>[]
>;

const conversationTransitionGraph = {
  opened: ["acknowledged", "rejected", "expired"],
  acknowledged: ["working", "expired"],
  working: ["blocked", "awaiting_approval", "resolved", "expired"],
  blocked: ["working", "expired"],
  awaiting_approval: ["working", "rejected", "expired"],
  resolved: ["closed"],
  rejected: ["closed"],
  closed: [],
  expired: []
} satisfies Record<
  z.infer<typeof conversationLifecycleStateSchema>,
  z.infer<typeof conversationLifecycleStateSchema>[]
>;

const approvalTransitionGraph = {
  not_required: [],
  pending: ["approved", "rejected", "expired", "withdrawn"],
  approved: [],
  rejected: [],
  expired: [],
  withdrawn: []
} satisfies Record<
  z.infer<typeof approvalLifecycleStateSchema>,
  z.infer<typeof approvalLifecycleStateSchema>[]
>;

function isAllowedTransition<TState extends string>(
  transitionGraph: Record<TState, TState[]>,
  fromState: TState,
  toState: TState
): boolean {
  return transitionGraph[fromState].includes(toState);
}

export function isAllowedSessionLifecycleTransition(
  fromState: SessionLifecycleState,
  toState: SessionLifecycleState
): boolean {
  return isAllowedTransition(sessionTransitionGraph, fromState, toState);
}

export function isAllowedConversationLifecycleTransition(
  fromState: ConversationLifecycleState,
  toState: ConversationLifecycleState
): boolean {
  return isAllowedTransition(conversationTransitionGraph, fromState, toState);
}

export function isAllowedApprovalLifecycleTransition(
  fromState: ApprovalLifecycleState,
  toState: ApprovalLifecycleState
): boolean {
  return isAllowedTransition(approvalTransitionGraph, fromState, toState);
}

export type SessionLifecycleState = z.infer<typeof sessionLifecycleStateSchema>;
export type ConversationLifecycleState = z.infer<
  typeof conversationLifecycleStateSchema
>;
export type ApprovalLifecycleState = z.infer<typeof approvalLifecycleStateSchema>;
export type RunnerPhase = z.infer<typeof runnerPhaseSchema>;
export type RunnerTriggerKind = z.infer<typeof runnerTriggerKindSchema>;
export type MemorySynthesisOutcome = z.infer<
  typeof memorySynthesisOutcomeSchema
>;
export type SessionRecord = z.infer<typeof sessionRecordSchema>;
export type ConversationRecord = z.infer<typeof conversationRecordSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type RunnerTurnRecord = z.infer<typeof runnerTurnRecordSchema>;
