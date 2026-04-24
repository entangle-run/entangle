import { z } from "zod";
import { validationReportSchema } from "../common/validation.js";
import { identifierSchema } from "../common/primitives.js";
import { nodeBindingSchema } from "../graph/graph-spec.js";
import { effectiveNodeBindingSchema } from "../runtime/runtime-context.js";
import { runtimeInspectionResponseSchema } from "./runtime.js";

export const managedNodeKindSchema = z.enum([
  "supervisor",
  "worker",
  "reviewer",
  "service"
]);

export const nodeCreateRequestSchema = nodeBindingSchema.extend({
  nodeKind: managedNodeKindSchema
});

export const nodeReplacementRequestSchema = nodeBindingSchema
  .omit({
    nodeId: true
  })
  .extend({
    nodeKind: managedNodeKindSchema
  });

export const nodeInspectionResponseSchema = z.object({
  binding: effectiveNodeBindingSchema,
  runtime: runtimeInspectionResponseSchema
});

export const nodeListResponseSchema = z.object({
  nodes: z.array(nodeInspectionResponseSchema)
});

export const nodeMutationResponseSchema = z.object({
  activeRevisionId: identifierSchema.optional(),
  node: nodeInspectionResponseSchema.optional(),
  validation: validationReportSchema
});

export const nodeDeletionResponseSchema = z.object({
  activeRevisionId: identifierSchema.optional(),
  deletedNodeId: identifierSchema.optional(),
  validation: validationReportSchema
});

export type ManagedNodeKind = z.infer<typeof managedNodeKindSchema>;
export type NodeCreateRequest = z.infer<typeof nodeCreateRequestSchema>;
export type NodeReplacementRequest = z.infer<typeof nodeReplacementRequestSchema>;
export type NodeInspectionResponse = z.infer<typeof nodeInspectionResponseSchema>;
export type NodeListResponse = z.infer<typeof nodeListResponseSchema>;
export type NodeMutationResponse = z.infer<typeof nodeMutationResponseSchema>;
export type NodeDeletionResponse = z.infer<typeof nodeDeletionResponseSchema>;
