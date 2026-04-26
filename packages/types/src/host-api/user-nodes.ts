import { z } from "zod";
import { artifactRefSchema } from "../artifacts/artifact-ref.js";
import { nostrEventIdSchema, nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  entangleA2AApprovalResponseDecisionSchema,
  entangleA2AResponsePolicySchema
} from "../protocol/a2a.js";
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

export const userNodeMessagePublishTypeSchema = z.enum([
  "task.request",
  "question",
  "answer",
  "approval.response",
  "conversation.close"
]);

export const userNodeMessagePublishRequestSchema = z
  .object({
    approval: z
      .object({
        approvalId: identifierSchema,
        decision: entangleA2AApprovalResponseDecisionSchema
      })
      .optional(),
    artifactRefs: z.array(artifactRefSchema).default([]),
    conversationId: identifierSchema.optional(),
    intent: nonEmptyStringSchema.optional(),
    messageType: userNodeMessagePublishTypeSchema.default("task.request"),
    parentMessageId: nostrEventIdSchema.optional(),
    responsePolicy: entangleA2AResponsePolicySchema.optional(),
    sessionId: identifierSchema.optional(),
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
  });

export const userNodeMessagePublishResponseSchema = z.object({
  conversationId: nonEmptyStringSchema,
  eventId: nostrEventIdSchema,
  fromNodeId: identifierSchema,
  fromPubkey: nostrPublicKeySchema,
  messageType: userNodeMessagePublishTypeSchema,
  publishedRelays: z.array(nonEmptyStringSchema),
  relayUrls: z.array(nonEmptyStringSchema),
  sessionId: identifierSchema,
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
