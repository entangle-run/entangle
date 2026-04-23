import { z } from "zod";
import { nonEmptyStringSchema } from "../common/primitives.js";
import { gitRepositoryTargetSchema } from "./git-repository-target.js";

export const gitRepositoryProvisioningStateSchema = z.enum([
  "not_requested",
  "ready",
  "failed"
]);

export const gitRepositoryProvisioningRecordSchema = z
  .object({
    checkedAt: nonEmptyStringSchema,
    created: z.boolean().optional(),
    lastError: nonEmptyStringSchema.optional(),
    schemaVersion: z.literal("1"),
    state: gitRepositoryProvisioningStateSchema,
    target: gitRepositoryTargetSchema
  })
  .superRefine((value, context) => {
    if (value.state === "failed" && !value.lastError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Failed repository provisioning records must include a lastError.",
        path: ["lastError"]
      });
    }

    if (value.state !== "failed" && value.lastError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Only failed repository provisioning records may include a lastError.",
        path: ["lastError"]
      });
    }

    if (value.state === "not_requested" && value.created !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Repository provisioning records with state 'not_requested' must not include created metadata.",
        path: ["created"]
      });
    }
  });

export type GitRepositoryProvisioningState = z.infer<
  typeof gitRepositoryProvisioningStateSchema
>;
export type GitRepositoryProvisioningRecord = z.infer<
  typeof gitRepositoryProvisioningRecordSchema
>;
