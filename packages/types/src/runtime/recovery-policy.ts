import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const runtimeRecoveryPolicySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("manual")
  }),
  z.object({
    cooldownSeconds: z.number().int().nonnegative().max(3600),
    maxAttempts: z.number().int().positive().max(20),
    mode: z.literal("restart_on_failure")
  })
]);

export const runtimeRecoveryPolicyRecordSchema = z.object({
  nodeId: identifierSchema,
  policy: runtimeRecoveryPolicySchema,
  schemaVersion: z.literal("1"),
  updatedAt: nonEmptyStringSchema
});

export const runtimeRecoveryControllerStateSchema = z.enum([
  "idle",
  "manual_required",
  "cooldown",
  "exhausted"
]);

export const runtimeRecoveryControllerRecordSchema = z.object({
  activeFailureFingerprint: nonEmptyStringSchema.optional(),
  attemptsUsed: z.number().int().nonnegative(),
  graphId: identifierSchema.optional(),
  graphRevisionId: identifierSchema.optional(),
  lastAttemptedAt: nonEmptyStringSchema.optional(),
  lastFailureAt: nonEmptyStringSchema.optional(),
  nextEligibleAt: nonEmptyStringSchema.optional(),
  nodeId: identifierSchema,
  schemaVersion: z.literal("1"),
  state: runtimeRecoveryControllerStateSchema,
  updatedAt: nonEmptyStringSchema
});

export type RuntimeRecoveryPolicy = z.infer<typeof runtimeRecoveryPolicySchema>;
export type RuntimeRecoveryPolicyRecord = z.infer<
  typeof runtimeRecoveryPolicyRecordSchema
>;
export type RuntimeRecoveryControllerState = z.infer<
  typeof runtimeRecoveryControllerStateSchema
>;
export type RuntimeRecoveryControllerRecord = z.infer<
  typeof runtimeRecoveryControllerRecordSchema
>;
