import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { runtimeInspectionResponseSchema } from "./runtime.js";
import {
  runtimeRecoveryControllerRecordSchema,
  runtimeRecoveryPolicyRecordSchema,
  runtimeRecoveryPolicySchema
} from "../runtime/recovery-policy.js";

export const runtimeRecoveryRecordSchema = z.object({
  lastError: nonEmptyStringSchema.optional(),
  recordedAt: nonEmptyStringSchema,
  recoveryId: identifierSchema,
  runtime: runtimeInspectionResponseSchema
});

export const runtimeRecoveryListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional()
});

export const runtimeRecoveryInspectionResponseSchema = z.object({
  controller: runtimeRecoveryControllerRecordSchema,
  currentRuntime: runtimeInspectionResponseSchema.optional(),
  entries: z.array(runtimeRecoveryRecordSchema),
  nodeId: identifierSchema,
  policy: runtimeRecoveryPolicyRecordSchema
});

export const runtimeRecoveryPolicyMutationRequestSchema =
  runtimeRecoveryPolicySchema;

export type RuntimeRecoveryRecord = z.infer<typeof runtimeRecoveryRecordSchema>;
export type RuntimeRecoveryListQuery = z.infer<typeof runtimeRecoveryListQuerySchema>;
export type RuntimeRecoveryInspectionResponse = z.infer<
  typeof runtimeRecoveryInspectionResponseSchema
>;
export type RuntimeRecoveryPolicyMutationRequest = z.infer<
  typeof runtimeRecoveryPolicyMutationRequestSchema
>;
