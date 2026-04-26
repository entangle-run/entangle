import { z } from "zod";
import { nostrPublicKeySchema } from "../common/crypto.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeNodeKindSchema } from "./runner.js";

export const runtimeAssignmentStatusSchema = z.enum([
  "offered",
  "accepted",
  "rejected",
  "active",
  "revoking",
  "revoked",
  "expired"
]);

export const assignmentLeaseSchema = z.object({
  expiresAt: nonEmptyStringSchema,
  issuedAt: nonEmptyStringSchema,
  leaseId: identifierSchema,
  renewBy: nonEmptyStringSchema.optional()
});

export const runtimeAssignmentRecordSchema = z
  .object({
    acceptedAt: nonEmptyStringSchema.optional(),
    assignmentId: identifierSchema,
    assignmentRevision: z.number().int().nonnegative().default(0),
    graphId: identifierSchema,
    graphRevisionId: identifierSchema,
    hostAuthorityPubkey: nostrPublicKeySchema,
    lease: assignmentLeaseSchema.optional(),
    nodeId: identifierSchema,
    offeredAt: nonEmptyStringSchema,
    policyRevisionId: identifierSchema.optional(),
    rejectedAt: nonEmptyStringSchema.optional(),
    rejectionReason: nonEmptyStringSchema.optional(),
    revokedAt: nonEmptyStringSchema.optional(),
    revocationReason: nonEmptyStringSchema.optional(),
    runnerId: identifierSchema,
    runnerPubkey: nostrPublicKeySchema,
    runtimeKind: runtimeNodeKindSchema,
    schemaVersion: z.literal("1"),
    status: runtimeAssignmentStatusSchema,
    updatedAt: nonEmptyStringSchema
  })
  .superRefine((value, context) => {
    if (
      (value.status === "accepted" || value.status === "active") &&
      !value.acceptedAt
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Accepted or active assignments must include acceptedAt.",
        path: ["acceptedAt"]
      });
    }

    if (value.status === "active" && !value.lease) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Active assignments must include an assignment lease.",
        path: ["lease"]
      });
    }

    if (value.status === "rejected") {
      if (!value.rejectedAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rejected assignments must include rejectedAt.",
          path: ["rejectedAt"]
        });
      }

      if (!value.rejectionReason) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rejected assignments must include rejectionReason.",
          path: ["rejectionReason"]
        });
      }
    }

    if (value.status === "revoked" && !value.revokedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revoked assignments must include revokedAt.",
        path: ["revokedAt"]
      });
    }
  });

export type RuntimeAssignmentStatus = z.infer<
  typeof runtimeAssignmentStatusSchema
>;
export type AssignmentLease = z.infer<typeof assignmentLeaseSchema>;
export type RuntimeAssignmentRecord = z.infer<
  typeof runtimeAssignmentRecordSchema
>;
