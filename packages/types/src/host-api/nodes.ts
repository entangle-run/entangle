import { z } from "zod";
import { effectiveNodeBindingSchema } from "../runtime/runtime-context.js";
import { runtimeInspectionResponseSchema } from "./runtime.js";

export const nodeInspectionResponseSchema = z.object({
  binding: effectiveNodeBindingSchema,
  runtime: runtimeInspectionResponseSchema
});

export const nodeListResponseSchema = z.object({
  nodes: z.array(nodeInspectionResponseSchema)
});

export type NodeInspectionResponse = z.infer<typeof nodeInspectionResponseSchema>;
export type NodeListResponse = z.infer<typeof nodeListResponseSchema>;
