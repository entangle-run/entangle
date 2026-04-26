import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import {
  identifierSchema,
  nonEmptyStringSchema,
  secretRefSchema
} from "../common/primitives.js";
import { authorityKeyAlgorithmSchema } from "../federation/authority.js";

export const userNodeIdentityStatusSchema = z.enum([
  "active",
  "inactive",
  "revoked"
]);

export const humanInterfaceRuntimeKindSchema = z.enum([
  "studio",
  "cli",
  "external_gateway"
]);

export const userInteractionGatewayStatusSchema = z.enum([
  "active",
  "inactive",
  "revoked"
]);

export const userInteractionGatewayRecordSchema = z
  .object({
    createdAt: nonEmptyStringSchema,
    gatewayId: identifierSchema,
    hostAuthorityPubkey: nostrPublicKeySchema,
    kind: humanInterfaceRuntimeKindSchema,
    lastSeenAt: nonEmptyStringSchema.optional(),
    publicKey: nostrPublicKeySchema.optional(),
    revokedAt: nonEmptyStringSchema.optional(),
    revocationReason: nonEmptyStringSchema.optional(),
    schemaVersion: z.literal("1"),
    status: userInteractionGatewayStatusSchema.default("active"),
    updatedAt: nonEmptyStringSchema,
    userNodeId: identifierSchema
  })
  .superRefine((value, context) => {
    if (value.status === "revoked" && !value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked user interaction gateways must include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only revoked user interaction gateways may include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revocationReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only revoked user interaction gateways may include revocationReason.",
        path: ["revocationReason"]
      });
    }
  });

export const userNodeIdentityRecordSchema = z
  .object({
    createdAt: nonEmptyStringSchema,
    displayName: nonEmptyStringSchema.optional(),
    gatewayIds: z.array(identifierSchema).default([]),
    graphId: identifierSchema,
    hostAuthorityPubkey: nostrPublicKeySchema,
    keyAlgorithm: authorityKeyAlgorithmSchema.default("nostr_secp256k1"),
    keyRef: secretRefSchema.optional(),
    nodeId: identifierSchema,
    publicKey: nostrPublicKeySchema,
    revokedAt: nonEmptyStringSchema.optional(),
    revocationReason: nonEmptyStringSchema.optional(),
    schemaVersion: z.literal("1"),
    status: userNodeIdentityStatusSchema.default("active"),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.status === "revoked" && !value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked User Node identities must include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only revoked User Node identities may include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revocationReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only revoked User Node identities may include revocationReason.",
        path: ["revocationReason"]
      });
    }
  });

export type UserNodeIdentityStatus = z.infer<
  typeof userNodeIdentityStatusSchema
>;
export type HumanInterfaceRuntimeKind = z.infer<
  typeof humanInterfaceRuntimeKindSchema
>;
export type UserInteractionGatewayStatus = z.infer<
  typeof userInteractionGatewayStatusSchema
>;
export type UserInteractionGatewayRecord = z.infer<
  typeof userInteractionGatewayRecordSchema
>;
export type UserNodeIdentityRecord = z.infer<
  typeof userNodeIdentityRecordSchema
>;
