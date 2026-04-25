import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const entangleA2AProtocolSchema = z.literal("entangle.a2a.v1");

export const entangleA2AMessageTypeSchema = z.enum([
  "task.request",
  "task.accept",
  "task.reject",
  "task.update",
  "task.handoff",
  "task.result",
  "artifact.ref",
  "question",
  "answer",
  "approval.request",
  "approval.response",
  "conversation.close"
]);

export const entangleA2AResponsePolicySchema = z.object({
  closeOnResult: z.boolean().default(true),
  maxFollowups: z.number().int().nonnegative().default(1),
  responseRequired: z.boolean().default(true)
});

export const entangleA2AConstraintsSchema = z.object({
  approvalRequiredBeforeAction: z.boolean().default(false),
  deadline: nonEmptyStringSchema.optional()
});

export const entangleA2AWorkSchema = z.object({
  artifactRefs: z.array(artifactRefSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  summary: nonEmptyStringSchema
});

export const entangleA2AApprovalRequestMetadataSchema = z.object({
  approval: z.object({
    approvalId: identifierSchema,
    approverNodeIds: z.array(identifierSchema).default([]),
    reason: nonEmptyStringSchema.optional()
  })
});

export const entangleA2AApprovalResponseDecisionSchema = z.enum([
  "approved",
  "rejected"
]);

export const entangleA2AApprovalResponseMetadataSchema = z.object({
  approval: z.object({
    approvalId: identifierSchema,
    decision: entangleA2AApprovalResponseDecisionSchema
  })
});

function requiresParentMessage(
  messageType: z.infer<typeof entangleA2AMessageTypeSchema>
): boolean {
  switch (messageType) {
    case "task.accept":
    case "task.reject":
    case "task.update":
    case "task.handoff":
    case "task.result":
    case "answer":
    case "approval.request":
    case "approval.response":
    case "conversation.close":
      return true;
    default:
      return false;
  }
}

export const entangleA2AMessageSchema = z
  .object({
    constraints: entangleA2AConstraintsSchema.default({
      approvalRequiredBeforeAction: false
    }),
    conversationId: identifierSchema,
    fromNodeId: identifierSchema,
    fromPubkey: nostrPublicKeySchema,
    graphId: identifierSchema,
    intent: nonEmptyStringSchema,
    messageType: entangleA2AMessageTypeSchema,
    parentMessageId: nostrEventIdSchema.optional(),
    protocol: entangleA2AProtocolSchema,
    responsePolicy: entangleA2AResponsePolicySchema.default({
      closeOnResult: true,
      maxFollowups: 1,
      responseRequired: true
    }),
    sessionId: identifierSchema,
    toNodeId: identifierSchema,
    toPubkey: nostrPublicKeySchema,
    turnId: identifierSchema,
    work: entangleA2AWorkSchema
  })
  .superRefine((value, context) => {
    if (value.fromNodeId === value.toNodeId) {
      context.addIssue({
        code: "custom",
        message: "Sender and recipient node ids must differ.",
        path: ["toNodeId"]
      });
    }

    if (value.fromPubkey === value.toPubkey) {
      context.addIssue({
        code: "custom",
        message: "Sender and recipient pubkeys must differ.",
        path: ["toPubkey"]
      });
    }

    if (requiresParentMessage(value.messageType) && !value.parentMessageId) {
      context.addIssue({
        code: "custom",
        message: `Message type '${value.messageType}' requires a parentMessageId.`,
        path: ["parentMessageId"]
      });
    }

    if (
      value.messageType === "conversation.close" &&
      value.responsePolicy.responseRequired
    ) {
      context.addIssue({
        code: "custom",
        message:
          "conversation.close messages must not request a follow-up response.",
        path: ["responsePolicy", "responseRequired"]
      });
    }

    if (
      value.responsePolicy.maxFollowups === 0 &&
      value.responsePolicy.responseRequired
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Messages that require a response must allow at least one follow-up.",
        path: ["responsePolicy", "maxFollowups"]
      });
    }
  });

export type EntangleA2AProtocol = z.infer<typeof entangleA2AProtocolSchema>;
export type EntangleA2AMessageType = z.infer<typeof entangleA2AMessageTypeSchema>;
export type EntangleA2AResponsePolicy = z.infer<
  typeof entangleA2AResponsePolicySchema
>;
export type EntangleA2AConstraints = z.infer<typeof entangleA2AConstraintsSchema>;
export type EntangleA2AApprovalRequestMetadata = z.infer<
  typeof entangleA2AApprovalRequestMetadataSchema
>;
export type EntangleA2AApprovalResponseDecision = z.infer<
  typeof entangleA2AApprovalResponseDecisionSchema
>;
export type EntangleA2AApprovalResponseMetadata = z.infer<
  typeof entangleA2AApprovalResponseMetadataSchema
>;
export type EntangleA2AWork = z.infer<typeof entangleA2AWorkSchema>;
export type EntangleA2AMessage = z.infer<typeof entangleA2AMessageSchema>;
