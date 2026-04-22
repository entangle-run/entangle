import { z } from "zod";
import { validationReportSchema } from "../common/validation.js";
import { graphSpecSchema } from "../graph/graph-spec.js";
import { agentPackageManifestSchema } from "../package/package-manifest.js";
import { packageSourceRecordSchema } from "../package/package-source.js";
import {
  deploymentResourceCatalogSchema
} from "../resources/catalog.js";
import { identifierSchema, nonEmptyStringSchema } from "../common/primitives.js";

export const packageSourceAdmissionRequestSchema = z.discriminatedUnion(
  "sourceKind",
  [
    z.object({
      sourceKind: z.literal("local_path"),
      packageSourceId: identifierSchema.optional(),
      absolutePath: nonEmptyStringSchema
    }),
    z.object({
      sourceKind: z.literal("local_archive"),
      packageSourceId: identifierSchema.optional(),
      archivePath: nonEmptyStringSchema
    })
  ]
);

export const catalogInspectionResponseSchema = z.object({
  catalog: deploymentResourceCatalogSchema.optional(),
  validation: validationReportSchema
});

export const packageSourceInspectionResponseSchema = z.object({
  packageSource: packageSourceRecordSchema,
  manifest: agentPackageManifestSchema.optional(),
  validation: validationReportSchema
});

export const packageSourceListResponseSchema = z.object({
  packageSources: z.array(packageSourceInspectionResponseSchema)
});

export const graphInspectionResponseSchema = z.object({
  graph: graphSpecSchema.optional(),
  activeRevisionId: identifierSchema.optional()
});

export const graphMutationResponseSchema = z.object({
  graph: graphSpecSchema.optional(),
  activeRevisionId: identifierSchema.optional(),
  validation: validationReportSchema
});

export type PackageSourceAdmissionRequest = z.infer<
  typeof packageSourceAdmissionRequestSchema
>;
export type CatalogInspectionResponse = z.infer<
  typeof catalogInspectionResponseSchema
>;
export type PackageSourceInspectionResponse = z.infer<
  typeof packageSourceInspectionResponseSchema
>;
export type PackageSourceListResponse = z.infer<
  typeof packageSourceListResponseSchema
>;
export type GraphInspectionResponse = z.infer<
  typeof graphInspectionResponseSchema
>;
export type GraphMutationResponse = z.infer<
  typeof graphMutationResponseSchema
>;
