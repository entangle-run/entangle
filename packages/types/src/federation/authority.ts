import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import {
  identifierSchema,
  nonEmptyStringSchema,
  secretRefSchema
} from "../common/primitives.js";

export const authorityKeyAlgorithmSchema = z.literal("nostr_secp256k1");

export const hostAuthorityStatusSchema = z.enum([
  "active",
  "standby",
  "rotated",
  "revoked"
]);

export const hostAuthorityRecordSchema = z
  .object({
    authorityId: identifierSchema,
    createdAt: nonEmptyStringSchema,
    displayName: nonEmptyStringSchema.optional(),
    keyAlgorithm: authorityKeyAlgorithmSchema.default("nostr_secp256k1"),
    keyRef: secretRefSchema.optional(),
    publicKey: nostrPublicKeySchema,
    revokedAt: nonEmptyStringSchema.optional(),
    revocationReason: nonEmptyStringSchema.optional(),
    rotatedFromAuthorityId: identifierSchema.optional(),
    schemaVersion: z.literal("1"),
    status: hostAuthorityStatusSchema.default("active"),
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (value.status === "revoked" && !value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked Host Authority records must include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only revoked Host Authority records may include revokedAt.",
        path: ["revokedAt"]
      });
    }

    if (value.status !== "revoked" && value.revocationReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only revoked Host Authority records may include revocationReason.",
        path: ["revocationReason"]
      });
    }
  });

export const operatorRoleSchema = z.enum([
  "owner",
  "admin",
  "operator",
  "viewer"
]);

export const operatorIdentityRecordSchema = z.object({
  createdAt: nonEmptyStringSchema,
  displayName: nonEmptyStringSchema,
  hostAuthorityPubkey: nostrPublicKeySchema,
  operatorId: identifierSchema,
  publicKey: nostrPublicKeySchema.optional(),
  role: operatorRoleSchema.default("operator"),
  schemaVersion: z.literal("1"),
  updatedAt: nonEmptyStringSchema
});

export type AuthorityKeyAlgorithm = z.infer<typeof authorityKeyAlgorithmSchema>;
export type HostAuthorityStatus = z.infer<typeof hostAuthorityStatusSchema>;
export type HostAuthorityRecord = z.infer<typeof hostAuthorityRecordSchema>;
export type OperatorRole = z.infer<typeof operatorRoleSchema>;
export type OperatorIdentityRecord = z.infer<
  typeof operatorIdentityRecordSchema
>;
