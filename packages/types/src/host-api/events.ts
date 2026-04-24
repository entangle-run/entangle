import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeReconciliationFindingCodeSchema } from "../runtime/reconciliation.js";
import {
  runtimeRecoveryControllerRecordSchema,
  runtimeRecoveryControllerStateSchema,
  runtimeRecoveryPolicySchema
} from "../runtime/recovery-policy.js";
import {
  runnerPhaseSchema,
  runnerTriggerKindSchema,
  sessionLifecycleStateSchema
} from "../runtime/session-state.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema,
  runtimeRestartGenerationSchema
} from "../runtime/runtime-state.js";

const hostEventBaseSchema = z.object({
  eventId: identifierSchema,
  message: nonEmptyStringSchema,
  schemaVersion: z.literal("1"),
  timestamp: nonEmptyStringSchema
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

export const externalPrincipalUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("control_plane"),
  principalId: identifierSchema,
  type: z.literal("external_principal.updated")
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

export const sessionUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("session"),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  ownerNodeId: identifierSchema,
  sessionId: identifierSchema,
  status: sessionLifecycleStateSchema,
  traceId: identifierSchema,
  updatedAt: nonEmptyStringSchema,
  type: z.literal("session.updated")
});

export const runnerTurnUpdatedEventSchema = hostEventBaseSchema.extend({
  category: z.literal("runner"),
  consumedArtifactIds: z.array(identifierSchema),
  conversationId: identifierSchema.optional(),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  phase: runnerPhaseSchema,
  producedArtifactIds: z.array(identifierSchema),
  sessionId: identifierSchema.optional(),
  startedAt: nonEmptyStringSchema,
  triggerKind: runnerTriggerKindSchema,
  turnId: identifierSchema,
  updatedAt: nonEmptyStringSchema,
  type: z.literal("runner.turn.updated")
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
  catalogUpdatedEventSchema,
  packageSourceAdmittedEventSchema,
  externalPrincipalUpdatedEventSchema,
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
  sessionUpdatedEventSchema,
  runnerTurnUpdatedEventSchema,
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
export type ExternalPrincipalUpdatedEvent = z.infer<
  typeof externalPrincipalUpdatedEventSchema
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
export type SessionUpdatedEvent = z.infer<typeof sessionUpdatedEventSchema>;
export type RunnerTurnUpdatedEvent = z.infer<typeof runnerTurnUpdatedEventSchema>;
export type HostReconciliationCompletedEvent = z.infer<
  typeof hostReconciliationCompletedEventSchema
>;
export type HostEventRecord = z.infer<typeof hostEventRecordSchema>;
export type HostEventListQuery = z.infer<typeof hostEventListQuerySchema>;
export type HostEventStreamQuery = z.infer<typeof hostEventStreamQuerySchema>;
export type HostEventListResponse = z.infer<typeof hostEventListResponseSchema>;
