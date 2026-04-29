import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  runtimeAssignmentRecordSchema,
  runtimeAssignmentStatusSchema
} from "../federation/assignment.js";
import {
  assignmentReceiptProjectionRecordSchema,
  runtimeCommandReceiptProjectionRecordSchema
} from "../projection/projection.js";
import { entangleRuntimeCommandEventTypeSchema } from "../protocol/control.js";

export const runtimeAssignmentListResponseSchema = z.object({
  assignments: z.array(runtimeAssignmentRecordSchema),
  generatedAt: nonEmptyStringSchema
});

export const runtimeAssignmentInspectionResponseSchema = z.object({
  assignment: runtimeAssignmentRecordSchema
});

export const runtimeAssignmentTimelineEntrySchema = z.object({
  assignmentId: identifierSchema,
  entryKind: z.enum([
    "assignment.offered",
    "assignment.accepted",
    "assignment.rejected",
    "assignment.revoked",
    "assignment.receipt",
    "runtime.command.receipt"
  ]),
  commandEventType: entangleRuntimeCommandEventTypeSchema.optional(),
  commandId: identifierSchema.optional(),
  message: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema.optional(),
  receiptKind: z
    .enum(["received", "materialized", "started", "stopped", "failed"])
    .optional(),
  receiptStatus: z.enum(["received", "completed", "failed"]).optional(),
  runnerId: identifierSchema.optional(),
  status: runtimeAssignmentStatusSchema.optional(),
  timestamp: nonEmptyStringSchema
});

export const runtimeAssignmentTimelineResponseSchema = z.object({
  assignment: runtimeAssignmentRecordSchema,
  commandReceipts: z.array(runtimeCommandReceiptProjectionRecordSchema),
  generatedAt: nonEmptyStringSchema,
  receipts: z.array(assignmentReceiptProjectionRecordSchema),
  timeline: z.array(runtimeAssignmentTimelineEntrySchema)
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
export type RuntimeAssignmentTimelineEntry = z.infer<
  typeof runtimeAssignmentTimelineEntrySchema
>;
export type RuntimeAssignmentTimelineResponse = z.infer<
  typeof runtimeAssignmentTimelineResponseSchema
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
