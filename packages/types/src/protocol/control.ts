import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  assignmentLeaseSchema,
  runtimeAssignmentRecordSchema
} from "../federation/assignment.js";
import { runnerTrustStateSchema } from "../federation/runner.js";
import { sessionCancellationRequestRecordSchema } from "../runtime/session-state.js";
import { entangleSignedEnvelopeSchema } from "./signed-envelope.js";

export const entangleControlProtocolSchema = z.literal("entangle.control.v1");

export const entangleControlEventTypeSchema = z.enum([
  "runner.hello.ack",
  "runtime.assignment.offer",
  "runtime.assignment.revoke",
  "assignment.lease.renew",
  "runtime.start",
  "runtime.stop",
  "runtime.restart",
  "runtime.session.cancel",
  "runtime.source_history.publish",
  "runtime.source_history.replay",
  "runtime.wiki.publish"
]);

const controlPayloadBaseSchema = z.object({
  hostAuthorityPubkey: nostrPublicKeySchema,
  issuedAt: nonEmptyStringSchema,
  protocol: entangleControlProtocolSchema,
  runnerId: identifierSchema,
  runnerPubkey: nostrPublicKeySchema
});

export const runnerHelloAckPayloadSchema = controlPayloadBaseSchema.extend({
  eventType: z.literal("runner.hello.ack"),
  message: nonEmptyStringSchema.optional(),
  trustState: runnerTrustStateSchema
});

export const runtimeAssignmentOfferPayloadSchema = controlPayloadBaseSchema
  .extend({
    assignment: runtimeAssignmentRecordSchema,
    eventType: z.literal("runtime.assignment.offer")
  })
  .superRefine((value, context) => {
    if (value.assignment.status !== "offered") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Runtime assignment offers must carry an offered assignment.",
        path: ["assignment", "status"]
      });
    }

    if (value.assignment.hostAuthorityPubkey !== value.hostAuthorityPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Runtime assignment hostAuthorityPubkey must match the control payload.",
        path: ["assignment", "hostAuthorityPubkey"]
      });
    }

    if (value.assignment.runnerPubkey !== value.runnerPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Runtime assignment runnerPubkey must match the control payload.",
        path: ["assignment", "runnerPubkey"]
      });
    }

    if (value.assignment.runnerId !== value.runnerId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Runtime assignment runnerId must match the control payload.",
        path: ["assignment", "runnerId"]
      });
    }
  });

export const runtimeAssignmentRevokePayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema,
  eventType: z.literal("runtime.assignment.revoke"),
  reason: nonEmptyStringSchema.optional(),
  revokedAt: nonEmptyStringSchema
});

export const assignmentLeaseRenewPayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema,
  eventType: z.literal("assignment.lease.renew"),
  lease: assignmentLeaseSchema
});

export const runtimeStartPayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema.optional(),
  commandId: identifierSchema,
  eventType: z.literal("runtime.start"),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  reason: nonEmptyStringSchema.optional()
});

export const runtimeStopPayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema.optional(),
  commandId: identifierSchema,
  eventType: z.literal("runtime.stop"),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  reason: nonEmptyStringSchema.optional()
});

export const runtimeRestartPayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema.optional(),
  commandId: identifierSchema,
  eventType: z.literal("runtime.restart"),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  reason: nonEmptyStringSchema.optional()
});

export const runtimeSessionCancelPayloadSchema = controlPayloadBaseSchema
  .extend({
    assignmentId: identifierSchema.optional(),
    cancellation: sessionCancellationRequestRecordSchema,
    commandId: identifierSchema,
    eventType: z.literal("runtime.session.cancel"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    sessionId: identifierSchema
  })
  .superRefine((value, context) => {
    if (value.cancellation.graphId !== value.graphId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cancellation graphId must match the control payload graphId.",
        path: ["cancellation", "graphId"]
      });
    }

    if (value.cancellation.nodeId !== value.nodeId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cancellation nodeId must match the control payload nodeId.",
        path: ["cancellation", "nodeId"]
      });
    }

    if (value.cancellation.sessionId !== value.sessionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Cancellation sessionId must match the control payload sessionId.",
        path: ["cancellation", "sessionId"]
      });
    }

    if (value.cancellation.status !== "requested") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cancellation control commands must carry requested records.",
        path: ["cancellation", "status"]
      });
    }
  });

export const runtimeSourceHistoryPublishPayloadSchema =
  controlPayloadBaseSchema.extend({
    assignmentId: identifierSchema.optional(),
    commandId: identifierSchema,
    eventType: z.literal("runtime.source_history.publish"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    requestedBy: identifierSchema.optional(),
    retryFailedPublication: z.boolean().default(false),
    sourceHistoryId: identifierSchema
  });

export const runtimeSourceHistoryReplayPayloadSchema =
  controlPayloadBaseSchema.extend({
    approvalId: identifierSchema.optional(),
    assignmentId: identifierSchema.optional(),
    commandId: identifierSchema,
    eventType: z.literal("runtime.source_history.replay"),
    graphId: identifierSchema,
    nodeId: identifierSchema,
    reason: nonEmptyStringSchema.optional(),
    replayedBy: identifierSchema.optional(),
    replayId: identifierSchema.optional(),
    sourceHistoryId: identifierSchema
  });

export const runtimeWikiPublishPayloadSchema = controlPayloadBaseSchema.extend({
  assignmentId: identifierSchema.optional(),
  commandId: identifierSchema,
  eventType: z.literal("runtime.wiki.publish"),
  graphId: identifierSchema,
  nodeId: identifierSchema,
  reason: nonEmptyStringSchema.optional(),
  requestedBy: identifierSchema.optional(),
  retryFailedPublication: z.boolean().default(false)
});

export const entangleControlEventPayloadSchema = z.discriminatedUnion(
  "eventType",
  [
    runnerHelloAckPayloadSchema,
    runtimeAssignmentOfferPayloadSchema,
    runtimeAssignmentRevokePayloadSchema,
    assignmentLeaseRenewPayloadSchema,
    runtimeStartPayloadSchema,
    runtimeStopPayloadSchema,
    runtimeRestartPayloadSchema,
    runtimeSessionCancelPayloadSchema,
    runtimeSourceHistoryPublishPayloadSchema,
    runtimeSourceHistoryReplayPayloadSchema,
    runtimeWikiPublishPayloadSchema
  ]
);

export const entangleControlEventSchema = z
  .object({
    envelope: entangleSignedEnvelopeSchema,
    payload: entangleControlEventPayloadSchema
  })
  .superRefine((value, context) => {
    if (value.envelope.protocol !== "entangle.control.v1") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Control events must use the entangle.control.v1 protocol.",
        path: ["envelope", "protocol"]
      });
    }

    if (value.envelope.signerPubkey !== value.payload.hostAuthorityPubkey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Control event signerPubkey must match payload.hostAuthorityPubkey.",
        path: ["envelope", "signerPubkey"]
      });
    }

    if (
      value.envelope.recipientPubkey &&
      value.envelope.recipientPubkey !== value.payload.runnerPubkey
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Control event recipientPubkey must match payload.runnerPubkey.",
        path: ["envelope", "recipientPubkey"]
      });
    }
  });

export type EntangleControlProtocol = z.infer<
  typeof entangleControlProtocolSchema
>;
export type EntangleControlEventType = z.infer<
  typeof entangleControlEventTypeSchema
>;
export type RunnerHelloAckPayload = z.infer<typeof runnerHelloAckPayloadSchema>;
export type RuntimeAssignmentOfferPayload = z.infer<
  typeof runtimeAssignmentOfferPayloadSchema
>;
export type RuntimeAssignmentRevokePayload = z.infer<
  typeof runtimeAssignmentRevokePayloadSchema
>;
export type AssignmentLeaseRenewPayload = z.infer<
  typeof assignmentLeaseRenewPayloadSchema
>;
export type RuntimeStartPayload = z.infer<typeof runtimeStartPayloadSchema>;
export type RuntimeStopPayload = z.infer<typeof runtimeStopPayloadSchema>;
export type RuntimeRestartPayload = z.infer<typeof runtimeRestartPayloadSchema>;
export type RuntimeSessionCancelPayload = z.infer<
  typeof runtimeSessionCancelPayloadSchema
>;
export type RuntimeSourceHistoryPublishPayload = z.infer<
  typeof runtimeSourceHistoryPublishPayloadSchema
>;
export type RuntimeSourceHistoryReplayPayload = z.infer<
  typeof runtimeSourceHistoryReplayPayloadSchema
>;
export type RuntimeWikiPublishPayload = z.infer<
  typeof runtimeWikiPublishPayloadSchema
>;
export type EntangleControlEventPayload = z.infer<
  typeof entangleControlEventPayloadSchema
>;
export type EntangleControlEvent = z.infer<typeof entangleControlEventSchema>;
