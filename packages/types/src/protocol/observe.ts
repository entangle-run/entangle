import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { assignmentLeaseSchema } from "../federation/assignment.js";
import {
  runnerHelloPayloadSchema,
  runnerOperationalStateSchema
} from "../federation/runner.js";
import { runtimeObservedStateSchema } from "../runtime/runtime-state.js";
import {
  approvalLifecycleStateSchema,
  conversationRecordSchema,
  conversationLifecycleStateSchema,
  runnerTurnRecordSchema,
  runnerPhaseSchema,
  sessionRecordSchema,
  sessionLifecycleStateSchema,
  sourceChangeCandidateStatusSchema
} from "../runtime/session-state.js";
import { entangleSignedEnvelopeSchema } from "./signed-envelope.js";

export const entangleObserveProtocolSchema = z.literal("entangle.observe.v1");

export const entangleObservationEventTypeSchema = z.enum([
  "runner.hello",
  "runner.heartbeat",
  "assignment.accepted",
  "assignment.rejected",
  "assignment.receipt",
  "runtime.status",
  "conversation.updated",
  "session.updated",
  "turn.updated",
  "approval.updated",
  "artifact.ref",
  "source_change.ref",
  "wiki.ref",
  "log.summary"
]);

const observationPayloadBaseSchema = z.object({
  hostAuthorityPubkey: nostrPublicKeySchema,
  protocol: entangleObserveProtocolSchema,
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema
});

const observedAtPayloadBaseSchema = observationPayloadBaseSchema.extend({
  observedAt: nonEmptyStringSchema
});

export const runnerHeartbeatPayloadSchema = observedAtPayloadBaseSchema.extend({
  assignmentIds: z.array(identifierSchema).default([]),
  eventType: z.literal("runner.heartbeat"),
  operationalState: runnerOperationalStateSchema.default("ready"),
  statusMessage: nonEmptyStringSchema.optional()
});

export const assignmentAcceptedObservationPayloadSchema =
  observationPayloadBaseSchema.extend({
    acceptedAt: nonEmptyStringSchema,
    assignmentId: identifierSchema,
    eventType: z.literal("assignment.accepted"),
    lease: assignmentLeaseSchema.optional()
  });

export const assignmentRejectedObservationPayloadSchema =
  observationPayloadBaseSchema.extend({
    assignmentId: identifierSchema,
    eventType: z.literal("assignment.rejected"),
    rejectedAt: nonEmptyStringSchema,
    rejectionReason: nonEmptyStringSchema
  });

export const assignmentReceiptPayloadSchema = observedAtPayloadBaseSchema.extend({
  assignmentId: identifierSchema,
  eventType: z.literal("assignment.receipt"),
  message: nonEmptyStringSchema.optional(),
  receiptKind: z.enum([
    "received",
    "materialized",
    "started",
    "stopped",
    "failed"
  ])
});

export const runtimeStatusObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    assignmentId: identifierSchema.optional(),
    clientUrl: nonEmptyStringSchema.optional(),
    eventType: z.literal("runtime.status"),
    graphId: identifierSchema,
    graphRevisionId: identifierSchema.optional(),
    nodeId: identifierSchema,
    observedState: runtimeObservedStateSchema,
    restartGeneration: z.number().int().nonnegative().default(0),
    statusMessage: nonEmptyStringSchema.optional()
  });

export const conversationUpdatedObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    conversation: conversationRecordSchema.optional(),
    conversationId: identifierSchema,
    eventType: z.literal("conversation.updated"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    status: conversationLifecycleStateSchema,
    updatedAt: nonEmptyStringSchema
  });

export const sessionUpdatedObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    eventType: z.literal("session.updated"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    session: sessionRecordSchema.optional(),
    sessionId: identifierSchema,
    status: sessionLifecycleStateSchema,
    updatedAt: nonEmptyStringSchema
  });

export const turnUpdatedObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    eventType: z.literal("turn.updated"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    phase: runnerPhaseSchema,
    sessionId: identifierSchema.optional(),
    turn: runnerTurnRecordSchema.optional(),
    turnId: identifierSchema,
    updatedAt: nonEmptyStringSchema
  });

export const approvalUpdatedObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    approvalId: identifierSchema,
    eventType: z.literal("approval.updated"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    sessionId: identifierSchema.optional(),
    status: approvalLifecycleStateSchema,
    updatedAt: nonEmptyStringSchema
  });

export const artifactRefObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    artifactRef: artifactRefSchema,
    eventType: z.literal("artifact.ref"),
    graphId: identifierSchema,
    nodeId: identifierSchema
  });

export const sourceChangeRefObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    artifactRefs: z.array(artifactRefSchema).default([]),
    candidateId: identifierSchema,
    eventType: z.literal("source_change.ref"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    status: sourceChangeCandidateStatusSchema
  });

export const wikiRefObservationPayloadSchema = observedAtPayloadBaseSchema.extend({
  artifactRef: artifactRefSchema,
  eventType: z.literal("wiki.ref"),
  graphId: identifierSchema,
  nodeId: identifierSchema
});

export const logSummaryObservationPayloadSchema =
  observedAtPayloadBaseSchema.extend({
    eventType: z.literal("log.summary"),
    graphId: identifierSchema.optional(),
    level: z.enum(["debug", "info", "warn", "error"]).default("info"),
    nodeId: identifierSchema.optional(),
    summary: nonEmptyStringSchema,
    truncated: z.boolean().default(false)
  });

export const entangleObservationEventPayloadSchema = z.discriminatedUnion(
  "eventType",
  [
    runnerHelloPayloadSchema,
    runnerHeartbeatPayloadSchema,
    assignmentAcceptedObservationPayloadSchema,
    assignmentRejectedObservationPayloadSchema,
    assignmentReceiptPayloadSchema,
    runtimeStatusObservationPayloadSchema,
    conversationUpdatedObservationPayloadSchema,
    sessionUpdatedObservationPayloadSchema,
    turnUpdatedObservationPayloadSchema,
    approvalUpdatedObservationPayloadSchema,
    artifactRefObservationPayloadSchema,
    sourceChangeRefObservationPayloadSchema,
    wikiRefObservationPayloadSchema,
    logSummaryObservationPayloadSchema
  ]
);

export const entangleObservationEventSchema = z
  .object({
    envelope: entangleSignedEnvelopeSchema,
    payload: entangleObservationEventPayloadSchema
  })
  .superRefine((value, context) => {
    if (value.envelope.protocol !== "entangle.observe.v1") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Observation events must use the entangle.observe.v1 protocol.",
        path: ["envelope", "protocol"]
      });
    }

    if (value.envelope.signerPubkey !== value.payload.runnerPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Observation event signerPubkey must match payload.runnerPubkey.",
        path: ["envelope", "signerPubkey"]
      });
    }

    if (
      value.envelope.recipientPubkey &&
      value.envelope.recipientPubkey !== value.payload.hostAuthorityPubkey
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Observation event recipientPubkey must match payload.hostAuthorityPubkey.",
        path: ["envelope", "recipientPubkey"]
      });
    }
  });

export type EntangleObserveProtocol = z.infer<
  typeof entangleObserveProtocolSchema
>;
export type EntangleObservationEventType = z.infer<
  typeof entangleObservationEventTypeSchema
>;
export type RunnerHeartbeatPayload = z.infer<
  typeof runnerHeartbeatPayloadSchema
>;
export type AssignmentAcceptedObservationPayload = z.infer<
  typeof assignmentAcceptedObservationPayloadSchema
>;
export type AssignmentRejectedObservationPayload = z.infer<
  typeof assignmentRejectedObservationPayloadSchema
>;
export type AssignmentReceiptPayload = z.infer<
  typeof assignmentReceiptPayloadSchema
>;
export type RuntimeStatusObservationPayload = z.infer<
  typeof runtimeStatusObservationPayloadSchema
>;
export type ConversationUpdatedObservationPayload = z.infer<
  typeof conversationUpdatedObservationPayloadSchema
>;
export type SessionUpdatedObservationPayload = z.infer<
  typeof sessionUpdatedObservationPayloadSchema
>;
export type TurnUpdatedObservationPayload = z.infer<
  typeof turnUpdatedObservationPayloadSchema
>;
export type ApprovalUpdatedObservationPayload = z.infer<
  typeof approvalUpdatedObservationPayloadSchema
>;
export type ArtifactRefObservationPayload = z.infer<
  typeof artifactRefObservationPayloadSchema
>;
export type SourceChangeRefObservationPayload = z.infer<
  typeof sourceChangeRefObservationPayloadSchema
>;
export type WikiRefObservationPayload = z.infer<
  typeof wikiRefObservationPayloadSchema
>;
export type LogSummaryObservationPayload = z.infer<
  typeof logSummaryObservationPayloadSchema
>;
export type EntangleObservationEventPayload = z.infer<
  typeof entangleObservationEventPayloadSchema
>;
export type EntangleObservationEvent = z.infer<
  typeof entangleObservationEventSchema
>;
