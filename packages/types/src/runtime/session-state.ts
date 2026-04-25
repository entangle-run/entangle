import { z } from "zod";
import { artifactPublicationSchema } from "../artifacts/artifact-ref.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
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

export const sourceChangeFileStatusSchema = z.enum([
  "added",
  "modified",
  "deleted",
  "renamed",
  "copied",
  "type_changed",
  "unknown"
]);

export const sourceChangeFileSummarySchema = z.object({
  additions: z.number().int().nonnegative().default(0),
  deletions: z.number().int().nonnegative().default(0),
  path: nonEmptyStringSchema,
  status: sourceChangeFileStatusSchema
});

export const sourceChangeSummarySchema = z.object({
  additions: z.number().int().nonnegative().default(0),
  checkedAt: nonEmptyStringSchema,
  deletions: z.number().int().nonnegative().default(0),
  diffExcerpt: nonEmptyStringSchema.optional(),
  failureReason: nonEmptyStringSchema.optional(),
  fileCount: z.number().int().nonnegative(),
  files: z.array(sourceChangeFileSummarySchema).default([]),
  status: z.enum(["not_configured", "unchanged", "changed", "failed"]),
  truncated: z.boolean().default(false)
});

export const sourceChangeCandidateStatusSchema = z.enum([
  "pending_review",
  "accepted",
  "rejected",
  "superseded"
]);

export const sourceChangeCandidateReviewDecisionSchema = z.enum([
  "accepted",
  "rejected",
  "superseded"
]);

export const sourceChangeCandidateReviewRecordSchema = z
  .object({
    decidedAt: nonEmptyStringSchema,
    decidedBy: identifierSchema.optional(),
    decision: sourceChangeCandidateReviewDecisionSchema,
    reason: nonEmptyStringSchema.optional(),
    supersededByCandidateId: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.decision === "superseded" && !value.supersededByCandidateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Superseded source change candidate reviews must include supersededByCandidateId.",
        path: ["supersededByCandidateId"]
      });
    }

    if (value.decision !== "superseded" && value.supersededByCandidateId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only superseded source change candidate reviews may include supersededByCandidateId.",
        path: ["supersededByCandidateId"]
      });
    }
  });

export const sourceHistoryApplicationModeSchema = z.enum([
  "already_in_workspace",
  "applied_to_workspace"
]);

export const sourceChangeCandidateApplicationRecordSchema = z.object({
  approvalId: identifierSchema.optional(),
  appliedAt: nonEmptyStringSchema,
  appliedBy: identifierSchema.optional(),
  commit: nonEmptyStringSchema,
  mode: sourceHistoryApplicationModeSchema,
  reason: nonEmptyStringSchema.optional(),
  sourceHistoryId: identifierSchema
});

export const sourceChangeSnapshotRefSchema = z.object({
  baseTree: nonEmptyStringSchema,
  headTree: nonEmptyStringSchema,
  kind: z.literal("shadow_git_tree")
});

export const sourceHistoryPublicationRecordSchema = z.object({
  approvalId: identifierSchema.optional(),
  artifactId: identifierSchema,
  branch: nonEmptyStringSchema,
  publication: artifactPublicationSchema,
  reason: nonEmptyStringSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  requestedBy: identifierSchema.optional(),
  targetGitServiceRef: identifierSchema.optional(),
  targetNamespace: identifierSchema.optional(),
  targetRepositoryName: identifierSchema.optional()
});

export const sourceChangeCandidateRecordSchema = z.object({
  application: sourceChangeCandidateApplicationRecordSchema.optional(),
  candidateId: identifierSchema,
  conversationId: identifierSchema.optional(),
  createdAt: nonEmptyStringSchema,
  graphId: identifierSchema,
  nodeId: identifierSchema,
  review: sourceChangeCandidateReviewRecordSchema.optional(),
  sessionId: identifierSchema.optional(),
  snapshot: sourceChangeSnapshotRefSchema.optional(),
  sourceChangeSummary: sourceChangeSummarySchema,
  status: sourceChangeCandidateStatusSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export const sourceHistoryRecordSchema = z.object({
  appliedAt: nonEmptyStringSchema,
  appliedBy: identifierSchema.optional(),
  applicationApprovalId: identifierSchema.optional(),
  baseTree: nonEmptyStringSchema,
  branch: nonEmptyStringSchema,
  candidateId: identifierSchema,
  commit: nonEmptyStringSchema,
  conversationId: identifierSchema.optional(),
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  headTree: nonEmptyStringSchema,
  mode: sourceHistoryApplicationModeSchema,
  nodeId: identifierSchema,
  publication: sourceHistoryPublicationRecordSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  sessionId: identifierSchema.optional(),
  sourceChangeSummary: sourceChangeSummarySchema,
  sourceHistoryId: identifierSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

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
  operation: policyOperationSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  requestedByNodeId: identifierSchema,
  resource: policyResourceScopeSchema.optional(),
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
  sourceChangeCandidateIds: z.array(identifierSchema).default([]),
  sourceChangeSummary: sourceChangeSummarySchema.optional(),
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
export type SourceChangeFileStatus = z.infer<
  typeof sourceChangeFileStatusSchema
>;
export type SourceChangeFileSummary = z.infer<
  typeof sourceChangeFileSummarySchema
>;
export type SourceChangeSummary = z.infer<typeof sourceChangeSummarySchema>;
export type SourceChangeCandidateStatus = z.infer<
  typeof sourceChangeCandidateStatusSchema
>;
export type SourceChangeCandidateReviewDecision = z.infer<
  typeof sourceChangeCandidateReviewDecisionSchema
>;
export type SourceChangeCandidateReviewRecord = z.infer<
  typeof sourceChangeCandidateReviewRecordSchema
>;
export type SourceHistoryApplicationMode = z.infer<
  typeof sourceHistoryApplicationModeSchema
>;
export type SourceChangeCandidateApplicationRecord = z.infer<
  typeof sourceChangeCandidateApplicationRecordSchema
>;
export type SourceChangeSnapshotRef = z.infer<
  typeof sourceChangeSnapshotRefSchema
>;
export type SourceHistoryPublicationRecord = z.infer<
  typeof sourceHistoryPublicationRecordSchema
>;
export type SourceChangeCandidateRecord = z.infer<
  typeof sourceChangeCandidateRecordSchema
>;
export type SourceHistoryRecord = z.infer<typeof sourceHistoryRecordSchema>;
export type SessionRecord = z.infer<typeof sessionRecordSchema>;
export type ConversationRecord = z.infer<typeof conversationRecordSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type RunnerTurnRecord = z.infer<typeof runnerTurnRecordSchema>;
