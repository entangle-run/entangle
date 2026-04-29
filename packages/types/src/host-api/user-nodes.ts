import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import {
  policyOperationSchema,
  policyResourceScopeSchema
} from "../common/policy.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  entangleA2AMessageSchema,
  entangleA2AApprovalResponseDecisionSchema,
  entangleA2ASourceChangeReviewDecisionSchema,
  entangleA2AResponsePolicySchema
} from "../protocol/a2a.js";
import { userConversationProjectionRecordSchema } from "../projection/projection.js";
import {
  userInteractionGatewayRecordSchema,
  userNodeIdentityRecordSchema
} from "../user-node/identity.js";

export const userNodeIdentityListResponseSchema = z.object({
  generatedAt: nonEmptyStringSchema,
  userNodes: z.array(userNodeIdentityRecordSchema)
});

export const userNodeIdentityInspectionResponseSchema = z.object({
  gateways: z.array(userInteractionGatewayRecordSchema).default([]),
  userNode: userNodeIdentityRecordSchema
});

export const userNodeInboxResponseSchema = z.object({
  conversations: z.array(userConversationProjectionRecordSchema).default([]),
  generatedAt: nonEmptyStringSchema,
  userNodeId: identifierSchema
});

export const userNodeMessageDirectionSchema = z.enum(["inbound", "outbound"]);

export const userNodeMessageDeliveryStatusSchema = z.enum([
  "failed",
  "partial",
  "published",
  "received"
]);

export const userNodeMessageDeliveryErrorSchema = z.object({
  message: nonEmptyStringSchema,
  relayUrl: nonEmptyStringSchema
});

export const userNodeMessageRecordSchema = z.object({
  approval: z
    .object({
      approvalId: identifierSchema,
      approverNodeIds: z.array(identifierSchema).default([]),
      decision: entangleA2AApprovalResponseDecisionSchema.optional(),
      operation: policyOperationSchema.optional(),
      reason: nonEmptyStringSchema.optional(),
      resource: policyResourceScopeSchema.optional()
    })
    .optional(),
  artifactRefs: z.array(artifactRefSchema).default([]),
  conversationId: identifierSchema,
  createdAt: nonEmptyStringSchema,
  direction: userNodeMessageDirectionSchema,
  deliveryErrors: z.array(userNodeMessageDeliveryErrorSchema).default([]),
  deliveryStatus: userNodeMessageDeliveryStatusSchema.optional(),
  eventId: nostrEventIdSchema,
  fromNodeId: identifierSchema,
  fromPubkey: nostrPublicKeySchema,
  messageType: nonEmptyStringSchema,
  parentMessageId: nostrEventIdSchema.optional(),
  peerNodeId: identifierSchema,
  publishedRelays: z.array(nonEmptyStringSchema).default([]),
  relayUrls: z.array(nonEmptyStringSchema).default([]),
  schemaVersion: z.literal("1"),
  sessionId: identifierSchema,
  signerPubkey: nostrPublicKeySchema.optional(),
  sourceChangeReview: z
    .object({
      candidateId: identifierSchema,
      decision: entangleA2ASourceChangeReviewDecisionSchema,
      reason: nonEmptyStringSchema.optional()
    })
    .optional(),
  summary: nonEmptyStringSchema,
  toNodeId: identifierSchema,
  toPubkey: nostrPublicKeySchema,
  turnId: identifierSchema,
  userNodeId: identifierSchema
});

export const userNodeInboundMessageRecordRequestSchema = z.object({
  eventId: nostrEventIdSchema,
  message: entangleA2AMessageSchema,
  receivedAt: nonEmptyStringSchema,
  signerPubkey: nostrPublicKeySchema.optional()
});

export const userNodeConversationResponseSchema = z.object({
  conversation: userConversationProjectionRecordSchema.optional(),
  conversationId: identifierSchema,
  generatedAt: nonEmptyStringSchema,
  messages: z.array(userNodeMessageRecordSchema).default([]),
  userNodeId: identifierSchema
});

export const userNodeConversationReadRecordSchema = z.object({
  conversationId: identifierSchema,
  readAt: nonEmptyStringSchema,
  userNodeId: identifierSchema
});

export const userNodeConversationReadResponseSchema = z.object({
  conversation: userConversationProjectionRecordSchema.optional(),
  read: userNodeConversationReadRecordSchema
});

export const userNodeMessageInspectionResponseSchema = z.object({
  generatedAt: nonEmptyStringSchema,
  message: userNodeMessageRecordSchema,
  userNodeId: identifierSchema
});

export const userNodeMessagePublishTypeSchema = z.enum([
  "task.request",
  "question",
  "answer",
  "approval.response",
  "source_change.review",
  "read.receipt",
  "conversation.close"
]);

export const userNodeMessagePublishRequestSchema = z
  .object({
    approval: z
      .object({
        approvalId: identifierSchema,
        decision: entangleA2AApprovalResponseDecisionSchema,
        operation: policyOperationSchema.optional(),
        reason: nonEmptyStringSchema.optional(),
        resource: policyResourceScopeSchema.optional()
      })
      .optional(),
    artifactRefs: z.array(artifactRefSchema).default([]),
    conversationId: identifierSchema.optional(),
    intent: nonEmptyStringSchema.optional(),
    messageType: userNodeMessagePublishTypeSchema.default("task.request"),
    parentMessageId: nostrEventIdSchema.optional(),
    responsePolicy: entangleA2AResponsePolicySchema.optional(),
    sessionId: identifierSchema.optional(),
    sourceChangeReview: z
      .object({
        candidateId: identifierSchema,
        decision: entangleA2ASourceChangeReviewDecisionSchema,
        reason: nonEmptyStringSchema.optional()
      })
      .optional(),
    summary: nonEmptyStringSchema,
    targetNodeId: identifierSchema,
    turnId: identifierSchema.optional()
  })
  .superRefine((value, context) => {
    if (value.messageType === "approval.response" && !value.approval) {
      context.addIssue({
        code: "custom",
        message: "approval.response messages require approval metadata.",
        path: ["approval"]
      });
    }

    if (value.messageType === "source_change.review") {
      if (!value.sourceChangeReview) {
        context.addIssue({
          code: "custom",
          message: "source_change.review messages require sourceChangeReview metadata.",
          path: ["sourceChangeReview"]
        });
      }

      if (!value.parentMessageId) {
        context.addIssue({
          code: "custom",
          message: "source_change.review messages require a parentMessageId.",
          path: ["parentMessageId"]
        });
      }
    }
  });

export const userNodeMessagePublishResponseSchema = z.object({
  conversationId: nonEmptyStringSchema,
  deliveryErrors: z.array(userNodeMessageDeliveryErrorSchema).default([]),
  deliveryStatus: z
    .enum(["failed", "partial", "published"])
    .default("published"),
  eventId: nostrEventIdSchema,
  fromNodeId: identifierSchema,
  fromPubkey: nostrPublicKeySchema,
  messageType: userNodeMessagePublishTypeSchema,
  publishedRelays: z.array(nonEmptyStringSchema),
  relayUrls: z.array(nonEmptyStringSchema),
  sessionId: identifierSchema,
  signerPubkey: nostrPublicKeySchema.optional(),
  targetNodeId: identifierSchema,
  toPubkey: nostrPublicKeySchema,
  turnId: identifierSchema
});

export type UserNodeIdentityListResponse = z.infer<
  typeof userNodeIdentityListResponseSchema
>;
export type UserNodeIdentityInspectionResponse = z.infer<
  typeof userNodeIdentityInspectionResponseSchema
>;
export type UserNodeInboxResponse = z.infer<typeof userNodeInboxResponseSchema>;
export type UserNodeConversationResponse = z.infer<
  typeof userNodeConversationResponseSchema
>;
export type UserNodeConversationReadRecord = z.infer<
  typeof userNodeConversationReadRecordSchema
>;
export type UserNodeConversationReadResponse = z.infer<
  typeof userNodeConversationReadResponseSchema
>;
export type UserNodeMessageInspectionResponse = z.infer<
  typeof userNodeMessageInspectionResponseSchema
>;
export type UserNodeInboundMessageRecordRequest = z.infer<
  typeof userNodeInboundMessageRecordRequestSchema
>;
export type UserNodeMessageDirection = z.infer<
  typeof userNodeMessageDirectionSchema
>;
export type UserNodeMessageRecord = z.infer<
  typeof userNodeMessageRecordSchema
>;
export type UserNodeMessagePublishRequest = z.input<
  typeof userNodeMessagePublishRequestSchema
>;
export type UserNodeMessagePublishType = z.infer<
  typeof userNodeMessagePublishTypeSchema
>;
export type ParsedUserNodeMessagePublishRequest = z.infer<
  typeof userNodeMessagePublishRequestSchema
>;
export type UserNodeMessagePublishResponse = z.infer<
  typeof userNodeMessagePublishResponseSchema
>;
