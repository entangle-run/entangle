import { z } from "zod";
import { filesystemPathSchema, identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";
import { effectiveRuntimeContextSchema } from "../runtime/runtime-context.js";
import {
  runtimeBackendKindSchema,
  runtimeDesiredStateSchema,
  runtimeObservedStateSchema
} from "../runtime/runtime-state.js";

export const runtimeInspectionResponseSchema = z.object({
  backendKind: runtimeBackendKindSchema,
  contextAvailable: z.boolean(),
  contextPath: filesystemPathSchema.optional(),
  desiredState: runtimeDesiredStateSchema,
  graphId: identifierSchema,
  graphRevisionId: identifierSchema,
  nodeId: identifierSchema,
  observedState: runtimeObservedStateSchema,
  packageSourceId: identifierSchema.optional(),
  reason: nonEmptyStringSchema.optional(),
  runtimeHandle: nonEmptyStringSchema.optional(),
  statusMessage: nonEmptyStringSchema.optional()
});

export const runtimeListResponseSchema = z.object({
  runtimes: z.array(runtimeInspectionResponseSchema)
});

export const runtimeIntentMutationRequestSchema = z.object({
  desiredState: runtimeDesiredStateSchema
});

export const runtimeContextInspectionResponseSchema = effectiveRuntimeContextSchema;

export type RuntimeInspectionResponse = z.infer<typeof runtimeInspectionResponseSchema>;
export type RuntimeListResponse = z.infer<typeof runtimeListResponseSchema>;
export type RuntimeIntentMutationRequest = z.infer<typeof runtimeIntentMutationRequestSchema>;
export type RuntimeContextInspectionResponse = z.infer<typeof runtimeContextInspectionResponseSchema>;
