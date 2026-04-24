import { z } from "zod";
import { validationReportSchema } from "../common/validation.js";
import { identifierSchema } from "../common/primitives.js";
import { edgeSchema } from "../graph/graph-spec.js";

export const edgeCreateRequestSchema = edgeSchema;

export const edgeReplacementRequestSchema = edgeSchema.omit({
  edgeId: true
});

export const edgeInspectionResponseSchema = edgeSchema;

export const edgeListResponseSchema = z.object({
  edges: z.array(edgeInspectionResponseSchema)
});

export const edgeMutationResponseSchema = z.object({
  activeRevisionId: identifierSchema.optional(),
  edge: edgeInspectionResponseSchema.optional(),
  validation: validationReportSchema
});

export const edgeDeletionResponseSchema = z.object({
  activeRevisionId: identifierSchema.optional(),
  deletedEdgeId: identifierSchema.optional(),
  validation: validationReportSchema
});

export type EdgeCreateRequest = z.infer<typeof edgeCreateRequestSchema>;
export type EdgeReplacementRequest = z.infer<typeof edgeReplacementRequestSchema>;
export type EdgeInspectionResponse = z.infer<typeof edgeInspectionResponseSchema>;
export type EdgeListResponse = z.infer<typeof edgeListResponseSchema>;
export type EdgeMutationResponse = z.infer<typeof edgeMutationResponseSchema>;
export type EdgeDeletionResponse = z.infer<typeof edgeDeletionResponseSchema>;
