import { z } from "zod";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
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
import { runtimeReconciliationFindingCodeSchema } from "../runtime/reconciliation.js";
import {
  runtimeRecoveryControllerRecordSchema,
  runtimeRecoveryControllerStateSchema,
  runtimeRecoveryPolicySchema
} from "../runtime/recovery-policy.js";
import {
  approvalLifecycleStateSchema,
  conversationLifecycleStateSchema,
  engineTurnRequestSummarySchema,
  memoryRepositorySyncOutcomeSchema,
  memorySynthesisOutcomeSchema,
  runnerPhaseSchema,
  runnerTriggerKindSchema,
  sessionLifecycleStateSchema,
  sessionCancellationRequestStatusSchema,
  sourceHistoryApplicationModeSchema,
  sourceChangeSummarySchema
} from "../runtime/session-state.js";
import { entangleA2AMessageTypeSchema } from "../protocol/a2a.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema,
  runtimeRestartGenerationSchema
} from "../runtime/runtime-state.js";
import {
  approvalStatusCountsSchema,
  conversationStatusCountsSchema,
  hostSessionConsistencyFindingCodeSchema
} from "./sessions.js";

const hostEventBaseSchema = z.object({
  eventId: identifierSchema,
  message: nonEmptyStringSchema,
  schemaVersion: z.literal("1"),
  timestamp: nonEmptyStringSchema
});

export const hostOperatorRequestMethodSchema = z.enum([
  "DELETE",
  "PATCH",
  "POST",
  "PUT"
]);

export const hostOperatorRequestAuthModeSchema = z.enum([
  "bootstrap_operator_token"
]);

export const hostOperatorRequestCompletedEventSchema =
  hostEventBaseSchema.extend({
    authMode: hostOperatorRequestAuthModeSchema,
    category: z.literal("security"),
    method: hostOperatorRequestMethodSchema,
    operatorId: identifierSchema,
    path: nonEmptyStringSchema,
    requestId: nonEmptyStringSchema,
    statusCode: z.number().int().positive(),
    type: z.literal("host.operator_request.completed")
  });

export const catalogUpdatedEventSchema = hostEventBaseSchema.extend({
  catalogId: identifierSchema,
  category: z.literal("control_plane"),
  type: z.literal("catalog.updated"),
  updateKind: z.enum(["bootstrap", "apply"])
});

export const packageSourceAdmittedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  packageSourceId: identifierSchema,
  type: z.literal("package_source.admitted")
});

export const packageSourceDeletedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  packageSourceId: identifierSchema,
  type: z.literal("package_source.deleted")
});

export const externalPrincipalUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  principalId: identifierSchema,
  type: z.literal("external_principal.updated")
});

export const externalPrincipalDeletedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  principalId: identifierSchema,
  type: z.literal("external_principal.deleted")
});

export const graphRevisionAppliedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  graphId: identifierSchema,
  type: z.literal("graph.revision.applied")
});

export const nodeBindingUpdatedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  graphId: identifierSchema,
  mutationKind: z.enum(["created", "replaced", "deleted"]),
  nodeId: identifierSchema,
  type: z.literal("node.binding.updated")
});

export const edgeUpdatedEventSchema = hostEventBaseSchema.extend({
  activeRevisionId: identifierSchema,
  category: z.literal("control_plane"),
  edgeId: identifierSchema,
  graphId: identifierSchema,
  mutationKind: z.enum(["created", "replaced", "deleted"]),
  type: z.literal("edge.updated")
});

export const runtimeDesiredStateChangedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runtime"),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  previousDesiredState: runtimeDesiredStateSchema.optional(),
  previousReason: nonEmptyStringSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  type: z.literal("runtime.desired_state.changed")
});

export const runtimeRestartRequestedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runtime"),
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  previousRestartGeneration: runtimeRestartGenerationSchema,
  restartGeneration: runtimeRestartGenerationSchema,
  type: z.literal("runtime.restart.requested")
});

export const runtimeRecoveryPolicyUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runtime"),
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  policy: runtimeRecoveryPolicySchema,
  previousPolicy: runtimeRecoveryPolicySchema.optional(),
  type: z.literal("runtime.recovery_policy.updated")
});

export const runtimeRecoveryAttemptedEventSchema = hostEventBaseSchema.extend({
  attemptNumber: z.number().int().positive(),
  category: z.literal("runtime"),
  cooldownSeconds: z.number().int().nonnegative(),
  failureFingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  maxAttempts: z.number().int().positive(),
  nextEligibleAt: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  restartGeneration: runtimeRestartGenerationSchema,
  type: z.literal("runtime.recovery.attempted")
});

export const runtimeRecoveryExhaustedEventSchema = hostEventBaseSchema.extend({
  attemptsUsed: z.number().int().positive(),
  category: z.literal("runtime"),
  failureFingerprint: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  maxAttempts: z.number().int().positive(),
  nodeId: identifierSchema,
  type: z.literal("runtime.recovery.exhausted")
});

export const runtimeRecoveryRecordedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runtime"),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  lastError: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  recordedAt: nonEmptyStringSchema,
  recoveryId: identifierSchema,
  restartGeneration: runtimeRestartGenerationSchema,
  type: z.literal("runtime.recovery.recorded")
});

export const runtimeRecoveryControllerUpdatedEventSchema =
  hostEventBaseSchema.extend({
    category: z.literal("runtime"),
    controller: runtimeRecoveryControllerRecordSchema,
    graphId: identifierSchema,
    graphRevisionId: identifierSchema,
    nodeId: identifierSchema,
    previousAttemptsUsed: z.number().int().nonnegative().optional(),
    previousState: runtimeRecoveryControllerStateSchema.optional(),
    type: z.literal("runtime.recovery_controller.updated")
  });

export const runtimeObservedStateChangedEventSchema = hostEventBaseSchema.extend({
  backendKind: runtimeBackendKindSchema,
  category: z.literal("runtime"),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  previousObservedState: runtimeObservedStateSchema.optional(),
  runtimeHandle: nonEmptyStringSchema.optional(),
  statusMessage: nonEmptyStringSchema.optional(),
  type: z.literal("runtime.observed_state.changed")
});

export const runtimeAssignmentReceiptEventSchema = hostEventBaseSchema.extend({
  assignmentId: identifierSchema,
  category: z.literal("runtime"),
  hostAuthorityPubkey: nostrPublicKeySchema,
  observedAt: nonEmptyStringSchema,
  receiptKind: z.enum([
    "received",
    "materialized",
    "started",
    "stopped",
    "failed"
  ]),
  receiptMessage: nonEmptyStringSchema.optional(),
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema,
  type: z.literal("runtime.assignment.receipt")
});

export const sessionUpdatedEventSchema = hostEventBaseSchema.extend({
  activeConversationIds: z.array(identifierSchema).default([]),
  approvalStatusCounts: approvalStatusCountsSchema.optional(),
  category: z.literal("session"),
  conversationStatusCounts: conversationStatusCountsSchema.optional(),
  graphId: identifierSchema,
  lastMessageType: entangleA2AMessageTypeSchema.optional(),
  nodeId: identifierSchema,
  ownerNodeId: identifierSchema,
  rootArtifactIds: z.array(identifierSchema).default([]),
  sessionConsistencyFindingCodes: z
    .array(hostSessionConsistencyFindingCodeSchema)
    .optional(),
  sessionConsistencyFindingCount: z.number().int().nonnegative().optional(),
  sessionId: identifierSchema,
  status: sessionLifecycleStateSchema,
  traceId: identifierSchema,
  updatedAt: nonEmptyStringSchema,
  type: z.literal("session.updated")
});

export const sessionCancellationRequestedEventSchema =
  hostEventBaseSchema.extend({
    cancellationId: identifierSchema,
    category: z.literal("session"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    requestedBy: identifierSchema.optional(),
    sessionId: identifierSchema,
    status: sessionCancellationRequestStatusSchema,
    type: z.literal("session.cancellation.requested")
  });

export const runnerTurnUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runner"),
  consumedArtifactIds: z.array(identifierSchema),
  conversationId: identifierSchema.optional(),
  engineOutcome: engineTurnOutcomeSchema.optional(),
  engineRequestSummary: engineTurnRequestSummarySchema.optional(),
  emittedHandoffMessageIds: z.array(nostrEventIdSchema).default([]),
  graphId: identifierSchema,
  memoryRepositorySyncOutcome: memoryRepositorySyncOutcomeSchema.optional(),
  memorySynthesisOutcome: memorySynthesisOutcomeSchema.optional(),
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema),
  sessionId: identifierSchema.optional(),
  sourceChangeCandidateIds: z.array(identifierSchema).default([]),
  sourceChangeSummary: sourceChangeSummarySchema.optional(),
  startedAt: nonEmptyStringSchema,
  triggerKind: runnerTriggerKindSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema,
  type: z.literal("runner.turn.updated")
});

export const sourceHistoryUpdatedEventSchema = hostEventBaseSchema.extend({
  approvalId: identifierSchema.optional(),
  candidateId: identifierSchema,
  category: z.literal("runtime"),
  commit: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  historyId: identifierSchema,
  mode: sourceHistoryApplicationModeSchema,
  nodeId: identifierSchema,
  sourceHistoryRef: nonEmptyStringSchema,
  turnId: identifierSchema,
  type: z.literal("source_history.updated")
});

export const sourceHistoryPublishedEventSchema = hostEventBaseSchema.extend({
  approvalId: identifierSchema.optional(),
  artifactId: identifierSchema,
  candidateId: identifierSchema,
  category: z.literal("runtime"),
  commit: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  historyId: identifierSchema,
  nodeId: identifierSchema,
  publicationState: artifactPublicationStateSchema,
  remoteName: identifierSchema.optional(),
  remoteUrl: nonEmptyStringSchema.optional(),
  sourceHistoryBranch: nonEmptyStringSchema,
  targetGitServiceRef: identifierSchema.optional(),
  targetNamespace: identifierSchema.optional(),
  targetRepositoryName: identifierSchema.optional(),
  turnId: identifierSchema,
  type: z.literal("source_history.published")
});

export const sourceHistoryReplayedEventSchema = hostEventBaseSchema.extend({
  approvalId: identifierSchema.optional(),
  candidateId: identifierSchema,
  category: z.literal("runtime"),
  commit: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  historyId: identifierSchema,
  nodeId: identifierSchema,
  replayId: identifierSchema,
  replayStatus: z.enum(["already_in_workspace", "replayed", "unavailable"]),
  turnId: identifierSchema,
  type: z.literal("source_history.replayed")
});

export const wikiRepositoryPublishedEventSchema = hostEventBaseSchema.extend({
  artifactId: identifierSchema,
  branch: nonEmptyStringSchema,
  category: z.literal("runtime"),
  commit: nonEmptyStringSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  publicationId: identifierSchema,
  publicationState: artifactPublicationStateSchema,
  remoteName: identifierSchema.optional(),
  remoteUrl: nonEmptyStringSchema.optional(),
  targetGitServiceRef: identifierSchema.optional(),
  targetNamespace: identifierSchema.optional(),
  targetRepositoryName: identifierSchema.optional(),
  type: z.literal("wiki_repository.published")
});

export const conversationTraceEventSchema = hostEventBaseSchema.extend({
  artifactIds: z.array(identifierSchema),
  category: z.literal("session"),
  conversationId: identifierSchema,
  followupCount: z.number().int().nonnegative(),
  graphId: identifierSchema,
  initiator: z.enum(["self", "peer"]),
  lastMessageType: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  peerNodeId: identifierSchema,
  sessionId: identifierSchema,
  status: conversationLifecycleStateSchema,
  type: z.literal("conversation.trace.event"),
  updatedAt: nonEmptyStringSchema
});

export const approvalTraceEventSchema = hostEventBaseSchema.extend({
  approvalId: identifierSchema,
  approverNodeIds: z.array(identifierSchema),
  category: z.literal("session"),
  conversationId: identifierSchema.optional(),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  operation: policyOperationSchema.optional(),
  requestedAt: nonEmptyStringSchema,
  requestedByNodeId: identifierSchema,
  resource: policyResourceScopeSchema.optional(),
  sessionId: identifierSchema,
  status: approvalLifecycleStateSchema,
  type: z.literal("approval.trace.event"),
  updatedAt: nonEmptyStringSchema
});

export const artifactTraceEventSchema = hostEventBaseSchema.extend({
  artifactId: identifierSchema,
  artifactKind: artifactKindSchema.optional(),
  backend: artifactBackendSchema,
  category: z.literal("session"),
  conversationId: identifierSchema.optional(),
  graphId: identifierSchema.optional(),
  lifecycleState: artifactLifecycleStateSchema.optional(),
  nodeId: identifierSchema,
  publicationState: artifactPublicationStateSchema.optional(),
  retrievalState: artifactRetrievalStateSchema.optional(),
  sessionId: identifierSchema.optional(),
  turnId: identifierSchema.optional(),
  type: z.literal("artifact.trace.event"),
  updatedAt: nonEmptyStringSchema
});

export const hostReconciliationCompletedEventSchema = hostEventBaseSchema.extend({
  backendKind: runtimeBackendKindSchema,
  blockedRuntimeCount: z.number().int().nonnegative().optional(),
  category: z.literal("reconciliation"),
  degradedRuntimeCount: z.number().int().nonnegative().optional(),
  failedRuntimeCount: z.number().int().nonnegative(),
  findingCodes: z.array(runtimeReconciliationFindingCodeSchema).optional(),
  graphId: identifierSchema.optional(),
  graphRevisionId: identifierSchema.optional(),
  issueCount: z.number().int().nonnegative().optional(),
  managedRuntimeCount: z.number().int().nonnegative(),
  runningRuntimeCount: z.number().int().nonnegative(),
  stoppedRuntimeCount: z.number().int().nonnegative(),
  transitioningRuntimeCount: z.number().int().nonnegative().optional(),
  type: z.literal("host.reconciliation.completed")
});

export const hostEventRecordSchema = z.discriminatedUnion("type", [
  hostOperatorRequestCompletedEventSchema,
  catalogUpdatedEventSchema,
  packageSourceAdmittedEventSchema,
  packageSourceDeletedEventSchema,
  externalPrincipalUpdatedEventSchema,
  externalPrincipalDeletedEventSchema,
  graphRevisionAppliedEventSchema,
  nodeBindingUpdatedEventSchema,
  edgeUpdatedEventSchema,
  runtimeDesiredStateChangedEventSchema,
  runtimeRestartRequestedEventSchema,
  runtimeRecoveryPolicyUpdatedEventSchema,
  runtimeRecoveryAttemptedEventSchema,
  runtimeRecoveryExhaustedEventSchema,
  runtimeRecoveryRecordedEventSchema,
  runtimeRecoveryControllerUpdatedEventSchema,
  runtimeObservedStateChangedEventSchema,
  runtimeAssignmentReceiptEventSchema,
  sessionUpdatedEventSchema,
  sessionCancellationRequestedEventSchema,
  runnerTurnUpdatedEventSchema,
  sourceHistoryUpdatedEventSchema,
  sourceHistoryPublishedEventSchema,
  sourceHistoryReplayedEventSchema,
  wikiRepositoryPublishedEventSchema,
  conversationTraceEventSchema,
  approvalTraceEventSchema,
  artifactTraceEventSchema,
  hostReconciliationCompletedEventSchema
]);

export const hostEventListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional()
});

export const hostEventStreamQuerySchema = z.object({
  replay: z.coerce.number().int().nonnegative().max(500).optional()
});

export const hostEventListResponseSchema = z.object({
  events: z.array(hostEventRecordSchema)
});

export type CatalogUpdatedEvent = z.infer<typeof catalogUpdatedEventSchema>;
export type PackageSourceAdmittedEvent = z.infer<
  typeof packageSourceAdmittedEventSchema
>;
export type PackageSourceDeletedEvent = z.infer<
  typeof packageSourceDeletedEventSchema
>;
export type ExternalPrincipalUpdatedEvent = z.infer<
  typeof externalPrincipalUpdatedEventSchema
>;
export type ExternalPrincipalDeletedEvent = z.infer<
  typeof externalPrincipalDeletedEventSchema
>;
export type GraphRevisionAppliedEvent = z.infer<
  typeof graphRevisionAppliedEventSchema
>;
export type NodeBindingUpdatedEvent = z.infer<
  typeof nodeBindingUpdatedEventSchema
>;
export type EdgeUpdatedEvent = z.infer<typeof edgeUpdatedEventSchema>;
export type RuntimeDesiredStateChangedEvent = z.infer<
  typeof runtimeDesiredStateChangedEventSchema
>;
export type RuntimeRestartRequestedEvent = z.infer<
  typeof runtimeRestartRequestedEventSchema
>;
export type RuntimeRecoveryPolicyUpdatedEvent = z.infer<
  typeof runtimeRecoveryPolicyUpdatedEventSchema
>;
export type RuntimeRecoveryAttemptedEvent = z.infer<
  typeof runtimeRecoveryAttemptedEventSchema
>;
export type RuntimeRecoveryExhaustedEvent = z.infer<
  typeof runtimeRecoveryExhaustedEventSchema
>;
export type RuntimeRecoveryRecordedEvent = z.infer<
  typeof runtimeRecoveryRecordedEventSchema
>;
export type RuntimeRecoveryControllerUpdatedEvent = z.infer<
  typeof runtimeRecoveryControllerUpdatedEventSchema
>;
export type RuntimeObservedStateChangedEvent = z.infer<
  typeof runtimeObservedStateChangedEventSchema
>;
export type RuntimeAssignmentReceiptEvent = z.infer<
  typeof runtimeAssignmentReceiptEventSchema
>;
export type SessionUpdatedEvent = z.infer<typeof sessionUpdatedEventSchema>;
export type SessionCancellationRequestedEvent = z.infer<
  typeof sessionCancellationRequestedEventSchema
>;
export type RunnerTurnUpdatedEvent = z.infer<typeof runnerTurnUpdatedEventSchema>;
export type SourceHistoryUpdatedEvent = z.infer<
  typeof sourceHistoryUpdatedEventSchema
>;
export type SourceHistoryPublishedEvent = z.infer<
  typeof sourceHistoryPublishedEventSchema
>;
export type SourceHistoryReplayedEvent = z.infer<
  typeof sourceHistoryReplayedEventSchema
>;
export type WikiRepositoryPublishedEvent = z.infer<
  typeof wikiRepositoryPublishedEventSchema
>;
export type ConversationTraceEvent = z.infer<typeof conversationTraceEventSchema>;
export type ApprovalTraceEvent = z.infer<typeof approvalTraceEventSchema>;
export type ArtifactTraceEvent = z.infer<typeof artifactTraceEventSchema>;
export type HostReconciliationCompletedEvent = z.infer<
  typeof hostReconciliationCompletedEventSchema
>;
export type HostOperatorRequestMethod = z.infer<
  typeof hostOperatorRequestMethodSchema
>;
export type HostOperatorRequestAuthMode = z.infer<
  typeof hostOperatorRequestAuthModeSchema
>;
export type HostOperatorRequestCompletedEvent = z.infer<
  typeof hostOperatorRequestCompletedEventSchema
>;
export type HostEventRecord = z.infer<typeof hostEventRecordSchema>;
export type HostEventListQuery = z.infer<typeof hostEventListQuerySchema>;
export type HostEventStreamQuery = z.infer<typeof hostEventStreamQuerySchema>;
export type HostEventListResponse = z.infer<typeof hostEventListResponseSchema>;
