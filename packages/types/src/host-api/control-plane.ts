import { z } from "zod";
import { validationReportSchema } from "../common/validation.js";
import { graphSpecSchema } from "../graph/graph-spec.js";
import { agentPackageManifestSchema } from "../package/package-manifest.js";
import { packageSourceRecordSchema } from "../package/package-source.js";
import {
  agentEngineHttpAuthSchema,
  agentEnginePermissionModeSchema,
  agentEngineProfileKindSchema,
  deploymentResourceCatalogSchema
} from "../resources/catalog.js";
import { externalPrincipalRecordSchema } from "../resources/external-principal.js";
import {
  httpUrlSchema,
  identifierSchema,
  nonEmptyStringSchema
} from "../common/primitives.js";

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

export const agentEngineProfileUpsertRequestSchema = z
  .object({
    baseUrl: httpUrlSchema.optional(),
    clearBaseUrl: z.boolean().default(false),
    clearDefaultAgent: z.boolean().default(false),
    clearExecutable: z.boolean().default(false),
    clearHttpAuth: z.boolean().default(false),
    clearPermissionMode: z.boolean().default(false),
    clearVersion: z.boolean().default(false),
    defaultAgent: identifierSchema.optional(),
    displayName: nonEmptyStringSchema.optional(),
    executable: nonEmptyStringSchema.optional(),
    httpAuth: agentEngineHttpAuthSchema.optional(),
    kind: agentEngineProfileKindSchema.optional(),
    permissionMode: agentEnginePermissionModeSchema.optional(),
    setDefault: z.boolean().default(false),
    stateScope: z.enum(["node", "shared"]).optional(),
    version: nonEmptyStringSchema.optional()
  })
  .superRefine((value, context) => {
    const conflictingFields: Array<{
      clearField:
        | "clearBaseUrl"
        | "clearDefaultAgent"
        | "clearExecutable"
        | "clearHttpAuth"
        | "clearPermissionMode"
        | "clearVersion";
      setField:
        | "baseUrl"
        | "defaultAgent"
        | "executable"
        | "httpAuth"
        | "permissionMode"
        | "version";
    }> = [
      { clearField: "clearBaseUrl", setField: "baseUrl" },
      { clearField: "clearDefaultAgent", setField: "defaultAgent" },
      { clearField: "clearExecutable", setField: "executable" },
      { clearField: "clearHttpAuth", setField: "httpAuth" },
      { clearField: "clearPermissionMode", setField: "permissionMode" },
      { clearField: "clearVersion", setField: "version" }
    ];

    for (const fields of conflictingFields) {
      if (value[fields.clearField] && value[fields.setField]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Use either ${fields.setField} or ${fields.clearField}, not both.`,
          path: [fields.clearField]
        });
      }
    }
  });

export const packageSourceInspectionResponseSchema = z.object({
  packageSource: packageSourceRecordSchema,
  manifest: agentPackageManifestSchema.optional(),
  validation: validationReportSchema
});

export const externalPrincipalMutationRequestSchema = externalPrincipalRecordSchema;

export const externalPrincipalInspectionResponseSchema = z.object({
  principal: externalPrincipalRecordSchema,
  validation: validationReportSchema
});

export const externalPrincipalListResponseSchema = z.object({
  principals: z.array(externalPrincipalInspectionResponseSchema)
});

export const externalPrincipalDeletionResponseSchema = z.object({
  deletedPrincipalId: identifierSchema
});

export const packageSourceListResponseSchema = z.object({
  packageSources: z.array(packageSourceInspectionResponseSchema)
});

export const packageSourceDeletionResponseSchema = z.object({
  deletedPackageSourceId: identifierSchema
});

export const graphInspectionResponseSchema = z.object({
  graph: graphSpecSchema.optional(),
  activeRevisionId: identifierSchema.optional()
});

export const activeGraphRevisionRecordSchema = z.object({
  activeRevisionId: identifierSchema,
  appliedAt: nonEmptyStringSchema
});

export const graphRevisionRecordSchema = z.object({
  appliedAt: nonEmptyStringSchema,
  graph: graphSpecSchema,
  revisionId: identifierSchema
});

export const graphRevisionMetadataSchema = z.object({
  appliedAt: nonEmptyStringSchema,
  graphId: identifierSchema,
  isActive: z.boolean(),
  revisionId: identifierSchema
});

export const graphRevisionInspectionResponseSchema = z.object({
  graph: graphSpecSchema,
  revision: graphRevisionMetadataSchema
});

export const graphRevisionListResponseSchema = z.object({
  revisions: z.array(graphRevisionMetadataSchema)
});

export const graphMutationResponseSchema = z.object({
  graph: graphSpecSchema.optional(),
  activeRevisionId: identifierSchema.optional(),
  validation: validationReportSchema
});

export type PackageSourceAdmissionRequest = z.infer<
  typeof packageSourceAdmissionRequestSchema
>;
export type ExternalPrincipalMutationRequest = z.infer<
  typeof externalPrincipalMutationRequestSchema
>;
export type ExternalPrincipalInspectionResponse = z.infer<
  typeof externalPrincipalInspectionResponseSchema
>;
export type ExternalPrincipalListResponse = z.infer<
  typeof externalPrincipalListResponseSchema
>;
export type ExternalPrincipalDeletionResponse = z.infer<
  typeof externalPrincipalDeletionResponseSchema
>;
export type CatalogInspectionResponse = z.infer<
  typeof catalogInspectionResponseSchema
>;
export type AgentEngineProfileUpsertRequest = z.infer<
  typeof agentEngineProfileUpsertRequestSchema
>;
export type AgentEngineProfileUpsertRequestInput = z.input<
  typeof agentEngineProfileUpsertRequestSchema
>;
export type PackageSourceInspectionResponse = z.infer<
  typeof packageSourceInspectionResponseSchema
>;
export type PackageSourceListResponse = z.infer<
  typeof packageSourceListResponseSchema
>;
export type PackageSourceDeletionResponse = z.infer<
  typeof packageSourceDeletionResponseSchema
>;
export type GraphInspectionResponse = z.infer<
  typeof graphInspectionResponseSchema
>;
export type ActiveGraphRevisionRecord = z.infer<
  typeof activeGraphRevisionRecordSchema
>;
export type GraphRevisionRecord = z.infer<typeof graphRevisionRecordSchema>;
export type GraphRevisionMetadata = z.infer<
  typeof graphRevisionMetadataSchema
>;
export type GraphRevisionInspectionResponse = z.infer<
  typeof graphRevisionInspectionResponseSchema
>;
export type GraphRevisionListResponse = z.infer<
  typeof graphRevisionListResponseSchema
>;
export type GraphMutationResponse = z.infer<
  typeof graphMutationResponseSchema
>;
