import { z } from "zod";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema
} from "./runtime-state.js";

export const reconciliationNodeSummarySchema = z.object({
  desiredState: runtimeDesiredStateSchema,
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  statusMessage: nonEmptyStringSchema.optional()
});

export const reconciliationSnapshotSchema = z.object({
  backendKind: runtimeBackendKindSchema,
  failedRuntimeCount: z.number().int().nonnegative(),
  graphId: identifierSchema.optional(),
  graphRevisionId: identifierSchema.optional(),
  lastReconciledAt: nonEmptyStringSchema,
  managedRuntimeCount: z.number().int().nonnegative(),
  nodes: z.array(reconciliationNodeSummarySchema),
  runningRuntimeCount: z.number().int().nonnegative(),
  schemaVersion: z.literal("1"),
  stoppedRuntimeCount: z.number().int().nonnegative()
});

export type ReconciliationNodeSummary = z.infer<
  typeof reconciliationNodeSummarySchema
>;
export type ReconciliationSnapshot = z.infer<typeof reconciliationSnapshotSchema>;
