import { z } from "zod";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const runtimeBackendKindSchema = z.enum(["docker", "memory"]);
export const runtimeDesiredStateSchema = z.enum(["running", "stopped"]);
export const runtimeObservedStateSchema = z.enum([
  "missing",
  "starting",
  "running",
  "stopped",
  "failed"
]);

export const runtimeIntentRecordSchema = z.object({
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  reason: nonEmptyStringSchema.optional(),
  schemaVersion: z.literal("1"),
  updatedAt: nonEmptyStringSchema
});

export const observedRuntimeRecordSchema = z.object({
  backendKind: runtimeBackendKindSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  lastError: nonEmptyStringSchema.optional(),
  lastSeenAt: nonEmptyStringSchema,
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  runtimeContextPath: filesystemPathSchema.optional(),
  runtimeHandle: nonEmptyStringSchema.optional(),
  schemaVersion: z.literal("1"),
  statusMessage: nonEmptyStringSchema.optional()
});

export type RuntimeBackendKind = z.infer<typeof runtimeBackendKindSchema>;
export type RuntimeDesiredState = z.infer<typeof runtimeDesiredStateSchema>;
export type RuntimeObservedState = z.infer<typeof runtimeObservedStateSchema>;
export type RuntimeIntentRecord = z.infer<typeof runtimeIntentRecordSchema>;
export type ObservedRuntimeRecord = z.infer<typeof observedRuntimeRecordSchema>;
