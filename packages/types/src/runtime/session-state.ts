import { z } from "zod";
import { artifactPublicationSchema } from "../artifacts/artifact-ref.js";
import { gitRepositoryTargetSelectorSchema } from "../artifacts/git-repository-target.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
import {
  filesystemPathSchema,
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";
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
  "cancelled",
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

export const memoryRepositorySyncOutcomeSchema = z.discriminatedUnion("status", [
  z.object({
    branch: identifierSchema,
    changedFileCount: z.number().int().nonnegative(),
    commit: nonEmptyStringSchema,
    status: z.literal("committed"),
    syncedAt: nonEmptyStringSchema
  }),
  z.object({
    branch: identifierSchema,
    commit: nonEmptyStringSchema.optional(),
    status: z.literal("unchanged"),
    syncedAt: nonEmptyStringSchema
  }),
  z.object({
    reason: nonEmptyStringSchema,
    status: z.literal("not_configured"),
    syncedAt: nonEmptyStringSchema
  }),
  z.object({
    reason: nonEmptyStringSchema,
    status: z.literal("failed"),
    syncedAt: nonEmptyStringSchema
  })
]);

export const engineTurnRequestSummarySchema = z.object({
  actionContractContextIncluded: z.boolean().default(false),
  agentRuntimeContextIncluded: z.boolean().default(false),
  artifactInputCount: z.number().int().nonnegative(),
  artifactRefCount: z.number().int().nonnegative(),
  executionLimits: z.object({
    maxOutputTokens: z.number().int().positive(),
    maxToolTurns: z.number().int().positive()
  }),
  generatedAt: nonEmptyStringSchema,
  inboundMessageContextIncluded: z.boolean().default(false),
  interactionPromptCharacterCount: z.number().int().nonnegative(),
  interactionPromptPartCount: z.number().int().nonnegative(),
  memoryRefCount: z.number().int().nonnegative(),
  peerRouteContextIncluded: z.boolean(),
  policyContextIncluded: z.boolean().default(false),
  systemPromptCharacterCount: z.number().int().nonnegative(),
  systemPromptPartCount: z.number().int().nonnegative(),
  toolDefinitionCount: z.number().int().nonnegative(),
  workspaceBoundaryContextIncluded: z.boolean().default(false)
});

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

export const sourceChangeFilePreviewSchema = z.discriminatedUnion("available", [
  z.object({
    available: z.literal(true),
    bytesRead: z.number().int().nonnegative(),
    content: z.string(),
    contentEncoding: z.literal("utf8"),
    contentType: z.enum(["text/markdown", "text/plain"]),
    path: nonEmptyStringSchema,
    truncated: z.boolean()
  }),
  z.object({
    available: z.literal(false),
    path: nonEmptyStringSchema,
    reason: nonEmptyStringSchema
  })
]);

export const sourceChangeSummarySchema = z.object({
  additions: z.number().int().nonnegative().default(0),
  checkedAt: nonEmptyStringSchema,
  deletions: z.number().int().nonnegative().default(0),
  diffExcerpt: nonEmptyStringSchema.optional(),
  failureReason: nonEmptyStringSchema.optional(),
  fileCount: z.number().int().nonnegative(),
  filePreviews: z.array(sourceChangeFilePreviewSchema).default([]),
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

export const sourceHistoryPublicationTargetSchema =
  gitRepositoryTargetSelectorSchema;

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
  publications: z.array(sourceHistoryPublicationRecordSchema).default([]),
  reason: nonEmptyStringSchema.optional(),
  sessionId: identifierSchema.optional(),
  sourceChangeSummary: sourceChangeSummarySchema,
  sourceHistoryId: identifierSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema
});

export const sourceHistoryReplayStatusSchema = z.enum([
  "already_in_workspace",
  "merged",
  "replayed",
  "unavailable"
]);

export const sourceHistoryReplayRecordSchema = z
  .object({
    approvalId: identifierSchema.optional(),
    baseTree: nonEmptyStringSchema,
    candidateId: identifierSchema,
    commit: nonEmptyStringSchema,
    createdAt: nonEmptyStringSchema,
    graphId: identifierSchema,
    graphRevisionId: identifierSchema,
    headTree: nonEmptyStringSchema,
    mergedTree: nonEmptyStringSchema.optional(),
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    replayedBy: identifierSchema.optional(),
    replayedFileCount: z.number().int().nonnegative().optional(),
    replayedPath: filesystemPathSchema.optional(),
    replayId: identifierSchema,
    sourceHistoryId: identifierSchema,
    status: sourceHistoryReplayStatusSchema,
    turnId: identifierSchema,
    unavailableReason: nonEmptyStringSchema.optional(),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.status !== "unavailable") {
      if (value.replayedFileCount === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Available source-history replay records must include replayedFileCount.",
          path: ["replayedFileCount"]
        });
      }

      if (!value.replayedPath) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Available source-history replay records must include replayedPath.",
          path: ["replayedPath"]
        });
      }
    }

    if (value.status === "unavailable" && !value.unavailableReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Unavailable source-history replay records must include unavailableReason.",
        path: ["unavailableReason"]
      });
    }

    if (value.status === "merged" && !value.mergedTree) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Merged source-history replay records must include mergedTree.",
        path: ["mergedTree"]
      });
    }

    if (value.status !== "merged" && value.mergedTree) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only merged source-history replay records may include mergedTree.",
        path: ["mergedTree"]
      });
    }
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
  initiator: z.enum(["self", "peer"]),
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

export const approvalRecordSchema = z
  .object({
    approvalId: identifierSchema,
    approverNodeIds: z.array(identifierSchema).default([]),
    conversationId: identifierSchema.optional(),
    graphId: identifierSchema,
    operation: policyOperationSchema.optional(),
    reason: nonEmptyStringSchema.optional(),
    requestEventId: nostrEventIdSchema.optional(),
    requestSignerPubkey: nostrPublicKeySchema.optional(),
    requestedAt: nonEmptyStringSchema,
    requestedByNodeId: identifierSchema,
    resource: policyResourceScopeSchema.optional(),
    responseEventId: nostrEventIdSchema.optional(),
    responseSignerPubkey: nostrPublicKeySchema.optional(),
    sessionId: identifierSchema,
    sourceMessageId: nostrEventIdSchema.optional(),
    status: approvalLifecycleStateSchema,
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.requestEventId && !value.requestSignerPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approval records with requestEventId must include requestSignerPubkey.",
        path: ["requestSignerPubkey"]
      });
    }

    if (value.requestSignerPubkey && !value.requestEventId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approval records with requestSignerPubkey must include requestEventId.",
        path: ["requestEventId"]
      });
    }

    if (value.responseEventId && !value.responseSignerPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approval records with responseEventId must include responseSignerPubkey.",
        path: ["responseSignerPubkey"]
      });
    }

    if (value.responseSignerPubkey && !value.responseEventId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approval records with responseSignerPubkey must include responseEventId.",
        path: ["responseEventId"]
      });
    }
  });

export const sessionCancellationRequestStatusSchema = z.enum([
  "requested",
  "observed"
]);

export const sessionCancellationRequestRecordSchema = z
  .object({
    cancellationId: identifierSchema,
    graphId: identifierSchema,
    nodeId: identifierSchema,
    observedAt: nonEmptyStringSchema.optional(),
    observedTurnId: identifierSchema.optional(),
    reason: nonEmptyStringSchema.optional(),
    requestedAt: nonEmptyStringSchema,
    requestedBy: identifierSchema.optional(),
    sessionId: identifierSchema,
    status: sessionCancellationRequestStatusSchema
  })
  .superRefine((value, context) => {
    if (value.status === "observed" && !value.observedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Observed session cancellation requests must include observedAt.",
        path: ["observedAt"]
      });
    }

    if (value.status === "requested" && value.observedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Requested session cancellation records must not include observedAt.",
        path: ["observedAt"]
      });
    }
  });

export const runnerTurnRecordSchema = z.object({
  conversationId: identifierSchema.optional(),
  consumedArtifactIds: z.array(identifierSchema).default([]),
  engineOutcome: engineTurnOutcomeSchema.optional(),
  engineRequestSummary: engineTurnRequestSummarySchema.optional(),
  emittedHandoffMessageIds: z.array(nostrEventIdSchema).default([]),
  graphId: identifierSchema,
  memoryRepositorySyncOutcome: memoryRepositorySyncOutcomeSchema.optional(),
  memorySynthesisOutcome: memorySynthesisOutcomeSchema.optional(),
  messageId: nostrEventIdSchema.optional(),
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema).default([]),
  requestedApprovalIds: z.array(identifierSchema).default([]),
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
export type SessionCancellationRequestStatus = z.infer<
  typeof sessionCancellationRequestStatusSchema
>;
export type SessionCancellationRequestRecord = z.infer<
  typeof sessionCancellationRequestRecordSchema
>;
export type RunnerPhase = z.infer<typeof runnerPhaseSchema>;
export type RunnerTriggerKind = z.infer<typeof runnerTriggerKindSchema>;
export type MemorySynthesisOutcome = z.infer<
  typeof memorySynthesisOutcomeSchema
>;
export type MemoryRepositorySyncOutcome = z.infer<
  typeof memoryRepositorySyncOutcomeSchema
>;
export type EngineTurnRequestSummary = z.infer<
  typeof engineTurnRequestSummarySchema
>;
export type SourceChangeFileStatus = z.infer<
  typeof sourceChangeFileStatusSchema
>;
export type SourceChangeFileSummary = z.infer<
  typeof sourceChangeFileSummarySchema
>;
export type SourceChangeFilePreview = z.infer<
  typeof sourceChangeFilePreviewSchema
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
export type SourceHistoryPublicationTarget = z.infer<
  typeof sourceHistoryPublicationTargetSchema
>;
export type SourceHistoryPublicationRecord = z.infer<
  typeof sourceHistoryPublicationRecordSchema
>;
export type SourceChangeCandidateRecord = z.infer<
  typeof sourceChangeCandidateRecordSchema
>;
export type SourceHistoryRecord = z.infer<typeof sourceHistoryRecordSchema>;
export type SourceHistoryReplayStatus = z.infer<
  typeof sourceHistoryReplayStatusSchema
>;
export type SourceHistoryReplayRecord = z.infer<
  typeof sourceHistoryReplayRecordSchema
>;
export type SessionRecord = z.infer<typeof sessionRecordSchema>;
export type ConversationRecord = z.infer<typeof conversationRecordSchema>;
export type ApprovalRecord = z.infer<typeof approvalRecordSchema>;
export type RunnerTurnRecord = z.infer<typeof runnerTurnRecordSchema>;
