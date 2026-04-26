import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeAssignmentRecordSchema } from "../federation/assignment.js";

export const runtimeAssignmentListResponseSchema = z.object({
  assignments: z.array(runtimeAssignmentRecordSchema),
  generatedAt: nonEmptyStringSchema
});

export const runtimeAssignmentInspectionResponseSchema = z.object({
  assignment: runtimeAssignmentRecordSchema
});

export const runtimeAssignmentOfferRequestSchema = z.object({
  assignmentId: identifierSchema.optional(),
  leaseDurationSeconds: z.number().int().positive().default(3600),
  nodeId: identifierSchema,
  policyRevisionId: identifierSchema.optional(),
  runnerId: identifierSchema
});

export const runtimeAssignmentOfferResponseSchema = z.object({
  assignment: runtimeAssignmentRecordSchema
});

export const runtimeAssignmentRevokeRequestSchema = z.object({
  reason: nonEmptyStringSchema.optional(),
  revokedBy: identifierSchema.optional()
});

export const runtimeAssignmentRevokeResponseSchema = z.object({
  assignment: runtimeAssignmentRecordSchema
});

export type RuntimeAssignmentListResponse = z.infer<
  typeof runtimeAssignmentListResponseSchema
>;
export type RuntimeAssignmentInspectionResponse = z.infer<
  typeof runtimeAssignmentInspectionResponseSchema
>;
export type RuntimeAssignmentOfferRequest = z.infer<
  typeof runtimeAssignmentOfferRequestSchema
>;
export type RuntimeAssignmentOfferResponse = z.infer<
  typeof runtimeAssignmentOfferResponseSchema
>;
export type RuntimeAssignmentRevokeRequest = z.infer<
  typeof runtimeAssignmentRevokeRequestSchema
>;
export type RuntimeAssignmentRevokeResponse = z.infer<
  typeof runtimeAssignmentRevokeResponseSchema
>;
