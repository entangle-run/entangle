import { z } from "zod";
import {
  nostrPublicKeySchema,
  nostrSecretKeySchema
} from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  hostAuthorityRecordSchema,
  hostAuthorityStatusSchema
} from "../federation/authority.js";

export const hostAuthoritySecretStatusSchema = z.enum([
  "available",
  "missing",
  "mismatched"
]);

export const hostAuthoritySecretInspectionSchema = z.object({
  keyRef: nonEmptyStringSchema.optional(),
  status: hostAuthoritySecretStatusSchema
});

export const hostAuthoritySummarySchema = z.object({
  authorityId: identifierSchema,
  publicKey: nostrPublicKeySchema,
  secretStatus: hostAuthoritySecretStatusSchema,
  status: hostAuthorityStatusSchema,
  updatedAt: nonEmptyStringSchema
});

export const hostAuthorityInspectionResponseSchema = z.object({
  authority: hostAuthorityRecordSchema,
  checkedAt: nonEmptyStringSchema,
  secret: hostAuthoritySecretInspectionSchema
});

export const hostAuthorityExportResponseSchema = z.object({
  authority: hostAuthorityRecordSchema,
  exportedAt: nonEmptyStringSchema,
  secretKey: nostrSecretKeySchema
});

export const hostAuthorityImportRequestSchema = z.object({
  authority: hostAuthorityRecordSchema,
  secretKey: nostrSecretKeySchema
});

export const hostAuthorityImportResponseSchema = z.object({
  authority: hostAuthorityRecordSchema,
  importedAt: nonEmptyStringSchema
});

export type HostAuthoritySecretStatus = z.infer<
  typeof hostAuthoritySecretStatusSchema
>;
export type HostAuthoritySecretInspection = z.infer<
  typeof hostAuthoritySecretInspectionSchema
>;
export type HostAuthoritySummary = z.infer<typeof hostAuthoritySummarySchema>;
export type HostAuthorityInspectionResponse = z.infer<
  typeof hostAuthorityInspectionResponseSchema
>;
export type HostAuthorityExportResponse = z.infer<
  typeof hostAuthorityExportResponseSchema
>;
export type HostAuthorityImportRequest = z.infer<
  typeof hostAuthorityImportRequestSchema
>;
export type HostAuthorityImportResponse = z.infer<
  typeof hostAuthorityImportResponseSchema
>;
